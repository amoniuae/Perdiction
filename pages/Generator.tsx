
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { fetchWeeklyFootballGames } from '../services/geminiService';
import { MatchPrediction, GroundingChunk } from '../types';
import MatchPredictionCard from '../components/MatchPredictionCard';
import AILoadingState from '../components/AILoadingState';
import SourceList from '../components/SourceList';
import { StakeModal } from '../components/StakeModal';
import { useFavorites } from '../contexts/FavoritesContext';

const Generator: React.FC = () => {
  const [predictions, setPredictions] = useState<MatchPrediction[]>([]);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { trackedPredictions, addPrediction, removePrediction } = useFavorites();

  const [isStakeModalOpen, setStakeModalOpen] = useState(false);
  const [itemToFavorite, setItemToFavorite] = useState<MatchPrediction | null>(null);

  const loadPageData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const { predictions: fetchedPredictions, sources: newSources } = await fetchWeeklyFootballGames(forceRefresh);
      setPredictions(fetchedPredictions.sort((a,b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()));
      setSources(newSources);
    } catch (err) {
      setError('An error occurred while generating weekly games. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const handleToggleTrack = (itemId: string) => {
    const isTracked = trackedPredictions.some(p => p.id === itemId);
    if (isTracked) {
      if (window.confirm("Are you sure you want to untrack this bet? It will be removed from your dashboard.")) {
        removePrediction(itemId);
      }
    } else {
      const prediction = predictions.find(p => p.id === itemId);
      if (prediction) {
        setItemToFavorite(prediction);
        setStakeModalOpen(true);
      }
    }
  };

  const handleStakeSubmit = (stake: number) => {
    if (itemToFavorite && stake > 0) {
      addPrediction(itemToFavorite, stake);
    }
    setItemToFavorite(null);
    setStakeModalOpen(false);
  };
  
  const getItemNameForModal = () => {
    if (!itemToFavorite) return undefined;
    return `${itemToFavorite.teamA} vs ${itemToFavorite.teamB}`;
  };

  const gamesByDay = useMemo(() => {
    const grouped: Record<string, MatchPrediction[]> = {};
    for (const match of predictions) {
      const matchDateObj = new Date(match.matchDate);
      if (isNaN(matchDateObj.getTime())) {
        console.warn(`Skipping match with invalid date: ${match.id}`, match.matchDate);
        continue; // Skip matches with invalid dates
      }
      const dateKey = matchDateObj.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    }
    return grouped;
  }, [predictions]);

  const renderPredictions = () => {
    const dayKeys = Object.keys(gamesByDay).sort();

    if (dayKeys.length === 0 && !loading) {
      return (
        <div className="text-center py-16 px-6 bg-brand-surface rounded-lg">
          <h3 className="mt-2 text-lg font-medium text-white">No Games Found</h3>
          <p className="mt-1 text-sm text-brand-text-secondary">
            The AI could not find any major football matches scheduled for the current week (Monday-Sunday).
          </p>
        </div>
      );
    }

    return dayKeys.map(dateKey => {
      const matchesForDay = gamesByDay[dateKey];
      const dayDate = new Date(`${dateKey}T12:00:00Z`); // Use noon to avoid timezone day shifts
      const dayHeader = new Intl.DateTimeFormat('en-GH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Accra'
      }).format(dayDate);

      return (
        <div key={dateKey} className="mb-10">
          <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b border-brand-secondary">{dayHeader}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matchesForDay.map((match) => {
              const trackedData = trackedPredictions.find(p => p.id === match.id);
              return (
                <ReactRouterDOM.Link key={match.id} to="/match-detail" state={{ match }} className="no-underline">
                  <MatchPredictionCard 
                    match={match} 
                    onToggleTrack={() => handleToggleTrack(match.id)} 
                    isTracked={!!trackedData}
                    virtualStake={trackedData?.virtualStake}
                  />
                </ReactRouterDOM.Link>
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Weekly Fixtures Generator</h1>
          <p className="text-brand-text-secondary mb-4 sm:mb-0">A comprehensive list of football matches from major leagues worldwide for the current week (Monday-Sunday).</p>
        </div>
        <button
            onClick={() => loadPageData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-brand-primary text-white hover:bg-brand-primary-hover disabled:bg-brand-secondary disabled:cursor-not-allowed"
            aria-label="Refresh weekly games"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a8 8 0 0113.142 5.5M20 20a8 8 0 00-13.142-5.5" />
            </svg>
            {loading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      {loading && <AILoadingState messages={['Scanning schedules for the week...', 'Analyzing upcoming fixtures from global leagues...', 'Generating game predictions...']} />}
      
      {!loading && <SourceList sources={sources} />}
      
      {error && <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>}
      
      {!loading && !error && (
        <div className="mt-8">
          {renderPredictions()}
        </div>
      )}

      <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onSubmit={handleStakeSubmit}
        itemName={getItemNameForModal()}
      />
    </div>
  );
};

export default Generator;
