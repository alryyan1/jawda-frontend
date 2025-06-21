// src/services/whatsappService.ts
import axios from 'axios'; // Use a fresh Axios instance for external API

const WAAPI_BASE_URL = 'https://waapi.app/api/v1/instances';

// Define interfaces for the waapi.app payloads and responses
interface WaApiSendMediaPayload {
  chatId: string; // e.g., "249991961111@c.us"
  mediaBase64: string;
  mediaCaption?: string;
  mediaName: string; // e.g., "report.pdf", "image.png"
  asDocument?: boolean; // True for PDFs
  // Other options from their API docs:
  // previewLink?: boolean;
  // asSticker?: boolean;
  // asVoice?: boolean;
}

interface WaApiSendTextPayload {
  chatId: string;
  message: string;
  // Other options from their API docs...
}

// Based on your example response
interface WaApiResponseDataDetail {
  _data: {
    id: {
      fromMe: boolean;
      remote: string;
      id: string;
      _serialized: string;
    };
    type: string; // 'document', 'chat', etc.
    caption?: string;
    filename?: string;
    // ... other fields
  };
  id: { };
  ack: number;
  // ... other fields
}
interface WaApiResponse {
  status: "success" | "error" | string; // API might have other statuses
  instanceId?: string;
  data?: WaApiResponseDataDetail; // For send-media and send-message
  message?: string; // For error messages from waapi
  error?: any; // For more detailed errors
}


/**
 * Sends media (e.g., PDF, image) via waapi.app.
 * @param instanceId - Your waapi.app instance ID.
 * @param token - Your waapi.app Bearer token.
 * @param payload - The data for sending media.
 */
export const sendWaApiMedia = async (
  instanceId: string,
  token: string,
  payload: WaApiSendMediaPayload
): Promise<WaApiResponse> => {
  try {
    const response = await axios.post<WaApiResponse>(
      `${WAAPI_BASE_URL}/${instanceId}/client/action/send-media`,
      payload,
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("waapi.app send-media error:", error.response?.data || error.message);
    // Re-throw a structured error or return a WaApiResponse error object
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as WaApiResponse; // Assuming error response matches WaApiResponse
    }
    throw new Error('Failed to send media via waapi.app');
  }
};

/**
 * Sends a text message via waapi.app.
 * (Assuming a similar endpoint structure, e.g., /send-message)
 * @param instanceId - Your waapi.app instance ID.
 * @param token - Your waapi.app Bearer token.
 * @param payload - The data for sending a text message.
 */
export const sendWaApiTextMessage = async (
  instanceId: string,
  token: string,
  payload: WaApiSendTextPayload
): Promise<WaApiResponse> => {
  try {
    // IMPORTANT: Verify the correct endpoint for sending text messages from waapi.app documentation
    const response = await axios.post<WaApiResponse>(
      `${WAAPI_BASE_URL}/${instanceId}/client/action/send-message`, // GUESSING this endpoint
      payload,
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("waapi.app send-message error:", error.response?.data || error.message);
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as WaApiResponse;
    }
    throw new Error('Failed to send text message via waapi.app');
  }
};

/**
 * Helper to convert a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result is "data:mime/type;base64,THE_BASE_64_STRING"
      // We need to strip the "data:mime/type;base64," part
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};
