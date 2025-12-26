import { pdf } from '@react-pdf/renderer';
import AdmissionServicesPdf from '@/components/admissions/pdfs/AdmissionServicesPdf';
import AdmissionPatientDetailsPdf from '@/components/admissions/pdfs/AdmissionPatientDetailsPdf';
import AdmissionVitalSignsPdf from '@/components/admissions/pdfs/AdmissionVitalSignsPdf';
import AdmissionFullDataPdf from '@/components/admissions/pdfs/AdmissionFullDataPdf';
import AdmissionFilePdf from '@/components/admissions/pdfs/AdmissionFilePdf';
import type { Admission, AdmissionRequestedService, AdmissionVitalSign } from '@/types/admissions';
import { registerAmiriFont } from '@/lib/pdfFonts';
import { getPdfSettings } from '@/services/pdfSettingService';

/**
 * Generate PDF blob for admission services
 */
export const generateServicesPdf = async (
  admission: Admission,
  services: AdmissionRequestedService[]
): Promise<Blob> => {
  await registerAmiriFont(); // Ensure font is registered
  const settings = await getPdfSettings();
  const doc = <AdmissionServicesPdf admission={admission} services={services} settings={settings} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Generate PDF blob for patient details
 */
export const generatePatientDetailsPdf = async (admission: Admission): Promise<Blob> => {
  await registerAmiriFont(); // Ensure font is registered
  const settings = await getPdfSettings();
  const doc = <AdmissionPatientDetailsPdf admission={admission} settings={settings} />;
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
  await registerAmiriFont(); // Ensure font is registered
  const settings = await getPdfSettings();
  const doc = <AdmissionVitalSignsPdf admission={admission} vitalSigns={vitalSigns} settings={settings} />;
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
  await registerAmiriFont(); // Ensure font is registered
  const settings = await getPdfSettings();
  const doc = (
    <AdmissionFullDataPdf admission={admission} services={services} vitalSigns={vitalSigns} settings={settings} />
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
  await registerAmiriFont(); // Ensure font is registered
  const settings = await getPdfSettings();
  const doc = <AdmissionFilePdf admission={admission} services={services} vitalSigns={vitalSigns} settings={settings} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
};

/**
 * Download PDF from blob
 */
export const downloadPdf = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

