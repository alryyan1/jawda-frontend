import apiClient from './api';

export interface QueueWorkerStatus {
  is_running: boolean;
  pid?: number;
  status: 'running' | 'stopped';
}

export interface QueueWorkerResponse {
  success: boolean;
  message?: string;
  data: QueueWorkerStatus;
}

class QueueWorkerService {
  /**
   * Get queue worker status
   */
  async getStatus(): Promise<QueueWorkerResponse> {
    const response = await apiClient.get('/queue-worker/status');
    return response.data;
  }

  /**
   * Start queue worker
   */
  async start(): Promise<QueueWorkerResponse> {
    const response = await apiClient.post('/queue-worker/start');
    return response.data;
  }

  /**
   * Stop queue worker
   */
  async stop(): Promise<QueueWorkerResponse> {
    const response = await apiClient.post('/queue-worker/stop');
    return response.data;
  }

  /**
   * Toggle queue worker (start if stopped, stop if running)
   */
  async toggle(): Promise<QueueWorkerResponse> {
    const response = await apiClient.post('/queue-worker/toggle');
    return response.data;
  }
}

export default new QueueWorkerService();
