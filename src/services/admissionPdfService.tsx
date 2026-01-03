import { pdf } from "@react-pdf/renderer";
import AdmissionServicesPdf from "@/components/admissions/pdfs/AdmissionServicesPdf";
import AdmissionPatientDetailsPdf from "@/components/admissions/pdfs/AdmissionPatientDetailsPdf";
import AdmissionVitalSignsPdf from "@/components/admissions/pdfs/AdmissionVitalSignsPdf";
import AdmissionFullDataPdf from "@/components/admissions/pdfs/AdmissionFullDataPdf";
import AdmissionFilePdf from "@/components/admissions/pdfs/AdmissionFilePdf";
import AdmissionLedgerPdf from "@/components/admissions/pdfs/AdmissionLedgerPdf";
import AdmissionSummaryPdf from "@/components/admissions/pdfs/AdmissionSummaryPdf";
import AdditionalSignsFormPdf from "@/components/admissions/pdfs/AdditionalSignsFormPdf";
import SugarAcetoneChartPdf from "@/components/admissions/pdfs/SugarAcetoneChartPdf";
import TreatmentSheetPdf from "@/components/admissions/pdfs/TreatmentSheetPdf";
import MedicationDoseFormPdf from "@/components/admissions/pdfs/MedicationDoseFormPdf";
import ObservationSheetPdf from "@/components/admissions/pdfs/ObservationSheetPdf";
import OperationSheetPdf from "@/components/admissions/pdfs/OperationSheetPdf";
import ClaimFormPdf from "@/components/admissions/pdfs/ClaimFormPdf";
import AdmissionDischargeFormPdf from "@/components/admissions/pdfs/AdmissionDischargeFormPdf";
import type {
  Admission,
  AdmissionRequestedService,
  AdmissionVitalSign,
  AdmissionLedger,
} from "@/types/admissions";
import { registerFont } from "@/lib/pdfFonts";
import { getPdfSettings } from "@/services/pdfSettingService";
import { processPdfSettingsImages } from "@/lib/pdfImageUtils";

/**
 * Generate PDF blob for admission services
 */
export const generateServicesPdf = async (
  admission: Admission,
  services: AdmissionRequestedService[]
): Promise<Blob> => {
  const settings = await getPdfSettings();
  await registerFont(settings?.font_family || 'Amiri'); // Register font based on settings
  await new Promise(resolve => setTimeout(resolve, 100)); // Ensure font is ready
  const processedSettings = await processPdfSettingsImages(settings);
  const doc = (
    <AdmissionServicesPdf
      admission={admission}
      services={services}
      settings={processedSettings}
    />
  );
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Generate PDF blob for patient details
 */
export const generatePatientDetailsPdf = async (
  admission: Admission
): Promise<Blob> => {
  const settings = await getPdfSettings();
  await registerFont(settings?.font_family || 'Amiri'); // Register font based on settings
  await new Promise(resolve => setTimeout(resolve, 100)); // Ensure font is ready
  const processedSettings = await processPdfSettingsImages(settings);
  const doc = (
    <AdmissionPatientDetailsPdf
      admission={admission}
      settings={processedSettings}
    />
  );
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Generate PDF blob for vital signs
 */
export const generateVitalSignsPdf = async (
  admission: Admission,
  vitalSigns: AdmissionVitalSign[]
): Promise<Blob> => {
  const settings = await getPdfSettings();
  await registerFont(settings?.font_family || 'Amiri'); // Register font based on settings
  await new Promise(resolve => setTimeout(resolve, 100)); // Ensure font is ready
  const processedSettings = await processPdfSettingsImages(settings);
  const doc = (
    <AdmissionVitalSignsPdf
      admission={admission}
      vitalSigns={vitalSigns}
      settings={processedSettings}
    />
  );
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Generate PDF blob for full admission data
 */
export const generateFullAdmissionPdf = async (
  admission: Admission,
  services: AdmissionRequestedService[],
  vitalSigns: AdmissionVitalSign[]
): Promise<Blob> => {
  const settings = await getPdfSettings();
  await registerFont(settings?.font_family || 'Amiri'); // Register font based on settings
  await new Promise(resolve => setTimeout(resolve, 100)); // Ensure font is ready
  const processedSettings = await processPdfSettingsImages(settings);
  const doc = (
    <AdmissionFullDataPdf
      admission={admission}
      services={services}
      vitalSigns={vitalSigns}
      settings={processedSettings}
    />
  );
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Generate PDF blob for admission file
 */
export const generateFilePdf = async (
  admission: Admission,
  services: AdmissionRequestedService[],
  vitalSigns: AdmissionVitalSign[]
): Promise<Blob> => {
  const settings = await getPdfSettings();
  await registerFont(settings?.font_family || 'Amiri'); // Register font based on settings
  await new Promise(resolve => setTimeout(resolve, 100)); // Ensure font is ready
  const processedSettings = await processPdfSettingsImages(settings);
  const doc = (
    <AdmissionFilePdf
      admission={admission}
      services={services}
      vitalSigns={vitalSigns}
      settings={processedSettings}
    />
  );
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Generate PDF blob for admission ledger (account statement)
 */
export const generateLedgerPdf = async (
  admission: Admission,
  ledger: AdmissionLedger
): Promise<Blob> => {
  try {
  const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri'); // Register font based on settings
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure font is ready
  const processedSettings = await processPdfSettingsImages(settings);
  const doc = (
    <AdmissionLedgerPdf
      admission={admission}
      ledger={ledger}
      settings={processedSettings}
    />
  );
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
  } catch (error) {
    console.error('Error in generateLedgerPdf:', error);
    throw error;
  }
};

/**
 * Download PDF from blob
 */
export const downloadPdf = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate PDF blob for admission summary sheet
 */
export const generateSummaryPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    // Register font and wait for it to be fully ready
    await registerFont(settings?.font_family || 'Amiri');
    // Additional small delay to ensure font registration is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <AdmissionSummaryPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateSummaryPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for additional signs form
 */
export const generateAdditionalSignsFormPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <AdditionalSignsFormPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateAdditionalSignsFormPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for sugar and acetone chart
 */
export const generateSugarAcetoneChartPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <SugarAcetoneChartPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateSugarAcetoneChartPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for treatment sheet
 */
export const generateTreatmentSheetPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <TreatmentSheetPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateTreatmentSheetPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for medication/dose form
 */
export const generateMedicationDoseFormPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <MedicationDoseFormPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateMedicationDoseFormPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for observation sheet
 */
export const generateObservationSheetPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <ObservationSheetPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateObservationSheetPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for operation sheet
 */
export const generateOperationSheetPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <OperationSheetPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateOperationSheetPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for claim form
 */
export const generateClaimFormPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <ClaimFormPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateClaimFormPdf:', error);
    throw error;
  }
};

/**
 * Generate PDF blob for admission/discharge form
 */
export const generateAdmissionDischargeFormPdf = async (
  admission: Admission
): Promise<Blob> => {
  try {
    const settings = await getPdfSettings();
    await registerFont(settings?.font_family || 'Amiri');
    await new Promise(resolve => setTimeout(resolve, 100));
    const processedSettings = await processPdfSettingsImages(settings);
    const doc = (
      <AdmissionDischargeFormPdf
        admission={admission}
        settings={processedSettings}
      />
    );
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (error) {
    console.error('Error in generateAdmissionDischargeFormPdf:', error);
    throw error;
  }
};

/**
 * Open PDF in the same tab
 */
export const openPdfInNewTab = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  window.location.href = url;
  // Note: The object URL will be cleaned up when the page navigates away
};
