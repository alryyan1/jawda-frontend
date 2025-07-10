import apiClient from './api';
import type { Denomination } from '@/types/cash';

export const getDenominationsForShift = async (shiftId: number): Promise<Denomination[]> => {
    const response = await apiClient.get<{ data: Denomination[] }>('/cash-denominations', {
        params: { shift_id: shiftId }
    });
    return response.data.data;
};

export const saveDenominationCounts = async (shiftId: number, counts: Denomination[]): Promise<{ message: string }> => {
    const payload = {
        shift_id: shiftId,
        counts: counts.map(d => ({ id: d.id, count: d.count }))
    };
    const response = await apiClient.post('/cash-denominations', payload);
    return response.data;
};