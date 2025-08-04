
import React, { useState, useEffect } from 'react';

const defaultMessages = [
  "Contacting AI assistant...",
  "Searching Google for live game data...",
  "Analyzing real-time statistics...",
  "Compiling predictions...",
  "Finalizing results..."
];

interface AILoadingStateProps {
  messages?: string[];
}

const AILoadingState: React.FC<AILoadingStateProps> = ({ messages = defaultMessages }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col justify-center items-center py-16 text-center">
      <div
        className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-brand-primary mb-6"
      ></div>
      <p className="text-lg font-semibold text-brand-text transition-opacity duration-500">
        {messages[currentMessageIndex]}
      </p>
      <p className="text-sm text-brand-text-secondary mt-2">
        This may take a moment as we gather real-time data.
      </p>
    </div>
  );
};

export default AILoadingState;
