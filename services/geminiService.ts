// Gemini AI Service
// This service handles interactions with Google's Gemini AI API

export interface GeminiResponse {
  text: string;
  error?: string;
}

export class GeminiService {
  private apiKey: string | null = null;

  constructor() {
    // Initialize with API key from environment or local storage
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
  }

  async generateContent(prompt: string): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return {
        text: '',
        error: 'API key not configured. Please set your Gemini API key.'
      };
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return {
          text: data.candidates[0].content.parts[0].text
        };
      } else {
        return {
          text: '',
          error: 'No content generated'
        };
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const geminiService = new GeminiService();

// Import types needed for the function
import { MatchPrediction, GroundingChunk } from '../types';

export async function fetchBetOfTheDay(): Promise<{
  prediction: MatchPrediction | null;
  sources: GroundingChunk[];
}> {
  try {
    const prompt = `
      Analyze today's football matches and provide the single most confident prediction as a "Bet of the Day".
      
      Please respond with a JSON object containing:
      - prediction: A match prediction with teams, league, date, recommended bet, odds, confidence score
      - sources: Array of grounding chunks with web references used for analysis
      
      Focus on matches with high confidence based on team form, head-to-head records, and current statistics.
    `;

    const response = await geminiService.generateContent(prompt);
    
    if (response.error) {
      throw new Error(response.error);
    }

    // Try to parse the AI response as JSON
    try {
      const data = JSON.parse(response.text);
      return {
        prediction: data.prediction || null,
        sources: data.sources || []
      };
    } catch (parseError) {
      // If JSON parsing fails, return null prediction
      console.warn('Failed to parse AI response as JSON:', parseError);
      return {
        prediction: null,
        sources: []
      };
    }
  } catch (error) {
    console.error('Error fetching bet of the day:', error);
    throw error;
  }
}