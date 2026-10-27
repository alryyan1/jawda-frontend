import apiClient from './api';
import type { PaymentMethod, PaymentMethodFormData } from '@/types/paymentMethods';

const API_URL = '/payment-methods';

export const getPaymentMethods = (activeOnly = false): Promise<PaymentMethod[]> => {
  return apiClient
    .get<{ data: PaymentMethod[] }>(API_URL, { params: activeOnly ? { active: 1 } : {} })
    .then(res => res.data.data);
};

export const createPaymentMethod = (data: PaymentMethodFormData): Promise<PaymentMethod> => {
  return apiClient.post<{ data: PaymentMethod }>(API_URL, data).then(res => res.data.data);
};

export const updatePaymentMethod = (id: number, data: Partial<PaymentMethodFormData>): Promise<PaymentMethod> => {
  return apiClient.put<{ data: PaymentMethod }>(`${API_URL}/${id}`, data).then(res => res.data.data);
};

export const deletePaymentMethod = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};
