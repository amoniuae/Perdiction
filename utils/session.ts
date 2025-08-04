import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = 'ai-predictor-user-id';

let userId: string | null = null;

export const getSessionUserId = (): string => {
    if (userId) {
        return userId;
    }

    let storedUserId = localStorage.getItem(USER_ID_KEY);
    if (!storedUserId) {
        storedUserId = uuidv4();
        localStorage.setItem(USER_ID_KEY, storedUserId);
    }
    
    userId = storedUserId;
    return userId;
};