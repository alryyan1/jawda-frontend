import apiClient from './api';

export interface HL7Message {
  id: number;
  raw_message: string;
  device?: string;
  message_type?: string;
  patient_id?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HL7MessagesResponse {
  data: HL7Message[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const hl7Service = {
  // Get all HL7 messages with pagination
  async getMessages(page: number = 1, perPage: number = 10): Promise<HL7MessagesResponse> {
    const response = await apiClient.get('/hl7-messages', {
      params: { page, per_page: perPage }
    });
    return response.data;
  },

  // Get a specific HL7 message by ID
  async getMessage(id: number): Promise<HL7Message> {
    const response = await apiClient.get(`/hl7-messages/${id}`);
    return response.data;
  },

  // Delete a specific HL7 message
  async deleteMessage(id: number): Promise<void> {
    await apiClient.delete(`/hl7-messages/${id}`);
  },

  // Get messages by device
  async getMessagesByDevice(device: string, page: number = 1, perPage: number = 10): Promise<HL7MessagesResponse> {
    const response = await apiClient.get('/hl7-messages', {
      params: { device, page, per_page: perPage }
    });
    return response.data;
  },

  // Get messages by patient ID
  async getMessagesByPatient(patientId: string, page: number = 1, perPage: number = 10): Promise<HL7MessagesResponse> {
    const response = await apiClient.get('/hl7-messages', {
      params: { patient_id: patientId, page, per_page: perPage }
    });
    return response.data;
  },

  // Get recent messages (last 24 hours)
  async getRecentMessages(page: number = 1, perPage: number = 10): Promise<HL7MessagesResponse> {
    const response = await apiClient.get('/hl7-messages/recent', {
      params: { page, per_page: perPage }
    });
    return response.data;
  }
};
