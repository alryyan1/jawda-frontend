// src/services/visitService.ts
import apiClient from './api';
import type { RequestedServiceDeposit, Service } from '../types/services';
import type  { RequestedService } from '../types/services'; // Or from types/visits
import type { DoctorVisit } from '@/types/visits';

import type { PatientVisitSummary } from '../types/visits'; // Adjust import
import type { PaginatedResponse } from '@/types/common';
const VISIT_API_BASE = '/visits';

const VISIT_API_URL_BASE = '/doctor-visits'; // Base URL for DoctorVisit CRUD from apiResource
const VISIT_SERVICES_API_BASE = '/visits'; // Base URL for visit-related service actions if different
export const getAvailableServicesForVisit = async (visitId: number): Promise<Service[]> => {
  // Backend returns ServiceResource::collection, which wraps in 'data'
  const response = await apiClient.get<{ data: Service[] }>(`${VISIT_API_BASE}/${visitId}/available-services`);
  return response.data.data;
};

// Support both call signatures for backwards compatibility:
// 1) addServicesToVisit({ visitId, service_ids })
// 2) addServicesToVisit(visitId, service_ids)
export const addServicesToVisit = async (
  visitIdOrParams: number | { visitId: number; service_ids: number[] },
  maybeServiceIds?: number[]
): Promise<RequestedService[]> => {
  const visitId = typeof visitIdOrParams === 'number' ? visitIdOrParams : visitIdOrParams.visitId;
  const service_ids = Array.isArray(maybeServiceIds) ? maybeServiceIds : (visitIdOrParams as { visitId: number; service_ids: number[] }).service_ids;

  if (!visitId || !Array.isArray(service_ids) || service_ids.length === 0) {
    throw new Error('Invalid parameters: visitId and service_ids are required');
  }

  const response = await apiClient.post<{ data: RequestedService[] }>(
    `${VISIT_API_BASE}/${visitId}/request-services`,
    { service_ids }
  );
  return response.data.data;
};



interface UpdateRequestedServicePayload {
  count?: number;
  discount_per?: number; // Assuming discount is primarily by percentage here
  discount?: number; // Or a fixed discount amount
  // Add other editable fields if any
}

export const updateRequestedServiceDetails = async (
  visitId: number, // May not be needed if rsId is globally unique and backend doesn't require visitId in URL for this
  rsId: number, // RequestedService ID
  data: UpdateRequestedServicePayload
): Promise<RequestedService> => {
  // Assuming backend RequestedServiceResource wraps in 'data'
  const response = await apiClient.put<{ data: RequestedService }>(`/requested-services/${rsId}`, data); // Or `/visits/${visitId}/requested-services/${rsId}`
  return response.data.data;
};


export const getRequestedServicesForVisit = async (visitId: number): Promise<RequestedService[]> => {
  // Assuming backend returns { data: RequestedService[] }
  const response = await apiClient.get<{ data: RequestedService[] }>(`${VISIT_SERVICES_API_BASE}/${visitId}/requested-services`);
  return response.data.data;
};

export const removeRequestedServiceFromVisit = async (visitId: number, requestedServiceId: number): Promise<void> => {
  await apiClient.delete(`${VISIT_SERVICES_API_BASE}/${visitId}/requested-services/${requestedServiceId}`);
};

// --- NEW: Functions for DoctorVisit CRUD and status update ---

/**
 * Fetches a single detailed doctor visit by its ID.
 * Interacts with DoctorVisitController@show.
 * 
 * @param visitId - The ID of the doctor visit to fetch.
 * @returns A promise that resolves to the detailed DoctorVisit object.
 */
export const getDoctorVisitById = async (visitId: number): Promise<DoctorVisit> => {
  // Your DoctorVisitController@show returns `new DoctorVisitResource(...)`
  // Laravel's JsonResource by default wraps single resource responses in a 'data' key.
  const response = await apiClient.get<{ data: DoctorVisit }>(`${VISIT_API_URL_BASE}/${visitId}`);
  return response.data.data; 
};

/**
 * Updates the status of a specific doctor visit.
 * Interacts with DoctorVisitController@updateStatus.
 * 
 * @param visitId - The ID of the doctor visit to update.
 * @param status - The new status string.
 * @returns A promise that resolves to the updated DoctorVisit object.
 */
export const updateDoctorVisitStatus = async (visitId: number, status: string): Promise<DoctorVisit> => {
  // Your DoctorVisitController@updateStatus takes { status: 'new_status' } in the body
  // and returns `new DoctorVisitResource(...)`
  const response = await apiClient.put<{ data: DoctorVisit }>(`${VISIT_API_URL_BASE}/${visitId}/status`, { status });
  return response.data.data;
};
interface CreateDepositPayload {
  requested_service_id: number;
  amount: number;
  is_bank: boolean;
  shift_id: number; // Current clinic shift ID
}

export const recordServicePayment = async (payload: CreateDepositPayload): Promise<RequestedServiceDeposit> => {
  // Assuming backend returns { data: RequestedServiceDeposit }
  const response = await apiClient.post<{ data: RequestedServiceDeposit }>(
    `/requested-services/${payload.requested_service_id}/deposits`, 
    payload
  );
  return response.data.data;
};

// --- Potentially other DoctorVisit CRUD functions if needed directly ---

/**
 * Creates a new doctor visit.
 * (Note: PatientController@store might already handle initial visit creation during patient registration)
 * Interacts with DoctorVisitController@store.
 * 
 * @param visitData - Data for the new visit.
 * @returns A promise that resolves to the created DoctorVisit object.
 */
// export const createDoctorVisit = async (visitData: Partial<Omit<DoctorVisit, 'id' | 'created_at' | 'updated_at' | 'patient' | 'doctor' >>): Promise<DoctorVisit> => {
//   const response = await apiClient.post<{ data: DoctorVisit }>(VISIT_API_URL_BASE, visitData);
//   return response.data.data;
// };

/**
 * Updates general details of a specific doctor visit.
 * Interacts with DoctorVisitController@update.
 * 
 * @param visitId - The ID of the visit to update.
 * @param visitData - Partial data to update the visit with.
 * @returns A promise that resolves to the updated DoctorVisit object.
 */
// export const updateDoctorVisitDetails = async (visitId: number, visitData: Partial<Omit<DoctorVisit, 'id' | 'created_at' | 'updated_at' | 'patient' | 'doctor'>>): Promise<DoctorVisit> => {
//   const response = await apiClient.put<{ data: DoctorVisit }>(`${VISIT_API_URL_BASE}/${visitId}`, visitData);
//   return response.data.data;
// };



const DOCTOR_VISITS_API_URL = '/doctor-visits'; // Matches your apiResource route

export interface GetVisitsFilters {
  page?: number;
  visit_date?: string; // YYYY-MM-DD
  doctor_id?: number | string | null;
  search?: string;
  status?: string | null; // e.g., 'all', 'waiting', 'completed'
  per_page?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
}

export const getPatientVisitsSummary = async (filters: GetVisitsFilters): Promise<PaginatedResponse<PatientVisitSummary>> => {
  const response = await apiClient.get<PaginatedResponse<PatientVisitSummary>>(DOCTOR_VISITS_API_URL, { params: filters });
  return response.data; // Assuming Laravel pagination structure
};
export const reassignDoctorVisitToShift = async (visitId: number, targetDoctorShiftId: number): Promise<DoctorVisit> => {
  const response = await apiClient.post<{ data: DoctorVisit }>(`/doctor-visits/${visitId}/reassign-shift`, { target_doctor_shift_id: targetDoctorShiftId });
  return response.data.data;
};