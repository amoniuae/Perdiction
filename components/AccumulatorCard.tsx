
import React from 'react';
import { AccumulatorTip, MatchStatus, AccumulatorResult, AccumulatorGame } from '../types';
import RiskIndicator from './RiskIndicator';
import { SportIcon } from './SportIcon';
import { getMatchStatus } from '../utils/dateUtils';
import { PlusCircleIcon, CheckCircleIcon, TrashIcon, XCircleIcon } from './icons';

interface AccumulatorCardProps {
  tip: AccumulatorTip;
  onToggleTrack: (id: string) => void;
  isTracked: boolean;
  isDashboardView?: boolean;
  result?: AccumulatorResult | null;
  isResultLoading?: boolean;
  virtualStake?: number;
  pnl?: number;
}

const Stat: React.FC<{icon: React.ReactNode, label: string, value: React.ReactNode, valueClass?: string}> = ({icon, label, value, valueClass}) => (
    <div className="text-center">
        <div className="mx-auto h-6 w-6 text-brand-primary mb-1">{icon}</div>
        <p className="text-xs text-brand-text-secondary">{label}</p>
        <div className={`text-lg font-bold ${valueClass || 'text-brand-text'}`}>{value}</div>
    </div>
);


const AccumulatorCard: React.FC<AccumulatorCardProps> = ({ 
    tip, 
    onToggleTrack,
    isTracked,
    isDashboardView = false,
    result, 
    isResultLoading, 
    virtualStake, 
    pnl 
}) => {
  
  const handleTrackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleTrack(tip.id);
  };

  const statusStyles: Record<MatchStatus, string> = {
    [MatchStatus.Live]: 'bg-red-600 text-white animate-pulse',
    [MatchStatus.Finished]: 'bg-brand-secondary text-brand-text-secondary',
    [MatchStatus.Upcoming]: 'bg-brand-bg text-brand-text-secondary border border-brand-secondary',
  };

  const getLegResult = (game: AccumulatorGame) => {
    return result?.legResults.find(r => r.teamA === game.teamA && r.teamB === game.teamB) || null;
  };
  
  const TrackButton: React.FC = () => {
    if (isDashboardView) return null;

    if (isTracked) {
        return (
            <button 
                onClick={handleTrackClick} 
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors w-full"
                aria-label="Untrack this accumulator"
            >
                <CheckCircleIcon className="h-5 w-5" />
                <span>Tracked ({(virtualStake || 0).toFixed(2)} u)</span>
            </button>
        );
    }

    return (
        <button 
            onClick={handleTrackClick}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-brand-primary/80 text-white hover:bg-brand-primary transition-colors w-full"
            aria-label="Track this accumulator"
        >
            <PlusCircleIcon className="h-5 w-5" />
            <span>Track Accumulator</span>
        </button>
    );
  };

  const renderCardContent = () => {
    if (isResultLoading) {
      return (
        <div className="flex-grow flex justify-center items-center h-48">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
            <p className="text-lg font-bold text-brand-text-secondary">Fetching results...</p>
          </div>
        </div>
      );
    }

    if (result && result.finalOutcome && pnl !== undefined && virtualStake !== undefined) {
       const outcomeColor = result.finalOutcome === 'Won' ? 'text-green-400' : 'text-red-500';
       const outcomeBadgeBg = result.finalOutcome === 'Won' ? 'bg-green-500/10' : 'bg-red-500/10';

      return (
        <div className={`-mx-6 -mb-6 mt-4 px-6 pb-6 rounded-b-lg ${outcomeBadgeBg}`}>
          <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-brand-secondary mb-4">
              <div>
                <p className="text-brand-text-secondary text-sm">Final Result</p>
                <p className={`text-xl font-bold ${outcomeColor}`}>{result.finalOutcome}</p>
              </div>
              <div>
                <p className="text-brand-text-secondary text-sm">Stake</p>
                <p className="text-xl font-bold text-brand-text">{(virtualStake || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-brand-text-secondary text-sm">Profit/Loss</p>
                 <p className={`text-xl font-bold ${(pnl || 0) >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                    {(pnl || 0) >= 0 ? `+${(pnl || 0).toFixed(2)}` : (pnl || 0).toFixed(2)}
                </p>
              </div>
          </div>
           <ul className="list-none pl-0 space-y-3 text-sm">
              {(tip.games || []).map((game, index) => {
                const legResult = getLegResult(game);
                return (
                  <li key={index} className="flex items-start gap-3 p-2 bg-brand-surface/50 rounded-md">
                     <span className="font-semibold text-brand-text-secondary pt-0.5">{index + 1}.</span>
                     <div className="flex-grow">
                       <div className="flex items-center gap-2 text-brand-text">
                         <SportIcon sport={game.sport} className="h-5 w-5 text-brand-primary flex-shrink-0" />
                         <span className="font-semibold">{game.teamA} vs {game.teamB}</span>
                       </div>
                       <div className="pl-7 mt-1 flex justify-between items-center">
                         <p className="font-bold text-brand-primary">{game.prediction} <span className="text-sm font-normal text-brand-text-secondary">@{(game.odds || 0).toFixed(2)}</span></p>
                         {legResult?.outcome === 'Won' ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400">
                                <CheckCircleIcon className="h-4 w-4" /> Won
                            </span>
                        ) : legResult?.outcome === 'Lost' ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-400">
                                <XCircleIcon className="h-4 w-4" /> Lost
                            </span>
                        ) : (
                            <span className="px-2 py-1 text-xs font-bold rounded-md bg-brand-secondary text-brand-text-secondary">
                                N/A
                            </span>
                        )}
                       </div>
                     </div>
                  </li>
                );
              })}
           </ul>
        </div>
      );
    }

    // Default view for upcoming/live
    return (
      <>
        {tip.rationale && (
          <p className="text-sm text-brand-text-secondary mb-4 italic border-l-2 border-brand-primary/50 pl-3">
            "{tip.rationale}"
          </p>
        )}
        <div className="flex-grow space-y-2 mb-4">
          <p className="text-brand-text-secondary text-sm">Games included:</p>
          <ul className="list-none pl-0 space-y-4 text-sm">
              {(tip.games || []).map((game, index) => {
                const { status, text } = getMatchStatus(game.matchDate);
                return (
                  <li key={index} className="space-y-1">
                      <p className="text-brand-text">
                          <span className="font-semibold text-brand-text-secondary">{index + 1}.</span> {game.teamA} vs {game.teamB}
                      </p>
                      <div className="pl-5 flex justify-between items-center gap-2">
                          <p className="font-bold text-brand-primary">{game.prediction} <span className="text-sm font-normal text-brand-text-secondary">@{(game.odds || 0).toFixed(2)}</span></p>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md whitespace-nowrap ${statusStyles[status]}`}>
                              {status === MatchStatus.Live && '● '}
                              {text}
                          </span>
                      </div>
                  </li>
                );
              })}
          </ul>
        </div>
        <div className="mt-auto pt-4 border-t border-brand-secondary space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <Stat
                    icon={<>🏆</>}
                    label="Success Prob."
                    value={`${(tip.successProbability || 0)}%`}
                    valueClass="text-green-400"
                />
                 <Stat
                    icon={<>💰</>}
                    label="Combined Odds"
                    value={(tip.combinedOdds || 0).toFixed(2)}
                />
                <Stat
                    icon={<>🚦</>}
                    label="Risk Level"
                    value={<RiskIndicator level={tip.riskLevel} />}
                />
            </div>
            <TrackButton />
        </div>
      </>
    );
  };

  return (
    <div className="bg-brand-surface rounded-lg shadow-lg p-6 flex flex-col h-full hover:shadow-brand-primary/20 hover:scale-[1.02] transition-all duration-300 relative">
       {isDashboardView ? (
         <button
            onClick={handleTrackClick}
            className="absolute top-2 right-2 p-1.5 rounded-full text-brand-text-secondary hover:bg-red-500/20 hover:text-red-400 transition-colors z-10"
            aria-label="Untrack this accumulator"
         >
           <TrashIcon className="h-5 w-5" />
         </button>
       ) : null}


      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-brand-text pr-8">{tip.name}</h3>
      </div>
      
      {renderCardContent()}
    </div>
  );
};

export default AccumulatorCard;