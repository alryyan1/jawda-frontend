// src/services/jobsManagementService.ts
import apiClient from "./api";

export interface FailedJob {
  id: number;
  uuid: string;
  queue: string;
  job_name: string;
  connection: string;
  exception: string;
  failed_at: string;
  payload: any;
}

export interface PendingJob {
  id: number;
  queue: string;
  job_name: string;
  attempts: number;
  reserved_at: string | null;
  available_at: string;
  created_at: string;
  payload: any;
}

export interface JobsStatistics {
  pending_total: number;
  failed_total: number;
  pending_by_queue: Record<string, number>;
  failed_by_queue: Record<string, number>;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface StatisticsResponse {
  success: boolean;
  data: JobsStatistics;
}

interface QueuesResponse {
  success: boolean;
  data: string[];
}

interface ActionResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Get list of failed jobs
 */
export const getFailedJobs = async (
  params?: { page?: number; per_page?: number }
): Promise<PaginatedResponse<FailedJob>> => {
  const response = await apiClient.get<PaginatedResponse<FailedJob>>(
    "/jobs-management/failed",
    { params }
  );
  return response.data;
};

/**
 * Get list of pending jobs
 */
export const getPendingJobs = async (
  params?: { page?: number; per_page?: number; queue?: string }
): Promise<PaginatedResponse<PendingJob>> => {
  const response = await apiClient.get<PaginatedResponse<PendingJob>>(
    "/jobs-management/pending",
    { params }
  );
  return response.data;
};

/**
 * Get jobs statistics
 */
export const getJobsStatistics = async (): Promise<JobsStatistics> => {
  const response = await apiClient.get<StatisticsResponse>(
    "/jobs-management/statistics"
  );
  return response.data.data;
};

/**
 * Get available queues
 */
export const getQueues = async (): Promise<string[]> => {
  const response = await apiClient.get<QueuesResponse>(
    "/jobs-management/queues"
  );
  return response.data.data;
};

/**
 * Retry a failed job
 */
export const retryJob = async (id: number): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>(
    `/jobs-management/retry/${id}`
  );
  return response.data;
};

/**
 * Retry all failed jobs
 */
export const retryAllJobs = async (): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>(
    "/jobs-management/retry-all"
  );
  return response.data;
};

/**
 * Delete a failed job
 */
export const deleteFailedJob = async (id: number): Promise<ActionResponse> => {
  const response = await apiClient.delete<ActionResponse>(
    `/jobs-management/failed/${id}`
  );
  return response.data;
};

/**
 * Delete all failed jobs
 */
export const deleteAllFailedJobs = async (): Promise<ActionResponse> => {
  const response = await apiClient.delete<ActionResponse>(
    "/jobs-management/failed"
  );
  return response.data;
};

/**
 * Delete failed jobs by queue name
 */
export const deleteFailedJobsByQueue = async (
  queue: string
): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>(
    "/jobs-management/failed/delete-by-queue",
    { queue }
  );
  return response.data;
};

/**
 * Delete multiple failed jobs by IDs
 */
export const deleteFailedJobsByIds = async (
  ids: number[]
): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>(
    "/jobs-management/failed/delete-by-ids",
    { ids }
  );
  return response.data;
};

/**
 * Delete a pending job
 */
export const deletePendingJob = async (id: number): Promise<ActionResponse> => {
  const response = await apiClient.delete<ActionResponse>(
    `/jobs-management/pending/${id}`
  );
  return response.data;
};

/**
 * Delete all pending jobs
 */
export const deleteAllPendingJobs = async (): Promise<ActionResponse> => {
  const response = await apiClient.delete<ActionResponse>(
    "/jobs-management/pending"
  );
  return response.data;
};

/**
 * Delete pending jobs by queue name
 */
export const deletePendingJobsByQueue = async (
  queue: string
): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>(
    "/jobs-management/pending/delete-by-queue",
    { queue }
  );
  return response.data;
};

/**
 * Delete multiple pending jobs by IDs
 */
export const deletePendingJobsByIds = async (
  ids: number[]
): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>(
    "/jobs-management/pending/delete-by-ids",
    { ids }
  );
  return response.data;
};

/**
 * Queue Worker Management
 */
export interface QueueWorkerStatus {
  success: boolean;
  data: {
    is_running: boolean;
    pid: number | null;
    status: 'running' | 'stopped';
  };
  message?: string;
}

/**
 * Get queue worker status
 */
export const getQueueWorkerStatus = async (): Promise<QueueWorkerStatus> => {
  const response = await apiClient.get<QueueWorkerStatus>(
    "/queue-worker/status"
  );
  return response.data;
};

/**
 * Start queue worker
 */
export const startQueueWorker = async (): Promise<QueueWorkerStatus> => {
  const response = await apiClient.post<QueueWorkerStatus>(
    "/queue-worker/start"
  );
  return response.data;
};

/**
 * Stop queue worker
 */
export const stopQueueWorker = async (): Promise<QueueWorkerStatus> => {
  const response = await apiClient.post<QueueWorkerStatus>(
    "/queue-worker/stop"
  );
  return response.data;
};

/**
 * Toggle queue worker (start if stopped, stop if running)
 */
export const toggleQueueWorker = async (): Promise<QueueWorkerStatus> => {
  const response = await apiClient.post<QueueWorkerStatus>(
    "/queue-worker/toggle"
  );
  return response.data;
};

