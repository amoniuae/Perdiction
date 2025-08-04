
import React from 'react';

const AccumulatorCardSkeleton: React.FC = () => {
  return (
    <div className="bg-brand-surface rounded-lg shadow-lg p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-brand-secondary rounded w-2/3"></div>
        <div className="h-6 bg-brand-secondary rounded w-1/4"></div>
      </div>
      
      {/* Rationale */}
      <div className="h-4 bg-brand-secondary rounded w-full mb-2"></div>
      <div className="h-4 bg-brand-secondary rounded w-5/6 mb-6"></div>

      {/* Games list */}
      <div className="space-y-4 mb-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="h-5 w-5 bg-brand-secondary rounded-full mt-0.5 flex-shrink-0"></div>
            <div className="flex-grow space-y-2">
              <div className="h-5 bg-brand-secondary rounded w-full"></div>
              <div className="h-4 bg-brand-secondary rounded w-1/2 ml-7"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-brand-secondary grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="h-4 bg-brand-secondary rounded w-full mb-2"></div>
          <div className="h-6 bg-brand-secondary rounded w-1/2 mx-auto"></div>
        </div>
        <div>
          <div className="h-4 bg-brand-secondary rounded w-full mb-2"></div>
          <div className="h-6 bg-brand-secondary rounded w-1/2 mx-auto"></div>
        </div>
        <div>
          <div className="h-4 bg-brand-secondary rounded w-full mb-2"></div>
          <div className="h-6 bg-brand-secondary rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default AccumulatorCardSkeleton;
