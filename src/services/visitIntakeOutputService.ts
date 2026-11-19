import apiClient from '@/services/api';
import type { VisitIntakeOutput, VisitIntakeOutputInput } from '@/types/intakeOutput';

export const getVisitIntakeOutputs = async (visitId: number): Promise<VisitIntakeOutput[]> => {
  const response = await apiClient.get<{ data: VisitIntakeOutput[] }>(`/doctor-visits/${visitId}/intake-outputs`);
  return response.data.data;
};

export const addVisitIntakeOutput = async (
  visitId: number,
  payload: VisitIntakeOutputInput
): Promise<VisitIntakeOutput> => {
  const response = await apiClient.post<{ data: VisitIntakeOutput }>(
    `/doctor-visits/${visitId}/intake-outputs`,
    payload
  );
  return response.data.data;
};

export const updateVisitIntakeOutput = async (
  visitId: number,
  entryId: number,
  payload: Partial<VisitIntakeOutputInput>
): Promise<VisitIntakeOutput> => {
  const response = await apiClient.put<{ data: VisitIntakeOutput }>(
    `/doctor-visits/${visitId}/intake-outputs/${entryId}`,
    payload
  );
  return response.data.data;
};

export const deleteVisitIntakeOutput = async (visitId: number, entryId: number): Promise<void> => {
  await apiClient.delete(`/doctor-visits/${visitId}/intake-outputs/${entryId}`);
};
