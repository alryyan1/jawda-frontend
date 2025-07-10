import apiClient from './api'; // Your configured Axios instance
import type { Patient, PatientFormData, PaginatedPatientsResponse, PatientSearchResult, PatientStripped, RecentDoctorVisitSearchItem } from '../types/patients'; // Your Patient types
import type { DoctorVisit } from '@/types/visits';
import type { PaginatedResponse } from '@/types/common';

const PATIENTS_API_URL = '/patients';

/**
 * Registers a new patient.
 * Handles FormData for potential file uploads (e.g., patient image if added later).
 * 
 * @param patientData - The data for the new patient from the form.
 * @returns A promise that resolves to the created Patient object.
 */
export const registerNewPatient = async (patientData: PatientFormData): Promise<Patient> => {
  // The backend's PatientController@store expects specific field names and types.
  // We need to transform PatientFormData if it differs significantly or handle file uploads.

  // If you were to handle file uploads (e.g., patient_photo_file):
  // const formData = new FormData();
  // Object.entries(patientData).forEach(([key, value]) => {
  //   if (key === 'patient_photo_file' && value instanceof File) {
  //     formData.append(key, value);
  //   } else if (typeof value === 'boolean') {
  //     formData.append(key, value ? '1' : '0');
  //   } else if (value !== null && value !== undefined) {
  //     formData.append(key, String(value)); // Convert numbers/etc. to string for FormData
  //   }
  // });
  // const response = await apiClient.post<{ data: Patient }>(PATIENTS_API_URL, formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  // });

  // For now, assuming no file uploads and PatientFormData largely matches backend expectations
  // after basic transformations (like parsing string IDs to numbers).
  // The transformation of string IDs to numbers should ideally happen *before* calling this service,
  // in the onSubmit handler of the form component.
  
  // Example of data expected by PatientController@store based on our earlier discussion:
  // {
  //   name: string,
  //   phone: string,
  //   gender: 'male' | 'female' | 'other',
  //   age_year?: number | null,
  //   age_month?: number | null,
  //   age_day?: number | null,
  //   address?: string | null,
  //   company_id?: number | null,
  //   doctor_id: number, // Doctor for the initial visit
  //   notes?: string | null, // Maps to present_complains
  //   // shift_id might be determined by backend or passed if known
  // }

  // The `patientData` argument should already be transformed to match backend needs
  // (e.g., string IDs parsed to numbers, age strings parsed to numbers).
  const response = await apiClient.post<{ data: Patient }>(PATIENTS_API_URL, patientData);
  return response.data.data; // Assuming your API wraps single resources in a 'data' key
};

/**
 * Fetches a paginated list of patients.
 * 
 * @param page - The page number to fetch.
 * @param filters - Optional filters (e.g., search term, status).
 * @returns A promise that resolves to a PaginatedPatientsResponse.
 */
export const getPatients = async (page = 1, filters: Record<string, any> = {}): Promise<PaginatedPatientsResponse> => {
  const response = await apiClient.get<PaginatedPatientsResponse>(PATIENTS_API_URL, { 
    params: { page, ...filters } 
  });
  return response.data; // Assuming Laravel pagination structure is returned directly
};
export const getPatientsWithRecentLabActivity = async (limit: number = 30): Promise<Array<PatientStripped & { latest_visit_id: number }>> => {
  // Backend endpoint needs to be created for this
  const response = await apiClient.get<{ data: Array<PatientStripped & { latest_visit_id: number }> }>(
    '/patients/recent-lab-activity', 
    { params: { limit } }
  );
  return response.data.data; // Assuming Laravel Resource Collection
};
/**
 * Fetches a single patient by their ID.
 * 
 * @param patientId - The ID of the patient to fetch.
 * @returns A promise that resolves to the Patient object.
 */
export const getPatientById = async (patientId: number): Promise<Patient> => {
  const response = await apiClient.get<{ data: Patient }>(`${PATIENTS_API_URL}/${patientId}`);
  return response.data.data;
};
// ... existing functions ...

export const togglePatientResultLock = async (patientId: number, lock: boolean): Promise<Patient> => {
  const response = await apiClient.patch<{ data: Patient }>(`/patients/${patientId}/toggle-result-lock`, { lock });
  return response.data.data; // Assuming backend returns PatientResource wrapped in data
};
export const searchExistingPatients = async (term: string): Promise<PatientSearchResult[]> => {
  // Backend returns PatientSearchResultResource::collection which wraps in 'data'
  const response = await apiClient.get<{ data: PatientSearchResult[] }>('/patients/search-existing', { params: { term } });
  return response.data.data;
};

interface StoreVisitFromHistoryPayload {
  previous_visit_id?: number | null;
  doctor_id: number; // New assigned doctor
  active_doctor_shift_id?: number | null;
  // current_clinic_shift_id: number; // Backend gets this now
  reason_for_visit?: string;
}
export const storeVisitFromHistory = async (patientId: number, payload: StoreVisitFromHistoryPayload): Promise<DoctorVisit> => {
  // Backend returns DoctorVisitResource, wrapped in 'data'
  const response = await apiClient.post<{ data: DoctorVisit }>(`/patients/${patientId}/store-visit-from-history`, payload);
  return response.data.data;
};
/**
 * Updates an existing patient.
 * 
 * @param patientId - The ID of the patient to update.
 * @param patientData - The partial data to update the patient with.
 * @returns A promise that resolves to the updated Patient object.
 */
export const updatePatient = async (patientId: number, patientData: Partial<PatientFormData>): Promise<Patient> => {
  // If handling file uploads, use FormData and POST with _method: 'PUT' similar to createDoctor
  // const formData = new FormData();
  // formData.append('_method', 'PUT');
  // ... append data ...
  // const response = await apiClient.post<{ data: Patient }>(`${PATIENTS_API_URL}/${patientId}`, formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  // });

  const response = await apiClient.put<{ data: Patient }>(`${PATIENTS_API_URL}/${patientId}`, patientData);
  return response.data.data;
};

/**
 * Deletes a patient by their ID.
 * 
 * @param patientId - The ID of the patient to delete.
 * @returns A promise that resolves when the patient is deleted.
 */
export const deletePatient = async (patientId: number): Promise<void> => {
  await apiClient.delete(`${PATIENTS_API_URL}/${patientId}`);
};

// Add other patient-related API call functions as needed, for example:
// - searchPatientsByNameOrPhone
// - getPatientVisitHistory
// - etc.
export const getPatientVisitHistory = async (patientId: number, page: number = 1): Promise<PaginatedResponse<DoctorVisit>> => { // Or DoctorVisit[] if not paginated
  const response = await apiClient.get<PaginatedResponse<DoctorVisit>>(`/patients/${patientId}/visit-history`, { params: { page } });
  return response.data;
};


export interface CreateCopiedVisitPayload {
  target_doctor_shift_id: number;
  reason_for_visit?: string;
  // original_visit_id?: number; // If needed for context on backend
}

export const createCopiedVisitForNewShift = async (
  sourcePatientId: number,
  payload: CreateCopiedVisitPayload
): Promise<DoctorVisit> => {
  const response = await apiClient.post<{ data: DoctorVisit }>(
    `/patients/${sourcePatientId}/copy-to-new-visit`,
    payload
  );
  return response.data.data;
};

export const searchRecentDoctorVisits = async (patientNameSearch: string, limit: number = 15): Promise<RecentDoctorVisitSearchItem[]> => {
  if (patientNameSearch.length < 2) return []; // Don't search for very short terms
  
  const response = await apiClient.get<{ data: RecentDoctorVisitSearchItem[] }>(
    '/doctor-visits/search-by-patient',
    { params: { patient_name_search: patientNameSearch, limit } }
  );
  return response.data.data;
};



/**
 * Creates a new lab-only visit for a patient who already exists in the system.
 * This is typically triggered from the Lab Reception search results.
 *
 * @param patientId - The ID of the existing patient.
 * @param payload - The data required to create the new visit, including the referring doctor's ID and optional company ID.
 * @returns A promise that resolves to the Patient object, which now includes the newly created DoctorVisit relation.
 */
export const createLabVisitForExistingPatient = async (
  patientId: number,
  payload: {
    doctor_id: number;
    company_id?: number;
    reason_for_visit?: string;
  }
): Promise<Patient> => { // The backend returns a PatientResource with the new visit loaded
  const response = await apiClient.post<{ data: Patient }>(
    `/patients/${patientId}/create-lab-visit`,
    payload
  );
  return response.data.data;
};

// ... (other existing functions in the file) ...




export const registerNewPatientFromLab = async (payload: Partial<PatientFormData>): Promise<Patient> => {
  // CHANGE THIS LINE: from '/patients/register-lab' to just '/patients'
  const response = await apiClient.post<{ data: Patient }>('/patients', payload);
  return response.data.data;
};
