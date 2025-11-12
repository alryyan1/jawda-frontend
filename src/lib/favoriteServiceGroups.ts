// Utility functions for managing favorite service groups in localStorage

const FAVORITE_SERVICE_GROUPS_KEY = 'favoriteServiceGroups';

export const getFavoriteServiceGroups = (): number[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITE_SERVICE_GROUPS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading favorite service groups from localStorage:', error);
    return [];
  }
};

export const saveFavoriteServiceGroups = (groupIds: number[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITE_SERVICE_GROUPS_KEY, JSON.stringify(groupIds));
  } catch (error) {
    console.error('Error saving favorite service groups to localStorage:', error);
  }
};

export const clearFavoriteServiceGroups = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(FAVORITE_SERVICE_GROUPS_KEY);
  } catch (error) {
    console.error('Error clearing favorite service groups from localStorage:', error);
  }
};

