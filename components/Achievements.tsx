import React from 'react';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface AchievementsProps {
    unlockedAchievements: Achievement[];
}

const Achievements: React.FC<AchievementsProps> = ({ unlockedAchievements }) => {
    
    if (unlockedAchievements.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-sm text-brand-text-secondary">Start winning to unlock your first achievement!</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {unlockedAchievements.map(achievement => (
                <div key={achievement.id} className="flex items-center gap-4 bg-brand-secondary/50 p-3 rounded-lg">
                    <div className="flex-shrink-0 text-yellow-400">
                        {React.cloneElement(achievement.icon as React.ReactElement<{ className?: string }>, { className: 'h-8 w-8' })}
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-text">{achievement.title}</h4>
                        <p className="text-xs text-brand-text-secondary">{achievement.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Achievements;
