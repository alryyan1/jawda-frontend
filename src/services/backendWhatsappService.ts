// src/services/backendWhatsappService.ts
import type { PatientStripped } from '@/types/patients';
import apiClient from './api'; // Your internal API client
import type { BulkMessageFilters } from '@/types/whatsapp';

export interface BackendWhatsAppTextPayload {
  patient_id?: number;
  chat_id?: string; // If sending to a number not linked to a patient
  message: string;
  template_id?: string; // Optional, if your backend handles template hydration
}

export interface BackendWhatsAppMediaPayload {
  patient_id?: number;
  chat_id?: string;
  media_base64: string;
  media_name: string;
  media_caption?: string;
  as_document?: boolean;
}

// Define a common response type from your backend for WhatsApp actions
interface BackendWhatsAppResponse {
  message: string; // Success or error message from your backend
  data?: any; // Could be the waapi response data or your own structured data
  details?: any; // For error details
}

export const sendBackendWhatsAppText = async (payload: BackendWhatsAppTextPayload): Promise<BackendWhatsAppResponse> => {
  const response = await apiClient.post<BackendWhatsAppResponse>('/whatsapp/send-text', payload);
  return response.data;
};

export const sendBackendWhatsAppMedia = async (payload: BackendWhatsAppMediaPayload): Promise<BackendWhatsAppResponse> => {
  const response = await apiClient.post<BackendWhatsAppResponse>('/whatsapp/send-media', payload);
  return response.data;
};

// If you implement fetching templates from your backend:
// export const getAppWhatsAppTemplates = async (): Promise<AppWhatsAppTemplate[]> => {
//   const response = await apiClient.get<{data: AppWhatsAppTemplate[]}>('/whatsapp/templates');
//   return response.data.data;
// };

export interface FetchPatientsForBulkMessagePayload extends BulkMessageFilters {}

export const fetchPatientsForBulkMessage = async (
  filters: FetchPatientsForBulkMessagePayload
): Promise<PatientStripped[]> => { // Backend should return a simple array, not paginated for this UI
  const response = await apiClient.get<{ data: PatientStripped[] }>('/whatsapp/bulk-message-patients', { params: filters });
  return response.data.data; 
};