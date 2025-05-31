// src/services/insuranceAuditService.ts
import apiClient from './api';
import type { AuditedPatientRecord, AuditedRequestedService, AuditedServiceApiPayload, AuditStatus } from '@/types/auditing';
import type { DoctorVisit } from '@/types/visits'; // For the list response
import type { UpdatePatientApiPayload } from '@/types/patients';
import type { PaginatedResponse } from '@/types/common';

const BASE_URL = '/insurance-audit';

export interface AuditListFilters {
  date_from?: string;
  date_to?: string;
  company_id: number | string; // Should be number when sending
  patient_name?: string;
  audit_status?: AuditStatus | 'all'; // 'all' to fetch all statuses
  page?: number;
  per_page?: number;
}

export const listAuditableVisits = async (filters: AuditListFilters): Promise<PaginatedResponse<DoctorVisit>> => {
  const params = { ...filters };
  if (filters.audit_status === 'all') {
    delete params.audit_status; // Don't send 'all' if it means no filter
  }
  const response = await apiClient.get<PaginatedResponse<DoctorVisit>>(`${BASE_URL}/patients`, { params });
  return response.data;
};

export const getOrCreateAuditRecordForVisit = async (doctorVisitId: number): Promise<AuditedPatientRecord> => {
  const response = await apiClient.get<{ data: AuditedPatientRecord }>(`${BASE_URL}/visits/${doctorVisitId}/audit-record`);
  return response.data.data;
};

export const updateAuditedPatientInfo = async (
  auditRecordId: number, 
  data: Partial<UpdatePatientApiPayload> // Use existing payload type for patient edits
): Promise<AuditedPatientRecord> => {
  const response = await apiClient.put<{ data: AuditedPatientRecord }>(`${BASE_URL}/records/${auditRecordId}`, data);
  return response.data.data;
};

export const copyServicesToAuditRecord = async (auditRecordId: number): Promise<{ message: string; copied_count: number; data: AuditedRequestedService[] }> => {
  const response = await apiClient.post<{ message: string; copied_count: number; data: AuditedRequestedService[] }>(
    `${BASE_URL}/records/${auditRecordId}/copy-services`
  );
  return response.data; // Includes the list of copied services
};

export const storeAuditedService = async (payload: AuditedServiceApiPayload): Promise<AuditedRequestedService> => {
  const response = await apiClient.post<{ data: AuditedRequestedService }>(`${BASE_URL}/audited-services`, payload);
  return response.data.data;
};

export const updateAuditedService = async (auditedServiceId: number, payload: Partial<AuditedServiceApiPayload>): Promise<AuditedRequestedService> => {
  const response = await apiClient.put<{ data: AuditedRequestedService }>(`${BASE_URL}/audited-services/${auditedServiceId}`, payload);
  return response.data.data;
};

export const deleteAuditedService = async (auditedServiceId: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/audited-services/${auditedServiceId}`);
};

export const verifyAuditRecord = async (
  auditRecordId: number, 
  payload: { status: Exclude<AuditStatus, 'all' | 'pending_review'>; auditor_notes?: string }
): Promise<AuditedPatientRecord> => {
  const response = await apiClient.post<{ data: AuditedPatientRecord }>(`${BASE_URL}/records/${auditRecordId}/verify`, payload);
  return response.data.data;
};

export const exportAuditPdf = async (filters: Omit<AuditListFilters, 'page' | 'per_page'>): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`${BASE_URL}/export/pdf`, { 
    params: filters, 
    responseType: 'blob' 
  });
  return response.data;
};

export const exportAuditExcel = async (filters: Omit<AuditListFilters, 'page' | 'per_page'>): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`${BASE_URL}/export/excel`, { 
    params: filters, 
    responseType: 'blob' 
  });
  return response.data;
};