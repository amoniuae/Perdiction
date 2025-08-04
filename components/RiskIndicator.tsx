import React from 'react';

interface RiskIndicatorProps {
  level: 'Low' | 'Medium' | 'High';
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ level }) => {
  const levelConfig = {
    Low: { text: 'Low', color: 'bg-green-500' },
    Medium: { text: 'Medium', color: 'bg-yellow-500' },
    High: { text: 'High', color: 'bg-red-500' },
  };

  const config = levelConfig[level];

  if (!config) {
    // Fallback for unexpected level values to prevent crashing.
    return (
        <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full bg-gray-500`}>
                N/A Risk
            </span>
        </div>
    );
  }

  const { text, color } = config;

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${color}`}>
        {text} Risk
      </span>
    </div>
  );
};

export default RiskIndicator;