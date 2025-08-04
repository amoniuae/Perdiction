import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { SportIcon } from './SportIcon';
import { Sport } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggleButton: React.FC<{className?: string}> = ({ className }) => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full text-brand-text-secondary hover:text-white hover:bg-brand-secondary transition-colors ${className}`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.706-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zm-2.12-10.607a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
            )}
        </button>
    );
};

const navLinks = [
    { to: "/", label: "Home" },
    { to: "/football", label: "Daily Picks" },
    { to: "/leagues", label: "Leagues" },
    { to: "/accumulator", label: "Accumulators" },
    { to: "/generator/custom", label: "Tip Builder" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/learning", label: "Learning" },
];

const Header: React.FC = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = (isActive: boolean): string =>
    `block md:inline-block px-3 py-2 rounded-md text-base md:text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-primary/20 text-brand-primary'
        : 'text-brand-text-secondary hover:bg-brand-secondary hover:text-white'
    }`;

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-brand-surface/80 backdrop-blur-md shadow-md sticky top-0 z-40 border-b border-brand-secondary/50">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <ReactRouterDOM.NavLink to="/" className="flex items-center space-x-2 text-white font-bold text-xl" onClick={handleLinkClick}>
               <SportIcon sport={Sport.Football} className="h-8 w-8 text-brand-primary" />
              <span className="text-brand-text">AI Predictor</span>
            </ReactRouterDOM.NavLink>
          </div>
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center">
            <div className="ml-10 flex items-baseline space-x-2">
              {navLinks.map(link => (
                  <ReactRouterDOM.NavLink key={link.to} to={link.to} className={({isActive}) => navLinkClass(isActive)}>
                      {link.label}
                  </ReactRouterDOM.NavLink>
              ))}
            </div>
            <ThemeToggleButton className="ml-4" />
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-brand-text-secondary hover:text-white hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-brand-surface/95 backdrop-blur-lg" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
              <ReactRouterDOM.NavLink key={link.to} to={link.to} className={({isActive}) => navLinkClass(isActive)} onClick={handleLinkClick}>
                {link.label}
              </ReactRouterDOM.NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;