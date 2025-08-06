import { GoogleGenAI } from "@google/genai";
import { Sport, MatchPrediction, AccumulatorTip, PredictionsWithSources, AccumulatorTipsWithSources, GroundingChunk, FootballPageData, AccumulatorResult, AccumulatorGame, PredictionResult, AIStrategy, AIRecommendation, DailyBriefing, AccumulatorStrategySets } from '../types';
import { getCachedData, setCachedData } from '../utils/caching';
import { getTodayAndTomorrowGH, getNext7DaysForPromptGH, getThisWeekRangeForPromptGH } from '../utils/dateUtils';

// SECURITY ISSUE: API key should not be hardcoded
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required but not provided.");
}

export const ai = new GoogleGenAI({ apiKey: API_KEY });

const JSON_SYSTEM_INSTRUCTION = "You are a sports data API. Your only output format is raw, valid JSON. You do not provide any explanations, logs, or conversational text. Your entire response must start and end with the appropriate JSON delimiters (e.g., '{' and '}' for an object). Your entire response must be ONLY the JSON, with no other text before or after.";

// Constants for better maintainability
const CACHE_KEYS = {
  FOOTBALL_PAGE: 'footballPageData',
  BET_OF_DAY: 'betOfTheDay',
  LEAGUE_DATA: 'leagueData',
  ACCUMULATOR_STRATEGIES: 'accumulatorStrategySets',
  SCORES_CACHE: 'scoresCache',
  ACCUMULATOR_RESULTS: 'accumulatorResultsCache',
  JC_GAMES: 'jcGamesData',
  WEEKLY_FOOTBALL: 'weeklyFootballGames'
} as const;

// Error handling utility
const handleApiError = (error: unknown, context: string): never => {
  console.error(`Gemini API error in ${context}:`, error);
  throw new Error(`Failed to fetch data from AI service: ${context}`);
};

// Retry mechanism for API calls
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};
const BASE_PREDICTION_PROMPT = `
1.  **DUAL PREDICTION MODEL:** For each match, provide two distinct predictions: "aiPrediction" (data-driven) and "learningPrediction" (form-focused). Both need confidence scores. The "recommendedBet" should be the single best bet.
2.  **BET BUILDER GENERATION (Optional):** If a compelling, multi-leg, single-game accumulator (a "Bet Builder") can be created for a match, generate one. This should be a 2-4 leg bet with correlated outcomes (e.g., Team A wins, Over 2.5 Goals, Team A top scorer to score). The "betBuilder" field should be an AccumulatorTip object. If no good Bet Builder opportunity exists, this field **MUST** be \`null\`.
3.  **REAL-TIME VERIFICATION:** Use Google Search to verify every game is real, officially scheduled, and to get its odds.
4.  **NO HALLUCINATION:** Strictly forbidden from inventing game data.
5.  **DATA TYPES:** All numeric values MUST be numbers, not strings.
6.  **EMPTY STATE:** If no verifiable matches are found for a query, return the appropriate empty JSON structure (e.g., \`{ "predictions": [], "accumulators": [] }\` or \`[]\`).
7.  **TIMEZONE CONTEXT:** All dates/times in prompts are in Ghana Mean Time (GMT). Your output 'matchDate' MUST be a full ISO 8601 UTC string (e.g., "2024-08-15T19:00:00Z").
`;

const PREDICTION_JSON_SCHEMA = `
{
  "id": "a-unique-v4-uuid",
  "teamA": "string",
  "teamB": "string",
  "league": "string",
  "stadium": "string",
  "city": "string",
  "matchDate": "ISO 8601 string",
  "sport": "Football",
  "formA": "e.g., 'WWLDW'",
  "formB": "e.g., 'LLDLW'",
  "h2h": "A descriptive sentence.",
  "keyStats": "A detailed, insightful key statistic.",
  "aiPrediction": "Specific prediction, e.g., 'Team A to win with a clean sheet.'",
  "aiConfidence": 93.0,
  "learningPrediction": "Specific secondary prediction, e.g., 'Team A to win and under 3.5 goals.'",
  "learningConfidence": 90.0,
  "aiRationale": "Detailed rationale for the recommended bet.",
  "recommendedBet": "string",
  "odds": 2.30,
  "betBuilder": { ...AccumulatorTip object... } or null
}
`;

export const parseJsonResponse = <T,>(jsonString: any): T | null => {
  // Input validation
  if (jsonString === null || jsonString === undefined) {
    return null;
  }

  if (typeof jsonString === 'object' && jsonString !== null) {
    return jsonString as T;
  }

  if (typeof jsonString !== 'string') {
    console.error("Failed to parse JSON: AI response was not a string or a valid object.", { response: jsonString });
    return null;
  }

  let textToParse = jsonString.trim();
  const lowerCaseText = textToParse.toLowerCase();

  if (lowerCaseText === 'null') {
    return null;
  }
  
  // Improved JSON detection and cleaning
  if (!isValidJsonStart(textToParse)) {
    if (hasConversationalContent(lowerCaseText)) {
      console.warn("AI returned a conversational response instead of JSON. Interpreting as null.", { response: jsonString });
      return null;
    }
  }

  textToParse = extractJsonFromResponse(textToParse);
  textToParse = sanitizeJsonString(textToParse);

  try {
    if (textToParse.trim().toLowerCase() === 'null') {
      return null;
    }
    return JSON.parse(textToParse) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original string was:", jsonString);
    console.error("Attempted to parse:", textToParse);
    return null;
  }
};

// Helper functions for JSON parsing
const isValidJsonStart = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

const hasConversationalContent = (lowerText: string): boolean => {
  const conversationalKeywords = [
    'i am sorry', 'i cannot', 'unable to find', 'could not find',
    'no verifiable matches', 'no football matches', 'data is not available',
    'not possible to fulfill', 'no odds were provided',
    'challenging', 'absence of readily available', 'not possible to fulfill the request',
    'due to the nature', 'unable to provide', 'not possible to provide', 'as an ai',
    'appropriate response is `null`', 'the response will be `null`',
    'based on the available information', 'ai prediction:', 'ai rationale:'
  ];
  
  return conversationalKeywords.some(keyword => lowerText.includes(keyword)) ||
         /`?null`?\.?\s*$/.test(lowerText);
};

const extractJsonFromResponse = (text: string): string => {
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(fenceRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Find JSON start
  const jsonStartIndex = text.indexOf('{');
  const arrayStartIndex = text.indexOf('[');
  const startIndex = jsonStartIndex > -1 && arrayStartIndex > -1 
    ? Math.min(jsonStartIndex, arrayStartIndex)
    : Math.max(jsonStartIndex, arrayStartIndex);

  return startIndex !== -1 ? text.substring(startIndex) : text;
};

const sanitizeJsonString = (text: string): string => {
  const annotationRegex = /tapped from search result \[\d+(,\s*\d+)*\]/g;
  text = text.replace(annotationRegex, '');
  
  const rogueWordRegex = /(?<=")\s+\w+\s*(?=[,}\]])/g;
  text = text.replace(rogueWordRegex, '');

  const malformedDateRegex = /(\d{2}:\d{2}:\d{2}):\d{2}(Z)/g;
  text = text.replace(malformedDateRegex, '$1$2');

  const mergedObjectRegex = /(Z")\s*\w+\s*(\w+)(?=:)/g;
  text = text.replace(mergedObjectRegex, '$1}, {"$2"');

  return text;
};

export const fetchDailyBriefing = async (pastStrategies: AIStrategy[]): Promise<DailyBriefing | null> => {
    const prompt = `
    Act as a senior betting analyst preparing a daily briefing for a user. Analyze their past strategies and provide concise, actionable insights.

    **CONTEXT: PAST STRATEGIES**
    Here is a summary of the user's previously created and tracked strategies, including their performance:
    ${JSON.stringify(pastStrategies.map(s => ({ name: s.name, params: s.parameters, wins: s.wins, losses: s.losses, pnl: s.pnl })), null, 2)}

    **YOUR TASK:**
    Generate a daily briefing with three key sections.

    **OUTPUT REQUIREMENTS (CRITICAL):**
    You MUST respond with a single, valid JSON object with three keys: "marketOpportunity", "performanceHighlight", and "strategySuggestion".

    1.  **"marketOpportunity" (string):** Identify a single, compelling market or type of bet for today's games that looks promising. Keep it brief (1-2 sentences). Example: "The 'Both Teams to Score' market in the Bundesliga looks strong today, with several high-scoring teams in action."
    2.  **"performanceHighlight" (string):** Look at the user's settled strategies. Find one positive takeaway. If there are no settled strategies or all have lost, provide a general encouragement. (1-2 sentences). Example: "Your 'Cautious Home Favorites' strategy is performing well, boasting a +12.5 P/L. It's a solid foundation to build upon."
    3.  **"strategySuggestion" (string):** Based on their history, suggest one simple adjustment or a new strategy to try in the Tip Builder. (1-2 sentences). Example: "Consider creating a new strategy focused on 'Over 2.5 Goals' but with a slightly higher risk profile (e.g., 70% success target) to capitalize on potential value."

    **DO NOT:**
    - Do not include any text outside of the JSON object.
    - If there is no data, provide optimistic but generic advice for each section.

    Now, generate the JSON response.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: "You are an expert sports betting analyst API. Your ONLY output is raw, valid JSON.",
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    
    return parseJsonResponse<DailyBriefing>(response.text);
};


export const fetchAIRecommendedStrategy = async (pastStrategies: AIStrategy[]): Promise<AIRecommendation | null> => {
    const prompt = `
    Analyze the user's past AI-generated betting strategies and recommend a new, optimized strategy for the "Tip Builder".

    **CONTEXT: PAST STRATEGIES**
    Here is a summary of the user's previously created and tracked strategies, including their performance:
    ${JSON.stringify(pastStrategies.map(s => ({ name: s.name, params: s.parameters, wins: s.wins, losses: s.losses, pnl: s.pnl })), null, 2)}

    **YOUR TASK:**
    Based on the performance data above, act as an expert betting analyst. Your goal is to generate a NEW set of parameters for the Tip Builder that has a high potential for success.

    **YOUR ANALYSIS SHOULD CONSIDER:**
    1.  **Winning Patterns:** What parameters (bet types, risk levels, number of games) are present in the most profitable (highest P/L) strategies?
    2.  **Losing Patterns:** What are the common themes in strategies that lost money?
    3.  **Untapped Potential:** Are there combinations of parameters that haven't been tried but seem promising? For example, combining a successful bet type with a different risk level.
    4.  **Balance:** The best strategy balances risk and reward. Don't just pick the safest options. Propose something that could be genuinely profitable.

    **OUTPUT REQUIREMENTS (CRITICAL):**
    You MUST respond with a single, valid JSON object containing two keys: "strategy" and "rationale".

    1.  **"strategy" object:** This object must contain the exact parameter structure for the Tip Builder:
        {
            "selectedBetTypes": string[], // An array of bet type strings. If aiSelectsMarkets is true, this should be an empty array.
            "customNlp": "string", // A new custom instruction for the AI, or an empty string.
            "numGames": number, // e.g., 4
            "successProbability": number, // e.g., 70
            "timeFrame": "string", // "24 hours", "3 days", etc.
            "aiSelectsMarkets": boolean // Let the AI choose markets? true/false
        }

    2.  **"rationale" string:** A concise, 1-3 sentence explanation for WHY you are recommending this new strategy, based on your analysis of the past performance data.

    **EXAMPLE RATIONALE:** "The 'Over 2.5 Goals' market has been highly profitable. I'm combining this with a slightly higher risk (lower success probability) and more games to capitalize on this trend, while keeping the timeframe short to focus on current team form."

    **DO NOT:**
    - Do not include any text outside of the JSON object.
    - Do not invent strategies that are impossible to fulfill.
    - If there are no past strategies, generate a well-balanced starting strategy.
    
    Now, generate the JSON response.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: "You are an expert sports betting analyst API. Your ONLY output is raw, valid JSON.",
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    
    const parsedData = parseJsonResponse<AIRecommendation>(response.text);
    return parsedData;
};

export const fetchAllLeaguesData = async (forceRefresh = false): Promise<{ data: FootballPageData | null, sources: GroundingChunk[] }> => {
  const cacheKey = `leagueData-All`;
  if (!forceRefresh) {
    const cachedData = getCachedData<FootballPageData>(cacheKey);
    if (cachedData) return { data: cachedData, sources: [] };
  }

  const allLeagueNames = [
    // International Club Competitions
    'UEFA Champions League', 'UEFA Europa League', 'UEFA Conference League', 'CONMEBOL Libertadores', 'CONMEBOL Sudamericana', 'AFC Champions League', 'FIFA Club World Cup', 'Leagues Cup 2025', 'UEFA Super Cup',
    // Major Domestic Leagues
    'English Premier League', 'La Liga (Spain)', 'Serie A (Italy)', 'Bundesliga (Germany)', 'Ligue 1 (France)', 'Major League Soccer (MLS)', 'Brasileiro Série A', 'Argentine Primera División', 'Eredivisie (Netherlands)', 'Primeira Liga (Portugal)', 'Saudi Pro League',
    // Other
    'Club Friendly Games',
  ].join('", "');

  const prompt = `Generate a JSON object with 'predictions' and 'accumulators' for upcoming football matches from any of the following leagues: **"${allLeagueNames}"**. Look for games in the near future (next 14 days).

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **LEAGUE SCOPE:** Only include games from the provided list.
9.  **ACCUMULATOR LOGIC:** The 'prediction' for each game in the 'accumulators' array must be the 'recommendedBet' from the main prediction object.

**JSON OUTPUT REQUIREMENTS:**
- Final output: \`{ "predictions": [...], "accumulators": [...] }\`.
- **'predictions' Property:** An array of football prediction objects, each conforming to: ${PREDICTION_JSON_SCHEMA}
- **'accumulators' Property:** An array of 1-3 distinct accumulator tip objects created ONLY from the games in your 'predictions' response.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: JSON_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsedData = parseJsonResponse<FootballPageData>(response.text);
  const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  if(parsedData) {
    setCachedData(cacheKey, parsedData);
  }
  return { data: parsedData, sources };
};

export const fetchLeagueData = async (leagueName: string, forceRefresh = false): Promise<{ data: FootballPageData | null, sources: GroundingChunk[] }> => {
  const cacheKey = `leagueData-${leagueName.replace(/[\s/]/g, '-')}`;
  if (!forceRefresh) {
    const cachedData = getCachedData<FootballPageData>(cacheKey);
    if (cachedData) return { data: cachedData, sources: [] };
  }

  const prompt = `Generate a JSON object with 'predictions' and 'accumulators' for upcoming football matches in the **"${leagueName}"**. Look for games in the near future (next 14 days).

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **LEAGUE FOCUS:** Only include games from **"${leagueName}"**.
9.  **ACCUMULATOR LOGIC:** The 'prediction' for each game in 'accumulators' must be the 'recommendedBet' from a prediction.

**JSON OUTPUT REQUIREMENTS:**
- Final output: \`{ "predictions": [...], "accumulators": [...] }\`.
- **'predictions' Property:** An array of football prediction objects from "${leagueName}", conforming to: ${PREDICTION_JSON_SCHEMA}
- **'accumulators' Property:** An array of 1-3 accumulator tip objects created ONLY from the games in your 'predictions' response.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: JSON_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsedData = parseJsonResponse<FootballPageData>(response.text);
  const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  if(parsedData) {
    setCachedData(cacheKey, parsedData);
  }
  return { data: parsedData, sources };
};

export const fetchJCGamesPageData = async (forceRefresh = false): Promise<{ data: FootballPageData | null, sources: GroundingChunk[] }> => {
  const cacheKey = 'jcGamesData';
  if (!forceRefresh) {
    const cachedData = getCachedData<FootballPageData>(cacheKey);
    if (cachedData) return { data: cachedData, sources: [] };
  }

  const { startOfWeek, endOfWeek } = getThisWeekRangeForPromptGH();
  const prompt = `Generate a JSON object with 'predictions' and 'accumulators' for upcoming football matches from the **J1 League, J2 League, J3 League (Japan), and the Chinese Super League (CSL)**. Focus on games between **${startOfWeek} and ${endOfWeek}**.

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **LEAGUE SCOPE:** Only include games from the specified Japanese and Chinese leagues.
9.  **ACCUMULATOR LOGIC:** The 'prediction' for each game in 'accumulators' must be the 'recommendedBet' from a prediction.

**JSON OUTPUT REQUIREMENTS:**
- Final output: \`{ "predictions": [...], "accumulators": [...] }\`.
- **'predictions' Property:** An array of football match prediction objects, each conforming to: ${PREDICTION_JSON_SCHEMA}
- **'accumulators' Property:** An array of 1-3 accumulator tip objects created ONLY from the games in 'predictions'.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: JSON_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsedData = parseJsonResponse<FootballPageData>(response.text);
  const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  if (parsedData) {
    setCachedData(cacheKey, parsedData);
  }
  return { data: parsedData, sources };
};

export const fetchBetOfTheDay = async (forceRefresh = false): Promise<{ prediction: MatchPrediction | null, sources: GroundingChunk[] }> => {
  const cacheKey = 'betOfTheDay';
  if (!forceRefresh) {
    const cachedData = getCachedData<{ prediction: MatchPrediction | null, sources: GroundingChunk[] }>(cacheKey);
    if (cachedData) return cachedData;
  }

  const { todayString } = getTodayAndTomorrowGH();
  
  const prompt = `Analyze upcoming football matches for **today, ${todayString}**, and identify the **single best betting opportunity**. This should be the 'recommendedBet' you have the absolute highest confidence in.

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **SINGLE HIGHEST-CONFIDENCE BET ONLY:** Your entire JSON output must be a single prediction object, not an array.
9.  **EMPTY STATE:** If you cannot find a single, high-confidence bet that meets all criteria, your entire response **MUST** be the JSON literal \`null\`.

**JSON OUTPUT REQUIREMENTS:**
- The final output MUST be a single JSON object conforming to: ${PREDICTION_JSON_SCHEMA}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: JSON_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsedData = parseJsonResponse<MatchPrediction>(response.text);
  const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  const result = { prediction: parsedData, sources };

  if (parsedData) {
    setCachedData(cacheKey, result);
  }
  return result;
};

export const fetchSportPredictions = async (sport: Sport, forceRefresh = false): Promise<PredictionsWithSources> => {
    const cacheKey = `weekly${sport.replace(/\s+/g, '')}Games`;
    if (!forceRefresh) {
        const cachedData = getCachedData<PredictionsWithSources>(cacheKey);
        if (cachedData) return cachedData;
    }
    
    const { todayString, tomorrowString } = getTodayAndTomorrowGH();
    
    const prompt = `Generate a comprehensive JSON array of upcoming ${sport} match predictions for today (${todayString}) and tomorrow (${tomorrowString}).

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **SPORT FOCUS:** "sport" property MUST be "${sport}".
9.  **BROAD SEARCH:** Find as many games as possible for the specified sport.

**JSON OUTPUT REQUIREMENTS:**
- The final output MUST be a valid JSON array of prediction objects.
- Each object in the array MUST strictly conform to this structure: ${PREDICTION_JSON_SCHEMA.replace('"Football"', `"${sport}"`)}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: JSON_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const parsedData = parseJsonResponse<MatchPrediction[]>(response.text);
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
    const result = { predictions: parsedData || [], sources };
    
    if (parsedData) {
        setCachedData(cacheKey, result);
    }
    return result;
};

export const fetchWeeklyFootballGames = async (forceRefresh = false): Promise<{ predictions: MatchPrediction[], sources: GroundingChunk[] }> => {
    const cacheKey = 'weeklyFootballGames';
    if (!forceRefresh) {
        const cachedData = getCachedData<{ predictions: MatchPrediction[], sources: GroundingChunk[] }>(cacheKey);
        if (cachedData) return cachedData;
    }

    const { startOfWeek, endOfWeek } = getThisWeekRangeForPromptGH();
    const allLeagueNames = [
        // International Club Competitions
        'UEFA Champions League', 'UEFA Europa League', 'UEFA Conference League', 'CONMEBOL Libertadores', 'CONMEBOL Sudamericana', 'AFC Champions League', 'FIFA Club World Cup', 'Leagues Cup 2025', 'UEFA Super Cup',
        // Major Domestic Leagues
        'English Premier League', 'La Liga (Spain)', 'Serie A (Italy)', 'Bundesliga (Germany)', 'Ligue 1 (France)', 'Major League Soccer (MLS)', 'Brasileiro Série A', 'Argentine Primera División', 'Eredivisie (Netherlands)', 'Primeira Liga (Portugal)', 'Saudi Pro League',
        // Other
        'Club Friendly Games',
    ].join('", "');

    const prompt = `Generate a comprehensive JSON array of upcoming football match predictions for this week (from **${startOfWeek} to ${endOfWeek}**). The games should be from any of the following major leagues: **"${allLeagueNames}"**.

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **BROAD SEARCH & VERIFICATION:** Be as comprehensive as possible.
9.  **ACCURATE DATES:** The 'matchDate' must fall within this week.

**JSON OUTPUT REQUIREMENTS:**
- The final output MUST be a valid JSON array of prediction objects.
- Each object MUST conform to this structure: ${PREDICTION_JSON_SCHEMA}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: JSON_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const parsedData = parseJsonResponse<MatchPrediction[]>(response.text);
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
    const result = { predictions: parsedData || [], sources };
    
    if (parsedData) {
        setCachedData(cacheKey, result);
    }
    return result;
};


export const fetchFootballPageData = async (forceRefresh = false): Promise<{ data: FootballPageData | null, sources: GroundingChunk[] }> => {
  const cacheKey = 'footballPageData';
  if (!forceRefresh) {
    const cachedData = getCachedData<FootballPageData>(cacheKey);
    if (cachedData) return { data: cachedData, sources: [] };
  }

  const { todayString, tomorrowString } = getTodayAndTomorrowGH();
  const prompt = `Generate a JSON object with 'predictions' and 'accumulators' for upcoming football matches for today (${todayString}) and tomorrow (${tomorrowString}).

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
${BASE_PREDICTION_PROMPT}
8.  **ACCUMULATOR LOGIC:** The 'prediction' for each game in 'accumulators' must be the 'recommendedBet' from a prediction.

**JSON OUTPUT REQUIREMENTS:**
- Final output: \`{ "predictions": [...], "accumulators": [...] }\`.
- **'predictions' Property:** An array of up to 10 football match prediction objects, each conforming to: ${PREDICTION_JSON_SCHEMA}
- **'accumulators' Property:** An array of up to 3 distinct accumulator tip objects (e.g., Low, Medium, High risk) created using games from the 'predictions' array. **Only return accumulators for which you can find suitable games. Do not return empty accumulator shells.**
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: JSON_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsedData = parseJsonResponse<FootballPageData>(response.text);
  const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  if(parsedData) {
    setCachedData(cacheKey, parsedData);
  }
  return { data: parsedData, sources };
};

export const fetchAccumulatorStrategySets = async (forceRefresh = false): Promise<{ data: AccumulatorStrategySets | null; sources: GroundingChunk[] }> => {
  const cacheKey = 'accumulatorStrategySets';
  if (!forceRefresh) {
    const cachedData = getCachedData<AccumulatorStrategySets>(cacheKey);
    if (cachedData) return { data: cachedData, sources: [] };
  }

  const { todayString } = getTodayAndTomorrowGH();
  const prompt = `
    Generate a structured JSON object containing four distinct, themed football accumulator tips for matches taking place exclusively **TODAY, ${todayString}**.

    **CRITICAL INSTRUCTIONS (NON-NEGOTIABLE):**
    1.  **MANDATORY STRATEGIES:** You MUST attempt to generate an accumulator for EACH of the following four strategies: "homeFortress", "goalRush", "valueHunter", and "theBanker".
    2.  **REAL-TIME VERIFICATION:** Use Google Search to find real, verifiable football matches scheduled for TODAY and get their accurate odds.
    3.  **STRATEGY-SPECIFIC RATIONALE:** For each accumulator, provide a "rationale" that clearly explains HOW the selected games fit the specific strategy's theme.
    4.  **PER-LEG CONFIDENCE:** For each individual game within an accumulator, you MUST include a numeric 'confidence' score (0-100).
    5.  **NO HALLUCINATION:** Do not invent games or odds. If you cannot find suitable games for a specific strategy, that strategy's value in the JSON should be \`null\`.
    6.  **JSON ONLY:** The entire response must be a single, raw JSON object.

    **JSON OUTPUT STRUCTURE (MUST BE FOLLOWED EXACTLY):**
    {
      "homeFortress": { ...AccumulatorTip object or null ... },
      "goalRush": { ...AccumulatorTip object or null ... },
      "valueHunter": { ...AccumulatorTip object or null ... },
      "theBanker": { ...AccumulatorTip object or null ... }
    }

    **STRATEGY DEFINITIONS:**
    -   **"homeFortress"**: A 3-4 leg accumulator. Focus on strong HOME teams with an extremely high probability of winning. Each leg should have an individual confidence score above 85%. Look for teams with excellent home records. Risk should be Low-Medium. Name it "Home Fortress".
    -   **"goalRush"**: A 3-4 leg accumulator. Focus on matches with a high likelihood of goals. Use markets like "Over 2.5 Goals" or "BTTS (Yes)". Risk is Medium. Name it "Goal Rush".
    -   **"valueHunter"**: A 3-4 leg accumulator. Identify 1-2 games that are undervalued by the market (e.g., a strong team playing away with decent odds). Balance this with safer bets to create a medium-risk, high-value tip. Name it "Value Hunter".
    -   **"theBanker"**: A 4-5 leg accumulator with an extremely high probability of success (target > 85%). Use very safe markets like "Double Chance" for dominant favorites, or "Over 1.5 Goals" in games with guaranteed action. The goal is maximum safety. Name it "The Banker".

    The structure for each AccumulatorTip object must be:
    { "id": "a-unique-v4-uuid", "name": "Strategy Name (e.g., 'Home Fortress')", "successProbability": number, "combinedOdds": number, "riskLevel": "Low"|"Medium"|"High", "rationale": "Strategy-specific explanation", "games": [ { "teamA": "string", "teamB": "string", "prediction": "string", "sport": "Football", "matchDate": "ISO 8601 string", "odds": number, "confidence": number } ] }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: JSON_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsedData = parseJsonResponse<AccumulatorStrategySets>(response.text);
  const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  if (parsedData) {
    setCachedData(cacheKey, parsedData);
  }
  return { data: parsedData, sources };
};

export const fetchScoresForPredictions = async (predictions: MatchPrediction[]): Promise<Record<string, PredictionResult>> => {
    const cacheKey = 'scoresCache';
    const cachedScores = getCachedData<Record<string, PredictionResult>>(cacheKey) || {};

    const predictionsToFetch = predictions.filter(p => cachedScores[p.id] === undefined);

    if (predictionsToFetch.length === 0) {
        const relevantScores: Record<string, PredictionResult> = {};
        for(const p of predictions) {
            if(cachedScores[p.id] !== undefined) {
                relevantScores[p.id] = cachedScores[p.id];
            }
        }
        return relevantScores;
    }

    const matchesToQuery = predictionsToFetch.map(p => ({
        id: p.id,
        teamA: p.teamA,
        teamB: p.teamB,
        matchDate: p.matchDate,
        recommendedBet: p.recommendedBet,
    }));

    const prompt = `For the following list of completed sports matches, use Google Search to find the final score for each one AND determine if the recommended bet was won or lost.

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
1.  **REAL-TIME VERIFICATION IS MANDATORY:** You **MUST** use Google Search to find the official final scores.
2.  **DETERMINE OUTCOME:** Compare the final score to the 'recommendedBet' to determine the outcome.
    - If the bet was correct, 'betOutcome' is "Won".
    - If the bet was incorrect, 'betOutcome' is "Lost".
    - For bets like "Over 2.5 Goals", calculate if the total goals meet the criteria.
3.  **STRICT JSON OUTPUT:** Your entire response must be a valid JSON array. Each object must conform to: \`{ "id": "string", "finalScore": "string", "betOutcome": "Won" | "Lost" }\`.
4.  **SCORE FORMAT:** The 'finalScore' should be a string like "2 - 1", "105 - 98", etc.
5.  **HANDLE MISSING DATA:** If you cannot find a definitive final score OR cannot determine the outcome for a match ID, you **MUST** return that object with 'finalScore' and 'betOutcome' values of \`null\`. Do not omit it.
6.  **NO HALLUCINATION:** Strictly forbidden from inventing scores or outcomes.
7.  **DO NOT RETURN THIS CONVERSATION:** Your entire response MUST be only the raw, valid JSON object.

Here are the matches to analyze:
${JSON.stringify(matchesToQuery, null, 2)}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: JSON_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const parsedData = parseJsonResponse<{ id: string; finalScore: string | null; betOutcome: 'Won' | 'Lost' | null }[]>(response.text);

    const newScores: Record<string, PredictionResult> = {};
    if (parsedData) {
        for (const item of parsedData) {
            newScores[item.id] = { finalScore: item.finalScore, betOutcome: item.betOutcome };
        }
    }
    
    for (const p of predictionsToFetch) {
        if (newScores[p.id] === undefined) {
            newScores[p.id] = { finalScore: null, betOutcome: null };
        }
    }

    const updatedCache = { ...cachedScores, ...newScores };
    setCachedData(cacheKey, updatedCache);

    const relevantScores: Record<string, PredictionResult> = {};
    for (const p of predictions) {
        if (updatedCache[p.id]) {
            relevantScores[p.id] = updatedCache[p.id];
        }
    }
    return relevantScores;
};

export const fetchSingleScore = async (prediction: MatchPrediction): Promise<PredictionResult | null> => {
    const matchToQuery = {
        id: prediction.id,
        teamA: prediction.teamA,
        teamB: prediction.teamB,
        matchDate: prediction.matchDate,
        recommendedBet: prediction.recommendedBet,
    };

    const prompt = `For the following completed sports match, use Google Search to find the final score AND determine if the recommended bet was won or lost.

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
1.  **REAL-TIME VERIFICATION:** You **MUST** use Google Search to find the official final score.
2.  **DETERMINE OUTCOME:** Compare the final score to the 'recommendedBet' to determine the outcome.
    - If the bet was correct, 'betOutcome' is "Won".
    - If the bet was incorrect, 'betOutcome' is "Lost".
    - For bets like "Over 2.5 Goals", calculate if the total goals meet the criteria.
3.  **STRICT JSON OUTPUT:** Your entire response must be a single, valid JSON object conforming to: \`{ "finalScore": "string", "betOutcome": "Won" | "Lost" | null }\`.
4.  **SCORE FORMAT:** The 'finalScore' should be a string like "2 - 1".
5.  **HANDLE MISSING DATA:** If you cannot find a definitive final score OR cannot determine the outcome, you **MUST** return a JSON object with 'finalScore' and 'betOutcome' values of \`null\`.
6.  **NO HALLUCINATION:** Strictly forbidden from inventing scores or outcomes.
7.  **DO NOT RETURN THIS CONVERSATION:** Your entire response MUST be only the raw, valid JSON object.

Here is the match to analyze:
${JSON.stringify(matchToQuery, null, 2)}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: JSON_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const parsedData = parseJsonResponse<PredictionResult>(response.text);
    
    // Update cache for this single item
    if (parsedData) {
        const cacheKey = 'scoresCache';
        const cachedScores = getCachedData<Record<string, PredictionResult>>(cacheKey) || {};
        const updatedCache = { ...cachedScores, [prediction.id]: parsedData };
        setCachedData(cacheKey, updatedCache);
    }
    
    return parsedData;
};

export const fetchResultsForAccumulators = async (accumulators: AccumulatorTip[]): Promise<Record<string, AccumulatorResult>> => {
    const cacheKey = 'accumulatorResultsCache';
    const cachedResults = getCachedData<Record<string, AccumulatorResult>>(cacheKey) || {};

    const accumulatorsToFetch = accumulators.filter(acc => cachedResults[acc.id] === undefined);
    
    if (accumulatorsToFetch.length === 0) {
        const relevantResults: Record<string, AccumulatorResult> = {};
        for(const acc of accumulators) {
            if(cachedResults[acc.id] !== undefined) {
                relevantResults[acc.id] = cachedResults[acc.id];
            }
        }
        return relevantResults;
    }

    const accumulatorsToQuery = accumulatorsToFetch.map(acc => ({
        id: acc.id,
        games: acc.games.map(g => ({
            teamA: g.teamA,
            teamB: g.teamB,
            prediction: g.prediction,
        })),
    }));

    const prompt = `For the following list of accumulators, you must determine the final result for each one.

**CRITICAL INSTRUCTIONS - NON-NEGOTIABLE:**
1.  **FOR EACH ACCUMULATOR:**
    a. **FOR EACH GAME (LEG) IN THE ACCUMULATOR:** Use Google Search to find the final, official score.
    b. **DETERMINE LEG OUTCOME:** Compare the final score to the game's 'prediction' to determine if that leg was "Won" or "Lost".
    c. **DETERMINE FINAL ACCUMULATOR OUTCOME:**
        - If **any** leg in the accumulator was "Lost", the accumulator's 'finalOutcome' is "Lost".
        - If **all** legs were "Won", the 'finalOutcome' is "Won".
        - If any leg's result cannot be determined, the 'finalOutcome' is \`null\`.
2.  **STRICT JSON OUTPUT:** Your entire response must be a valid JSON array of result objects. Each object MUST conform to the schema.
3.  **HANDLE MISSING DATA:** If you cannot find a definitive result for a leg, its 'outcome' **MUST** be \`null\`. If any leg is \`null\`, the accumulator's 'finalOutcome' is also \`null\`. Do not omit any accumulator from the response.
4.  **NO HALLUCINATION:** Strictly forbidden from inventing scores or outcomes.
5.  **DO NOT RETURN THIS CONVERSATION:** Your entire response MUST be only the raw, valid JSON object.

**JSON OUTPUT SCHEMA:**
Your response must be an array, where each object is structured as follows:
\`{
  "id": "string", // The accumulator's ID
  "finalOutcome": "Won" | "Lost" | null,
  "legResults": [
    {
      "teamA": "string",
      "teamB": "string",
      "outcome": "Won" | "Lost" | null
    },
    ...
  ]
}\`

Here are the accumulators to analyze:
${JSON.stringify(accumulatorsToQuery, null, 2)}
`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: JSON_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const parsedData = parseJsonResponse<AccumulatorResult[]>(response.text);

    const newResults: Record<string, AccumulatorResult> = {};
    if (parsedData) {
        for (const item of parsedData) {
            newResults[item.id] = item;
        }
    }

    for (const acc of accumulatorsToFetch) {
        if (newResults[acc.id] === undefined) {
            newResults[acc.id] = { 
                id: acc.id, 
                finalOutcome: null, 
                legResults: acc.games.map(g => ({ teamA: g.teamA, teamB: g.teamB, outcome: null }))
            };
        }
    }

    const updatedCache = { ...cachedResults, ...newResults };
    setCachedData(cacheKey, updatedCache);

    const relevantResults: Record<string, AccumulatorResult> = {};
    for (const acc of accumulators) {
        if (updatedCache[acc.id]) {
            relevantResults[acc.id] = updatedCache[acc.id];
        }
    }
    return relevantResults;
};