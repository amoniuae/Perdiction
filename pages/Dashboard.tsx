import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { FavoritePrediction, FavoriteAccumulator, PredictionResult, AccumulatorResult, MatchStatus, AIStrategy } from '../types';
import { useFavorites } from '../contexts/FavoritesContext';
import { fetchScoresForPredictions, fetchResultsForAccumulators, fetchSingleScore } from '../services/geminiService';
import { getMatchStatus } from '../utils/dateUtils';
import MatchPredictionCard from '../components/MatchPredictionCard';
import AccumulatorCard from '../components/AccumulatorCard';
import PerformanceChart from '../components/PerformanceChart';
import { exportToCsv } from '../utils/exportUtils';
import { Modal } from '../components/Modal';
import BreakdownTabs, { BreakdownData } from '../components/BreakdownTabs';
import Achievements, { Achievement } from '../components/Achievements';
import { ChartPieIcon, CrownIcon, FireIcon, RocketIcon, SparklesIcon, TrophyIcon, ClipboardDocIcon, BanknotesIcon, ChartBarIcon, StarIcon } from '../components/icons';
import Spinner from '../components/Spinner';

type PnlHistory = Record<string, number>;

type DisplayItem = {
    id: string;
    type: 'prediction' | 'accumulator';
    date: Date;
    pnl: number | null;
    status: 'pending' | 'won' | 'lost';
    component: React.ReactNode;
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-brand-surface p-4 rounded-lg shadow-lg flex items-start gap-3">
        <div className="bg-brand-secondary p-2 rounded-lg text-brand-primary">
            {icon}
        </div>
        <div>
            <p className="text-sm text-brand-text-secondary">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const FilterButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isActive ? 'bg-brand-primary text-white font-semibold' : 'bg-brand-secondary text-brand-text-secondary hover:bg-opacity-80'
    }`}
  >
    {label}
  </button>
);

const getItemDate = (item: FavoritePrediction | FavoriteAccumulator): Date => {
    if ('matchDate' in item && item.matchDate) { // It's a FavoritePrediction
        return new Date(item.matchDate);
    }
    if ('games' in item && item.games && item.games.length > 0) { // It's a FavoriteAccumulator
        return item.games.reduce((latest, game) => {
            const gameDate = new Date(game.matchDate);
            return gameDate > latest ? gameDate : latest;
        }, new Date(0));
    }
    return new Date(); // Fallback
};

export const Dashboard: React.FC = () => {
  const { 
      trackedPredictions, 
      trackedAccumulators, 
      isLoading: favoritesLoading,
      error: favoritesError,
      removePrediction, 
      removeAccumulator,
      clearAllTrackedBets,
      updateAIStrategyOutcome, 
  } = useFavorites();
  
  const [predictionResults, setPredictionResults] = useState<Record<string, PredictionResult>>({});
  const [checkingResultId, setCheckingResultId] = useState<string | null>(null);

  const [accumulatorResults, setAccumulatorResults] = useState<Record<string, AccumulatorResult>>({});
  const [isAccumulatorResultsLoading, setIsAccumulatorResultsLoading] = useState<boolean>(false);
  const fetchingAccResultsRef = useRef(false);
  const processedStrategyUpdates = useRef(new Set<string>());
  
  const [pnlHistory, setPnlHistory] = useState<PnlHistory>({});

  const [isClearModalOpen, setClearModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'predictions' | 'accumulators'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc'>('date_desc');

  const isAccumulatorFinished = useCallback((tip: FavoriteAccumulator): boolean => {
    if (!tip.games || tip.games.length === 0) return false;
    const lastGameDate = tip.games.reduce((latest, game) => {
        return new Date(game.matchDate) > new Date(latest) ? game.matchDate : latest;
    }, tip.games[0].matchDate);
    return getMatchStatus(lastGameDate).status === MatchStatus.Finished;
  }, []);

  useEffect(() => {
    if (favoritesLoading || favoritesError) return;

    // Fetch results for predictions that are finished but don't have a result in the state yet
    const predictionsToFetch = trackedPredictions.filter(p => 
        getMatchStatus(p.matchDate).status === MatchStatus.Finished && 
        !predictionResults.hasOwnProperty(p.id)
    );
    if (predictionsToFetch.length > 0) {
        fetchScoresForPredictions(predictionsToFetch).then(fetchedResults => {
            setPredictionResults(prev => ({ ...prev, ...fetchedResults }));
        });
    }

    // Fetch results for accumulators that are finished but don't have a result in the state yet
    const accumulatorsToFetch = trackedAccumulators.filter(acc => 
        isAccumulatorFinished(acc) && 
        !accumulatorResults.hasOwnProperty(acc.id)
    );
    if (accumulatorsToFetch.length > 0 && !fetchingAccResultsRef.current) {
        fetchingAccResultsRef.current = true;
        setIsAccumulatorResultsLoading(true);
        fetchResultsForAccumulators(accumulatorsToFetch)
            .then(fetchedResults => {
                setAccumulatorResults(prev => ({ ...prev, ...fetchedResults }));
            })
            .catch(error => console.error("Failed to fetch accumulator results:", error))
            .finally(() => {
                fetchingAccResultsRef.current = false;
                setIsAccumulatorResultsLoading(false);
            });
    }
  }, [trackedPredictions, trackedAccumulators, isAccumulatorFinished, favoritesLoading, favoritesError, predictionResults, accumulatorResults]);


  const handleCheckResult = useCallback(async (matchId: string) => {
    const match = trackedPredictions.find(p => p.id === matchId);
    if (!match) return;
    
    setCheckingResultId(matchId);
    try {
      const result = await fetchSingleScore(match);
      if (result) {
        setPredictionResults(prev => ({ ...prev, [matchId]: result }));
      }
    } catch (error) {
        console.error(`Failed to fetch single score for match ${matchId}:`, error);
    } finally {
      setCheckingResultId(null);
    }
  }, [trackedPredictions]);

  useEffect(() => {
    const newPnlHistory: PnlHistory = {};

    trackedPredictions.forEach(p => {
        const result = predictionResults[p.id];
        if (result?.betOutcome) {
            newPnlHistory[p.id] = result.betOutcome === 'Won' 
                ? p.virtualStake * (p.odds || 0) - p.virtualStake 
                : -p.virtualStake;
        }
    });

    trackedAccumulators.forEach(acc => {
        const result = accumulatorResults[acc.id];
        if (result?.finalOutcome) {
            const pnl = result.finalOutcome === 'Won' 
                ? acc.virtualStake * (acc.combinedOdds || 0) - acc.virtualStake
                : -acc.virtualStake;
            newPnlHistory[acc.id] = pnl;

            const strategyId = acc.strategy_id;
            const updateKey = `${strategyId}-${acc.id}`;
            
            if (strategyId && !processedStrategyUpdates.current.has(updateKey)) {
                updateAIStrategyOutcome(strategyId, result.finalOutcome, pnl);
                processedStrategyUpdates.current.add(updateKey);
            }
        }
    });
    setPnlHistory(newPnlHistory);
  }, [predictionResults, accumulatorResults, trackedPredictions, trackedAccumulators, updateAIStrategyOutcome]);

  const settledPredictions = useMemo(() => trackedPredictions.filter(p => predictionResults[p.id]?.betOutcome), [trackedPredictions, predictionResults]);
  const settledAccumulators = useMemo(() => trackedAccumulators.filter(acc => accumulatorResults[acc.id]?.finalOutcome), [trackedAccumulators, accumulatorResults]);

  const stats = useMemo(() => {
    const wonCount = settledPredictions.filter(p => predictionResults[p.id].betOutcome === 'Won').length +
                     settledAccumulators.filter(acc => accumulatorResults[acc.id].finalOutcome === 'Won').length;
    
    const settledCount = settledPredictions.length + settledAccumulators.length;
    const totalPnl = Object.values(pnlHistory).reduce((sum, pnl) => sum + pnl, 0);

    const totalStake = [...settledPredictions, ...settledAccumulators].reduce((sum, item) => sum + item.virtualStake, 0);
    const totalBets = trackedPredictions.length + trackedAccumulators.length;

    return {
        totalPnl: totalPnl,
        winRate: settledCount > 0 ? (wonCount / settledCount) * 100 : 0,
        roi: totalStake > 0 ? (totalPnl / totalStake) * 100 : 0,
        settledBets: settledCount,
        totalBets: totalBets,
    };
  }, [settledPredictions, settledAccumulators, predictionResults, accumulatorResults, pnlHistory, trackedPredictions, trackedAccumulators]);

  const breakdownData = useMemo((): BreakdownData => {
    const byBetType = settledPredictions.reduce((acc, p) => {
        const betType = p.recommendedBet;
        if (!acc[betType]) {
            acc[betType] = { name: betType, bets: 0, wins: 0, pnl: 0 };
        }
        acc[betType].bets++;
        const pnl = pnlHistory[p.id] || 0;
        acc[betType].pnl += pnl;
        if (pnl > 0) {
            acc[betType].wins++;
        }
        return acc;
    }, {} as Record<string, { name: string; bets: number; wins: number; pnl: number }>);

    const byLeague = settledPredictions.reduce((acc, p) => {
        const league = p.league || 'Unknown League';
        if (!acc[league]) {
            acc[league] = { name: league, bets: 0, wins: 0, pnl: 0 };
        }
        acc[league].bets++;
        const pnl = pnlHistory[p.id] || 0;
        acc[league].pnl += pnl;
        if (pnl > 0) {
            acc[league].wins++;
        }
        return acc;
    }, {} as Record<string, { name: string; bets: number; wins: number; pnl: number }>);
    
    return {
      byBetType: Object.values(byBetType).sort((a,b) => b.pnl - a.pnl),
      byLeague: Object.values(byLeague).sort((a,b) => b.pnl - a.pnl),
    }
  }, [settledPredictions, pnlHistory]);
  
  const unlockedAchievements = useMemo((): Achievement[] => {
      const achievements: Achievement[] = [];
      const wonBets = settledPredictions.filter(p => predictionResults[p.id]?.betOutcome === 'Won');
      const wonAccas = settledAccumulators.filter(a => accumulatorResults[a.id]?.finalOutcome === 'Won');

      if (wonBets.length + wonAccas.length > 0) achievements.push({ id: 'first_win', title: 'First Win!', description: 'You won your first tracked bet.', icon: <TrophyIcon className="h-6 w-6" /> });
      if (stats.totalBets >= 10 && stats.totalPnl > 0) achievements.push({ id: 'consistent_performer', title: 'Consistent Performer', description: 'Tracked 10+ bets with a positive P/L.', icon: <RocketIcon className="h-6 w-6" /> });
      if (wonBets.some(p => (p.odds || 0) > 5.0) || wonAccas.some(a => (a.combinedOdds || 0) > 5.0)) achievements.push({ id: 'high_roller', title: 'High Roller', description: 'Won a bet with odds over 5.0.', icon: <SparklesIcon className="h-6 w-6" /> });
      if (wonAccas.some(a => (a.games || []).length >= 3)) achievements.push({ id: 'accumulator_king', title: 'Accumulator King', description: 'Won an accumulator with 3+ legs.', icon: <CrownIcon className="h-6 w-6" /> });
      
      const sortedSettled = [...settledPredictions, ...settledAccumulators].sort((a,b) => getItemDate(a).getTime() - getItemDate(b).getTime());
      
      let streak = 0;
      for (const item of sortedSettled) {
          const result = 'recommendedBet' in item ? predictionResults[item.id]?.betOutcome : accumulatorResults[item.id]?.finalOutcome;
          if (result === 'Won') streak++; else streak = 0;
          if (streak >= 3) break;
      }
      if (streak >= 3) achievements.push({ id: 'on_a_roll', title: 'On a Roll', description: 'Achieved a winning streak of 3+ bets.', icon: <FireIcon className="h-6 w-6" /> });

      return achievements;
  }, [settledPredictions, predictionResults, settledAccumulators, accumulatorResults, stats.totalBets, stats.totalPnl]);

  const handleUntrack = (id: string, type: 'prediction' | 'accumulator') => {
    if (window.confirm("Are you sure you want to untrack this bet? This will remove it from your dashboard permanently.")) {
        if (type === 'prediction') {
            removePrediction(id);
        } else {
            removeAccumulator(id);
        }
    }
  };

  const handleClearAll = () => {
      clearAllTrackedBets();
      setPredictionResults({});
      setAccumulatorResults({});
      setPnlHistory({});
      setClearModalOpen(false);
  };

  const displayItems = useMemo(() => {
    const getItemStatus = (outcome?: 'Won' | 'Lost' | null): 'pending' | 'won' | 'lost' => {
        if (outcome === 'Won') return 'won';
        if (outcome === 'Lost') return 'lost';
        return 'pending';
    };

    const mappedPredictions: DisplayItem[] = trackedPredictions.map(p => ({
        id: p.id, type: 'prediction', date: new Date(p.matchDate), pnl: pnlHistory[p.id] ?? null,
        status: getItemStatus(predictionResults[p.id]?.betOutcome),
        component: <MatchPredictionCard key={p.id} match={p} finalScore={predictionResults[p.id]?.finalScore} betOutcome={predictionResults[p.id]?.betOutcome} isResultLoading={checkingResultId === p.id} virtualStake={p.virtualStake} pnl={pnlHistory[p.id]} onCheckResult={handleCheckResult} onToggleTrack={(id, type) => handleUntrack(id, type)} isTracked={true} isAccumulatorTracked={false} isDashboardView={true} />
    }));

    const mappedAccumulators: DisplayItem[] = trackedAccumulators.map(acc => ({
        id: acc.id, type: 'accumulator',
        date: getItemDate(acc),
        pnl: pnlHistory[acc.id] ?? null,
        status: getItemStatus(accumulatorResults[acc.id]?.finalOutcome),
        component: <AccumulatorCard key={acc.id} tip={acc} result={accumulatorResults[acc.id]} isResultLoading={isAccumulatorResultsLoading && isAccumulatorFinished(acc) && !accumulatorResults[acc.id]} virtualStake={acc.virtualStake} pnl={pnlHistory[acc.id]} onToggleTrack={() => handleUntrack(acc.id, 'accumulator')} isTracked={true} isDashboardView={true} />
    }));

    let items = [...mappedPredictions, ...mappedAccumulators];

    if (activeTab === 'predictions') items = items.filter(item => item.type === 'prediction');
    if (activeTab === 'accumulators') items = items.filter(item => item.type === 'accumulator');

    if (statusFilter !== 'all') {
        if (statusFilter === 'settled') {
            items = items.filter(item => item.status === 'won' || item.status === 'lost');
        } else {
            items = items.filter(item => item.status === statusFilter);
        }
    }

    items.sort((a, b) => sortOrder === 'date_asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime());

    return items;
  }, [ trackedPredictions, trackedAccumulators, predictionResults, accumulatorResults, pnlHistory, activeTab, statusFilter, sortOrder, checkingResultId, isAccumulatorResultsLoading, handleCheckResult, isAccumulatorFinished, handleUntrack ]);

  const handleExport = () => {
    const data = [...trackedPredictions.map(p => ({
        id: p.id, type: 'Prediction', date: p.matchDate, name: `${p.teamA} vs ${p.teamB}`, details: p.recommendedBet, odds: (p.odds || 0), stake: p.virtualStake, outcome: predictionResults[p.id]?.betOutcome ?? 'Pending', pnl: pnlHistory[p.id] ?? 0
    })), ...trackedAccumulators.map(acc => ({
        id: acc.id, type: 'Accumulator', date: acc.games[0]?.matchDate, name: acc.name, details: `${(acc.games || []).length} legs`, odds: (acc.combinedOdds || 0), stake: acc.virtualStake, outcome: accumulatorResults[acc.id]?.finalOutcome ?? 'Pending', pnl: pnlHistory[acc.id] ?? 0
    }))];
    exportToCsv('tracked_bets_export.csv', data, [
        { key: 'date', label: 'Date' }, { key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'details', label: 'Details' }, { key: 'odds', label: 'Odds' }, { key: 'stake', label: 'Stake' }, { key: 'outcome', label: 'Outcome' }, { key: 'pnl', label: 'P/L' }
    ]);
  }

  const renderEmptyState = () => {
    const hasFavorites = trackedPredictions.length > 0 || trackedAccumulators.length > 0;
    if (!hasFavorites) {
        return (
            <div className="col-span-full text-center py-10 px-6 bg-brand-surface rounded-lg border-2 border-dashed border-brand-secondary">
              <TrophyIcon className="mx-auto h-12 w-12 text-brand-secondary" />
              <h3 className="mt-2 text-lg font-medium text-white">Your Dashboard is Empty</h3>
              <p className="mt-1 text-sm text-brand-text-secondary">Find a prediction you like and click the star icon to start tracking your performance.</p>
              <ReactRouterDOM.Link to="/football" className="mt-6 inline-block bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-primary-hover transition-colors">
                Find Predictions
              </ReactRouterDOM.Link>
            </div>
        );
    }
    
    return (
        <div className="col-span-full text-center py-10 px-6 bg-brand-surface rounded-lg">
             <h3 className="mt-2 text-lg font-medium text-white">No Bets Match Your Criteria</h3>
             <p className="mt-1 text-sm text-brand-text-secondary">Try adjusting your filters to see more results.</p>
        </div>
    );
  };

  if (favoritesLoading) {
      return (
          <div className="flex flex-col justify-center items-center h-96">
            <Spinner size="lg" />
            <p className="text-brand-text-secondary mt-4">Loading your dashboard...</p>
          </div>
      );
  }

  if (favoritesError) {
      return (
        <div className="text-center py-10 px-6 bg-red-900/20 border border-red-500/50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h3 className="mt-4 text-xl font-bold text-white">Dashboard Error</h3>
            <p className="mt-2 text-md text-red-300 max-w-2xl mx-auto">{favoritesError}</p>
            <p className="mt-2 text-sm text-brand-text-secondary">Please verify your credentials and refresh the page.</p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Performance Dashboard</h1>
                <p className="text-brand-text-secondary mb-4 sm:mb-0">Your command center for tracking virtual bet performance.</p>
            </div>
             <div className="flex items-center gap-2">
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-brand-secondary text-brand-text-secondary hover:text-white"
                >
                    Export (CSV)
                </button>
                 <button
                    onClick={() => setClearModalOpen(true)}
                    disabled={trackedPredictions.length === 0 && trackedAccumulators.length === 0}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-red-600/20 text-red-400 hover:bg-red-600/40 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear All
                </button>
            </div>
        </div>

        <PerformanceChart favoritePredictions={trackedPredictions} favoriteAccumulators={trackedAccumulators} predictionResults={predictionResults} accumulatorResults={accumulatorResults} />
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                 <div className="bg-brand-surface p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {(['all', 'predictions', 'accumulators'] as const).map(tab => (
                            <FilterButton key={tab} label={tab.charAt(0).toUpperCase() + tab.slice(1)} isActive={activeTab === tab} onClick={() => setActiveTab(tab)} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {(['all', 'pending', 'settled'] as const).map(filter => (
                            <FilterButton key={filter} label={filter.charAt(0).toUpperCase() + filter.slice(1)} isActive={statusFilter === filter} onClick={() => setStatusFilter(filter)} />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {displayItems.length > 0 ? displayItems.map(item => item.component) : renderEmptyState()}
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                 <div className="bg-brand-surface p-4 rounded-lg shadow-lg space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><ChartPieIcon className="h-6 w-6 text-brand-primary" /> Key Performance Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard title="Total P/L" value={`${(stats.totalPnl || 0) >= 0 ? '+' : ''}${(stats.totalPnl || 0).toFixed(2)}`} icon={<BanknotesIcon className="h-6 w-6"/>} />
                        <StatCard title="ROI" value={`${(stats.roi || 0).toFixed(1)}%`} icon={<RocketIcon className="h-6 w-6" />} />
                        <StatCard title="Win Rate" value={`${(stats.winRate || 0).toFixed(1)}%`} icon={<TrophyIcon className="h-6 w-6"/>} />
                        <StatCard title="Settled Bets" value={`${stats.settledBets}`} icon={<ClipboardDocIcon className="h-6 w-6"/>} />
                    </div>
                </div>

                <div className="bg-brand-surface p-4 rounded-lg shadow-lg space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><ChartBarIcon className="h-6 w-6 text-brand-primary" /> Performance Breakdown</h3>
                    <BreakdownTabs data={breakdownData} />
                </div>
                
                <div className="bg-brand-surface p-4 rounded-lg shadow-lg space-y-4">
                     <h3 className="text-lg font-bold text-white flex items-center gap-2"><StarIcon className="h-6 w-6 text-brand-primary" /> Achievements</h3>
                    <Achievements unlockedAchievements={unlockedAchievements} />
                </div>
            </div>
        </div>

      <Modal isOpen={isClearModalOpen} onClose={() => setClearModalOpen(false)} title="Clear All Tracked Bets">
        <div>
            <p className="text-brand-text-secondary">Are you sure you want to clear all tracked predictions and accumulators? This action cannot be undone and will reset your performance data.</p>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setClearModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-secondary text-white hover:bg-opacity-80 transition-colors">
                    Cancel
                </button>
                <button type="button" onClick={handleClearAll} className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
                    Clear All
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};