import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { config } from '../config';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-surface mt-12">
      <div className="container mx-auto py-6 px-4 text-center text-brand-text-secondary">
        <div className="flex justify-center gap-x-6 mb-4">
          <ReactRouterDOM.Link to="/about" className="text-sm hover:text-brand-primary transition-colors">About Us</ReactRouterDOM.Link>
          <ReactRouterDOM.Link to="/responsible-gambling" className="text-sm hover:text-brand-primary transition-colors">Responsible Gambling</ReactRouterDOM.Link>
          {config.telegramChannelUrl && config.telegramChannelUrl !== 'https://t.me/your_channel_link_here' && (
            <a href={config.telegramChannelUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-brand-primary transition-colors">
              Join our Telegram
            </a>
          )}
        </div>
        <p>&copy; {new Date().getFullYear()} AI Sports Predictor. All rights reserved.</p>
        <p className="text-xs mt-2 max-w-2xl mx-auto">
          Predictions are AI-generated and not guaranteed. This tool should be used for guidance and entertainment. Please gamble responsibly and within your means.
        </p>
      </div>
    </footer>
  );
};

export default Footer;