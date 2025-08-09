
import { MatchStatus } from '../types';

const GHANA_TIMEZONE = 'Africa/Accra';
const TYPICAL_MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours

// Cache for date formatting to improve performance
const dateFormatCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

// Utility function to clear cache when it gets too large
const clearCacheIfNeeded = () => {
  if (dateFormatCache.size > MAX_CACHE_SIZE) {
    dateFormatCache.clear();
  }
};

/**
 * Gets the date string for a given date in the Ghana timezone.
 * Uses en-CA locale for a reliable YYYY-MM-DD format.
 * @param date The date object to format.
 * @returns A string in YYYY-MM-DD format.
 */
export const getDateStringGH = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
        console.warn('Invalid date provided to getDateStringGH:', date);
        return 'Invalid Date';
    }
    
    const cacheKey = `${date.getTime()}-GH`;
    if (dateFormatCache.has(cacheKey)) {
        return dateFormatCache.get(cacheKey)!;
    }
    
    clearCacheIfNeeded();
    
    const options: Intl.DateTimeFormatOptions = {
        timeZone: GHANA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };
    
    const formatted = new Intl.DateTimeFormat('en-CA', options).format(date);
    dateFormatCache.set(cacheKey, formatted);
    return formatted;
};

// Memoized date formatters for better performance
const createMemoizedFormatter = (options: Intl.DateTimeFormatOptions) => {
    const cache = new Map<number, string>();
    return (date: Date): string => {
        const timestamp = date.getTime();
        if (cache.has(timestamp)) {
            return cache.get(timestamp)!;
        }
        
        if (cache.size > 50) cache.clear(); // Prevent memory leaks
        
        const formatted = new Intl.DateTimeFormat('en-US', options).format(date);
        cache.set(timestamp, formatted);
        return formatted;
    };
};

const longDateFormatter = createMemoizedFormatter({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: GHANA_TIMEZONE
});

const mediumDateFormatter = createMemoizedFormatter({
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
});

/**
 * Returns formatted date strings for today and tomorrow based on the Ghana timezone.
 * This is primarily for providing clear date context in AI prompts.
 * @returns An object with todayString and tomorrowString.
 */
export const getTodayAndTomorrowGH = () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
        todayString: longDateFormatter(today),
        tomorrowString: longDateFormatter(tomorrow),
    };
};

/**
 * Returns formatted date strings for the next 7 days based on the Ghana timezone for AI prompts.
 * @returns An object with formatted start and end date strings.
 */
export const getNext7DaysForPromptGH = () => {
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
        startDateString: longDateFormatter(now),
        endDateString: longDateFormatter(future),
    };
};

// Memoized week calculation to avoid repeated computations
let cachedWeekRange: { startOfWeek: Date; endOfWeek: Date; cacheTime: number } | null = null;
const WEEK_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Gets the start (Monday) and end (Sunday) of the current week in the Ghana timezone.
 * This is calculated relative to the current date in the specified timezone.
 * @returns An object with startOfWeek and endOfWeek Date objects.
 */
export const getThisWeekRangeGH = (): { startOfWeek: Date; endOfWeek: Date } => {
    const currentTime = Date.now();
    
    // Return cached result if still valid
    if (cachedWeekRange && (currentTime - cachedWeekRange.cacheTime) < WEEK_CACHE_DURATION) {
        return {
            startOfWeek: cachedWeekRange.startOfWeek,
            endOfWeek: cachedWeekRange.endOfWeek
        };
    }
    
    const now = new Date();
    const ghanaDateStr = now.toLocaleString('en-US', { timeZone: GHANA_TIMEZONE });
    const ghanaNow = new Date(ghanaDateStr);

    const dayOfWeek = ghanaNow.getDay(); 
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; 

    const startOfWeek = new Date(ghanaNow.getFullYear(), ghanaNow.getMonth(), ghanaNow.getDate() + diffToMonday);
    startOfWeek.setHours(0,0,0,0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const result = { startOfWeek, endOfWeek };
    
    // Cache the result
    cachedWeekRange = {
        ...result,
        cacheTime: currentTime
    };
    
    return result;
};

/**
 * Returns formatted date strings for the start and end of the current week for AI prompts.
 * @returns An object with formatted start and end date strings.
 */
export const getThisWeekRangeForPromptGH = () => {
    const { startOfWeek, endOfWeek } = getThisWeekRangeGH();

    return {
        startOfWeek: longDateFormatter(startOfWeek),
        endOfWeek: longDateFormatter(endOfWeek),
    };
};

// Memoized date comparison functions
const dateComparisonCache = new Map<string, boolean>();

const memoizedDateComparison = (date: Date, comparisonFn: () => boolean, cacheKey: string): boolean => {
    if (dateComparisonCache.has(cacheKey)) {
        return dateComparisonCache.get(cacheKey)!;
    }
    
    if (dateComparisonCache.size > 200) {
        dateComparisonCache.clear();
    }
    
    const result = comparisonFn();
    dateComparisonCache.set(cacheKey, result);
    return result;
};

/**
 * Checks if a given date is within the current week (Mon-Sun) in the Ghana timezone.
 * @param date The date to check (assumed to be a correct Date object from an ISO string).
 * @returns True if the date is within this week, false otherwise.
 */
export const isWithinThisWeekGH = (date: Date): boolean => {
    if (!date || isNaN(date.getTime())) {
        return false;
    }
    
    const cacheKey = `week-${date.getTime()}-${Math.floor(Date.now() / WEEK_CACHE_DURATION)}`;
    return memoizedDateComparison(date, () => {
        const { startOfWeek, endOfWeek } = getThisWeekRangeGH();
        return date >= startOfWeek && date <= endOfWeek;
    }, cacheKey);
};

/**
 * Checks if a given date is "today" in the Ghana timezone.
 * @param date The date to check.
 * @returns True if the date is today in Ghana, false otherwise.
 */
export const isTodayGH = (date: Date): boolean => {
    if (!date || isNaN(date.getTime())) {
        return false;
    }
    
    const today = new Date();
    const cacheKey = `today-${date.getTime()}-${Math.floor(today.getTime() / (24 * 60 * 60 * 1000))}`;
    return memoizedDateComparison(date, () => {
        return getDateStringGH(today) === getDateStringGH(date);
    }, cacheKey);
};

/**
 * Checks if a given date is "tomorrow" in the Ghana timezone.
 * @param date The date to check.
 * @returns True if the date is tomorrow in Ghana, false otherwise.
 */
export const isTomorrowGH = (date: Date): boolean => {
    if (!date || isNaN(date.getTime())) {
        return false;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const cacheKey = `tomorrow-${date.getTime()}-${Math.floor(Date.now() / (24 * 60 * 60 * 1000))}`;
    return memoizedDateComparison(date, () => {
        return getDateStringGH(tomorrow) === getDateStringGH(date);
    }, cacheKey);
};

/**
 * Determines the status of a match (Live, Finished, Upcoming) based on its date.
 * Implements caching for frequently checked matches.
 * @param matchDateString The ISO 8601 string of the match date.
 * @returns An object containing the status and the text to display.
 */
const matchStatusCache = new Map<string, { status: MatchStatus; text: string; timestamp: number }>();
const MATCH_STATUS_CACHE_DURATION = 60 * 1000; // 1 minute

export const getMatchStatus = (matchDateString: string): { status: MatchStatus; text: string } => {
  // Check cache first
  const now = Date.now();
  const cached = matchStatusCache.get(matchDateString);
  
  if (cached && (now - cached.timestamp) < MATCH_STATUS_CACHE_DURATION) {
    return { status: cached.status, text: cached.text };
  }

  const matchDate = new Date(matchDateString);

  if (!matchDateString || isNaN(matchDate.getTime())) {
    console.warn(`Invalid date string provided to getMatchStatus: "${matchDateString}"`);
    const result = { status: MatchStatus.Upcoming, text: 'Date TBD' };
    matchStatusCache.set(matchDateString, { ...result, timestamp: now });
    return result;
  }
  
  const currentTime = new Date();
  const typicalMatchDurationMs = 2.5 * 60 * 60 * 1000; // 2.5 hours
  const matchEndTime = new Date(matchDate.getTime() + typicalMatchDurationMs);

  let result: { status: MatchStatus; text: string };

  if (currentTime > matchEndTime) {
    result = { status: MatchStatus.Finished, text: 'Finished' };
  } else if (currentTime >= matchDate && currentTime <= matchEndTime) {
    result = { status: MatchStatus.Live, text: 'Live' };
  } else {
    const formattedDate = mediumDateFormatter(matchDate);
    result = { status: MatchStatus.Upcoming, text: formattedDate };
  }

  // Cache the result
  matchStatusCache.set(matchDateString, { ...result, timestamp: now });
  
  // Clean up old cache entries periodically
  if (matchStatusCache.size > 100) {
    const cutoff = now - MATCH_STATUS_CACHE_DURATION * 2;
    for (const [key, value] of matchStatusCache.entries()) {
      if (value.timestamp < cutoff) {
        matchStatusCache.delete(key);
      }
    }
  }

  return result;
};

// Utility to clear date caches (useful for testing or memory management)
export const clearDateCaches = (): void => {
  dateFormatCache.clear();
  matchStatusCache.clear();
};

// Utility function to clear all caches (useful for testing or memory management)
export const clearDateUtilsCaches = (): void => {
  dateFormatCache.clear();
  dateComparisonCache.clear();
  matchStatusCache.clear();
  cachedWeekRange = null;
};