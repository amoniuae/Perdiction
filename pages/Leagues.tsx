import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { fetchAllLeaguesData } from '../services/geminiService';
import { MatchPrediction, GroundingChunk, AccumulatorTip, FootballPageData } from '../types';
import MatchPredictionCard from '../components/MatchPredictionCard';
import AccumulatorCard from '../components/AccumulatorCard';
import AILoadingState from '../components/AILoadingState';
import SourceList from '../components/SourceList';
import { StakeModal } from '../components/StakeModal';
import { useFavorites } from '../contexts/FavoritesContext';
import { ShareModal } from '../components/ShareModal';

const Leagues: React.FC = () => {
    const [predictions, setPredictions] = useState<MatchPrediction[]>([]);
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
        setPredictions([]);
        setAccumulators([]);
        setSources([]);

        try {
            const { data, sources: newSources } = await fetchAllLeaguesData(forceRefresh);

            if (data) {
                const sortedPredictions = (data.predictions || []).sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
                setPredictions(sortedPredictions);
                setAccumulators(data.accumulators || []);
                setSources(newSources);
            } else {
                setError('Failed to fetch league data. The AI returned an unexpected response.');
            }
        } catch (err) {
            setError('An error occurred while fetching league data. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPageData();
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
    
    const handleShareClick = () => {
        setDataToShare({ predictions, accumulators });
        setShareModalOpen(true);
    };

    const predictionsByLeague = useMemo(() => {
        const grouped: Record<string, MatchPrediction[]> = {};
        for (const match of predictions) {
            const leagueKey = match.league || 'Other Matches';
            if (!grouped[leagueKey]) {
                grouped[leagueKey] = [];
            }
            grouped[leagueKey].push(match);
        }
        return grouped;
    }, [predictions]);

    const renderPredictions = () => {
        const leagueNames = Object.keys(predictionsByLeague).sort();

        if (leagueNames.length === 0) {
            return (
                <div className="text-center py-16 px-6 bg-brand-surface rounded-lg">
                    <h3 className="mt-2 text-lg font-medium text-white">No League Matches Found</h3>
                    <p className="mt-1 text-sm text-brand-text-secondary">
                        The AI could not find any available matches for major leagues. This might be due to the off-season.
                    </p>
                </div>
            );
        }

        return leagueNames.map(leagueName => (
            <div key={leagueName} className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-4 pb-2 border-b-2 border-brand-primary">{leagueName}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {predictionsByLeague[leagueName].map(match => {
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
        ));
    };


    const renderAccumulators = () => (
        <div className="mt-16">
            <h2 className="text-2xl font-bold text-white mb-4 pb-2 border-b-2 border-brand-primary">AI-Generated League Accumulators</h2>
            <p className="text-brand-text-secondary mb-6">Strategic accumulators created from the match predictions above.</p>
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
                <p className="text-brand-text-secondary p-4 bg-brand-surface rounded-md">
                    The AI could not generate any league-wide accumulator tips at this time.
                </p>
            )}
        </div>
    );
    
    const getItemNameForModal = () => {
        if (!itemToFavorite) return undefined;
        return 'aiPrediction' in itemToFavorite 
            ? `${itemToFavorite.teamA} vs ${itemToFavorite.teamB}` 
            : itemToFavorite.name;
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-brand-secondary">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Featured League Predictions</h1>
                    <p className="text-brand-text-secondary mb-4 sm:mb-0">AI analysis for major football leagues and tournaments worldwide.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadPageData(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-brand-primary text-white hover:bg-brand-primary-hover disabled:bg-brand-secondary disabled:cursor-not-allowed"
                        aria-label="Refresh league predictions"
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
            
            {loading && <AILoadingState messages={['Fetching schedules for all major leagues...', 'Verifying games with Google Search...', 'Building predictions & accumulators...']} />}
            
            {!loading && <SourceList sources={sources} />}
            
            {error && <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>}

            {!loading && !error && (
                <>
                    {renderPredictions()}
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
                title="AI Picks for Featured Leagues"
            />
        </div>
    );
};

export default Leagues;