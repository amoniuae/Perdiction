import React from 'react';
import { memo, useMemo } from 'react';
import { MatchPrediction, MatchStatus, AccumulatorTip, AccumulatorGame, Sport } from '../types';
import { getMatchStatus } from '../utils/dateUtils';
import { PlusCircleIcon, CheckCircleIcon, TrashIcon, ShieldIcon } from './icons';
import { SportIcon } from './SportIcon';
import RiskIndicator from './RiskIndicator';

// Performance optimization: Memoize expensive calculations
const calculatePnL = (betOutcome: 'Won' | 'Lost' | null, virtualStake: number, odds: number): number => {
  if (betOutcome === 'Won') {
    return virtualStake * odds - virtualStake;
  }
  if (betOutcome === 'Lost') {
    return -virtualStake;
  }
  return 0;
};

// Memoized status styles to prevent recreation on each render
const STATUS_STYLES: Record<MatchStatus, string> = {
  [MatchStatus.Live]: 'bg-red-600 text-white animate-pulse',
  [MatchStatus.Finished]: 'bg-brand-secondary text-brand-text-secondary',
  [MatchStatus.Upcoming]: 'bg-brand-bg text-brand-text-secondary border border-brand-secondary',
} as const;

interface MatchPredictionCardProps {
  match: MatchPrediction;
  onToggleTrack: (id: string, itemType: 'prediction' | 'accumulator') => void;
  isTracked: boolean;
  isAccumulatorTracked?: boolean;
  isDashboardView?: boolean;
  finalScore?: string | null;
  betOutcome?: 'Won' | 'Lost' | null;
  isResultLoading?: boolean;
  virtualStake?: number;
  accumulatorStake?: number;
  pnl?: number;
  onCheckResult?: (matchId: string) => void;
}

// Memoized confidence color calculation
const getConfidenceColor = (confidence: number): string => {
  if (confidence > 80) return 'text-green-400';
  if (confidence > 65) return 'text-yellow-400';
  return 'text-orange-400';
};

// Memoized sub-components for better performance
const Stat: React.FC<{icon: React.ReactNode, label: string, value: React.ReactNode, valueClass?: string}> = memo(({icon, label, value, valueClass}) => (
    <div className="text-center">
        <div className="mx-auto h-6 w-6 text-brand-primary mb-1">{icon}</div>
        <p className="text-xs text-brand-text-secondary">{label}</p>
        <div className={`text-lg font-bold ${valueClass || 'text-brand-text'}`}>{value}</div>
    </div>
));

Stat.displayName = 'Stat';

const TrackButton: React.FC<{
  isTracked: boolean;
  isDashboardView: boolean;
  virtualStake?: number;
  onTrackClick: (e: React.MouseEvent) => void;
}> = memo(({ isTracked, isDashboardView, virtualStake, onTrackClick }) => {
  if (isDashboardView) return null;

  if (isTracked) {
    return (
      <button 
        onClick={onTrackClick} 
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors w-full"
        aria-label="Untrack this bet"
      >
        <CheckCircleIcon className="h-5 w-5" />
        <span>Tracked ({(virtualStake || 0).toFixed(2)} u)</span>
      </button>
    );
  }

  return (
    <button 
      onClick={onTrackClick}
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-brand-primary/80 text-white hover:bg-brand-primary transition-colors w-full"
      aria-label="Track this bet"
    >
      <PlusCircleIcon className="h-5 w-5" />
      <span>Track Bet</span>
    </button>
  );
});

TrackButton.displayName = 'TrackButton';

// Extracted component for better maintainability
const BetBuilderDisplay: React.FC<{
  tip: AccumulatorTip;
  onTrack: (e: React.MouseEvent) => void;
  isTracked: boolean;
  stake?: number;
}> = React.memo(({ tip, onTrack, isTracked, stake }) => (
    <div className="mt-4 pt-4 border-t-2 border-dashed border-brand-primary/20">
        <div className="bg-brand-secondary/40 p-4 rounded-lg">
            <h4 className="font-bold text-brand-primary flex items-center gap-2 mb-2">
                <ShieldIcon className="h-5 w-5" />
                <span>Bet Builder</span>
            </h4>
             <ul className="list-none pl-0 space-y-2 text-sm mb-3">
                {(tip.games || []).map((game, index) => (
                  <li key={index} className="flex items-center gap-3">
                     <span className="font-semibold text-brand-text-secondary">{index + 1}.</span>
                     <div className="flex-grow flex justify-between items-center text-brand-text">
                        <span className="font-semibold">{game.prediction}</span>
                        <span className="font-bold">@{(game.odds || 0).toFixed(2)}</span>
                     </div>
                  </li>
                ))}
             </ul>
            <div className="grid grid-cols-2 gap-3 text-center text-xs mb-4">
                <div className="bg-brand-surface/50 p-2 rounded-md">
                    <p className="text-brand-text-secondary">Total Odds</p>
                    <p className="font-bold text-lg text-white">{(tip.combinedOdds || 0).toFixed(2)}</p>
                </div>
                <div className="bg-brand-surface/50 p-2 rounded-md">
                    <p className="text-brand-text-secondary">Success Prob.</p>
                    <p className="font-bold text-lg text-green-400">{(tip.successProbability || 0).toFixed(0)}%</p>
                </div>
            </div>
            
             {isTracked ? (
                 <button disabled className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/30">
                     <CheckCircleIcon className="h-5 w-5" />
                     <span>Tracked ({(stake || 0).toFixed(2)} u)</span>
                 </button>
             ) : (
                 <button onClick={onTrack} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md bg-brand-primary/80 text-white hover:bg-brand-primary transition-colors">
                     <PlusCircleIcon className="h-5 w-5" />
                     <span>Track Bet Builder</span>
                 </button>
             )}
        </div>
    </div>
));

BetBuilderDisplay.displayName = 'BetBuilderDisplay';

const MatchPredictionCard: React.FC<MatchPredictionCardProps> = memo(({ 
    match, 
    onToggleTrack,
    isTracked,
    isAccumulatorTracked = false,
    isDashboardView = false,
    finalScore, 
    betOutcome, 
    isResultLoading,
    virtualStake,
    accumulatorStake,
    pnl,
    onCheckResult,
}) => {
  // Memoize expensive calculations
  const { status, text } = useMemo(() => getMatchStatus(match.matchDate), [match.matchDate]);
  
  const statusStyles: Record<MatchStatus, string> = useMemo(() => ({
    [MatchStatus.Live]: 'bg-red-600 text-white animate-pulse',
    [MatchStatus.Finished]: 'bg-brand-secondary text-brand-text-secondary',
    [MatchStatus.Upcoming]: 'bg-brand-bg text-brand-text-secondary border border-brand-secondary',
  }), []);

  const formattedOdds = useMemo(() => (match.odds || 0).toFixed(2), [match.odds]);
  const formattedStake = useMemo(() => (virtualStake || 0).toFixed(2), [virtualStake]);
  
  const handleTrackClick = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    onToggleTrack(match.id, 'prediction');
  };
  
  const handleBetBuilderTrackClick = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (match.betBuilder) {
        onToggleTrack(match.betBuilder.id, 'accumulator');
    }
  };

  // Memoize calculated PnL
  const calculatedPnL = React.useMemo(() => {
    return pnl !== undefined ? pnl : calculatePnL(betOutcome || null, virtualStake || 0, match.odds || 0);
  }, [pnl, betOutcome, virtualStake, match.odds]);

  const renderPredictionDetails = () => {
    if (status === MatchStatus.Finished) {
        if (isResultLoading) {
            return (
                <div className="mt-6 pt-4 border-t border-brand-secondary flex justify-center items-center h-28">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                        <p className="text-lg font-bold text-brand-text-secondary">Fetching result...</p>
                    </div>
                </div>
            );
        }

        if (betOutcome && calculatedPnL !== undefined && virtualStake !== undefined) {
            const outcomeColor = betOutcome === 'Won' ? 'text-green-400' : 'text-red-500';
            const outcomeBadgeBg = betOutcome === 'Won' ? 'bg-green-500/10' : 'bg-red-500/10';

            return (
                <div className={`mt-6 pt-4 border-t border-brand-secondary ${outcomeBadgeBg} -mx-6 -mb-6 px-6 pb-6 rounded-b-lg`}>
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                        <div>
                            <p className="text-brand-text-secondary text-sm">Result</p>
                            <p className={`text-xl font-bold ${outcomeColor}`}>{betOutcome}</p>
                        </div>
                        <div>
                            <p className="text-brand-text-secondary text-sm">Final Score</p>
                            <p className="text-xl font-bold text-brand-text">{finalScore || 'N/A'}</p>
                        </div>
                         <div>
                            <p className="text-brand-text-secondary text-sm">Profit/Loss</p>
                            <p className={`text-xl font-bold ${calculatedPnL >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {calculatedPnL >= 0 ? `+${calculatedPnL.toFixed(2)}` : calculatedPnL.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-sm space-y-1 pt-3 border-t border-white/10 dark:border-white/10 bg-brand-surface/50 p-3 rounded-md">
                        <p className="font-semibold text-brand-text-secondary mb-2">Original AI Bet</p>
                        <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Bet:</span>
                            <span className="font-semibold text-brand-text">{match.recommendedBet}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Odds:</span>
                            <span className="font-semibold text-brand-text">@{(match.odds || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Stake:</span>
                            <span className="font-semibold text-brand-primary">{(virtualStake || 0).toFixed(2)} units</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (finalScore && !betOutcome) {
          return (
              <div className="mt-6 pt-4 border-t border-brand-secondary -mx-6 -mb-6 px-6 pb-6 rounded-b-lg bg-brand-secondary/30">
                   <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                      <div>
                          <p className="text-brand-text-secondary text-sm">Result</p>
                          <p className="text-xl font-bold text-yellow-400">Pending</p>
                      </div>
                      <div>
                          <p className="text-brand-text-secondary text-sm">Final Score</p>
                          <p className="text-xl font-bold text-brand-text">{finalScore}</p>
                      </div>
                  </div>
                   <p className="text-xs text-center text-brand-text-secondary">AI could not automatically determine bet outcome.</p>
              </div>
          );
        }

        return (
            <div className="mt-6 pt-4 border-t border-brand-secondary flex flex-col justify-center items-center h-28">
                <p className="text-lg font-bold text-brand-text-secondary">Result Not Available</p>
                {onCheckResult && (
                    <button
                        onClick={(e) => { e.preventDefault(); onCheckResult(match.id); }}
                        disabled={isResultLoading}
                        className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-brand-primary/80 text-white hover:bg-brand-primary disabled:bg-brand-secondary disabled:cursor-not-allowed"
                    >
                       Check Result
                    </button>
                )}
            </div>
        );
    }
    
    return (
        <>
            <div className="mt-6 pt-4 border-t border-brand-secondary space-y-4">
                <div>
                    <p className="text-sm font-semibold text-brand-text-secondary">AI Prediction</p>
                    <p className="text-lg text-brand-text font-semibold">{match.aiPrediction}</p>
                    <div className="w-full bg-brand-secondary rounded-full h-5 my-1">
                        <div className="bg-blue-500 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ width: `${(match.aiConfidence || 0)}%` }}>
                            {(match.aiConfidence || 0).toFixed(1)}%
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-semibold text-brand-text-secondary">Learning Prediction</p>
                    <p className="text-lg text-brand-text font-semibold">{match.learningPrediction}</p>
                    <div className="w-full bg-brand-secondary rounded-full h-5 my-1">
                        <div className="bg-purple-500 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ width: `${(match.learningConfidence || 0)}%` }}>
                            {(match.learningConfidence || 0).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
            <div className="!mt-6 pt-4 border-t border-brand-secondary/50">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-semibold text-brand-text-secondary">Recommended Bet</p>
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold text-brand-primary text-xl">{match.recommendedBet}</span>
                            <span className="text-brand-text-secondary">@</span>
                            <span className="text-xl font-bold">{(match.odds || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <TrackButton 
                      isTracked={isTracked}
                      isDashboardView={isDashboardView}
                      virtualStake={virtualStake}
                      onTrackClick={handleTrackClick}
                    />
                </div>
                {match.aiRationale && <p className="text-sm text-brand-text-secondary italic mt-2">"{match.aiRationale}"</p>}
            </div>
            {match.betBuilder && match.betBuilder.games && match.betBuilder.games.length > 0 && (
                <BetBuilderDisplay 
                    tip={match.betBuilder}
                    onTrack={handleBetBuilderTrackClick}
                    isTracked={isAccumulatorTracked}
                    stake={accumulatorStake}
                />
            )}
        </>
    );
  };

  return (
    <div
      className="bg-brand-surface rounded-lg shadow-lg p-6 hover:shadow-brand-primary/20 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden h-full flex flex-col border border-transparent hover:border-brand-primary/50"
      aria-label={`View details for ${match.teamA} vs ${match.teamB}`}
    >
        {isDashboardView && (
            <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleTrack(match.id, 'prediction'); }}
                className="absolute top-2 right-2 p-1.5 rounded-full text-brand-text-secondary hover:bg-red-500/20 hover:text-red-400 transition-colors z-10"
                aria-label="Untrack this bet"
            >
                <TrashIcon className="h-5 w-5" />
            </button>
        )}
      
      <div className="flex-grow">
          <div className="flex justify-between items-start mb-2 flex-wrap gap-y-2">
            <h3 className="text-xl font-bold text-brand-text pr-8">{match.teamA} vs {match.teamB}</h3>
            <div className="flex items-center gap-2">
                {match.league && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-md bg-brand-secondary text-brand-primary">
                        {match.league}
                    </span>
                )}
                <span className={`px-2 py-1 text-xs font-bold rounded-md ${statusStyles[status]}`}>
                  {status === MatchStatus.Live && '● '}
                  {text}
                </span>
            </div>
          </div>
          
          {match.stadium && (
            <div className="flex items-center gap-1.5 text-sm text-brand-text-secondary mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 20l-4.95-6.05a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>{match.stadium}{match.city ? `, ${match.city}` : ''}</span>
            </div>
          )}

          <div className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-2 text-sm mt-4 text-brand-text">
            {match.formA && (
              <>
                <span className="font-semibold text-brand-text-secondary text-right">Form ({match.teamA}):</span>
                <span className="font-mono text-left">{match.formA}</span>
              </>
            )}
            {match.formB && (
              <>
                <span className="font-semibold text-brand-text-secondary text-right">Form ({match.teamB}):</span>
                <span className="font-mono text-left">{match.formB}</span>
              </>
            )}
            {match.h2h && (
              <>
                <span className="font-semibold text-brand-text-secondary text-right">H2H (Last 5):</span>
                <p className="text-left">{match.h2h}</p>
              </>
            )}
            {match.keyStats && (
                <>
                    <span className="font-semibold text-brand-text-secondary text-right">Key Stat:</span>
                    <p className="text-left">{match.keyStats}</p>
                </>
            )}
          </div>
      </div>
      
      <div className="mt-auto">
        {renderPredictionDetails()}
      </div>
    </div>
  );
});

MatchPredictionCard.displayName = 'MatchPredictionCard';

export default MatchPredictionCard;