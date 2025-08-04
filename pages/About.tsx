
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-4">About AI Sports Predictor</h1>
      <div className="space-y-6 text-brand-text-secondary bg-brand-surface p-8 rounded-lg shadow-lg">
        <p>
          AI Sports Predictor is a cutting-edge platform designed to give you a competitive edge in sports betting. We harness the power of artificial intelligence and machine learning to analyze vast datasets and deliver highly accurate predictions across a wide range of sports.
        </p>
        <h2 className="text-2xl font-semibold text-white pt-4 border-t border-brand-secondary">Our Methodology</h2>
        <p>
          Our system is built on a sophisticated AI model that continuously learns and evolves. It processes a multitude of factors for each game, including:
        </p>
        <ul className="list-disc list-inside space-y-2 pl-4 text-brand-primary">
          <li><span className="text-brand-text">Historical Performance Data:</span> Decades of match results and statistics.</li>
          <li><span className="text-brand-text">Team & Player Form:</span> Current performance trends, injuries, and player availability.</li>
          <li><span className="text-brand-text">Head-to-Head (H2H) Analysis:</span> Historical matchups between competing teams.</li>
          <li><span className="text-brand-text">Advanced Metrics:</span> Sport-specific statistics like possession, shots on target, power play efficiency, and more.</li>
        </ul>
        <p>
          By synthesizing this information, our AI calculates the probability of various outcomes, providing you with a confidence score for each prediction. This data-driven approach removes emotion and bias, leading to more informed and strategic betting decisions.
        </p>
        <h2 className="text-2xl font-semibold text-white pt-4 border-t border-brand-secondary">Our Mission</h2>
        <p>
          Our mission is to democratize sports analytics, making powerful predictive tools accessible to everyone from casual fans to seasoned bettors. We are committed to transparency, innovation, and responsible gaming.
        </p>
        <p className="text-sm italic pt-4 border-t border-brand-secondary">
          <strong>Disclaimer:</strong> While our AI provides statistically-backed predictions, no outcome is guaranteed. Sports are unpredictable, and our tool should be used for guidance and entertainment. Please gamble responsibly and within your means.
        </p>
      </div>
    </div>
  );
};

export default About;
