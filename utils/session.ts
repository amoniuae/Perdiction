// Session utilities for user management

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
}

/**
 * Gets the current session user ID from localStorage or sessionStorage
 * This is a placeholder implementation - replace with your actual session management
 */
export const getSessionUserId = (): string | null => {
  try {
    // Try to get from localStorage first
    const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
    return userId;
  } catch (error) {
    console.error('Error getting session user ID:', error);
    return null;
  }
};

/**
 * Sets the session user ID
 */
export const setSessionUserId = (userId: string): void => {
  try {
    localStorage.setItem('user_id', userId);
  } catch (error) {
    console.error('Error setting session user ID:', error);
  }
};

/**
 * Clears the session user ID
 */
export const clearSessionUserId = (): void => {
  try {
    localStorage.removeItem('user_id');
    sessionStorage.removeItem('user_id');
  } catch (error) {
    console.error('Error clearing session user ID:', error);
  }
};

/**
 * Gets the current session user information
 */
export const getSessionUser = (): SessionUser | null => {
  const userId = getSessionUserId();
  if (!userId) return null;

  try {
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return {
        id: userId,
        ...userData
      };
    }
    
    return { id: userId };
  } catch (error) {
    console.error('Error getting session user:', error);
    return { id: userId };
  }
};

/**
 * Sets the session user information
 */
export const setSessionUser = (user: SessionUser): void => {
  try {
    setSessionUserId(user.id);
    const { id, ...userData } = user;
    localStorage.setItem('user_data', JSON.stringify(userData));
  } catch (error) {
    console.error('Error setting session user:', error);
  }
};