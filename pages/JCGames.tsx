
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { fetchJCGamesPageData } from '../services/geminiService';
import { MatchPrediction, GroundingChunk, AccumulatorTip, FootballPageData } from '../types';
import MatchPredictionCard from '../components/MatchPredictionCard';
import AccumulatorCard from '../components/AccumulatorCard';
import AILoadingState from '../components/AILoadingState';
import SourceList from '../components/SourceList';
import { isWithinThisWeekGH } from '../utils/dateUtils';
import { StakeModal } from '../components/StakeModal';
import { useFavorites } from '../contexts/FavoritesContext';
import { ShareModal } from '../components/ShareModal';

type LeagueFilter = 'All' | 'J1' | 'J2' | 'J3' | 'CSL';
const LEAGUE_FILTERS: LeagueFilter[] = ['All', 'J1', 'J2', 'J3', 'CSL'];

export default function JCGames(): React.ReactElement {
  const [predictions, setPredictions] = useState<MatchPrediction[]>([]);
  const [accumulators, setAccumulators] = useState<AccumulatorTip[]>([]);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>('All');

  const { 
      trackedPredictions, 
      trackedAccumulators, 
      addPrediction, 
      removePrediction,
      addAccumulator,
      removeAccumulator
  } = useFavorites();

  const [isStakeModalOpen, setStakeModalOpen] = useState(false);
  const [itemToFavorite, setItemToFavorite] = useState<MatchPrediction | AccumulatorTip | null>(null);

  // Share Modal State
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [dataToShare, setDataToShare] = useState<Partial<FootballPageData> | null>(null);

  const loadPageData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const { data, sources: newSources } = await fetchJCGamesPageData(forceRefresh);

      if (data) {
        const weeklyGames = data.predictions
          .filter(p => isWithinThisWeekGH(new Date(p.matchDate)))
          .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
        
        setPredictions(weeklyGames);
        setAccumulators(data.accumulators || []);
        setSources(newSources);
      } else {
         setError('Failed to fetch JC Games data. The AI returned an unexpected response.');
      }

    } catch (err: any) {
      setError('An error occurred while fetching JC Games data. Please try again later.');
      console.error(err);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPageData]);

  const handleToggleTrack = (itemId: string, itemType: 'prediction' | 'accumulator') => {
    const isPredTracked = trackedPredictions.some(p => p.id === itemId);
    const isAccaTracked = trackedAccumulators.some(a => a.id === itemId);

    if (isPredTracked || isAccaTracked) {
      if (window.confirm("Are you sure you want to untrack this? It will be removed from your dashboard.")) {
        if (itemType === 'prediction') removePrediction(itemId);
        if (itemType === 'accumulator') removeAccumulator(itemId);
      }
    } else {
      const prediction = predictions.find(p => p.id === itemId);
      if (prediction) {
        setItemToFavorite(prediction);
        setStakeModalOpen(true);
        return;
      }

      const accumulator = accumulators.find(a => a.id === itemId);
      if (accumulator) {
        setItemToFavorite(accumulator);
        setStakeModalOpen(true);
      }
    }
  };

  const handleStakeSubmit = (stake: number) => {
    if (itemToFavorite && stake > 0) {
      if ('aiPrediction' in itemToFavorite) { // MatchPrediction
        addPrediction(itemToFavorite, stake);
      } else { // AccumulatorTip
        addAccumulator(itemToFavorite, stake);
      }
    }
    setItemToFavorite(null);
    setStakeModalOpen(false);
  };
  
  const getItemNameForModal = () => {
    if (!itemToFavorite) return undefined;
    return 'aiPrediction' in itemToFavorite
      ? `${itemToFavorite.teamA} vs ${itemToFavorite.teamB}`
      : itemToFavorite.name;
  };

  const filteredPredictions = useMemo(() => {
    if (leagueFilter === 'All') {
        return predictions;
    }
    // Use `includes` to loosely match (e.g., 'J1' matches 'J1 League').
    return predictions.filter(p => p.league?.toUpperCase().includes(leagueFilter));
  }, [predictions, leagueFilter]);
  
  const handleShareClick = () => {
    setDataToShare({ predictions: filteredPredictions, accumulators });
    setShareModalOpen(true);
  };

  const gamesByDay = useMemo(() => {
    const grouped: Record<string, MatchPrediction[]> = {};
    for (const match of filteredPredictions) {
      const matchDateObj = new Date(match.matchDate);
      if (isNaN(matchDateObj.getTime())) {
        console.warn(`Skipping match with invalid date: ${match.id}`, match.matchDate);
        continue; // Skip matches with invalid dates
      }
      // Group by YYYY-MM-DD date string to avoid timezone issues with keys
      const dateKey = matchDateObj.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    }
    return grouped;
  }, [filteredPredictions]);

  const renderPredictions = () => {
    const dayKeys = Object.keys(gamesByDay).sort();

    if (dayKeys.length === 0 && !loading) {
      return (
        <p className="text-brand-text-secondary p-4 bg-brand-surface rounded-md">
          No upcoming matches found
          {leagueFilter !== 'All' ? ` for ${leagueFilter}` : ' for the selected leagues'} 
          in the current week (Monday-Sunday).
        </p>
      );
    }
    
    return dayKeys.map(dateKey => {
      const matchesForDay = gamesByDay[dateKey];
      // Create a date object from the key in UTC to prevent timezone shifts
      const dayDate = new Date(`${dateKey}T12:00:00Z`);

      const dayHeader = new Intl.DateTimeFormat('en-GH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Accra' // Display in Ghana time
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
                    onToggleTrack={() => handleToggleTrack(match.id, 'prediction')} 
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

  const renderAccumulators = () => (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-4 pb-2 border-b-2 border-brand-primary">AI-Generated JC League Accumulators</h2>
      <p className="text-brand-text-secondary mb-6">Strategic accumulators created from the J.League and CSL match predictions above.</p>
      {accumulators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {accumulators.map((tip) => {
            const trackedData = trackedAccumulators.find(a => a.id === tip.id);
            return (
              <AccumulatorCard 
                key={tip.id} 
                tip={tip} 
                onToggleTrack={() => handleToggleTrack(tip.id, 'accumulator')}
                isTracked={!!trackedData}
                virtualStake={trackedData?.virtualStake}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-brand-text-secondary">Could not generate accumulator tips from the current predictions.</p>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Japan & China League Predictions</h1>
          <p className="text-brand-text-secondary mb-4 sm:mb-0">Upcoming J.League (J1, J2, J3) & CSL matches analyzed by our AI.</p>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={() => loadPageData(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-brand-primary text-white hover:bg-brand-primary-hover disabled:bg-brand-secondary disabled:cursor-not-allowed"
                aria-label="Refresh JCgames predictions"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a8 8 0 0113.142 5.5M20 20a8 8 0 00-13.142-5.5" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
                onClick={handleShareClick}
                disabled={loading || (predictions.length === 0 && accumulators.length === 0)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-brand-secondary disabled:cursor-not-allowed"
                aria-label="Share Picks to Telegram"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.789 0l-2 4a1 1 0 00.894 1.447h4a1 1 0 00.894-1.447l-2-4zM10 8a1 1 0 011 1v2.586l2.293 2.293a1 1 0 11-1.414 1.414L10 13.414V9a1 1 0 01-1-1z" /><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm2 0a6 6 0 1012 0 6 6 0 00-12 0z" /></svg>
                Share Picks
            </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-brand-secondary pb-4">
        {LEAGUE_FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => setLeagueFilter(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              leagueFilter === filter
                ? 'bg-brand-primary text-white'
                : 'bg-brand-surface text-brand-text-secondary hover:bg-brand-secondary hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
      
      {loading && <AILoadingState messages={['Fetching J.League & CSL schedules...', 'Verifying games with Google Search...', 'Building predictions & accumulators...']} />}

      {!loading && <SourceList sources={sources} />}
      
      {error && <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>}

      {!loading && !error && (
        <>
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b-2 border-brand-primary">Upcoming Matches This Week (Monday to Sunday)</h2>
            {renderPredictions()}
          </div>
          {renderAccumulators()}
        </>
      )}
       <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onSubmit={handleStakeSubmit}
        itemName={getItemNameForModal()}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        data={dataToShare}
        title="AI Japan & China League Picks"
      />
    </div>
  );
}
