import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAccumulatorStrategySets, fetchFootballPageData } from '../services/geminiService';
import { AccumulatorTip, GroundingChunk, FootballPageData, AccumulatorStrategySets } from '../types';
import { useFavorites } from '../contexts/FavoritesContext';
import AccumulatorCard from '../components/AccumulatorCard';
import SourceList from '../components/SourceList';
import AccumulatorCardSkeleton from '../components/AccumulatorCardSkeleton';
import AILoadingState from '../components/AILoadingState';
import { StakeModal } from '../components/StakeModal';
import { ShareModal } from '../components/ShareModal';
import { FortressIcon, GoalRushIcon, UnderdogIcon, BanknotesIcon } from '../components/icons';

const STRATEGY_METADATA: Record<string, { title: string; icon: React.ReactNode; description: string; }> = {
    homeFortress: { 
        title: "Home Fortress", 
        icon: <FortressIcon className="h-6 w-6 text-brand-primary" />,
        description: "A low-to-medium risk accumulator focusing on strong home favorites with a high probability of winning."
    },
    goalRush: { 
        title: "Goal Rush", 
        icon: <GoalRushIcon className="h-6 w-6 text-brand-primary" />,
        description: "A medium-risk slip targeting matches with a high probability of 'Over 2.5 Goals' or 'Both Teams to Score'."
    },
    valueHunter: { 
        title: "Value Hunter", 
        icon: <UnderdogIcon className="h-6 w-6 text-brand-primary" />,
        description: "A medium-risk slip that balances 1-2 undervalued bets with safer legs for high potential value."
    },
    theBanker: { 
        title: "The Banker", 
        icon: <BanknotesIcon className="h-6 w-6 text-brand-primary" />,
        description: "An ultra-low-risk accumulator using the safest markets. Designed for the highest possible probability of winning."
    }
};

const StrategySection: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
    <div className="mb-12">
        <div className="flex items-start gap-4 mb-3">
            <div>{icon}</div>
            <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-brand-text-secondary text-sm mt-1">{description}</p>
            </div>
        </div>
        {children}
    </div>
);


const Accumulator: React.FC = () => {
  const [strategySets, setStrategySets] = useState<AccumulatorStrategySets | null>(null);
  const [fallbackTips, setFallbackTips] = useState<AccumulatorTip[]>([]);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFetchingFallback, setIsFetchingFallback] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { trackedAccumulators, addAccumulator, removeAccumulator } = useFavorites();

  const [isStakeModalOpen, setStakeModalOpen] = useState(false);
  const [itemToFavorite, setItemToFavorite] = useState<AccumulatorTip | null>(null);
  
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [dataToShare, setDataToShare] = useState<Partial<FootballPageData> | null>(null);

  const loadTips = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setFallbackTips([]); // Reset fallbacks on new load

      const { data: strategyData, sources: newSources } = await fetchAccumulatorStrategySets(forceRefresh);
      setStrategySets(strategyData);
      setSources(newSources);

      const hasPrimaryTips = strategyData && Object.values(strategyData).some(tip => tip !== null);

      if (!hasPrimaryTips) {
        setIsFetchingFallback(true);
        try {
          const { data: fallbackData, sources: fallbackSources } = await fetchFootballPageData(forceRefresh);
          if (fallbackData?.accumulators && fallbackData.accumulators.length > 0) {
            setFallbackTips(fallbackData.accumulators);
            setSources(prev => [...prev, ...fallbackSources]);
          }
        } catch (fallbackError) {
          console.error("Failed to fetch fallback tips:", fallbackError);
        } finally {
          setIsFetchingFallback(false);
        }
      }
    } catch (err) {
      setError('Failed to fetch accumulator tips. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTips(false);
  }, [loadTips]);

  const allPrimaryTips = useMemo(() => {
    if (!strategySets) return [];
    return Object.values(strategySets).filter((tip): tip is AccumulatorTip => tip !== null);
  }, [strategySets]);

  const handleToggleTrack = (tipId: string) => {
    const isTracked = trackedAccumulators.some(a => a.id === tipId);
    if (isTracked) {
        if (window.confirm("Are you sure you want to untrack this accumulator? It will be removed from your dashboard.")) {
            removeAccumulator(tipId);
        }
    } else {
        const allAvailableTips = [...allPrimaryTips, ...fallbackTips];
        const tipToFavorite = allAvailableTips.find(t => t.id === tipId);
        if (tipToFavorite) {
            setItemToFavorite(tipToFavorite);
            setStakeModalOpen(true);
        }
    }
  };

  const handleStakeSubmit = (stake: number) => {
    if (itemToFavorite && stake > 0) {
      addAccumulator(itemToFavorite, stake);
    }
    setItemToFavorite(null);
    setStakeModalOpen(false);
  };
  
  const handleShareClick = () => {
    let tipsToShare: AccumulatorTip[] = [];
    if (allPrimaryTips.length > 0) {
        tipsToShare = allPrimaryTips;
    } else if (fallbackTips.length > 0) {
        tipsToShare = fallbackTips;
    }
    
    if (tipsToShare.length > 0) {
        setDataToShare({ accumulators: tipsToShare });
        setShareModalOpen(true);
    }
  };

  const renderFallbackAccumulators = () => (
    <div>
        <h2 className="text-2xl font-bold text-white mb-3">Today's Top Accumulators</h2>
        <p className="text-brand-text-secondary mb-6">The AI couldn't build its standard themed strategies for today, but found these opportunities instead.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {fallbackTips.map(tip => (
                <AccumulatorCard
                    key={tip.id}
                    tip={tip}
                    onToggleTrack={() => handleToggleTrack(tip.id)}
                    isTracked={trackedAccumulators.some(a => a.id === tip.id)}
                    virtualStake={trackedAccumulators.find(a => a.id === tip.id)?.virtualStake}
                />
            ))}
        </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <AILoadingState messages={['Searching for today\'s best tips...', 'Analyzing odds with Google Search...', 'Building accumulator strategies...']} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, index) => <AccumulatorCardSkeleton key={index} />)}
          </div>
        </>
      );
    }

    if (error) {
      return <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>;
    }
    
    if (allPrimaryTips.length > 0) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(strategySets!).map(([key, tip]) => {
                    const metadata = STRATEGY_METADATA[key];
                    if (!metadata) return null;

                    return (
                        <StrategySection key={key} title={metadata.title} description={metadata.description} icon={metadata.icon}>
                            {tip ? (
                                <AccumulatorCard
                                    tip={tip}
                                    onToggleTrack={() => handleToggleTrack(tip.id)}
                                    isTracked={trackedAccumulators.some(a => a.id === tip.id)}
                                    virtualStake={trackedAccumulators.find(a => a.id === tip.id)?.virtualStake}
                                />
                            ) : (
                                <div className="text-center p-6 bg-brand-secondary/30 rounded-lg border-2 border-dashed border-brand-secondary">
                                    <p className="text-brand-text-secondary">AI could not find suitable matches for this strategy today.</p>
                                </div>
                            )}
                        </StrategySection>
                    );
                })}
            </div>
        );
    }
    
    if (isFetchingFallback) {
        return <AILoadingState messages={['No themed tips found for today...', 'Searching for other accumulator opportunities...', 'This may take a moment...']} />;
    }

    if (fallbackTips.length > 0) {
        return renderFallbackAccumulators();
    }

    // Final empty state if both fail
    return (
        <div className="text-center py-16 px-6 bg-brand-surface rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-white">No Accumulator Tips Found</h3>
          <p className="mt-1 text-sm text-brand-text-secondary max-w-md mx-auto">
            The AI analyzed today's games for both themed strategies and general accumulators but could not find any high-value tips.
          </p>
        </div>
    );
  };

  const hasAnyTips = allPrimaryTips.length > 0 || fallbackTips.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-brand-secondary">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Accumulator Strategies</h1>
          <p className="text-brand-text-secondary mb-4 sm:mb-0">Themed accumulator sets for today's games, generated by our advanced AI.</p>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={() => loadTips(true)}
              disabled={loading || isFetchingFallback}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-brand-primary text-white hover:bg-brand-primary-hover disabled:bg-brand-secondary disabled:cursor-not-allowed"
              aria-label="Refresh accumulator tips"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading || isFetchingFallback ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a8 8 0 0113.142 5.5M20 20a8 8 0 00-13.142-5.5" />
              </svg>
              {loading || isFetchingFallback ? 'Refreshing...' : 'Refresh Tips'}
            </button>
            <button
                onClick={handleShareClick}
                disabled={loading || !hasAnyTips}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-brand-secondary disabled:cursor-not-allowed"
                aria-label="Share Accumulator Tips to Telegram"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.789 0l-2 4a1 1 0 00.894 1.447h4a1 1 0 00.894-1.447l-2-4zM10 8a1 1 0 011 1v2.586l2.293 2.293a1 1 0 11-1.414 1.414L10 13.414V9a1 1 0 01-1-1z" /><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm2 0a6 6 0 1012 0 6 6 0 00-12 0z" /></svg>
                Share All
            </button>
        </div>
      </div>
      
      {!loading && sources.length > 0 && <SourceList sources={sources} />}
      
      {renderContent()}

      <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onSubmit={handleStakeSubmit}
        itemName={itemToFavorite?.name}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        data={dataToShare}
        title="Today's AI Accumulator Strategies"
      />
    </div>
  );
};

export default Accumulator;