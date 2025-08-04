import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { FootballPageData, MatchPrediction, AccumulatorTip } from '../types';
import { shareToTelegram } from '../services/telegramService';
import Spinner from './Spinner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Partial<FootballPageData> | null;
  title: string;
}

const formatPredictionForTelegram = (p: MatchPrediction): string => {
  let message = `*${p.teamA} vs ${p.teamB}*
- _Prediction_: ${p.aiPrediction}
- _Recommended Bet_: ${p.recommendedBet}
- _Odds_: @${(p.odds || 0).toFixed(2)}
- _Confidence_: ${(p.aiConfidence || 0).toFixed(1)}%`;

  if (p.aiRationale) {
    message += `\n- _Rationale_: ${p.aiRationale}`;
  }
  return message;
};

const formatAccumulatorForTelegram = (a: AccumulatorTip): string => {
  const games = (a.games || []).map((g, i) => {
    let legString = `${i + 1}. ${g.teamA} vs ${g.teamB} (${g.prediction} @${(g.odds || 0).toFixed(2)})`;
    if (g.rationale) {
        legString += `\n   - _AI Justification_: ${g.rationale}`;
    }
    return legString;
  }).join('\n');

  let message = `*${a.name}* (${a.riskLevel} Risk)
- _Combined Odds_: @${(a.combinedOdds || 0).toFixed(2)}
- _Success Probability_: ${(a.successProbability || 0)}%`;

  if (a.rationale) {
    message += `\n- _Strategy_: ${a.rationale}`;
  }
  
  message += `\n_Games_:\n${games}`;
  return message;
};


export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data, title }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const formattedMessage = useMemo(() => {
    if (!data) return '';
    let message = `*${title}*\n\n`;

    if (data.predictions && data.predictions.length > 0) {
      if(data.predictions.length > 1) message += '*== Predictions ==*\n';
      message += data.predictions.map(formatPredictionForTelegram).join('\n\n');
    }

    if (data.accumulators && data.accumulators.length > 0) {
      if(data.predictions && data.predictions.length > 0) message += '\n\n';
      if(data.accumulators.length > 1) message += '*== Accumulators ==*\n';
      message += data.accumulators.map(formatAccumulatorForTelegram).join('\n\n');
    }
    
    message += '\n\n_Disclaimer: AI Predictions. Not guaranteed. Gamble responsibly._';
    return message;
  }, [data, title]);

  const handleTelegramShare = async () => {
    setStatus('loading');
    setErrorMessage('');
    const result = await shareToTelegram(formattedMessage);
    if (result.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'An unknown error occurred.');
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(formattedMessage)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    if (status === 'loading') return;
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };
  
  const renderContent = () => {
      switch (status) {
          case 'loading':
              return <div className="text-center py-8"><Spinner size="md" /> <p className="mt-4 text-brand-text">Posting to Telegram...</p></div>;
          case 'success':
              return (
                  <div className="text-center py-8">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h3 className="text-lg font-medium text-brand-text">Successfully Shared!</h3>
                      <p className="text-sm text-brand-text-secondary mt-2">The predictions have been posted to your Telegram channel.</p>
                      <button onClick={handleClose} className="mt-6 px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors">
                          Done
                      </button>
                  </div>
              );
          case 'error':
               return (
                  <div className="text-center py-8">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <h3 className="text-lg font-medium text-brand-text">Sharing Failed</h3>
                      <p className="text-sm text-brand-text-secondary mt-2">Could not post to Telegram. Please check your configuration and try again.</p>
                      <p className="text-xs text-red-400 mt-2 bg-brand-bg p-2 rounded-md">{errorMessage}</p>
                       <button onClick={handleClose} className="mt-6 px-4 py-2 text-sm font-medium rounded-md bg-brand-secondary text-white hover:bg-opacity-80 transition-colors">
                          Close
                      </button>
                  </div>
              );
          default:
              return (
                 <>
                    <p className="text-sm text-brand-text-secondary mb-4">
                        A preview of the message that will be sent.
                    </p>
                    <pre className="w-full bg-brand-bg text-sm text-brand-text p-4 rounded-md whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {formattedMessage}
                    </pre>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-secondary text-white hover:bg-opacity-80 transition-colors">
                            Cancel
                        </button>
                        <button type="button" onClick={handleWhatsAppShare} className="px-4 py-2 text-sm font-medium rounded-md bg-[#25D366] text-white hover:bg-[#1EAE52] transition-colors flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99 0-3.903-.52-5.58-1.452l-6.341 1.693zm5.423-1.807l1.08 1.021 1.021 1.08c1.479 1.479 3.584 2.296 5.725 2.296 5.45 0 9.881-4.431 9.881-9.881s-4.431-9.881-9.881-9.881-9.881 4.431-9.881 9.881c0 2.021.59 3.94 1.635 5.578l.499.782-.492 1.834-1.834.491z"/></svg>
                            Share to WhatsApp
                        </button>
                        <button type="button" onClick={handleTelegramShare} className="px-4 py-2 text-sm font-medium rounded-md bg-[#0088cc] text-white hover:bg-[#0077b3] transition-colors flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23l7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3L3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.57c-.28 1.1-.94 1.36-1.8 1.1l-5.11-1.64l-2.43 2.35c-.22.22-.4.33-.7.33l.24-4.14z"/></svg>
                            Share to Telegram
                        </button>
                    </div>
                </>
              );
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      {renderContent()}
    </Modal>
  );
};
