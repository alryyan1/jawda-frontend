// src/services/settingService.ts
import apiClient from './api';
import type { Setting, SettingsFormData } from '../types/settings';

const API_URL = '/settings';

export const DEFAULT_FIRESTORE_FACILITY_ID = 'KyKrjLBHMBGHtLzU3RS3';

let _firestoreFacilityId: string | null = null;

// Cached Firestore medicalFacilities document ID from General Settings.
export const getFirestoreFacilityId = async (): Promise<string> => {
  if (_firestoreFacilityId) return _firestoreFacilityId;
  try {
    const settings = await getSettings();
    _firestoreFacilityId = settings?.firestore_facility_id?.trim() || DEFAULT_FIRESTORE_FACILITY_ID;
  } catch {
    return DEFAULT_FIRESTORE_FACILITY_ID;
  }
  return _firestoreFacilityId;
};

// Call this after saving settings so the next Firestore call uses the new facility.
export const invalidateFirestoreFacilityIdCache = (): void => {
  _firestoreFacilityId = null;
};

export const getSettings = async (): Promise<Setting | null> => {
  try {
     // Backend SettingResource wraps in 'data'
     const response = await apiClient.get<{ data: Setting }>(API_URL);
     return response.data.data;
  } catch (error: any) {
     if (error.response && error.response.status === 404) {
         return null; // No settings found/initialized
     }
     throw error;
  }
};

export const updateSettings = async (data: SettingsFormData): Promise<Setting> => {
  const formData = new FormData();
  // Append _method PUT if your route is PUT but you send FormData
  // formData.append('_method', 'PUT'); // Not needed if route is POST

  (Object.keys(data) as Array<keyof SettingsFormData>).forEach(key => {
     const value = data[key];
     if (key.endsWith('_file') && value instanceof File) {
         formData.append(key, value);
     } else if (key.startsWith('clear_') && typeof value === 'boolean') {
         formData.append(key, value ? '1' : '0');
     }
      else if (typeof value === 'boolean') {
         formData.append(key, value ? '1' : '0');
     } else if (value !== null && value !== undefined) {
         formData.append(key, String(value));
     }
  });
  
  // Using POST because of FormData for file uploads
  const response = await apiClient.post<{ data: Setting }>(API_URL, formData, {
     headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};