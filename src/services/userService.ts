

// src/services/userService.ts
import apiClient from "./api";
import type { UserShiftIncomeSummary } from '../types/users'; // Adjust path
import type {
  User,
  UserFormData,
  PaginatedUsersResponse,
  Role,
} from "../types/users"; // Adjust paths

const API_URL = "/users";
const ROLES_API_URL = "/roles-list"; // Route to get all roles
// ... existing types

export interface LabUserShiftIncomeSummary {
  user_id: number;
  user_name: string;
  shift_id: number;
  total_lab_income: number;
  total_cash: number;
  total_bank: number;
}
export const getUsers = (
  page = 1,
  filters: Record<string, any> = {}
): Promise<PaginatedUsersResponse> => {
  return apiClient
    .get<PaginatedUsersResponse>('get-users', { params: { page, ...filters } })
    .then((res) => res.data);
};

export const getUserById = (id: number): Promise<{ data: User }> => {
  return apiClient
    .get<{ data: User }>(`${API_URL}/${id}`)
    .then((res) => res.data);
};

export const createUser = (data: UserFormData): Promise<{ data: User }> => {
  return apiClient.post<{ data: User }>(API_URL, data).then((res) => res.data);
};

export const updateUser = (
  id: number,
  data: Partial<UserFormData>
): Promise<{ data: User }> => {
  return apiClient
    .put<{ data: User }>(`${API_URL}/${id}`, data)
    .then((res) => res.data);
};

export const deleteUser = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then((res) => res.data);
};
// Route::post('/users/{user}/update-password', [UserController::class, 'updatePassword']);

export const updateUserPassword = (id: number, data: { password: string }): Promise<void> => {
  return apiClient.post(`${API_URL}/${id}/update-password`, data).then((res) => res.data);
}
export const getRolesList = (): Promise<Role[]> => {
  // Expects an array of Role objects
  return apiClient.get(ROLES_API_URL).then((res) => res.data.data); // Laravel ResourceCollection wraps in 'data'
  // So if RoleResource::collection is used, it's res.data.data
  // If you return Role::all() directly, it might be res.data
  // Check your backend response structure for roles-list!
  // Let's assume RoleResource::collection wrapping:
  // return apiClient.get<{data: Role[]}>(ROLES_API_URL).then(res => res.data.data);
};

export const fetchCurrentUserShiftIncomeSummary = async (shiftId: number): Promise<UserShiftIncomeSummary> => {
  // Backend response is { data: UserShiftIncomeSummary }
  const response = await apiClient.get<{ data: UserShiftIncomeSummary }>(`/user/current-shift-income-summary`, {
    params: { shift_id: shiftId }
  });
  return response.data.data;
};
export const fetchCurrentUserLabIncomeSummary = async (shiftId: number): Promise<LabUserShiftIncomeSummary> => {
  const response = await apiClient.get<{ data: LabUserShiftIncomeSummary }>(`/user/current-shift-lab-income-summary`, {
      params: { shift_id: shiftId }
  });
  return response.data.data;
};