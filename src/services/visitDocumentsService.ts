import apiClient from '@/services/api';

const blobToPdfUrl = (data: BlobPart): string => URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));

export const getVisitVitalsPdfUrl = async (visitId: number): Promise<string> => {
  const response = await apiClient.get(`/doctor-visits/${visitId}/vitals-pdf`, { responseType: 'blob' });
  return blobToPdfUrl(response.data);
};

export const getVisitPrescriptionsPdfUrl = async (visitId: number): Promise<string> => {
  const response = await apiClient.get(`/doctor-visits/${visitId}/prescriptions-pdf`, { responseType: 'blob' });
  return blobToPdfUrl(response.data);
};

export const getPatientMedicalHistoryPdfUrl = async (patientId: number): Promise<string> => {
  const response = await apiClient.get(`/patients/${patientId}/medical-history-pdf`, { responseType: 'blob' });
  return blobToPdfUrl(response.data);
};

/** Also marks the report as printed on the visit, matching the Lab Workstation's print behavior. */
export const getVisitLabReportPdfUrl = async (visitId: number): Promise<string> => {
  const response = await apiClient.get(`/visits/${visitId}/lab-report/pdf`, { responseType: 'blob' });
  apiClient.post(`/visits/${visitId}/lab-report/mark-printed`).catch(() => undefined);
  return blobToPdfUrl(response.data);
};

/**
 * Sends the "visit_documents_menu" WhatsApp template to the visit's patient —
 * three quick-reply buttons (medical report / diagnosis / prescription) that,
 * when tapped, have the patient receive the matching PDF as a WhatsApp document.
 */
export const sendVisitDocumentsWhatsAppMenu = async (
  visitId: number
): Promise<{ success: boolean; error?: string }> => {
  const response = await apiClient.post<{ success: boolean; error?: string }>(
    `/doctor-visits/${visitId}/send-documents-whatsapp`
  );
  return response.data;
};
