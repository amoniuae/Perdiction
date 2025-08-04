import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { fetchBetOfTheDay } from '../services/geminiService';
import { MatchPrediction, GroundingChunk, FootballPageData } from '../types';
import MatchPredictionCard from '../components/MatchPredictionCard';
import SourceList from '../components/SourceList';
import Spinner from '../components/Spinner';
import { StakeModal } from '../components/StakeModal';
import { useFavorites } from '../contexts/FavoritesContext';
import { ShareModal } from '../components/ShareModal';

const Home: React.FC = () => {
  const [betOfTheDay, setBetOfTheDay] = useState<MatchPrediction | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { trackedPredictions, addPrediction, removePrediction } = useFavorites();

  const [isStakeModalOpen, setStakeModalOpen] = useState(false);
  const [itemToFavorite, setItemToFavorite] = useState<MatchPrediction | null>(null);

  // Share Modal State
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [dataToShare, setDataToShare] = useState<Partial<FootballPageData> | null>(null);

  useEffect(() => {
    const loadBet = async () => {
      setLoading(true);
      setError(null);
      try {
        const { prediction, sources: newSources } = await fetchBetOfTheDay();
        if (prediction) {
          setBetOfTheDay(prediction);
          setSources(newSources);
        } else {
          setError("The AI couldn't determine a Bet of the Day. Please check back later.");
        }
      } catch (err) {
        setError("An error occurred while fetching the Bet of the Day.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadBet();
  }, []);
  
  const isBetOfTheDayTracked = betOfTheDay ? trackedPredictions.some(p => p.id === betOfTheDay.id) : false;

  const handleToggleTrack = (itemId: string) => {
    if (isBetOfTheDayTracked) {
      if (window.confirm("Are you sure you want to untrack this bet? It will be removed from your dashboard.")) {
        removePrediction(itemId);
      }
    } else {
      if (betOfTheDay && betOfTheDay.id === itemId) {
        setItemToFavorite(betOfTheDay);
        setStakeModalOpen(true);
      }
    }
  };

  const handleStakeSubmit = (stake: number) => {
    if (itemToFavorite && stake > 0) {
      addPrediction(itemToFavorite, stake);
    }
    setItemToFavorite(null);
    setStakeModalOpen(false);
  };

  const getItemNameForModal = () => {
    if (!itemToFavorite) return undefined;
    return `${itemToFavorite.teamA} vs ${itemToFavorite.teamB}`;
  };

  const handleShareClick = () => {
    if (betOfTheDay) {
        setDataToShare({ predictions: [betOfTheDay] });
        setShareModalOpen(true);
    }
  };

  return (
    <div>
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
          Welcome to <span className="text-brand-primary">AI Sports Predictor</span>
        </h1>
        <p className="text-lg md:text-xl text-brand-text-secondary max-w-3xl mx-auto mb-8">
          Leverage the power of machine learning to get insightful sports predictions, detailed analytics, and smart accumulator tips. Your edge in sports betting starts here.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <ReactRouterDOM.Link to="/football" className="bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-primary-hover transition-colors duration-300 transform hover:scale-105">
            View Football Predictions
          </ReactRouterDOM.Link>
          <ReactRouterDOM.Link to="/accumulator" className="bg-brand-secondary text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors duration-300 transform hover:scale-105">
            Explore Accumulator Tips
          </ReactRouterDOM.Link>
        </div>
      </div>

      <div className="mt-16">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">AI Bet of the Day</h2>
            <p className="text-center text-brand-text-secondary mb-6">The single most confident prediction from our AI for today's games.</p>
        </div>
        {loading && <Spinner />}
        {error && <p className="text-red-500 bg-red-100/10 p-4 rounded-md text-center">{error}</p>}
        {!loading && !error && betOfTheDay && (
          <div className="max-w-2xl mx-auto">
             <div className="flex justify-end mb-2">
                <button
                    onClick={handleShareClick}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
                    aria-label="Share Bet of the Day to Telegram"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.789 0l-2 4a1 1 0 00.894 1.447h4a1 1 0 00.894-1.447l-2-4zM10 8a1 1 0 011 1v2.586l2.293 2.293a1 1 0 11-1.414 1.414L10 13.414V9a1 1 0 01-1-1z" /><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm2 0a6 6 0 1012 0 6 6 0 00-12 0z" /></svg>
                    Share to Telegram
                </button>
            </div>
            <ReactRouterDOM.Link to="/match-detail" state={{ match: betOfTheDay }} className="no-underline">
              <MatchPredictionCard 
                match={betOfTheDay} 
                onToggleTrack={handleToggleTrack}
                isTracked={isBetOfTheDayTracked}
                virtualStake={trackedPredictions.find(p => p.id === betOfTheDay.id)?.virtualStake}
              />
            </ReactRouterDOM.Link>
            <SourceList sources={sources} />
          </div>
        )}
         {!loading && !error && !betOfTheDay && (
            <div className="text-center py-10 px-6 bg-brand-surface rounded-lg">
                <p className="mt-1 text-brand-text-secondary">
                    There are no high-confidence "Bet of the Day" predictions available right now. Please check back later.
                </p>
            </div>
         )}
      </div>

      <div className="mt-16 p-8 bg-brand-surface rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="p-4 border-l-4 border-brand-primary">
            <h3 className="font-bold text-lg mb-2">Data Analysis</h3>
            <p className="text-sm text-brand-text-secondary">Our AI scans vast amounts of data, including team form, head-to-head stats, and performance metrics.</p>
          </div>
          <div className="p-4 border-l-4 border-brand-primary">
            <h3 className="font-bold text-lg mb-2">ML Predictions</h3>
            <p className="text-sm text-brand-text-secondary">Using advanced algorithms, we calculate probabilities for match outcomes with a confidence score.</p>
          </div>
          <div className="p-4 border-l-4 border-brand-primary">
            <h3 className="font-bold text-lg mb-2">Actionable Insights</h3>
            <p className="text-sm text-brand-text-secondary">We provide clear, recommended bets and accumulator options based on the AI's findings.</p>
          </div>
        </div>
      </div>
       <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onSubmit={handleStakeSubmit}
        itemName={getItemNameForModal()}
      />
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        data={dataToShare}
        title="AI Bet of the Day"
      />
    </div>
  );
};

export default Home;