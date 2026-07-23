import apiClient from '@/services/api';
import type { VisitPrescription, VisitPrescriptionItemInput } from '@/types/prescriptions';

export const getVisitPrescriptions = async (visitId: number): Promise<VisitPrescription[]> => {
  const response = await apiClient.get<{ data: VisitPrescription[] }>(
    `/doctor-visits/${visitId}/prescriptions`
  );
  return response.data.data;
};

export const addVisitPrescription = async (
  visitId: number,
  payload: { notes?: string; items: VisitPrescriptionItemInput[] }
): Promise<VisitPrescription> => {
  const response = await apiClient.post<{ data: VisitPrescription }>(
    `/doctor-visits/${visitId}/prescriptions`,
    payload
  );
  return response.data.data;
};

export const deleteVisitPrescription = async (prescriptionId: number): Promise<void> => {
  await apiClient.delete(`/visit-prescriptions/${prescriptionId}`);
};

export const openVisitPrescriptionPdf = async (prescriptionId: number): Promise<void> => {
  const response = await apiClient.get(`/visit-prescriptions/${prescriptionId}/pdf`, {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
};
