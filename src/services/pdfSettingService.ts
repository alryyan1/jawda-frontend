import apiClient from './api';
import type { PdfSetting, PdfSettingFormData } from '@/types/pdfSettings';

export const getPdfSettings = async (): Promise<PdfSetting> => {
  const response = await apiClient.get<{ data: PdfSetting }>('/pdf-settings');
  return response.data.data || response.data;
};

export const updatePdfSettings = async (data: PdfSettingFormData): Promise<PdfSetting> => {
  const response = await apiClient.put<{ data: PdfSetting }>('/pdf-settings', data);
  return response.data.data || response.data;
};

export const uploadLogo = async (file: File): Promise<PdfSetting> => {
  const formData = new FormData();
  formData.append('logo', file);
  
  const response = await apiClient.post<{ data: PdfSetting }>('/pdf-settings/upload-logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data || response.data;
};

export const uploadHeader = async (file: File): Promise<PdfSetting> => {
  const formData = new FormData();
  formData.append('header', file);
  
  const response = await apiClient.post<{ data: PdfSetting }>('/pdf-settings/upload-header', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data || response.data;
};

export const deleteLogo = async (): Promise<PdfSetting> => {
  const response = await apiClient.delete<{ data: PdfSetting }>('/pdf-settings/logo');
  return response.data.data || response.data;
};

export const deleteHeader = async (): Promise<PdfSetting> => {
  const response = await apiClient.delete<{ data: PdfSetting }>('/pdf-settings/header');
  return response.data.data || response.data;
};

