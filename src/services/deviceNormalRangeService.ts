import apiClient from './api';
import type { DeviceNormalRange } from '../types/labTests';

export const getDeviceNormalRangesForChildTest = async (childTestId: number): Promise<DeviceNormalRange[]> => {
  const response = await apiClient.get<{ data: DeviceNormalRange[] }>(`/child-tests/${childTestId}/device-normal-ranges`);
  return response.data.data;
};

export const setDeviceNormalRange = async (
  childTestId: number,
  deviceId: number,
  data: { normal_range: string; is_default?: boolean }
): Promise<DeviceNormalRange> => {
  const response = await apiClient.post<{ data: DeviceNormalRange }>(
    `/child-tests/${childTestId}/devices/${deviceId}/normal-range`,
    data
  );
  return response.data.data;
};
