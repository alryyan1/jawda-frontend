// src/services/partyService.ts
import apiClient from './api';
import type {
  Party,
  PartyFormData,
  PartyServiceCost,
  PartyServiceCostFormData,
} from '../types/parties';
import type { Service } from '../types/services';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/parties';

// --- Party CRUD ---
export const getParties = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedResponse<Party>> => {
  const response = await apiClient.get<PaginatedResponse<Party>>(API_URL, {
    params: { page, ...filters },
  });
  return response.data;
};

export const getPartiesList = async (): Promise<Party[]> => {
  const response = await apiClient.get<{ data: Party[] }>('/parties-list');
  return response.data.data;
};

export const getPartyById = async (id: number): Promise<{ data: Party }> => {
  const response = await apiClient.get<{ data: Party }>(`${API_URL}/${id}`);
  return response.data;
};

export const createParty = async (data: PartyFormData): Promise<{ data: Party }> => {
  const response = await apiClient.post<{ data: Party }>(API_URL, data);
  return response.data;
};

export const updateParty = async (id: number, data: Partial<PartyFormData>): Promise<{ data: Party }> => {
  const response = await apiClient.put<{ data: Party }>(`${API_URL}/${id}`, data);
  return response.data;
};

export const deleteParty = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

// --- Party Service Cost Management ---
export const getPartyServiceCosts = (partyId: number, page = 1, filters: { search?: string } = {}): Promise<PaginatedResponse<PartyServiceCost>> => {
  return apiClient.get<PaginatedResponse<PartyServiceCost>>(`${API_URL}/${partyId}/service-costs`, { params: { page, ...filters } })
    .then(res => res.data);
};

export const getPartyAvailableServices = (partyId: number): Promise<Service[]> => {
  return apiClient.get<{ data: Service[] }>(`${API_URL}/${partyId}/available-services`).then(res => res.data.data);
};

export const addServiceToPartyCosts = (partyId: number, data: PartyServiceCostFormData): Promise<{ data: PartyServiceCost }> => {
  return apiClient.post<{ data: PartyServiceCost }>(`${API_URL}/${partyId}/service-costs`, data)
    .then(res => res.data);
};

export const updatePartyServiceCost = (partyId: number, serviceId: number, data: Partial<PartyServiceCostFormData>): Promise<{ data: PartyServiceCost }> => {
  return apiClient.put<{ data: PartyServiceCost }>(`${API_URL}/${partyId}/service-costs/${serviceId}`, data)
    .then(res => res.data);
};

export const removeServiceFromPartyCosts = (partyId: number, serviceId: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${partyId}/service-costs/${serviceId}`).then(res => res.data);
};

export const importPartyServicesByGroup = (
  partyId: number,
  payload: { service_group_id: number; price_preference: 'standard_price' | 'zero_price' }
): Promise<{ message: string; imported_count: number }> => {
  return apiClient.post<{ message: string; imported_count: number }>(
    `${API_URL}/${partyId}/service-costs/import-by-group`,
    payload
  ).then(res => res.data);
};
