// src/lib/medical-action-grid-store.ts
import type { SectionKey } from '@/components/doctor-portal/MedicalActionGrid';

const ACTION_GRID_ORDER_KEY = 'doctorPortalMedicalActionGridOrder';

export const getActionGridOrder = (defaultOrder: SectionKey[]): SectionKey[] => {
  try {
    const stored = localStorage.getItem(ACTION_GRID_ORDER_KEY);
    if (stored) {
      const parsedOrder = JSON.parse(stored) as SectionKey[];
      const finalOrder = parsedOrder.filter(key => defaultOrder.includes(key));
      defaultOrder.forEach(key => {
        if (!finalOrder.includes(key)) {
          finalOrder.push(key);
        }
      });
      return finalOrder;
    }
  } catch (e) {
    console.error('Error getting medical action grid order from localStorage', e);
  }
  return [...defaultOrder];
};

export const saveActionGridOrder = (order: SectionKey[]): void => {
  try {
    localStorage.setItem(ACTION_GRID_ORDER_KEY, JSON.stringify(order));
  } catch (e) {
    console.error('Error saving medical action grid order to localStorage', e);
  }
};
