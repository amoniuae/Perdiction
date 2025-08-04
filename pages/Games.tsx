import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { fetchSportPredictions } from '../services/geminiService';
import { MatchPrediction, Sport, GroundingChunk, AccumulatorTip, FootballPageData, FavoritePrediction } from '../types';
import { SUPPORTED_SPORTS } from '../constants';
import MatchPredictionCard from '../components/MatchPredictionCard';
import AILoadingState from '../components/AILoadingState';
import { SportIcon } from '../components/SportIcon';
import SourceList from '../components/SourceList';
import { isTodayGH, isTomorrowGH } from '../utils/dateUtils';
import { StakeModal } from '../components/StakeModal';
import { addFavoritePrediction, removeFavoritePrediction, isFavoritePrediction, getFavoritePredictions } from '../utils/favorites';
import { ShareModal } from '../components/ShareModal';

const Games: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState<Sport>(Sport.Football);
  const [todayPredictions, setTodayPredictions] = useState<MatchPrediction[]>([]);
  const [tomorrowPredictions, setTomorrowPredictions] = useState<MatchPrediction[]>([]);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isStakeModalOpen, setStakeModalOpen] = useState(false);
  const [itemToFavorite, setItemToFavorite] = useState<MatchPrediction | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const [trackedPredictions, setTrackedPredictions] = useState<FavoritePrediction[]>([]);

  // Share Modal State
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [dataToShare, setDataToShare] = useState<Partial<FootballPageData> | null>(null);

  const loadPredictions = useCallback(async (sport: Sport, forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setTodayPredictions([]);
      setTomorrowPredictions([]);
      setSources([]);
      const { predictions: data, sources: newSources } = await fetchSportPredictions(sport, forceRefresh);
      
      const todayGames = data.filter(p => isTodayGH(new Date(p.matchDate)));
      const tomorrowGames = data.filter(p => isTomorrowGH(new Date(p.matchDate)));
      
      setTodayPredictions(todayGames);
      setTomorrowPredictions(tomorrowGames);
      setSources(newSources);
    } catch (err) {
      setError(`Failed to fetch ${sport} predictions. Please try again later.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    setTrackedPredictions(getFavoritePredictions());
  }, [forceUpdate]);

  useEffect(() => {
    loadPredictions(selectedSport);
  }, [selectedSport, loadPredictions]);

  const handleToggleTrack = (itemId: string) => {
    if (isFavoritePrediction(itemId)) {
       if (window.confirm("Are you sure you want to untrack this? It will be removed from your dashboard.")) {
        removeFavoritePrediction(itemId);
        setForceUpdate(f => f + 1);
      }
    } else {
      const allPredictions = [...todayPredictions, ...tomorrowPredictions];
      const prediction = allPredictions.find(p => p.id === itemId);
      if (prediction) {
        setItemToFavorite(prediction);
        setStakeModalOpen(true);
      }
    }
  };

  const handleStakeSubmit = (stake: number) => {
    if (itemToFavorite && stake > 0) {
      addFavoritePrediction(itemToFavorite, stake);
    }
    setItemToFavorite(null);
    setStakeModalOpen(false);
    setForceUpdate(f => f + 1);
  };
  
  const getItemNameForModal = () => {
    if (!itemToFavorite) return undefined;
    return `${itemToFavorite.teamA} vs ${itemToFavorite.teamB}`;
  };
  
  const handleShareClick = () => {
    setDataToShare({ predictions: todayPredictions });
    setShareModalOpen(true);
  };

  const renderPredictions = (title: string, games: MatchPrediction[]) => (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-4 pb-2 border-b-2 border-brand-primary">{title}</h2>
      {games.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {games.map((match) => {
            const trackedData = trackedPredictions.find(p => p.id === match.id);
            return (
                <ReactRouterDOM.Link key={match.id} to="/match-detail" state={{ match }} className="no-underline">
                    <MatchPredictionCard 
                        match={match} 
                        onToggleTrack={handleToggleTrack}
                        isTracked={!!trackedData}
                        virtualStake={trackedData?.virtualStake}
                    />
                </ReactRouterDOM.Link>
            )
          })}
        </div>
      ) : (
        <p className="text-brand-text-secondary">No matches found for this day.</p>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Multi-Sport AI Predictions</h1>
      <p className="text-brand-text-secondary mb-6">Select a sport to see the latest AI-powered predictions for today and tomorrow.</p>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-brand-secondary pb-4">
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_SPORTS.map(sport => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedSport === sport
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-surface text-brand-text-secondary hover:bg-brand-secondary hover:text-white'
              }`}
            >
              <SportIcon sport={sport} className="h-5 w-5" />
              {sport}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={() => loadPredictions(selectedSport, true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-brand-surface text-brand-text-secondary hover:bg-brand-secondary hover:text-white disabled:bg-brand-secondary disabled:cursor-not-allowed"
                aria-label="Refresh predictions"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a8 8 0 0113.142 5.5M20 20a8 8 0 00-13.142-5.5" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
                onClick={handleShareClick}
                disabled={loading || todayPredictions.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-brand-secondary disabled:cursor-not-allowed"
                aria-label="Share Today's Picks to Telegram"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.789 0l-2 4a1 1 0 00.894 1.447h4a1 1 0 00.894-1.447l-2-4zM10 8a1 1 0 011 1v2.586l2.293 2.293a1 1 0 11-1.414 1.414L10 13.414V9a1 1 0 01-1-1z" /><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm2 0a6 6 0 1012 0 6 6 0 00-12 0z" /></svg>
                Share Today's Picks
            </button>
        </div>
      </div>
      
      {loading && <AILoadingState messages={[`Searching for ${selectedSport} games...`, 'Verifying schedules with Google Search...', 'Calculating predictions...']} />}

      {!loading && <SourceList sources={sources} />}

      {error && <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>}

      {!loading && !error && (
        <>
          {renderPredictions("Today's Matches", todayPredictions)}
          {renderPredictions("Tomorrow's Matches", tomorrowPredictions)}
          {todayPredictions.length === 0 && tomorrowPredictions.length === 0 && (
            <p className="text-center col-span-full">No predictions available for {selectedSport} at the moment.</p>
          )}
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
        title={`Today's AI ${selectedSport} Picks`}
      />
    </div>
  );
};

export default Games;