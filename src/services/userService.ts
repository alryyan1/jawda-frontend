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

export const getUsers = (
  page = 1,
  filters: Record<string, any> = {}
): Promise<PaginatedUsersResponse> => {
  return apiClient
    .get<PaginatedUsersResponse>(API_URL, { params: { page, ...filters } })
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