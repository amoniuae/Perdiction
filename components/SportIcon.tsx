
import React from 'react';
import { Sport } from '../types';

interface SportIconProps {
  sport: Sport;
  className?: string;
}

export const SportIcon: React.FC<SportIconProps> = ({ sport, className = 'h-6 w-6' }) => {
  const icons: Record<Sport, React.ReactNode> = {
    [Sport.Football]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664l.369.555a1.125 1.125 0 0 1 .162 1.305l-.392.588a2.25 2.25 0 0 1-1.437.879l-.29.058a1.125 1.125 0 0 0-.939 1.49l.694 1.233a2.25 2.25 0 0 1 .283 1.095l-.123.419a1.125 1.125 0 0 1-1.254 1.058l-.29-.072a1.125 1.125 0 0 0-1.196.858l-.071.29a1.125 1.125 0 0 0 .964 1.348l.25.044a1.125 1.125 0 0 1 .832 1.342l-.657 1.139a2.25 2.25 0 0 1-2.224 1.321H9a2.25 2.25 0 0 1-2.224-1.321l-.657-1.139a1.125 1.125 0 0 1 .832-1.342l.25-.044a1.125 1.125 0 0 0 .964-1.348l-.071-.29a1.125 1.125 0 0 0-1.196-.858l-.29.072a1.125 1.125 0 0 1-1.254-1.058l-.123-.419a2.25 2.25 0 0 1 .283-1.095l.694-1.233a1.125 1.125 0 0 0-.939-1.49l-.29-.058a2.25 2.25 0 0 1-1.437-.879l-.392-.588a1.125 1.125 0 0 1 .162-1.305l.369-.555a1.107 1.107 0 0 0-.57-1.664l-.143-.048a2.25 2.25 0 0 1-1.161-.886l-.51-.766a1.125 1.125 0 0 1 .216-1.49l1.068-.89a1.125 1.125 0 0 1 .405-.864v-.568a1.125 1.125 0 0 1 2.25 0Z" />
      </svg>
    ),
    [Sport.Basketball]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.793V21l-4.5-3.5L12 21l-4.5-3.5L3 21V12.793a12.016 12.016 0 0 1 0-1.586V3l4.5 3.5L12 3l4.5 3.5L21 3v8.207a12.016 12.016 0 0 1 0 1.586Z" />
      </svg>
    ),
    [Sport.Tennis]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5A7.5 7.5 0 0 0 12 4.5v.75m0 14.25v-.75a7.5 7.5 0 0 0 7.5-7.5h.75a7.5 7.5 0 0 0-7.5-7.5v.75m0 14.25a7.5 7.5 0 0 0-7.5-7.5H4.5m16.5 7.5h.75a7.5 7.5 0 0 0-7.5-7.5v.75m0 0H12m0 0v-1.5m0 1.5v-7.5m0 7.5v-1.5m0 0v-3.75m-3.75 5.25H8.25m9 0h.75M12 4.5v-1.5m0 1.5v-3m0 3h1.5M12 4.5H9" />
        </svg>
    ),
    [Sport.TableTennis]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-2.835-2.835m2.835 2.835L14.415 1.835m5.835 5.665H18.75m-2.25 2.25l-2.835-2.835m2.835 2.835L10.835 4.5m5.835 5.665H15m4.5-2.25h-2.25m-3-3l-2.835-2.835m2.835 2.835L8.415 1.5m5.835 5.665H12.75m.75-4.5l-2.835-2.835M13.5 3L10.665.165m2.835 2.835H12.75m-2.25 2.25l-2.835-2.835m2.835 2.835L7.835 3.75m5.835 5.665H10.5m1.5-4.5h-1.5m-.75-3l-2.835-2.835m2.835 2.835L6.415.75m5.835 5.665H9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    [Sport.IceHockey]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.969-4.031 9-9 9s-9-4.031-9-9 4.031-9 9-9 9 4.031 9 9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5M12 3.75v16.5" />
      </svg>
    ),
    [Sport.Volleyball]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9.75c0 4.969-4.031 9-9 9s-9-4.031-9-9 4.031-9 9-9 9 4.031 9 9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.625 5.625l12.75 12.75m0-12.75L5.625 18.375" />
      </svg>
    ),
    [Sport.Handball]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75h-7.5a.75.75 0 00-.75.75v10.5a.75.75 0 00.75.75h7.5a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
      </svg>
    ),
    [Sport.AmericanFootball]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 3m0 0l-3 3m3-3h6m3 0l-3-3m0 0l3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return icons[sport] || null;
};
