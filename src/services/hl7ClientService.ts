import apiClient from './api';

export interface HL7ClientStatus {
  is_running: boolean;
  pid?: number;
  status: 'connected' | 'disconnected';
}

export interface HL7ClientResponse {
  success: boolean;
  message?: string;
  data: HL7ClientStatus;
}

class HL7ClientService {
  /**
   * Get HL7 client status
   */
  async getStatus(): Promise<HL7ClientResponse> {
    const response = await apiClient.get('/hl7-client/status');
    return response.data;
  }

  /**
   * Start HL7 client
   */
  async start(host?: string, port?: number): Promise<HL7ClientResponse> {
    const response = await apiClient.post('/hl7-client/start', {
      host: host || '192.168.1.114',
      port: port || 5100
    });
    return response.data;
  }

  /**
   * Stop HL7 client
   */
  async stop(): Promise<HL7ClientResponse> {
    const response = await apiClient.post('/hl7-client/stop');
    return response.data;
  }

  /**
   * Toggle HL7 client (start if stopped, stop if running)
   */
  async toggle(host?: string, port?: number): Promise<HL7ClientResponse> {
    const response = await apiClient.post('/hl7-client/toggle', {
      host: host || '192.168.1.114',
      port: port || 5100
    });
    return response.data;
  }
}

export default new HL7ClientService();
