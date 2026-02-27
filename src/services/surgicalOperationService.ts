import apiClient from "./api";

export interface SurgicalOperation {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export const getSurgicalOperations = async (): Promise<SurgicalOperation[]> => {
  const response = await apiClient.get("/surgical-operations");
  return response.data?.data || response.data || [];
};

export const createSurgicalOperation = async (data: {
  name: string;
}): Promise<SurgicalOperation> => {
  const response = await apiClient.post("/surgical-operations", data);
  return response.data;
};

export const updateSurgicalOperation = async (
  id: number,
  data: { name: string },
): Promise<SurgicalOperation> => {
  const response = await apiClient.put(`/surgical-operations/${id}`, data);
  return response.data;
};

export const deleteSurgicalOperation = async (id: number): Promise<void> => {
  await apiClient.delete(`/surgical-operations/${id}`);
};

export interface SurgicalOperationCharge {
  id: number;
  surgical_operation_id: number;
  name: string;
  type: "fixed" | "percentage";
  amount: number;
  reference_type: "total" | "charge" | null;
  reference_charge_id: number | null;
  beneficiary: "center" | "staff";
  created_at?: string;
  updated_at?: string;
}

export const getSurgicalOperationCharges = async (
  operationId: number,
): Promise<SurgicalOperationCharge[]> => {
  const response = await apiClient.get(
    `/surgical-operations/${operationId}/charges`,
  );
  return response.data?.data || response.data || [];
};

export const createSurgicalOperationCharge = async (
  operationId: number,
  data: {
    name: string;
    type: "fixed" | "percentage";
    amount: number;
    reference_type?: "total" | "charge" | null;
    reference_charge_id?: number | null;
    beneficiary: "center" | "staff";
  },
): Promise<SurgicalOperationCharge> => {
  const response = await apiClient.post(
    `/surgical-operations/${operationId}/charges`,
    data,
  );
  return response.data;
};

export const updateSurgicalOperationCharge = async (
  operationId: number,
  chargeId: number,
  data: {
    name?: string;
    type?: "fixed" | "percentage";
    amount?: number;
    reference_type?: "total" | "charge" | null;
    reference_charge_id?: number | null;
    beneficiary?: "center" | "staff";
  },
): Promise<SurgicalOperationCharge> => {
  const response = await apiClient.put(
    `/surgical-operations/${operationId}/charges/${chargeId}`,
    data,
  );
  return response.data;
};

export const deleteSurgicalOperationCharge = async (
  operationId: number,
  chargeId: number,
): Promise<void> => {
  await apiClient.delete(
    `/surgical-operations/${operationId}/charges/${chargeId}`,
  );
};

export const importStandardCharges = async (
  operationId: number,
): Promise<SurgicalOperationCharge[]> => {
  const response = await apiClient.post(
    `/surgical-operations/${operationId}/import-standard-charges`,
  );
  return response.data;
};

export const getSurgeryStatistics = async (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const response = await apiClient.get("/surgeries/statistics", { params });
  return response.data;
};
