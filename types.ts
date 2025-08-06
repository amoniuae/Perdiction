// Utility types for better type safety
export type NonEmptyArray<T> = [T, ...T[]];
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Validation schemas using branded types for better type safety
export type PositiveNumber = number & { readonly __brand: 'PositiveNumber' };
export type ValidDateString = string & { readonly __brand: 'ValidDateString' };
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' };

// Type guards for runtime validation
export const isPositiveNumber = (value: number): value is PositiveNumber => {
  return typeof value === 'number' && value > 0 && isFinite(value);
};

export const isValidDateString = (value: string): value is ValidDateString => {
  return typeof value === 'string' && !isNaN(new Date(value).getTime());
};

export const isNonEmptyString = (value: string): value is NonEmptyString => {
  return typeof value === 'string' && value.trim().length > 0;
};

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

// Enhanced interfaces with better type safety
export interface MatchPrediction {
  id: NonEmptyString;
  teamA: NonEmptyString;
  teamB: NonEmptyString;
  matchDate: ValidDateString;
  sport: Sport;
  formA?: string;
  formB?: string;
  h2h?: string;
  keyStats?: string;
  stadium?: string;
  city?: string;
  aiPrediction: NonEmptyString;
  aiConfidence: PositiveNumber;
  learningPrediction: NonEmptyString;
  learningConfidence: PositiveNumber;
  aiRationale?: string;
  recommendedBet: NonEmptyString;
  odds: PositiveNumber;
  league?: string;
  betBuilder?: AccumulatorTip; // New field for single-game multi-leg bets
}

export interface FavoritePrediction extends MatchPrediction {
  virtualStake: PositiveNumber;
}

export interface AccumulatorGame {
  teamA: NonEmptyString;
  teamB: NonEmptyString;
  prediction: NonEmptyString;
  sport: Sport;
  matchDate: ValidDateString;
  odds: PositiveNumber;
  rationale?: string;
  confidence?: PositiveNumber;
}

export interface AccumulatorTip {
  id: NonEmptyString;
  name: NonEmptyString;
  successProbability: PositiveNumber;
  combinedOdds: PositiveNumber;
  riskLevel: 'Low' | 'Medium' | 'High';
  rationale?: string;
  games: NonEmptyArray<AccumulatorGame>;
  strategy_id?: string;
}

export interface FavoriteAccumulator extends AccumulatorTip {
  virtualStake: PositiveNumber;
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