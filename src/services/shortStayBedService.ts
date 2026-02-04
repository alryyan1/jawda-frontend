import apiClient from "./api";
import type { ShortStayBed, ShortStayBedFormData } from "@/types/admissions";
import type { PaginatedResponse } from "@/types/common";

const API_URL = "/short-stay-beds";

export interface PaginatedShortStayBedsResponse extends PaginatedResponse {
  data: ShortStayBed[];
}

export const getShortStayBeds = async (
  page = 1,
  filters: Record<string, string | number | boolean> = {}
): Promise<PaginatedShortStayBedsResponse> => {
  const response = await apiClient.get<PaginatedShortStayBedsResponse>(API_URL, {
    params: { page, ...filters },
  });
  return response.data;
};

export const getShortStayBedById = async (
  id: number
): Promise<{ data: ShortStayBed }> => {
  const response = await apiClient.get<{ data: ShortStayBed }>(`${API_URL}/${id}`);
  return response.data;
};

export const createShortStayBed = async (
  data: ShortStayBedFormData
): Promise<{ data: ShortStayBed }> => {
  const response = await apiClient.post<{ data: ShortStayBed }>(API_URL, data);
  return response.data;
};

export const updateShortStayBed = async (
  id: number,
  data: Partial<ShortStayBedFormData>
): Promise<{ data: ShortStayBed }> => {
  const response = await apiClient.put<{ data: ShortStayBed }>(
    `${API_URL}/${id}`,
    data
  );
  return response.data;
};

export const deleteShortStayBed = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};
