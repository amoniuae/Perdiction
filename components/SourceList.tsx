
import React from 'react';
import { GroundingChunk } from '../types';

interface SourceListProps {
  sources: GroundingChunk[];
}

const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  const getHostname = (uri: string) => {
    try {
      return new URL(uri).hostname;
    } catch (e) {
      return uri;
    }
  }

  return (
    <div className="my-6 p-4 bg-brand-surface rounded-lg shadow-inner border border-brand-secondary">
      <h4 className="text-sm font-semibold text-brand-text-secondary mb-3">
        AI analysis powered by the following live sources from Google Search:
      </h4>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs list-none pl-0">
        {sources.map((source, index) => (
          <li key={index} className="truncate">
            <a
              href={source.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline hover:text-brand-primary-hover transition-colors"
              title={source.web.title}
            >
              {source.web.title || getHostname(source.web.uri)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SourceList;
