// src/services/labRequestService.ts
import apiClient from "./api";
import { MainTestStripped } from "../types/labTests"; // For available tests
import { LabRequest } from "../types/visits"; // Or where LabRequest type is defined

const VISIT_BASE_URL = "/visits"; // Assuming lab requests are nested under visits
const LABREQUEST_BASE_URL = "/labrequests"; // For direct operations on lab requests

export const getAvailableLabTestsForVisit = async (
  visitId: number
): Promise<MainTestStripped[]> => {
  // Backend LabRequestController@availableTestsForVisit returns MainTestStrippedResource::collection
  const response = await apiClient.get<{ data: MainTestStripped[] }>(
    `${VISIT_BASE_URL}/${visitId}/available-lab-tests`
  );
  return response.data.data;
};

export const addLabTestsToVisit = async (params: {
  visitId: number;
  main_test_ids: number[];
  comment?: string;
}): Promise<LabRequest[]> => {
  // Backend LabRequestController@storeBatchForVisit returns LabRequestResource::collection
  const response = await apiClient.post<{ data: LabRequest[] }>(
    `${VISIT_BASE_URL}/${params.visitId}/lab-requests-batch`,
    {
      main_test_ids: params.main_test_ids,
      comment: params.comment,
    }
  );
  return response.data.data;
};

export const getLabRequestsForVisit = async (
  visitId: number
): Promise<LabRequest[]> => {
  // Backend LabRequestController@indexForVisit returns LabRequestResource::collection
  const response = await apiClient.get<{ data: LabRequest[] }>(
    `${VISIT_BASE_URL}/${visitId}/lab-requests`
  );
  return response.data.data;
};

export const cancelLabRequest = async (labRequestId: number): Promise<void> => {
  await apiClient.delete(`${LABREQUEST_BASE_URL}/${labRequestId}`);
};

interface RecordLabPaymentPayload {
  amount_to_pay: number;
  is_bankak: boolean; // Or generic is_bank
  shift_id: number;
}
export const recordLabRequestPayment = async (
  labRequestId: number,
  payload: RecordLabPaymentPayload
): Promise<LabRequest> => {
  // Backend LabRequestController@recordPayment returns LabRequestResource
  const response = await apiClient.post<{ data: LabRequest }>(
    `${LABREQUEST_BASE_URL}/${labRequestId}/pay`,
    payload
  );
  return response.data.data;
};
export const updateLabRequestFlags = async (
  labRequestId: number,
  flags: { hidden?: boolean; no_sample?: boolean; valid?: boolean }
): Promise<LabRequest> => {
  // Backend LabRequestController@update returns LabRequestResource
  const response = await apiClient.put<{ data: LabRequest }>(
    `${LABREQUEST_BASE_URL}/${labRequestId}`,
    flags
  );
  return response.data.data;
};

// Optional: Update other details of a lab request
// export const updateLabRequestDetails = async (labRequestId: number, data: Partial<LabRequest>): Promise<LabRequest> => { ... }
