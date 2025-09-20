import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a PDF file to Firebase Storage
 * @param file - The file to upload (Blob or File)
 * @param hospitalName - Name of the hospital
 * @param doctorVisitId - ID of the doctor visit
 * @param fileName - Optional custom filename
 * @returns Promise with upload result
 */
export const uploadLabResultToFirebase = async (
  file: Blob | File,
  hospitalName: string,
  doctorVisitId: number,
  fileName?: string
): Promise<UploadResult> => {
  try {
    // Create storage path: results/${hospitalname}/${doctorvisit.id}/
    const storagePath = `results/${hospitalName}/${doctorVisitId}/`;
    const finalFileName = fileName || 'result.pdf';
    const fullPath = `${storagePath}${finalFileName}`;
    
    // Create a reference to the file location
    const storageRef = ref(storage, fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL
    };
  } catch (error) {
    console.error('Error uploading to Firebase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Upload lab result PDF from API response
 * @param pdfBlob - PDF blob from API
 * @param hospitalName - Name of the hospital
 * @param doctorVisitId - ID of the doctor visit
 * @returns Promise with upload result
 */
export const uploadLabResultFromApi = async (
  pdfBlob: Blob,
  hospitalName: string,
  doctorVisitId: number
): Promise<UploadResult> => {
  // Use simple filename
  const fileName = 'result.pdf';
  
  return uploadLabResultToFirebase(pdfBlob, hospitalName, doctorVisitId, fileName);
};

/**
 * Get the stored result URL for a patient
 * @param patient - Patient object with result_url field
 * @returns The Firebase download URL if available, null otherwise
 */
export const getPatientResultUrl = (patient: { result_url?: string | null }): string | null => {
  return patient.result_url || null;
};

/**
 * Check if a patient has a stored result URL
 * @param patient - Patient object with result_url field
 * @returns True if patient has a result URL, false otherwise
 */
export const hasPatientResultUrl = (patient: { result_url?: string | null }): boolean => {
  return Boolean(patient.result_url);
};
