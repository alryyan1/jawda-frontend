import apiClient from '@/services/api';
import type { VisitMedicalReport } from '@/types/medicalReport';

export const getVisitMedicalReport = async (visitId: number): Promise<VisitMedicalReport | null> => {
  const response = await apiClient.get<{ data: VisitMedicalReport | null }>(
    `/doctor-visits/${visitId}/medical-report`
  );
  return response.data.data;
};

export const startVisitMedicalReport = async (visitId: number): Promise<VisitMedicalReport> => {
  const response = await apiClient.post<{ data: VisitMedicalReport }>(
    `/doctor-visits/${visitId}/medical-report`
  );
  return response.data.data;
};

export const updateVisitMedicalReport = async (
  reportId: number,
  payload: Partial<Pick<VisitMedicalReport, 'content' | 'complete' | 'is_printed' | 'printed_by_user_id'>>
): Promise<VisitMedicalReport> => {
  const response = await apiClient.put<{ data: VisitMedicalReport }>(
    `/visit-medical-reports/${reportId}`,
    payload
  );
  return response.data.data;
};

export const getVisitMedicalReportPdfUrl = async (reportId: number): Promise<string> => {
  const response = await apiClient.get(`/visit-medical-reports/${reportId}/pdf`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
};
