import apiClient from './api';

export interface FirestoreUpdateData {
  lab_to_lab_object_id: string;
  pdf_url: string;
  project_id: string;
  firestore_path: string;
  firestore_url: string;
  update_payload: {
    fields: {
      pdf_url: { stringValue: string };
      result_updated_at: { timestampValue: string };
    };
  };
}

export interface FirestoreUpdateResponse {
  success: boolean;
  message: string;
  data?: FirestoreUpdateData;
  error?: string;
}

/**
 * Update Firestore document directly via backend with merge operation
 * This will append/update specific fields without removing existing ones
 */
export const updateFirestoreDocumentViaBackend = async (
  labToLabObjectId: string,
  resultUrl: string,
  patientId: number
): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    console.log('Updating Firestore document via backend (merge operation):', {
      labToLabObjectId,
      resultUrl,
      patientId,
      note: 'This will preserve existing fields and only update pdf_url, result_updated_at, and lab_to_lab_object_id'
    });

    const response = await apiClient.post('/firestore/update-document', {
      lab_to_lab_object_id: labToLabObjectId,
      pdf_url: resultUrl,
      patient_id: patientId
    });

    return response.data;
  } catch (error: unknown) {
    console.error('Error updating Firestore document via backend:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: 'Failed to update Firestore document',
      error: errorMessage,
    };
  }
};

/**
 * Get Firestore update data from backend
 */
export const getFirestoreUpdateData = async (
  labToLabObjectId: string,
  pdfUrl: string
): Promise<FirestoreUpdateResponse> => {
  try {
    const response = await apiClient.post('/firestore/update-patient-pdf', {
      lab_to_lab_object_id: labToLabObjectId,
      pdf_url: pdfUrl,
    });

    return response.data;
  } catch (error: unknown) {
    console.error('Error getting Firestore update data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: 'Failed to get Firestore update data',
      error: errorMessage,
    };
  }
};

/**
 * Update Firestore document directly using REST API
 * This function makes a direct call to Google Firestore REST API
 */
// This function is no longer needed as we're using the backend endpoint
// export const updateFirestoreDocument = async (
//   firestoreUrl: string,
//   updatePayload: Record<string, unknown>,
//   accessToken?: string
// ): Promise<{ success: boolean; message: string; error?: string }> => {
//   // Implementation removed - using backend endpoint instead
// };

/**
 * Helper function to construct Firestore path for a patient
 */
export const constructFirestorePath = (patientId: number): string => {
  return `/labToLap/global/patients/${patientId}`;
};

/**
 * Directly update Firestore document using the provided path and data
 * This function constructs the Firestore REST API URL and updates the document directly
 */
// This function is no longer needed as we're using the backend endpoint
// export const updateFirestoreDocumentDirect = async (
//   labToLabObjectId: string,
//   resultUrl: string,
//   firestorePath: string = '/labToLap/global/patients/15'
// ): Promise<{ success: boolean; message: string; error?: string }> => {
//   // Implementation removed - using backend endpoint instead
// };

// This function is no longer needed as we're using the backend endpoint
// export const updatePatientPdfInFirestore = async (
//   labToLabObjectId: string,
//   pdfUrl: string,
//   accessToken?: string
// ): Promise<{ success: boolean; message: string; error?: string }> => {
//   // Implementation removed - using backend endpoint instead
// };
