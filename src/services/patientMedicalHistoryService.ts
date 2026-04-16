import apiClient from './api';
import type { PatientMedicalHistory } from '@/types/medicalHistory';

export const getMedicalHistory = async (patientId: number): Promise<PatientMedicalHistory> => {
  const res = await apiClient.get<{ data: PatientMedicalHistory }>(
    `/patients/${patientId}/medical-history`
  );
  return res.data.data;
};

export const saveMedicalHistory = async (
  patientId: number,
  data: Partial<PatientMedicalHistory>
): Promise<PatientMedicalHistory> => {
  const res = await apiClient.put<{ data: PatientMedicalHistory }>(
    `/patients/${patientId}/medical-history`,
    data
  );
  return res.data.data;
};
