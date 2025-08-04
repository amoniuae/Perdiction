import React, { useState } from 'react';

export interface BreakdownStat {
    name: string;
    bets: number;
    wins: number;
    pnl: number;
}

export interface BreakdownData {
    byBetType: BreakdownStat[];
    byLeague: BreakdownStat[];
}

interface BreakdownTabsProps {
    data: BreakdownData;
}

const BreakdownRow: React.FC<{ item: BreakdownStat }> = ({ item }) => {
    const winRate = item.bets > 0 ? (item.wins / item.bets) * 100 : 0;
    const pnlColor = item.pnl > 0 ? 'text-green-400' : item.pnl < 0 ? 'text-red-400' : 'text-brand-text-secondary';
    
    return (
        <li className="grid grid-cols-3 gap-2 py-2 border-b border-brand-secondary/50">
            <span className="col-span-1 text-sm text-brand-text truncate" title={item.name}>{item.name}</span>
            <span className="col-span-1 text-sm text-center text-brand-text-secondary">{winRate.toFixed(1)}% ({item.wins}/{item.bets})</span>
            <span className={`col-span-1 text-sm text-right font-semibold ${pnlColor}`}>
                {item.pnl >= 0 ? '+' : ''}{item.pnl.toFixed(2)}
            </span>
        </li>
    );
};

const BreakdownTabs: React.FC<BreakdownTabsProps> = ({ data }) => {
    const [activeTab, setActiveTab] = useState<'betType' | 'league'>('betType');
    
    const hasData = data.byBetType.length > 0 || data.byLeague.length > 0;

    if (!hasData) {
        return <p className="text-sm text-brand-text-secondary text-center py-4">Settle some bets to see your performance breakdown.</p>;
    }

    const currentData = activeTab === 'betType' ? data.byBetType : data.byLeague;

    return (
        <div>
            <div className="flex border-b border-brand-secondary/50 mb-2">
                <button
                    onClick={() => setActiveTab('betType')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'betType' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:text-white'}`}
                >
                    By Bet Type
                </button>
                <button
                    onClick={() => setActiveTab('league')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'league' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:text-white'}`}
                >
                    By League
                </button>
            </div>
            {currentData.length > 0 ? (
                 <ul className="space-y-1 max-h-64 overflow-y-auto pr-2">
                    <li className="grid grid-cols-3 gap-2 py-1 text-xs font-bold text-brand-text-secondary">
                        <span className="col-span-1">Name</span>
                        <span className="col-span-1 text-center">Win Rate</span>
                        <span className="col-span-1 text-right">P/L</span>
                    </li>
                    {currentData.map(item => <BreakdownRow key={item.name} item={item} />)}
                </ul>
            ) : (
                <p className="text-sm text-brand-text-secondary text-center py-4">No settled bets found for this category.</p>
            )}
        </div>
    );
};

export default BreakdownTabs;
