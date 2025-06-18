// src/lib/panel-settings-store.ts (New file)
const PANEL_ORDER_KEY = 'labWorkstationPanelOrder';
const PANEL_COLLAPSED_KEY_PREFIX = 'labWorkstationPanelCollapsed_';

export type PanelId = 'patientInfo' | 'requestStatus' | 'parameterDetails';

const DEFAULT_PANEL_ORDER: PanelId[] = ['patientInfo', 'requestStatus', 'parameterDetails'];

export const getPanelOrder = (): PanelId[] => {
  try {
    const storedOrder = localStorage.getItem(PANEL_ORDER_KEY);
    if (storedOrder) {
      const parsedOrder = JSON.parse(storedOrder) as PanelId[];
      // Ensure all default panels are present, add missing ones to the end
      const newOrder = [...DEFAULT_PANEL_ORDER];
      parsedOrder.forEach(id => {
        if (newOrder.includes(id)) {
          newOrder.splice(newOrder.indexOf(id), 1); // Remove from default position
          newOrder.push(id); // Add to its stored position (effectively moving it)
        }
      });
       // Ensure all default panels are present, add new ones from default if not in stored
      const finalOrder = [...parsedOrder];
      DEFAULT_PANEL_ORDER.forEach(defaultId => {
          if (!finalOrder.includes(defaultId)) {
              finalOrder.push(defaultId);
          }
      });
      // Remove any IDs that are no longer in DEFAULT_PANEL_ORDER
      return finalOrder.filter(id => DEFAULT_PANEL_ORDER.includes(id));

    }
  } catch (e) { console.error("Error getting panel order from localStorage", e); }
  return [...DEFAULT_PANEL_ORDER];
};

export const savePanelOrder = (order: PanelId[]): void => {
  try {
    localStorage.setItem(PANEL_ORDER_KEY, JSON.stringify(order));
  } catch (e) { console.error("Error saving panel order to localStorage", e); }
};

export const getPanelCollapsedState = (panelId: PanelId, defaultCollapsed = false): boolean => {
  try {
    const storedState = localStorage.getItem(`${PANEL_COLLAPSED_KEY_PREFIX}${panelId}`);
    return storedState ? JSON.parse(storedState) : defaultCollapsed;
  } catch (e) { console.error("Error getting panel collapsed state", e); }
  return defaultCollapsed;
};

export const savePanelCollapsedState = (panelId: PanelId, isCollapsed: boolean): void => {
  try {
    localStorage.setItem(`${PANEL_COLLAPSED_KEY_PREFIX}${panelId}`, JSON.stringify(isCollapsed));
  } catch (e) { console.error("Error saving panel collapsed state", e); }
};