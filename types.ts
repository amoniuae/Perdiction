export enum Sport {
  Football = "Football",
  Basketball = "Basketball",
  Tennis = "Tennis",
  TableTennis = "Table Tennis",
  IceHockey = "Ice Hockey",
  Volleyball = "Volleyball",
  Handball = "Handball",
  AmericanFootball = "American Football",
}

export enum MatchStatus {
  Upcoming = "Upcoming",
  Live = "Live",
  Finished = "Finished",
}

export interface MatchPrediction {
  id: string;
  teamA: string;
  teamB: string;
  matchDate: string;
  sport: Sport;
  formA?: string;
  formB?: string;
  h2h?: string;
  keyStats?: string;
  stadium?: string;
  city?: string;
  aiPrediction: string;
  aiConfidence: number;
  learningPrediction: string;
  learningConfidence: number;
  aiRationale?: string;
  recommendedBet: string;
  odds: number;
  league?: string;
  betBuilder?: AccumulatorTip; // New field for single-game multi-leg bets
}

export interface FavoritePrediction extends MatchPrediction {
  virtualStake: number;
}

export interface AccumulatorGame {
  teamA: string;
  teamB: string;
  prediction: string;
  sport: Sport;
  matchDate: string;
  odds: number;
  rationale?: string;
  confidence?: number;
}

export interface AccumulatorTip {
  id: string;
  name: string;
  successProbability: number;
  combinedOdds: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  rationale?: string;
  games: AccumulatorGame[];
  strategy_id?: string;
}

export interface FavoriteAccumulator extends AccumulatorTip {
  virtualStake: number;
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface PredictionsWithSources {
  predictions: MatchPrediction[];
  sources: GroundingChunk[];
}

export interface AccumulatorTipsWithSources {
  tips: AccumulatorTip[];
  sources: GroundingChunk[];
}

export interface FootballPageData {
  predictions?: MatchPrediction[];
  accumulators?: AccumulatorTip[];
}

export interface PredictionResult {
    finalScore: string | null;
    betOutcome: 'Won' | 'Lost' | null;
}

export interface IndividualLegResult {
    teamA: string;
    teamB: string;
    outcome: 'Won' | 'Lost' | null;
}

export interface AccumulatorResult {
    id: string;
    finalOutcome: 'Won' | 'Lost' | null;
    legResults: IndividualLegResult[];
}

// --- AI Learning & Strategy Types ---

export interface AIStrategy {
    id: string; // uuid
    created_at: string; // timestamp
    user_id: string;
    name: string;
    parameters: any; // JSONB of the builder state
    tip_id: string | null; // The ID of the last tip generated
    tip_data: AccumulatorTip | null; // The last tip generated
    outcome: 'Won' | 'Lost' | 'Pending' | null;
    pnl: number; // Profit and Loss
    wins: number;
    losses: number;
    is_archived: boolean;
    is_promoted: boolean;
}

export interface SavedStrategy {
    name: string;
    state: any;
}

export interface AIRecommendation {
    strategy: {
        selectedBetTypes: string[];
        customNlp: string;
        numGames: number;
        successProbability: number;
        timeFrame: string;
        aiSelectsMarkets: boolean;
    };
    rationale: string;
}

export interface DailyBriefing {
    marketOpportunity: string;
    performanceHighlight: string;
    strategySuggestion: string;
}

export interface AccumulatorStrategySets {
  homeFortress: AccumulatorTip | null;
  goalRush: AccumulatorTip | null;
  valueHunter: AccumulatorTip | null;
  theBanker: AccumulatorTip | null;
}