import apiClient from "@/services/api";
import type {
  DiagnosisPageData,
  RequestedServiceDiagnosis,
} from "@/types/diagnosis";

export const getDiagnosisPageData = async (
  requestedServiceId: number,
): Promise<DiagnosisPageData> => {
  const response = await apiClient.get<DiagnosisPageData>(
    `/requested-services/${requestedServiceId}/diagnosis`,
  );
  return response.data;
};

export const startDiagnosis = async (
  requestedServiceId: number,
): Promise<RequestedServiceDiagnosis> => {
  const response = await apiClient.post<{ data: RequestedServiceDiagnosis }>(
    `/requested-services/${requestedServiceId}/diagnosis`,
  );
  return response.data.data;
};

export const openDiagnosisPdf = async (diagnosisId: number): Promise<void> => {
  const response = await apiClient.get(
    `/requested-service-diagnoses/${diagnosisId}/pdf`,
    { responseType: "blob" },
  );
  const blobUrl = URL.createObjectURL(
    new Blob([response.data], { type: "application/pdf" }),
  );
  window.open(blobUrl, "_blank");
  // Revoke after a short delay to free memory once the tab has loaded
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
};

export const updateDiagnosis = async (
  diagnosisId: number,
  payload: Partial<
    Pick<
      RequestedServiceDiagnosis,
      "diagnosis" | "complete" | "is_printed" | "printed_by_user_id"
    >
  >,
): Promise<RequestedServiceDiagnosis> => {
  const response = await apiClient.put<{ data: RequestedServiceDiagnosis }>(
    `/requested-service-diagnoses/${diagnosisId}`,
    payload,
  );
  return response.data.data;
};
