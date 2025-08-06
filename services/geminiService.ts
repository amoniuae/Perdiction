import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { getSessionUserId } from '../utils/session';
import { FavoritePrediction, FavoriteAccumulator, MatchPrediction, AccumulatorTip, AIStrategy } from '../types';

// Error types for better error handling
type FavoritesError = 
  | 'DATABASE_TABLES_MISSING'
  | 'AUTHENTICATION_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'
interface FavoritesContextType {
  trackedPredictions: FavoritePrediction[];
  trackedAccumulators: FavoriteAccumulator[];
  aiStrategies: AIStrategy[];
  isLoading: boolean;
  error: string | null;
  addPrediction: (prediction: MatchPrediction, virtualStake: number) => Promise<void>;
  removePrediction: (predictionId: string) => Promise<void>;
  addAccumulator: (accumulator: AccumulatorTip, virtualStake: number, strategyId?: string) => Promise<void>;
  removeAccumulator: (accumulatorId: string) => Promise<void>;
  saveAIStrategy: (strategy: Omit<AIStrategy, 'id' | 'created_at' | 'user_id'>) => Promise<AIStrategy | null>;
// Secure API key handling with proper error messaging
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is required. Please set VITE_GEMINI_API_KEY in your environment variables."
    );
  }
  
  if (apiKey === 'your-api-key-here' || apiKey.length < 10) {
    throw new Error(
      "Invalid GEMINI_API_KEY detected. Please provide a valid API key."
    );
  }
  
  return apiKey;
};
  updateAIStrategyOutcome: (strategyId: string, outcome: 'Won' | 'Lost', pnl: number) => Promise<void>;

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackedPredictions, setTrackedPredictions] = useState<FavoritePrediction[]>([]);
  const [trackedAccumulators, setTrackedAccumulators] = useState<FavoriteAccumulator[]>([]);
  const [aiStrategies, setAiStrategies] = useState<AIStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = getSessionUserId();
  
  const clearError = () => setError(null);

  const handleSupabaseError = (error: any, context: string) => {
    console.error(`Supabase error while ${context}:`, JSON.stringify(error, null, 2));
    const errorMessage = (error.message || '').toLowerCase();
    
    if (errorMessage.includes('api key')) {
      setError('Authentication with the database failed. Please ensure the Supabase API key in `config.ts` is correct.');
    } else if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      setError('DATABASE_TABLES_MISSING');
    }
    else {
      setError(`A database error occurred while ${context}. Please check your connection and try again.`);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [predictionsRes, accumulatorsRes, strategiesRes] = await Promise.all([
        supabase
          .from('tracked_predictions')
          .select('prediction_id, prediction_data, virtual_stake')
          .eq('user_id', userId)
          .gte('created_at', THIRTY_DAYS_AGO),
        supabase
          .from('tracked_accumulators')
          .select('accumulator_id, accumulator_data, virtual_stake')
          .eq('user_id', userId)
          .gte('created_at', THIRTY_DAYS_AGO),
        supabase
            .from('ai_strategies')
            .select('*')
            .eq('user_id', userId)
      ]);

      if (predictionsRes.error) return handleSupabaseError(predictionsRes.error, 'loading tracked predictions');
      if (accumulatorsRes.error) return handleSupabaseError(accumulatorsRes.error, 'loading tracked accumulators');
      if (strategiesRes.error) return handleSupabaseError(strategiesRes.error, 'loading AI strategies');

      const preds = predictionsRes.data.map((item: any) => ({
        ...(item.prediction_data as MatchPrediction),
        virtualStake: item.virtual_stake,
      }));

      const accs = accumulatorsRes.data.map((item: any) => ({
        ...(item.accumulator_data as AccumulatorTip),
        virtualStake: item.virtual_stake,
      }));

      setTrackedPredictions(preds.sort((a,b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()));
      setTrackedAccumulators(accs.sort((a,b) => {
        const gamesA = a.games || [];
        const gamesB = b.games || [];
        const lastGameDateA = new Date(gamesA.reduce((max, g) => g.matchDate > max ? g.matchDate : max, '1970-01-01'));
        const lastGameDateB = new Date(gamesB.reduce((max, g) => g.matchDate > max ? g.matchDate : max, '1970-01-01'));
        return lastGameDateA.getTime() - lastGameDateB.getTime();
      }));
      setAiStrategies((strategiesRes.data as AIStrategy[]).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

    } catch (err: any) {
      handleSupabaseError(err, 'connecting to the database');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addPrediction = async (prediction: MatchPrediction, virtualStake: number) => {
    clearError();
    const newFavorite: FavoritePrediction = { ...prediction, virtualStake };
    const { error } = await supabase.from('tracked_predictions').upsert({
      user_id: userId,
      prediction_id: prediction.id,
      prediction_data: prediction,
      virtual_stake: virtualStake,
    }, {
      onConflict: 'user_id,prediction_id',
    });

    if (error) {
      handleSupabaseError(error, 'tracking the prediction');
    } else {
      setTrackedPredictions(prev => {
        const otherPredictions = prev.filter(p => p.id !== prediction.id);
        return [...otherPredictions, newFavorite].sort((a,b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      });
    }
  };

  const removePrediction = async (predictionId: string) => {
    clearError();
    const { error } = await supabase.from('tracked_predictions').delete()
      .match({ user_id: userId, prediction_id: predictionId });
    
    if (error) {
      handleSupabaseError(error, 'untracking the prediction');
    } else {
      setTrackedPredictions(prev => prev.filter(p => p.id !== predictionId));
    }
  };
  
  const addAccumulator = async (accumulator: AccumulatorTip, virtualStake: number, strategyId?: string) => {
    clearError();
    const newFavorite: FavoriteAccumulator = { ...accumulator, virtualStake };
    const { error } = await supabase.from('tracked_accumulators').upsert({
        user_id: userId,
        accumulator_id: accumulator.id,
        accumulator_data: { ...accumulator, strategy_id: strategyId },
        virtual_stake: virtualStake
    }, {
        onConflict: 'user_id,accumulator_id',
    });

    if (error) {
        handleSupabaseError(error, 'tracking the accumulator');
    } else {
        setTrackedAccumulators(prev => {
            const otherAccumulators = prev.filter(a => a.id !== accumulator.id);
            const sorted = [...otherAccumulators, newFavorite].sort((a,b) => {
                const gamesA = a.games || [];
                const gamesB = b.games || [];
                const lastGameDateA = new Date(gamesA.reduce((max, g) => g.matchDate > max ? g.matchDate : max, '1970-01-01'));
                const lastGameDateB = new Date(gamesB.reduce((max, g) => g.matchDate > max ? g.matchDate : max, '1970-01-01'));
                return lastGameDateA.getTime() - lastGameDateB.getTime();
            });
            return sorted;
        });
    }
  };

  const removeAccumulator = async (accumulatorId: string) => {
      clearError();
      const { error } = await supabase.from('tracked_accumulators').delete()
          .match({ user_id: userId, accumulator_id: accumulatorId });
      if (error) {
          handleSupabaseError(error, 'untracking the accumulator');
      } else {
          setTrackedAccumulators(prev => prev.filter(a => a.id !== accumulatorId));
      }
  };

  const saveAIStrategy = async (strategy: Omit<AIStrategy, 'id' | 'created_at' | 'user_id'>): Promise<AIStrategy | null> => {
      clearError();
      const { data, error } = await supabase
        .from('ai_strategies')
        .insert({ ...strategy, user_id: userId })
        .select()
        .single();
      
      if (error) {
          handleSupabaseError(error, 'saving AI strategy');
          return null;
      } else {
          setAiStrategies(prev => [data as AIStrategy, ...prev]);
          return data as AIStrategy;
      }
  };

  const deleteAIStrategy = async (strategyId: string) => {
      clearError();
      const { error } = await supabase.from('ai_strategies').delete().match({ id: strategyId, user_id: userId });
      if (error) {
          handleSupabaseError(error, 'deleting AI strategy');
      } else {
          setAiStrategies(prev => prev.filter(s => s.id !== strategyId));
      }
  };

  const updateAIStrategy = async (strategyId: string, updates: Partial<AIStrategy>) => {
      clearError();
      const { data, error } = await supabase
        .from('ai_strategies')
        .update(updates)
        .match({ id: strategyId, user_id: userId })
        .select()
        .single();

      if (error) {
          handleSupabaseError(error, 'updating AI strategy');
      } else {
          setAiStrategies(prev => prev.map(s => s.id === strategyId ? data as AIStrategy : s));
      }
  };
  
  const updateAIStrategyOutcome = async (strategyId: string, outcome: 'Won' | 'Lost', pnl: number) => {
    clearError();
    const strategy = aiStrategies.find(s => s.id === strategyId);
    if (!strategy) return;

    const updates = {
      outcome,
      pnl: strategy.pnl + pnl,
      wins: strategy.wins + (outcome === 'Won' ? 1 : 0),
      losses: strategy.losses + (outcome === 'Lost' ? 1 : 0),
    };

    await updateAIStrategy(strategyId, updates);
  };

  const clearAllTrackedBets = async () => {
      clearError();
      const [predError, accError] = await Promise.all([
        supabase.from('tracked_predictions').delete().eq('user_id', userId),
        supabase.from('tracked_accumulators').delete().eq('user_id', userId)
      ]);

      if (predError.error) return handleSupabaseError(predError.error, 'clearing all predictions');
      if (accError.error) return handleSupabaseError(accError.error, 'clearing all accumulators');
      
      setTrackedPredictions([]);
      setTrackedAccumulators([]);
export const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const value = {
    trackedPredictions,
    trackedAccumulators,
// Centralized cache configuration
    isLoading,
    error,
    addPrediction,
    removePrediction,
    addAccumulator,
    removeAccumulator,
    saveAIStrategy,
    deleteAIStrategy,
    updateAIStrategy,
    updateAIStrategyOutcome,
    clearAllTrackedBets,
// API configuration constants
const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 30000,
  MAX_PREDICTIONS_PER_REQUEST: 10,
  MAX_ACCUMULATORS_PER_REQUEST: 3
} as const;

    clearError,
const handleApiError = (error: unknown, context: string, additionalInfo?: Record<string, any>): never => {

  
  if (additionalInfo) {
    console.error('Additional context:', additionalInfo);
  }
  
  // Provide more specific error messages based on error type
  if (error instanceof Error) {
    if (error.message.includes('API key')) {
      throw new Error(`Authentication failed: Invalid API key. Context: ${context}`);
    }
    if (error.message.includes('quota')) {
      throw new Error(`API quota exceeded. Please try again later. Context: ${context}`);
    }
  maxRetries: number = API_CONFIG.MAX_RETRIES,
  delay: number = API_CONFIG.RETRY_DELAY,
  context?: string
    }
  }
  
  throw new Error(`AI service error in ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
};

        handleApiError(error, context || 'retry operation', { attempt, maxRetries });
  const context = useContext(FavoritesContext);
      
      console.warn(`Attempt ${attempt}/${maxRetries} failed, retrying in ${delay * attempt}ms...`);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

// Input validation utilities
const validateSport = (sport: Sport): void => {
  const validSports = Object.values(Sport);
  if (!validSports.includes(sport)) {
    throw new Error(`Invalid sport: ${sport}. Valid options: ${validSports.join(', ')}`);
  }
};

const validateDateRange = (startDate: string, endDate: string): void => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format provided');
  }
  
  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }
};