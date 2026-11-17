import apiClient from '@/services/api';
import type { CompanionContact, SendWhatsAppResult, VisitDose, VisitDoseInput } from '@/types/doses';

export const getVisitDoses = async (visitId: number): Promise<VisitDose[]> => {
  const response = await apiClient.get<{ data: VisitDose[] }>(`/doctor-visits/${visitId}/doses`);
  return response.data.data;
};

export const addVisitDose = async (visitId: number, payload: VisitDoseInput): Promise<VisitDose> => {
  const response = await apiClient.post<{ data: VisitDose }>(`/doctor-visits/${visitId}/doses`, payload);
  return response.data.data;
};

export const updateVisitDose = async (
  visitId: number,
  doseId: number,
  payload: Partial<VisitDoseInput>
): Promise<VisitDose> => {
  const response = await apiClient.put<{ data: VisitDose }>(`/doctor-visits/${visitId}/doses/${doseId}`, payload);
  return response.data.data;
};

export const deleteVisitDose = async (visitId: number, doseId: number): Promise<void> => {
  await apiClient.delete(`/doctor-visits/${visitId}/doses/${doseId}`);
};

export const sendVisitDoseWhatsApp = async (
  visitId: number,
  doseId: number,
  phone?: string
): Promise<SendWhatsAppResult> => {
  const response = await apiClient.post<SendWhatsAppResult>(
    `/doctor-visits/${visitId}/doses/${doseId}/send-whatsapp`,
    phone ? { phone } : {},
    { suppressToast: true } as any
  );
  return response.data;
};

export const getCompanionContact = async (visitId: number): Promise<CompanionContact> => {
  const response = await apiClient.get<CompanionContact>(`/doctor-visits/${visitId}/companion-contact`);
  return response.data;
};
