// src/services/costService.ts
import apiClient from './api';
import type { Cost, CostFormData, CostCategory } from '@/types/finance';

const API_URL = '/costs';
const CATEGORIES_API_URL = '/cost-categories-list';

export const getCostCategoriesList = async (): Promise<CostCategory[]> => {
  // Backend returns ResourceCollection, assumes 'data' wrapper
  const response = await apiClient.get<{ data: CostCategory[] }>(CATEGORIES_API_URL);
  return response.data.data;
};

export const addCost = async (data: CostFormData): Promise<Cost> => {
  const payload = {
    ...data,
    amount: parseFloat(data.amount),
    is_bank_payment: data.is_bank_payment === "1", // Convert string "0" or "1" to boolean
    cost_category_id: data.cost_category_id ? parseInt(data.cost_category_id) : null,
    doctor_shift_id: data.doctor_shift_id ? parseInt(data.doctor_shift_id) : null,
  };
  // Backend returns CostResource, assumes 'data' wrapper
  const response = await apiClient.post<{ data: Cost }>(API_URL, payload);
  return response.data.data;
};

// Add getCosts, updateCost, deleteCost later for a full cost management page