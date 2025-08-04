
import { MatchStatus } from '../types';

const GHANA_TIMEZONE = 'Africa/Accra';

/**
 * Gets the date string for a given date in the Ghana timezone.
 * Uses en-CA locale for a reliable YYYY-MM-DD format.
 * @param date The date object to format.
 * @returns A string in YYYY-MM-DD format.
 */
const getDateStringGH = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
        return 'Invalid Date'; // Return a non-matching string to prevent errors
    }
    const options: Intl.DateTimeFormatOptions = {
        timeZone: GHANA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };
    return new Intl.DateTimeFormat('en-CA', options).format(date);
};


/**
 * Returns formatted date strings for today and tomorrow based on the Ghana timezone.
 * This is primarily for providing clear date context in AI prompts.
 * @returns An object with todayString and tomorrowString.
 */
export const getTodayAndTomorrowGH = () => {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: GHANA_TIMEZONE
    };
    
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
        todayString: new Intl.DateTimeFormat('en-US', options).format(today),
        tomorrowString: new Intl.DateTimeFormat('en-US', options).format(tomorrow),
    };
};

/**
 * Returns formatted date strings for the next 7 days based on the Ghana timezone for AI prompts.
 * @returns An object with formatted start and end date strings.
 */
export const getNext7DaysForPromptGH = () => {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: GHANA_TIMEZONE,
    };

    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
        startDateString: new Intl.DateTimeFormat('en-US', options).format(now),
        endDateString: new Intl.DateTimeFormat('en-US', options).format(future),
    };
};

/**
 * Gets the start (Monday) and end (Sunday) of the current week in the Ghana timezone.
 * This is calculated relative to the current date in the specified timezone.
 * @returns An object with startOfWeek and endOfWeek Date objects.
 */
export const getThisWeekRangeGH = (): { startOfWeek: Date; endOfWeek: Date } => {
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

    return { startOfWeek, endOfWeek };
};

/**
 * Returns formatted date strings for the start and end of the current week for AI prompts.
 * @returns An object with formatted start and end date strings.
 */
export const getThisWeekRangeForPromptGH = () => {
    const { startOfWeek, endOfWeek } = getThisWeekRangeGH();
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: GHANA_TIMEZONE,
    };

    return {
        startOfWeek: new Intl.DateTimeFormat('en-US', options).format(startOfWeek),
        endOfWeek: new Intl.DateTimeFormat('en-US', options).format(endOfWeek),
    };
};


/**
 * Checks if a given date is within the current week (Mon-Sun) in the Ghana timezone.
 * @param date The date to check (assumed to be a correct Date object from an ISO string).
 * @returns True if the date is within this week, false otherwise.
 */
export const isWithinThisWeekGH = (date: Date): boolean => {
    const { startOfWeek, endOfWeek } = getThisWeekRangeGH();
    return date >= startOfWeek && date <= endOfWeek;
};


/**
 * Checks if a given date is "today" in the Ghana timezone.
 * @param date The date to check.
 * @returns True if the date is today in Ghana, false otherwise.
 */
export const isTodayGH = (date: Date): boolean => {
    return getDateStringGH(new Date()) === getDateStringGH(date);
};

/**
 * Checks if a given date is "tomorrow" in the Ghana timezone.
 * @param date The date to check.
 * @returns True if the date is tomorrow in Ghana, false otherwise.
 */
export const isTomorrowGH = (date: Date): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getDateStringGH(tomorrow) === getDateStringGH(date);
};

/**
 * Determines the status of a match (Live, Finished, Upcoming) based on its date.
 * @param matchDateString The ISO 8601 string of the match date.
 * @returns An object containing the status and the text to display.
 */
export const getMatchStatus = (matchDateString: string): { status: MatchStatus; text: string } => {
  const matchDate = new Date(matchDateString);

  if (!matchDateString || isNaN(matchDate.getTime())) {
    console.warn(`Invalid date string provided to getMatchStatus: "${matchDateString}"`);
    return { status: MatchStatus.Upcoming, text: 'Date TBD' };
  }
  
  const now = new Date();
  const typicalMatchDurationMs = 2.5 * 60 * 60 * 1000; // 2.5 hours
  const matchEndTime = new Date(matchDate.getTime() + typicalMatchDurationMs);

  if (now > matchEndTime) {
    return { status: MatchStatus.Finished, text: 'Finished' };
  }

  if (now >= matchDate && now <= matchEndTime) {
    return { status: MatchStatus.Live, text: 'Live' };
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
  };
  const formattedDate = new Intl.DateTimeFormat('en-GH', options).format(matchDate);
  return { status: MatchStatus.Upcoming, text: formattedDate };
};
