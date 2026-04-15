import apiClient from './api';
import type { Device } from '../types/labTests';

export const getDevicesList = async (): Promise<Device[]> => {
  const response = await apiClient.get<{ data: Device[] }>('/devices-list');
  return response.data.data;
};

export const createDevice = async (data: { name: string }): Promise<Device> => {
  const response = await apiClient.post<{ data: Device }>('/devices', data);
  return response.data.data;
};

export const updateDevice = async (id: number, data: { name: string }): Promise<Device> => {
  const response = await apiClient.put<{ data: Device }>(`/devices/${id}`, data);
  return response.data.data;
};

export const deleteDevice = async (id: number): Promise<void> => {
  await apiClient.delete(`/devices/${id}`);
};
