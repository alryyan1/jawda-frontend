// src/services/whatsappCloudApiService.ts
import apiClient from './api';

export interface WhatsAppCloudTextPayload {
  to: string;
  text: string;
  access_token?: string;
  phone_number_id?: string;
}

export interface WhatsAppCloudTemplatePayload {
  to: string;
  template_name: string;
  language_code?: string;
  components?: any[];
  access_token?: string;
  phone_number_id?: string;
}

export interface WhatsAppCloudDocumentPayload {
  to: string;
  document_url: string;
  filename?: string;
  caption?: string;
  access_token?: string;
  phone_number_id?: string;
}

export interface WhatsAppCloudImagePayload {
  to: string;
  image_url: string;
  caption?: string;
  access_token?: string;
  phone_number_id?: string;
}

export interface WhatsAppCloudResponse {
  success: boolean;
  data?: any;
  error?: string;
  message_id?: string;
}

export interface WhatsAppCloudPhoneNumbersResponse {
  success: boolean;
  data?: {
    data?: Array<{
      id: string;
      verified_name?: string;
      display_phone_number?: string;
      quality_rating?: string;
    }>;
  };
  error?: string;
}

export interface WhatsAppCloudConfigResponse {
  success: boolean;
  configured: boolean;
  phone_number_id?: string;
  waba_id?: string;
}

// Send text message via WhatsApp Cloud API
export const sendWhatsAppCloudText = async (payload: WhatsAppCloudTextPayload): Promise<WhatsAppCloudResponse> => {
  const response = await apiClient.post<WhatsAppCloudResponse>('/whatsapp-cloud/send-text', payload);
  return response.data;
};

// Send template message via WhatsApp Cloud API
export const sendWhatsAppCloudTemplate = async (payload: WhatsAppCloudTemplatePayload): Promise<WhatsAppCloudResponse> => {
  const response = await apiClient.post<WhatsAppCloudResponse>('/whatsapp-cloud/send-template', payload);
  return response.data;
};

// Send document via WhatsApp Cloud API
export const sendWhatsAppCloudDocument = async (payload: WhatsAppCloudDocumentPayload): Promise<WhatsAppCloudResponse> => {
  const response = await apiClient.post<WhatsAppCloudResponse>('/whatsapp-cloud/send-document', payload);
  return response.data;
};

// Send image via WhatsApp Cloud API
export const sendWhatsAppCloudImage = async (payload: WhatsAppCloudImagePayload): Promise<WhatsAppCloudResponse> => {
  const response = await apiClient.post<WhatsAppCloudResponse>('/whatsapp-cloud/send-image', payload);
  return response.data;
};

// Get phone numbers
export const getWhatsAppCloudPhoneNumbers = async (params?: {
  waba_id?: string;
  access_token?: string;
}): Promise<WhatsAppCloudPhoneNumbersResponse> => {
  const response = await apiClient.get<WhatsAppCloudPhoneNumbersResponse>('/whatsapp-cloud/phone-numbers', {
    params,
  });
  return response.data;
};

// Check if service is configured
export const isWhatsAppCloudConfigured = async (): Promise<WhatsAppCloudConfigResponse> => {
  const response = await apiClient.get<WhatsAppCloudConfigResponse>('/whatsapp-cloud/configured');
  return response.data;
};

