import apiClient from './api';
import type { Room, RoomFormData, PaginatedRoomsResponse } from '../types/admissions';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/rooms';

export const getRooms = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedRoomsResponse> => {
  const response = await apiClient.get<PaginatedRoomsResponse>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data;
};

export const getRoomById = async (id: number): Promise<{ data: Room }> => {
  const response = await apiClient.get<{ data: Room }>(`${API_URL}/${id}`);
  return response.data;
};

export const createRoom = async (data: RoomFormData): Promise<{ data: Room }> => {
  const payload = {
    ...data,
    ward_id: parseInt(String(data.ward_id)),
    capacity: parseInt(String(data.capacity)),
  };
  const response = await apiClient.post<{ data: Room }>(API_URL, payload);
  return response.data;
};

export const updateRoom = async (id: number, data: Partial<RoomFormData>): Promise<{ data: Room }> => {
  const payload: Record<string, any> = { ...data };
  if (data.ward_id !== undefined) payload.ward_id = parseInt(String(data.ward_id));
  if (data.capacity !== undefined) payload.capacity = parseInt(String(data.capacity));
  
  const response = await apiClient.put<{ data: Room }>(`${API_URL}/${id}`, payload);
  return response.data;
};

export const deleteRoom = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

export const getRoomBeds = async (roomId: number): Promise<{ data: any[] }> => {
  const response = await apiClient.get<{ data: any[] }>(`${API_URL}/${roomId}/beds`);
  return response.data;
};

