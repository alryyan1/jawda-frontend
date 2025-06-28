// src/lib/appearance-settings-store.ts (New File)

export type ItemState = 'default' | 'selected' | 'printed' | 'isLocked';

export interface LabItemStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  isBold: boolean;
}

export interface LabAppearanceSettings {
  default: LabItemStyle;
  selected: LabItemStyle;
  printed: LabItemStyle;
  isLocked: { // Special state for the lock icon color
    iconColor: string;
  };
  // Add other global settings like font size, etc. if needed
}

// Sensible, professional defaults
export const DEFAULT_APPEARANCE_SETTINGS: LabAppearanceSettings = {
  default: {
    backgroundColor: '#FFFFFF', // White
    borderColor: '#E2E8F0', // slate-200
    textColor: '#334155', // slate-700
    badgeBackgroundColor: '#475569', // slate-600 (for unknown payment status)
    badgeTextColor: '#FFFFFF',
    isBold: false,
  },
  selected: {
    backgroundColor: '#EFF6FF', // blue-50
    borderColor: '#3B82F6', // blue-500
    textColor: '#1E40AF', // blue-800
    badgeBackgroundColor: '#F97316', // orange-500
    badgeTextColor: '#FFFFFF',
    isBold: true,
  },
  printed: {
    backgroundColor: '#EEF2FF', // indigo-50
    borderColor: '#6366F1', // indigo-500
    textColor: '#4338CA', // indigo-800
    badgeBackgroundColor: '#10B981', // emerald-500
    badgeTextColor: '#FFFFFF',
    isBold: false,
  },
  isLocked: {
    iconColor: '#EF4444', // red-500
  },
};

const APPEARANCE_SETTINGS_KEY = 'labItemAppearanceSettings';

export const getAppearanceSettings = (): LabAppearanceSettings => {
  try {
    const storedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
    if (storedSettings) {
      // Merge stored settings with defaults to handle new properties added later
      return { ...DEFAULT_APPEARANCE_SETTINGS, ...JSON.parse(storedSettings) };
    }
  } catch (e) { console.error("Error getting appearance settings:", e); }
  return DEFAULT_APPEARANCE_SETTINGS;
};

export const saveAppearanceSettings = (settings: LabAppearanceSettings): void => {
  try {
    localStorage.setItem(APPEARANCE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) { console.error("Error saving appearance settings:", e); }
};