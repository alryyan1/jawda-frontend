import apiClient from '@/services/api';
import type { VisitDiagnosis } from '@/types/diagnosis';

export const getVisitDiagnosis = async (visitId: number): Promise<VisitDiagnosis | null> => {
  const response = await apiClient.get<{ data: VisitDiagnosis | null }>(
    `/doctor-visits/${visitId}/diagnosis`
  );
  return response.data.data;
};

export const startVisitDiagnosis = async (visitId: number): Promise<VisitDiagnosis> => {
  const response = await apiClient.post<{ data: VisitDiagnosis }>(
    `/doctor-visits/${visitId}/diagnosis`
  );
  return response.data.data;
};

export const updateVisitDiagnosis = async (
  diagnosisId: number,
  payload: Partial<Pick<VisitDiagnosis, 'diagnosis' | 'complete' | 'is_printed' | 'printed_by_user_id'>>
): Promise<VisitDiagnosis> => {
  const response = await apiClient.put<{ data: VisitDiagnosis }>(
    `/visit-diagnoses/${diagnosisId}`,
    payload
  );
  return response.data.data;
};

export const openVisitDiagnosisPdf = async (diagnosisId: number): Promise<void> => {
  const response = await apiClient.get(`/visit-diagnoses/${diagnosisId}/pdf`, {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
};
