import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const ResponsibleGambling: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto text-brand-text-secondary">
      <h1 className="text-3xl font-bold text-white mb-4">Responsible Gambling</h1>
      <div className="space-y-6 bg-brand-surface p-8 rounded-lg shadow-lg">
        <p className="text-lg">
          We are committed to providing a safe and responsible environment. While our AI offers data-driven insights, betting should always be an enjoyable and controlled activity. This page provides resources to help you gamble responsibly.
        </p>

        <section>
          <h2 className="text-2xl font-semibold text-white pt-4 border-t border-brand-secondary">Core Principles of Responsible Gambling</h2>
          <ul className="list-disc list-inside space-y-2 pl-4 mt-2 text-brand-primary">
            <li><span className="text-brand-text"><strong>Bet for Fun, Not as Income:</strong> Treat gambling as a form of entertainment, not a way to make money.</span></li>
            <li><span className="text-brand-text"><strong>Only Bet What You Can Afford:</strong> Never bet more than you are willing to lose. Use a dedicated entertainment budget.</span></li>
            <li><span className="text-brand-text"><strong>Set Limits:</strong> Before you start, decide on a time limit and a money limit and stick to them.</span></li>
            <li><span className="text-brand-text"><strong>Don't Chase Losses:</strong> Accepting losses is part of the game. Trying to win back lost money can lead to bigger losses.</span></li>
            <li><span className="text-brand-text"><strong>Know When to Stop:</strong> Understand the signs of problem gambling. If it's no longer fun, it's time to take a break.</span></li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white pt-4 border-t border-brand-secondary">Self-Assessment Tool</h2>
          <p className="mt-2">Ask yourself the following questions. The more you answer "yes" to, the more likely you are to have a gambling problem.</p>
          <ul className="list-decimal list-inside space-y-1 pl-4 mt-2">
            <li>Have you ever bet more than you could really afford to lose?</li>
            <li>Have you ever needed to gamble with larger amounts of money to get the same feeling of excitement?</li>
            <li>Have you ever felt guilty about the amount of money you gamble or what happens when you gamble?</li>
            <li>Have you ever tried to win back money you have lost (chasing losses)?</li>
            <li>Has gambling caused you any health problems, including stress or anxiety?</li>
            <li>Has gambling ever caused any financial problems for you or your household?</li>
          </ul>
          <p className="mt-2 text-sm italic">If you are concerned about your answers, please seek help from one of the professional organizations listed below.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white pt-4 border-t border-brand-secondary">Get Help & Support</h2>
          <p className="mt-2">If you or someone you know needs support, confidential help is available from the following organizations:</p>
          <ul className="list-none space-y-2 mt-2">
            <li>
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                <strong>BeGambleAware:</strong> Offers free, confidential help for anyone who is worried about their or someone else’s gambling.
              </a>
            </li>
            <li>
              <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                <strong>GamCare:</strong> Provides information, advice, and support for anyone affected by problem gambling in the UK.
              </a>
            </li>
             <li>
              <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                <strong>Gamblers Anonymous:</strong> A fellowship of men and women who share their experience, strength and hope with each other that they may solve their common problem and help others to recover from a gambling problem.
              </a>
            </li>
          </ul>
        </section>

        <div className="text-center pt-4 border-t border-brand-secondary">
            <ReactRouterDOM.Link to="/about" className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-primary-hover transition-colors">
              Learn more about our methodology
            </ReactRouterDOM.Link>
        </div>
      </div>
    </div>
  );
};

export default ResponsibleGambling;