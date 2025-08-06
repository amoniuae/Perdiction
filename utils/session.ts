import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = 'ai-predictor-user-id';
const SESSION_METADATA_KEY = 'ai-predictor-session-metadata';

interface SessionMetadata {
  createdAt: string;
  lastAccessed: string;
  version: string;
  deviceInfo?: string;
}
let userId: string | null = null;
let sessionMetadata: SessionMetadata | null = null;

// Get basic device information for session tracking
const getDeviceInfo = (): string => {
  try {
    const { userAgent, language, platform } = navigator;
    const screenInfo = `${screen.width}x${screen.height}`;
    return `${platform}-${language}-${screenInfo}`;
  } catch (error) {
    return 'unknown';
  }
};
export const getSessionUserId = (): string => {
    if (userId) {
        return userId;
    }

// Validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
// Initialize or update session metadata
const initializeSessionMetadata = (isNewSession: boolean): SessionMetadata => {
  const now = new Date().toISOString();
  
  if (isNewSession) {
    return {
      createdAt: now,
      lastAccessed: now,
      version: '1.0.0',
      deviceInfo: getDeviceInfo()
    };
  }
  
  // Update existing metadata
  const existing = getSessionMetadata();
  return {
    ...existing,
    lastAccessed: now
  };
};

// Get session metadata
const getSessionMetadata = (): SessionMetadata => {
  if (sessionMetadata) {
    return sessionMetadata;
  }
  
  try {
    const stored = localStorage.getItem(SESSION_METADATA_KEY);
    if (stored) {
      sessionMetadata = JSON.parse(stored);
      return sessionMetadata!;
    }
  } catch (error) {
    console.warn('Failed to parse session metadata:', error);
  }
  
  // Return default metadata if none exists
  return {
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    version: '1.0.0'
  };
};
};
// Save session metadata
const saveSessionMetadata = (metadata: SessionMetadata): void => {
  try {
    sessionMetadata = metadata;
    localStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save session metadata:', error);
  }
};
    let storedUserId = localStorage.getItem(USER_ID_KEY);
    if (!storedUserId) {
        storedUserId = uuidv4();
    try {
        let storedUserId = localStorage.getItem(USER_ID_KEY);
        let isNewSession = false;
        
        if (!storedUserId || !isValidUUID(storedUserId)) {
            if (storedUserId) {
                console.warn('Invalid stored user ID detected, generating new one');
            }
            storedUserId = uuidv4();
            isNewSession = true;
            localStorage.setItem(USER_ID_KEY, storedUserId);
        }
        
        userId = storedUserId;
        
        // Initialize or update session metadata
        const metadata = initializeSessionMetadata(isNewSession);
        saveSessionMetadata(metadata);
        
        return userId;
    } catch (error) {
        console.error('Failed to initialize session:', error);
        // Fallback: generate a temporary session ID
        saveSessionMetadata(metadata);
        userId = storedUserId;
        return userId;
    }
};

// Get session information for debugging/analytics
export const getSessionInfo = (): { userId: string; metadata: SessionMetadata } => {
  return {
    userId: getSessionUserId(),
    metadata: getSessionMetadata()
  };
};

// Clear session data (useful for testing or user logout)
export const clearSession = (): void => {
  try {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(SESSION_METADATA_KEY);
    userId = null;
    sessionMetadata = null;
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

// Check if session is expired (older than 30 days)
export const isSessionExpired = (): boolean => {
  try {
    const metadata = getSessionMetadata();
    const createdAt = new Date(metadata.createdAt);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return createdAt < thirtyDaysAgo;
  } catch (error) {
    console.error('Failed to check session expiry:', error);
    return false;
  }
};