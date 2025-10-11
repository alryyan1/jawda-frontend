import apiClient from './api';

export interface SmsMessage {
  to: string;
  message: string;
  is_otp?: boolean;
}

export interface SmsRequest {
  sender?: string;
  messages: SmsMessage[];
}

export interface SmsResponse {
  success: boolean;
  provider_id?: string;
  error?: string;
  raw?: any;
}

export interface SmsBulkResponse {
  success: boolean;
  results: Array<{
    to: string;
    success: boolean;
    provider_id?: string;
    error?: string;
  }>;
  raw?: any;
}

class SmsService {
  /**
   * Send a single SMS message
   */
  async sendSms(to: string, message: string, sender?: string): Promise<SmsResponse> {
    try {
      const request: SmsRequest = {
        sender,
        messages: [
          {
            to,
            message,
            is_otp: false
          }
        ]
      };

      const response = await apiClient.post('/sms/send', request);
      return response.data;
    } catch (error: any) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Send multiple SMS messages
   */
  async sendBulkSms(messages: SmsMessage[], sender?: string): Promise<SmsBulkResponse> {
    try {
      const request: SmsRequest = {
        sender,
        messages
      };

      const response = await apiClient.post('/sms/send', request);
      return response.data;
    } catch (error: any) {
      console.error('Bulk SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Send lab approval notification SMS
   */
  async sendLabApprovalSms(phoneNumber: string): Promise<SmsResponse> {
    const message = "تمّ تفعيل حسابكم بنجاح، ويمكنكم الآن استخدامه لطلب التحاليل المخبرية.\nمع خالص التحية،\nمختبر الرومي الطبي";
    
    return this.sendSms(phoneNumber, message, "Jawda");
  }
}

export const smsService = new SmsService();
export default smsService;
