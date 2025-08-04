import { MatchPrediction, AccumulatorTip, MatchStatus, FavoritePrediction, FavoriteAccumulator } from '../types';
import { getMatchStatus } from './dateUtils';

const FAVORITE_PREDICTIONS_KEY = 'favoritePredictions';
const FAVORITE_ACCUMULATORS_KEY = 'favoriteAccumulators';
const CLEANUP_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Helper to safely get and parse data from localStorage
const getFromStorage = <T>(key: string): T[] => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return [];
  }
};

// Helper to safely set data in localStorage
const setInStorage = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
};

// --- Match Predictions ---

export const getFavoritePredictions = (): FavoritePrediction[] => {
  const favorites = getFromStorage<FavoritePrediction>(FAVORITE_PREDICTIONS_KEY);
  const now = Date.now();
  
  const recentFavorites = favorites.filter(p => {
    const { status } = getMatchStatus(p.matchDate);
    if (status !== MatchStatus.Finished) {
      return true; // Keep upcoming and live games
    }
    const typicalMatchDurationMs = 2.5 * 60 * 60 * 1000;
    const matchEndTime = new Date(p.matchDate).getTime() + typicalMatchDurationMs;
    return (now - matchEndTime) < CLEANUP_THRESHOLD_MS;
  });

  if(recentFavorites.length < favorites.length) {
    setInStorage(FAVORITE_PREDICTIONS_KEY, recentFavorites);
  }

  return recentFavorites.sort((a,b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
};

export const addFavoritePrediction = (prediction: MatchPrediction, virtualStake: number): void => {
  const favorites = getFavoritePredictions();
  if (!favorites.some(fav => fav.id === prediction.id)) {
    const newFavorite: FavoritePrediction = { ...prediction, virtualStake };
    setInStorage(FAVORITE_PREDICTIONS_KEY, [...favorites, newFavorite]);
  }
};

export const removeFavoritePrediction = (predictionId: string): void => {
  const favorites = getFavoritePredictions();
  setInStorage(FAVORITE_PREDICTIONS_KEY, favorites.filter(fav => fav.id !== predictionId));
};

export const isFavoritePrediction = (predictionId: string): boolean => {
  const favorites = getFavoritePredictions();
  return favorites.some(fav => fav.id === predictionId);
};


// --- Accumulator Tips ---

export const getFavoriteAccumulators = (): FavoriteAccumulator[] => {
  const favorites = getFromStorage<FavoriteAccumulator>(FAVORITE_ACCUMULATORS_KEY);
  const now = Date.now();

  const recentFavorites = favorites.filter(tip => {
    if (!tip.games || tip.games.length === 0) return false;

    const lastGameDate = tip.games.reduce((latest, game) => {
        const gameDate = new Date(game.matchDate);
        return gameDate > latest ? gameDate : latest;
    }, new Date(0));

    const { status } = getMatchStatus(lastGameDate.toISOString());
    if (status !== MatchStatus.Finished) {
      return true;
    }
    
    const typicalMatchDurationMs = 2.5 * 60 * 60 * 1000;
    const matchEndTime = lastGameDate.getTime() + typicalMatchDurationMs;
    return (now - matchEndTime) < CLEANUP_THRESHOLD_MS;
  });

  if (recentFavorites.length < favorites.length) {
    setInStorage(FAVORITE_ACCUMULATORS_KEY, recentFavorites);
  }
  
  return recentFavorites.sort((a,b) => {
      const gamesA = a.games || [];
      const gamesB = b.games || [];
      const lastGameDateA = new Date(gamesA.reduce((max, g) => g.matchDate > max ? g.matchDate : max, '1970-01-01'));
      const lastGameDateB = new Date(gamesB.reduce((max, g) => g.matchDate > max ? g.matchDate : max, '1970-01-01'));
      return lastGameDateA.getTime() - lastGameDateB.getTime();
  });
};

export const addFavoriteAccumulator = (accumulator: AccumulatorTip, virtualStake: number): void => {
  const favorites = getFavoriteAccumulators();
  if (!favorites.some(fav => fav.id === accumulator.id)) {
    const newFavorite: FavoriteAccumulator = { ...accumulator, virtualStake };
    setInStorage(FAVORITE_ACCUMULATORS_KEY, [...favorites, newFavorite]);
  }
};

export const removeFavoriteAccumulator = (accumulatorId: string): void => {
  const favorites = getFavoriteAccumulators();
  setInStorage(FAVORITE_ACCUMULATORS_KEY, favorites.filter(fav => fav.id !== accumulatorId));
};

export const isFavoriteAccumulator = (accumulatorId: string): boolean => {
  const favorites = getFavoriteAccumulators();
  return favorites.some(fav => fav.id === accumulatorId);
};

// --- General ---

export const clearAllTrackedBets = (): void => {
  localStorage.removeItem(FAVORITE_PREDICTIONS_KEY);
  localStorage.removeItem(FAVORITE_ACCUMULATORS_KEY);
}