import apiClient from './api';
import type { 
  Admission, 
  AdmissionFormData, 
  DischargeFormData, 
  TransferFormData, 
  PaginatedAdmissionsResponse,
  AdmissionDeposit,
  AdmissionDepositFormData,
  AdmissionTransaction,
  AdmissionTransactionFormData,
  AdmissionLedger,
} from '../types/admissions';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/admissions';

export const getAdmissions = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedAdmissionsResponse> => {
  const response = await apiClient.get<PaginatedAdmissionsResponse>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data;
};

export const getAdmissionById = async (id: number): Promise<{ data: Admission }> => {
  const response = await apiClient.get<{ data: Admission }>(`${API_URL}/${id}`);
  return response.data;
};

export const createAdmission = async (data: AdmissionFormData): Promise<{ data: Admission }> => {
  const payload: Record<string, any> = {
    patient_id: parseInt(String(data.patient_id)),
    ward_id: parseInt(String(data.ward_id)),
    room_id: parseInt(String(data.room_id)),
    bed_id: parseInt(String(data.bed_id)),
    admission_date: data.admission_date ? (data.admission_date instanceof Date ? data.admission_date.toISOString().split('T')[0] : data.admission_date) : new Date().toISOString().split('T')[0],
    admission_time: data.admission_time || null,
    admission_type: data.admission_type || null,
    admission_reason: data.admission_reason || null,
    diagnosis: data.diagnosis || null,
    doctor_id: data.doctor_id ? parseInt(String(data.doctor_id)) : null,
    notes: data.notes || null,
    provisional_diagnosis: data.provisional_diagnosis || null,
    operations: data.operations || null,
  };
  
  // Add specialist_doctor_id if provided
  if (data.specialist_doctor_id) {
    payload.specialist_doctor_id = parseInt(String(data.specialist_doctor_id));
  }
  
  const response = await apiClient.post<{ data: Admission }>(API_URL, payload);
  return response.data;
};

export const updateAdmission = async (id: number, data: Partial<AdmissionFormData>): Promise<{ data: Admission }> => {
  const payload: Record<string, any> = {};
  if (data.admission_reason !== undefined) payload.admission_reason = data.admission_reason;
  if (data.diagnosis !== undefined) payload.diagnosis = data.diagnosis;
  if (data.doctor_id !== undefined) payload.doctor_id = data.doctor_id ? parseInt(String(data.doctor_id)) : null;
  if (data.notes !== undefined) payload.notes = data.notes;
  
  const response = await apiClient.put<{ data: Admission }>(`${API_URL}/${id}`, payload);
  return response.data;
};

export const dischargeAdmission = async (id: number, data: DischargeFormData): Promise<{ data: Admission }> => {
  const payload: Record<string, any> = {};
  if (data.discharge_date) {
    payload.discharge_date = data.discharge_date.toISOString().split('T')[0];
  }
  if (data.discharge_time !== undefined) {
    // Convert HH:mm to HH:mm:ss format if needed
    let timeStr = data.discharge_time;
    if (timeStr && timeStr.length === 5 && timeStr.includes(':')) {
      // Format is HH:mm, convert to HH:mm:ss
      timeStr = timeStr + ':00';
    }
    payload.discharge_time = timeStr;
  }
  if (data.notes !== undefined) payload.notes = data.notes;
  
  const response = await apiClient.put<{ data: Admission }>(`${API_URL}/${id}/discharge`, payload);
  return response.data;
};

export const transferAdmission = async (id: number, data: TransferFormData): Promise<{ data: Admission }> => {
  const payload = {
    ward_id: parseInt(String(data.ward_id)),
    room_id: parseInt(String(data.room_id)),
    bed_id: parseInt(String(data.bed_id)),
    notes: data.notes || null,
  };
  const response = await apiClient.put<{ data: Admission }>(`${API_URL}/${id}/transfer`, payload);
  return response.data;
};

export const getActiveAdmissions = async (filters: { ward_id?: number } = {}): Promise<Admission[]> => {
  const response = await apiClient.get<{ data: Admission[] }>(`${API_URL}/active`, { params: filters });
  return response.data.data;
};

export const getAdmissionBalance = async (id: number): Promise<{ balance: number; total_credits: number; total_debits: number }> => {
  const response = await apiClient.get<{ balance: number; total_credits: number; total_debits: number }>(`${API_URL}/${id}/balance`);
  return response.data;
};

export const getAdmissionTransactions = async (id: number): Promise<AdmissionTransaction[]> => {
  const response = await apiClient.get<{ data: AdmissionTransaction[] }>(`${API_URL}/${id}/transactions`);
  return response.data.data;
};

export const addAdmissionTransaction = async (id: number, data: AdmissionTransactionFormData): Promise<{ data: AdmissionTransaction }> => {
  const response = await apiClient.post<{ data: AdmissionTransaction }>(`${API_URL}/${id}/transactions`, data);
  return response.data;
};

export const deleteAdmissionTransaction = async (admissionId: number, transactionId: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${admissionId}/transactions/${transactionId}`);
};

// Backward compatibility - redirects to transactions
export const getAdmissionDeposits = async (id: number): Promise<AdmissionDeposit[]> => {
  const response = await apiClient.get<{ data: AdmissionDeposit[] }>(`${API_URL}/${id}/deposits`);
  return response.data.data;
};

export const addAdmissionDeposit = async (id: number, data: AdmissionDepositFormData): Promise<{ data: AdmissionDeposit }> => {
  // Convert deposit to credit transaction
  const transactionData: AdmissionTransactionFormData = {
    type: 'credit',
    amount: data.amount,
    description: 'دفعة',
    reference_type: 'deposit',
    is_bank: data.is_bank,
    notes: data.notes,
  };
  const response = await apiClient.post<{ data: AdmissionTransaction }>(`${API_URL}/${id}/transactions`, transactionData);
  // Convert back to deposit format for compatibility
  return {
    data: {
      id: response.data.data.id,
      admission_id: response.data.data.admission_id,
      amount: response.data.data.amount,
      is_bank: response.data.data.is_bank,
      notes: response.data.data.notes,
      user_id: response.data.data.user_id,
      user: response.data.data.user,
      created_at: response.data.data.created_at,
      updated_at: response.data.data.updated_at,
    }
  };
};

export const getAdmissionLedger = async (id: number): Promise<AdmissionLedger> => {
  const response = await apiClient.get<AdmissionLedger>(`${API_URL}/${id}/ledger`);
  return response.data;
};

