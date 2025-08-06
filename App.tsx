import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Football from './pages/Football';
import Leagues from './pages/Leagues';
import Accumulator from './pages/Accumulator';
import AIGenerator from './pages/AIGenerator';
import About from './pages/About';
import { MatchDetail } from './pages/MatchDetail';
import ResponsibleGambling from './pages/ResponsibleGambling';
import { Dashboard } from './pages/Dashboard';
import { Learning } from './pages/Learning';
import ScrollToTop from './components/ScrollToTop';
import { config } from './config';
import { ApiKeyNeededOverlay } from './components/ApiKeyNeededOverlay';
import { DatabaseSetupNeededOverlay } from './components/DatabaseSetupNeededOverlay';
import { useFavorites } from './contexts/FavoritesContext';

const AppContent: React.FC = () => {
  const { error, clearError } = useFavorites();

  if (error?.type === 'DATABASE_TABLES_MISSING' || error?.message === 'DATABASE_TABLES_MISSING') {
    return <DatabaseSetupNeededOverlay />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      {error && (
        <div className="bg-red-600 text-white p-3 text-center sticky top-0 z-50 flex justify-between items-center shadow-lg" role="alert">
          <p className="flex-grow text-sm font-semibold">
            {typeof error === 'string' ? error : error.message}
          </p>
          <button 
            onClick={clearError} 
            className="ml-4 p-1 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Dismiss error message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <ErrorBoundary>
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <ErrorBoundary>
            <ReactRouterDOM.Routes>
              <ReactRouterDOM.Route path="/" element={<Home />} />
              <ReactRouterDOM.Route path="/football" element={<Football />} />
              <ReactRouterDOM.Route path="/leagues" element={<Leagues />} />
              <ReactRouterDOM.Route path="/accumulator" element={<Accumulator />} />
              <ReactRouterDOM.Route path="/generator/custom" element={<AIGenerator />} />
              <ReactRouterDOM.Route path="/dashboard" element={<Dashboard />} />
              <ReactRouterDOM.Route path="/learning" element={<Learning />} />
              <ReactRouterDOM.Route path="/about" element={<About />} />
              <ReactRouterDOM.Route path="/match-detail" element={<MatchDetail />} />
              <ReactRouterDOM.Route path="/responsible-gambling" element={<ResponsibleGambling />} />
            </ReactRouterDOM.Routes>
          </ErrorBoundary>
        </main>
        <Footer />
      </ErrorBoundary>
    </div>
  );
};

const App: React.FC = () => {
  if (config.supabaseAnonKey === 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE' || !config.supabaseAnonKey) {
    return <ApiKeyNeededOverlay />;
  }
  
  return (
    <ErrorBoundary>
      <ReactRouterDOM.HashRouter>
        <ScrollToTop />
        <AppContent />
      </ReactRouterDOM.HashRouter>
    </ErrorBoundary>
  );
};

export default App;