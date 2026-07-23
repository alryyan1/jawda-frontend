import apiClient from '@/services/api';
import type { MedicalAttachment } from '@/types/attachments';

export const getPatientAttachments = async (patientId: number): Promise<MedicalAttachment[]> => {
  const response = await apiClient.get<{ data: MedicalAttachment[] }>(
    `/patients/${patientId}/attachments`
  );
  return response.data.data;
};

interface UploadAttachmentPayload {
  visitId: number;
  file: File;
  category?: string;
  title?: string;
  note?: string;
}

export const uploadAttachment = async ({
  visitId,
  file,
  category,
  title,
  note,
}: UploadAttachmentPayload): Promise<MedicalAttachment> => {
  const form = new FormData();
  form.append('file', file);
  if (category) form.append('category', category);
  if (title) form.append('title', title);
  if (note) form.append('note', note);

  const response = await apiClient.post<{ data: MedicalAttachment }>(
    `/doctor-visits/${visitId}/attachments`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data.data;
};

export const deleteAttachment = async (attachmentId: number): Promise<void> => {
  await apiClient.delete(`/attachments/${attachmentId}`);
};
