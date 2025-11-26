// src/services/deletedRequestedServiceDepositService.ts
import apiClient from "./api";
import type { RequestedServiceDepositDeletion } from "@/types/services";

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

/**
 * Fetch a paginated list of deleted/voided requested service deposits.
 */
export const getDeletedRequestedServiceDeposits = async (
  params?: { page?: number; per_page?: number; service_name?: string; from_date?: string; to_date?: string }
): Promise<PaginatedResponse<RequestedServiceDepositDeletion>> => {
  const response = await apiClient.get<PaginatedResponse<RequestedServiceDepositDeletion>>(
    "/requested-service-deposit-deletions",
    { params }
  );
  return response.data;
};


