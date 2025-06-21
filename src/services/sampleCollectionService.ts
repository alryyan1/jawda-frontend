// src/services/sampleCollectionService.ts
import apiClient from './api';
import type { PaginatedPatientLabQueueResponse } from '@/types/labWorkflow';
import type { LabRequest } from '@/types/visits';

export const getSampleCollectionQueue = async (
  filters: {
    shift_id?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }
): Promise<PaginatedPatientLabQueueResponse> => {
  const response = await apiClient.get('/sample-collection/queue', { params: filters });
  return response.data; // Assuming backend wraps in 'data' for collection, or direct for PaginatedResponse
};

export const markSampleCollectedApi = async (labRequestId: number): Promise<LabRequest> => {
  const response = await apiClient.patch<{ data: LabRequest }>(`/sample-collection/labrequests/${labRequestId}/mark-collected`);
  return response.data.data;
};

export const markAllSamplesCollectedForVisitApi = async (visitId: number): Promise<{ message: string; updated_count: number }> => {
  const response = await apiClient.post<{ message: string; updated_count: number }>(`/sample-collection/visits/${visitId}/mark-all-collected`);
  return response.data;
};

export const generateSampleIdForRequestApi = async (labRequestId: number): Promise<LabRequest> => {
  const response = await apiClient.patch<{ data: LabRequest }>(`/sample-collection/labrequests/${labRequestId}/generate-sample-id`);
  return response.data.data;
};