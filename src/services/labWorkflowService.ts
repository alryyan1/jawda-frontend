// src/services/labWorkflowService.ts
import apiClient from './api';

import type { ChildTestOption } from '../types/labTests';
import type { ChildTestWithResult, MainTestWithChildrenResults, PaginatedPatientLabQueueResponse, ResultEntryFormValues } from '@/types/labWorkflow';
import type { LabRequest } from '@/types/visits';

const LABREQUEST_BASE_URL = '/labrequests';

export const getLabPendingQueue = (filters: {shift_id?: number; date?: string; search?: string; page?: number}): Promise<PaginatedPatientLabQueueResponse> => {
  return apiClient.get<PaginatedPatientLabQueueResponse>('/lab/pending-queue', { params: filters }).then(res => res.data);
};

export const getLabRequestForEntry = async (labRequestId: number): Promise<MainTestWithChildrenResults> => {
  // This is the endpoint we designed for the ResultEntryPanel.
  // It hits LabRequestController@getLabRequestForEntry
  const response = await apiClient.get<{ data: MainTestWithChildrenResults }>(`/labrequests/${labRequestId}/for-result-entry`);
  return response.data.data;
};

// If you ALSO need a generic way to get a LabRequest by its ID (using LabRequestController@show):
export const getFullLabRequestById = async (labRequestId: number): Promise<LabRequest> => {
  // This would hit LabRequestController@show if the apiResource route is correctly set up
  const response = await apiClient.get<{ data: LabRequest }>(`${LABREQUEST_BASE_URL}/${labRequestId}`); // LABREQUEST_BASE_URL = '/labrequests'
  return response.data.data;
};

export const getChildTestOptions = async (childTestId: number): Promise<ChildTestOption[]> => {
    const response = await apiClient.get<{data: ChildTestOption[]}>(`/child-tests/${childTestId}/options`);
    return response.data.data;
};

export const saveLabResults = async (labRequestId: number, data: ResultEntryFormValues): Promise<LabRequest> => {
  const response = await apiClient.post<{ data: LabRequest }>(`/labrequests/${labRequestId}/results`, data);
  return response.data.data; // Return updated LabRequest
};

export const updateLabRequestFlags = async (labRequestId: number, flags: { hidden?: boolean; no_sample?: boolean; valid?: boolean }): Promise<LabRequest> => {
    const response = await apiClient.put<{data: LabRequest}>(`/labrequests/${labRequestId}`, flags); // Assuming your general update can handle this
    return response.data.data;
};