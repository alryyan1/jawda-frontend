// src/services/ultramsgService.ts
import apiClient from './api';

export interface UltramsgTextPayload {
  to: string;
  body: string;
}

export interface UltramsgDocumentPayload {
  to: string;
  filename: string;
  document: string; // base64 or URL
  caption?: string;
}

export interface UltramsgResponse {
  success: boolean;
  data?: any;
  error?: string;
  message_id?: number;
}

export interface UltramsgInstanceStatus {
  success: boolean;
  data?: {
    status?: string;
    connected?: boolean;
    [key: string]: any;
  };
  error?: string;
}

// Send text message via Ultramsg
export const sendUltramsgText = async (payload: UltramsgTextPayload): Promise<UltramsgResponse> => {
  const response = await apiClient.post<UltramsgResponse>('/ultramsg/send-text', payload);
  return response.data;
};

// Send document via Ultramsg
export const sendUltramsgDocument = async (payload: UltramsgDocumentPayload): Promise<UltramsgResponse> => {
  const response = await apiClient.post<UltramsgResponse>('/ultramsg/send-document', payload);
  return response.data;
};

// Send document from file upload
export const sendUltramsgDocumentFromFile = async (formData: FormData): Promise<UltramsgResponse> => {
  const response = await apiClient.post<UltramsgResponse>('/ultramsg/send-document-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Send document from URL
export const sendUltramsgDocumentFromUrl = async (payload: {
  to: string;
  document_url: string;
  filename: string;
  caption?: string;
}): Promise<UltramsgResponse> => {
  const response = await apiClient.post<UltramsgResponse>('/ultramsg/send-document-url', payload);
  return response.data;
};

// Get instance status
export const getUltramsgInstanceStatus = async (): Promise<UltramsgInstanceStatus> => {
  const response = await apiClient.get<UltramsgInstanceStatus>('/ultramsg/instance-status');
  return response.data;
};

// Check if service is configured
export const isUltramsgConfigured = async (): Promise<{ configured: boolean; instance_id?: string }> => {
  const response = await apiClient.get<{ configured: boolean; instance_id?: string }>('/ultramsg/configured');
  return response.data;
};
