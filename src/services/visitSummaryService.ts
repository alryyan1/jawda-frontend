import apiClient from '@/services/api';

export const getVisitSummaryPdfUrl = async (visitId: number): Promise<string> => {
  const response = await apiClient.get(`/doctor-visits/${visitId}/summary-pdf`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
};
