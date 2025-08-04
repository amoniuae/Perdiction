import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { fetchFootballPageData } from '../services/geminiService';
import { MatchPrediction, GroundingChunk, AccumulatorTip, FootballPageData } from '../types';
import MatchPredictionCard from '../components/MatchPredictionCard';
import AccumulatorCard from '../components/AccumulatorCard';
import AILoadingState from '../components/AILoadingState';
import SourceList from '../components/SourceList';
import { isTodayGH, isTomorrowGH } from '../utils/dateUtils';
import { StakeModal } from '../components/StakeModal';
import { useFavorites } from '../contexts/FavoritesContext';
import { ShareModal } from '../components/ShareModal';
import { SparklesIcon } from '../components/icons';


export default function Football(): React.ReactElement {
  const [todayPredictions, setTodayPredictions] = useState<MatchPrediction[]>([]);
  const [tomorrowPredictions, setTomorrowPredictions] = useState<MatchPrediction[]>([]);
  const [accumulators, setAccumulators] = useState<AccumulatorTip[]>([]);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      const { data, sources: newSources } = await fetchFootballPageData(forceRefresh);

      if (data) {
        const allPredictions = data.predictions || [];
        const todayGames = allPredictions.filter(p => isTodayGH(new Date(p.matchDate)));
        const tomorrowGames = allPredictions.filter(p => isTomorrowGH(new Date(p.matchDate)));
        
        setTodayPredictions(todayGames);
        setTomorrowPredictions(tomorrowGames);
        setAccumulators(data.accumulators || []);
        setSources(newSources);
      } else {
         setError('Failed to fetch football data. The AI returned an unexpected response.');
      }

    } catch (err) {
      setError('An error occurred while fetching football data. Please try again later.');
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
    const isTracked = itemType === 'prediction' 
      ? trackedPredictions.some(p => p.id === itemId)
      : trackedAccumulators.some(a => a.id === itemId);

    if (isTracked) {
      if (window.confirm("Are you sure you want to untrack this? It will be removed from your dashboard.")) {
        if (itemType === 'prediction') removePrediction(itemId);
        if (itemType === 'accumulator') removeAccumulator(itemId);
      }
    } else {
      let itemToTrack: MatchPrediction | AccumulatorTip | undefined;
      if (itemType === 'prediction') {
        itemToTrack = [...todayPredictions, ...tomorrowPredictions].find(p => p.id === itemId);
      } else {
        const allTips = [...accumulators];
        todayPredictions.forEach(p => { if (p.betBuilder) allTips.push(p.betBuilder) });
        tomorrowPredictions.forEach(p => { if (p.betBuilder) allTips.push(p.betBuilder) });
        itemToTrack = allTips.find(a => a.id === itemId);
      }
      
      if (itemToTrack) {
        setItemToFavorite(itemToTrack);
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
      ? `${itemToFavorite.teamA} vs ${itemToFavorite.teamB} (${itemToFavorite.recommendedBet})`
      : itemToFavorite.name;
  };
  
  const handleShareClick = () => {
    const data: Partial<FootballPageData> = {};
    if (todayPredictions.length > 0) data.predictions = todayPredictions;
    if (accumulators.length > 0) data.accumulators = accumulators;
    setDataToShare(data);
    setShareModalOpen(true);
  };

  const renderPredictions = (title: string, games: MatchPrediction[], shareable = false) => (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-brand-primary">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {shareable && (
             <button
                onClick={handleShareClick}
                disabled={loading || (todayPredictions.length === 0 && accumulators.length === 0)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-brand-secondary disabled:cursor-not-allowed"
                aria-label="Share Today's Picks to Telegram"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.789 0l-2 4a1 1 0 00.894 1.447h4a1 1 0 00.894-1.447l-2-4zM10 8a1 1 0 011 1v2.586l2.293 2.293a1 1 0 11-1.414 1.414L10 13.414V9a1 1 0 01-1-1z" /><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm2 0a6 6 0 1012 0 6 6 0 00-12 0z" /></svg>
                Share Today's Picks
            </button>
          )}
      </div>
      {games.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {games.map((match) => {
            const isPredTracked = trackedPredictions.some(p => p.id === match.id);
            const isAccaTracked = match.betBuilder ? trackedAccumulators.some(a => a.id === match.betBuilder!.id) : false;
            return (
                 <ReactRouterDOM.Link key={match.id} to="/match-detail" state={{ match }} className="no-underline">
                    <MatchPredictionCard 
                        match={match} 
                        onToggleTrack={handleToggleTrack}
                        isTracked={isPredTracked}
                        isAccumulatorTracked={isAccaTracked}
                        virtualStake={trackedPredictions.find(p => p.id === match.id)?.virtualStake}
                        accumulatorStake={match.betBuilder ? trackedAccumulators.find(a => a.id === match.betBuilder!.id)?.virtualStake : undefined}
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

  const renderAccumulators = () => {
    const validAccumulators = accumulators.filter(tip => tip && tip.games && tip.games.length > 0);

    return (
        <div className="mt-16">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <SparklesIcon className="h-7 w-7 text-brand-primary" />
                AI-Generated Accumulators
            </h2>
            <p className="text-brand-text-secondary mb-8">
                Our AI combines the most promising predictions into strategic, high-value accumulator bets.
            </p>
            {validAccumulators.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {validAccumulators.map((tip) => {
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
                <div className="text-center py-12 px-6 bg-brand-surface rounded-lg border-2 border-dashed border-brand-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.442V18.75a3.375 3.375 0 00-3.375-3.375H12a3.375 3.375 0 00-3.375-3.375v-.308A3.375 3.375 0 006 12.343l-.547-.547a5 5 0 017.072 0z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-white">No Accumulators Available Yet</h3>
                    <p className="mt-1 text-sm text-brand-text-secondary">
                        The AI is analyzing today's games to build the best accumulator tips.
                        <br />
                        If no high-value combinations are found, this section will remain empty.
                    </p>
                </div>
            )}
        </div>
    );
};


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Football Predictions</h1>
          <p className="text-brand-text-secondary mb-4 sm:mb-0">Matches for today and tomorrow, analyzed by our AI using real-time data.</p>
        </div>
        <button
            onClick={() => loadPageData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-brand-primary text-white hover:bg-brand-primary-hover disabled:bg-brand-secondary disabled:cursor-not-allowed"
            aria-label="Refresh football predictions"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a8 8 0 0113.142 5.5M20 20a8 8 0 00-13.142-5.5" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {loading && <AILoadingState messages={['Fetching football match schedules...', 'Using Google Search to verify games...', 'Building predictions & accumulators...']} />}

      {!loading && <SourceList sources={sources} />}
      
      {error && <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>}

      {!loading && !error && (
        <>
          {renderPredictions("Today's Matches", todayPredictions, true)}
          {renderPredictions("Tomorrow's Matches", tomorrowPredictions)}
          {todayPredictions.length === 0 && tomorrowPredictions.length === 0 && (
            <p>No predictions available at the moment.</p>
          )}
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
        title="Today's AI Football Picks"
      />
    </div>
  );
}