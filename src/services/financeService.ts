import apiClient from './api';
import type { FinanceAccount } from '@/types/finance';

export const getFinanceAccountsList = async (): Promise<FinanceAccount[]> => {
    const response = await apiClient.get<{ data: FinanceAccount[] }>('/finance-accounts-list');
    return response.data.data;
}; 