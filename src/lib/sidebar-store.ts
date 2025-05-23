// Helper functions to manage sidebar collapsed state in localStorage

const SIDEBAR_COLLAPSED_KEY: string = 'sidebarCollapsed';

export const getSidebarCollapsedState = (): boolean => {
  try {
    const storedValue: string | null = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return storedValue === 'true';
  } catch {
    return false; // Default to expanded if localStorage is not available
  }
};

export const setSidebarCollapsedState = (collapsed: boolean): void => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // Silently fail if localStorage is not available
  }
}; 