import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, secondaryStorage, secondaryDb, isBothTargetsEnabled } from '@/lib/firebase';
import { webUrl } from '@/pages/constants';
import { getSettings } from './settingService';
import { sendWhatsAppCloudTemplate, type WhatsAppCloudTemplatePayload } from './whatsappCloudApiService';
import {
  downloadShiftProfitLossPdf,
  downloadShiftRevenuePdf,
  downloadShiftExpensesPdf,
  downloadShiftInsuranceStatsPdf,
  downloadShiftLabStatsPdf,
  downloadShiftDiscountsPdf,
  downloadShiftDoctorLabPdf,
} from './reportService';

export interface ShiftUploadResult {
  success: boolean;
  discountUrl?: string;
  refundUrl?: string;
  reconciliationUrl?: string;
  error?: string;
}

/**
 * Upload a shift report PDF to Firebase Storage
 */
const uploadReportToStorage = async (
  shiftId: number,
  blob: Blob,
  reportType: "discount" | "refund" | "reconciliation",
  useSecondary = false
): Promise<string> => {
  const currentStorage = useSecondary ? secondaryStorage : storage;
  if (!currentStorage) throw new Error('Firebase Storage is not initialized');

  const fileName = `${reportType}_report.pdf`;
  const storagePath = `medical_shifts/${shiftId}/${fileName}`;
  const storageRef = ref(currentStorage, storagePath);

  const snapshot = await uploadBytes(storageRef, blob);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Orchestrate the upload of both discount and refund reports for a given shift
 */
export const uploadShiftReportsToFirebase = async (
  shiftId: number,
  userId: number,
): Promise<ShiftUploadResult> => {
  if (!db || !storage) {
    return {
      success: false,
      error: 'Firebase is not initialized or disabled.'
    };
  }

  try {
    // 1. Fetch the PDFs from backend as Blobs
    const discountPdfResp = await fetch(
      `${webUrl}reports/shift-patients-discount/pdf?shift_id=${shiftId}`,
    );
    const refundPdfResp = await fetch(
      `${webUrl}reports/shift-refunds/pdf?shift_id=${shiftId}`,
    );
    const reconciliationPdfResp = await fetch(
      `${webUrl}reports/cash-reconciliation/pdf?shift_id=${shiftId}&user_id=${userId}`,
    );

    if (
      !discountPdfResp.ok ||
      !refundPdfResp.ok ||
      !reconciliationPdfResp.ok
    ) {
      throw new Error(
        "Failed to fetch one or more shift reports from the server.",
      );
    }

    const discountBlob = await discountPdfResp.blob();
    const refundBlob = await refundPdfResp.blob();
    const reconciliationBlob = await reconciliationPdfResp.blob();

    // 2. Upload to Primary Storage
    const discountUrl = await uploadReportToStorage(
      shiftId,
      discountBlob,
      "discount",
    );
    const refundUrl = await uploadReportToStorage(shiftId, refundBlob, "refund");
    const reconciliationUrl = await uploadReportToStorage(
      shiftId,
      reconciliationBlob,
      "reconciliation",
    );

    // 3. Save metadata to Primary Firestore
    const shiftDocRef = doc(db, 'pharmacies', 'one_care', 'medical_shift', shiftId.toString());
    const docData = {
      shift_id: shiftId,
      discount_report_url: discountUrl,
      refund_report_url: refundUrl,
      reconciliation_report_url: reconciliationUrl,
      uploaded_at: serverTimestamp(),
      status: "closed",
    };
    
    await setDoc(shiftDocRef, docData, { merge: true });

    // 4. Handle Secondary Project if enabled
    if (isBothTargetsEnabled && secondaryStorage && secondaryDb) {
      try {
        console.log('[Firebase] Syncing shift reports to secondary project...');
        
        // Upload to Secondary Storage
        const discountUrlSec = await uploadReportToStorage(shiftId, discountBlob, "discount", true);
        const refundUrlSec = await uploadReportToStorage(shiftId, refundBlob, "refund", true);
        const reconciliationUrlSec = await uploadReportToStorage(shiftId, reconciliationBlob, "reconciliation", true);

        // Save to Secondary Firestore
        const shiftDocRefSec = doc(secondaryDb, 'pharmacies', 'one_care', 'medical_shift', shiftId.toString());
        await setDoc(shiftDocRefSec, {
          ...docData,
          discount_report_url: discountUrlSec,
          refund_report_url: refundUrlSec,
          reconciliation_report_url: reconciliationUrlSec,
        }, { merge: true });

        console.log('[Firebase] Shift reports synced to secondary project successfully.');
      } catch (secError) {
        console.error('[Firebase] Error syncing to secondary project:', secError);
      }
    }

    return {
      success: true,
      discountUrl,
      refundUrl,
      reconciliationUrl,
    };
  } catch (error) {
    console.error('Error uploading shift reports to Firebase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload'
    };
  }
};

export interface ClinicShiftReportUploadResult {
  success: boolean;
  urls?: Record<string, string>;
  error?: string;
}

const CLINIC_REPORT_KEYS = [
  { key: 'profit_loss',      label: 'الأرباح والخسائر',   fetcher: downloadShiftProfitLossPdf },
  { key: 'revenue',          label: 'الإيرادات',           fetcher: downloadShiftRevenuePdf },
  { key: 'expenses',         label: 'المصروفات',           fetcher: downloadShiftExpensesPdf },
  { key: 'insurance_stats',  label: 'إحصائيات التأمين',   fetcher: downloadShiftInsuranceStatsPdf },
  { key: 'lab_stats',        label: 'إحصائيات التحاليل',  fetcher: downloadShiftLabStatsPdf },
  { key: 'discounts',        label: 'التخفيضات',           fetcher: downloadShiftDiscountsPdf },
  { key: 'doctor_lab',       label: 'أداء الأطباء مختبر', fetcher: downloadShiftDoctorLabPdf },
] as const;

export type ClinicReportProgressCallback = (
  step: 'fetch' | 'upload' | 'done',
  label: string,
  index: number,
  total: number,
) => void;

/**
 * Upload all 7 clinic shift PDFs to Firebase Storage (sales project only) and record URLs in Firestore.
 * Storage path:  {storageName}/shifts/{shiftId}/documents/{key}.pdf
 * Firestore doc: {storageName}_shifts/{shiftId}  →  field: documents
 * Files are processed sequentially so onProgress reflects real per-file state.
 */
export const uploadShiftClinicReportsToFirebase = async (
  shiftId: number,
  onProgress?: ClinicReportProgressCallback,
): Promise<ClinicShiftReportUploadResult> => {
  if (!db || !storage) {
    return { success: false, error: 'Firebase is not initialized or disabled.' };
  }

  try {
    const settings = await getSettings();
    const storageName = settings?.storage_name?.trim();
    if (!storageName) {
      return { success: false, error: 'storage_name is not configured in settings.' };
    }

    const total = CLINIC_REPORT_KEYS.length;
    const urls: Record<string, string> = {};

    for (let i = 0; i < total; i++) {
      const { key, label, fetcher } = CLINIC_REPORT_KEYS[i];
      try {
        onProgress?.('fetch', label, i, total);
        const blob = await fetcher(shiftId);

        onProgress?.('upload', label, i, total);
        const path = `${storageName}/shifts/${shiftId}/${key}.pdf`;
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
        urls[key] = await getDownloadURL(snapshot.ref);

        onProgress?.('done', label, i, total);
      } catch (e) {
        console.warn(`[Firebase] Skipping ${key}:`, e);
      }
    }

    const docData = {
      shift_id: shiftId,
      storage_name: storageName,
      documents: urls,
      uploaded_at: serverTimestamp(),
    };

    // Firestore path: {storageName}/reports/shifts/{shiftId}
    const docRef = doc(db, storageName, 'reports', 'shifts', String(shiftId));
    await setDoc(docRef, docData, { merge: true });

    return { success: true, urls };
  } catch (error) {
    console.error('[Firebase] Error uploading clinic shift reports:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Send the shift_close_reports WhatsApp template with all 7 PDF URLs as URL buttons.
 * Body params: {{1}} shift_id, {{2}} date (DD-M-YYYY), {{3}} username
 * Buttons 0-6: dynamic URL for each report
 */
export const sendShiftCloseReportsWhatsApp = async (
  shiftId: number,
  userName: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const settings = await getSettings();
    const to = (settings as any)?.shift_summary_phone ?? settings?.whatsapp_number;
    if (!to) return { success: false, error: 'WhatsApp number not configured' };
    console.log(`[WhatsApp] Sending shift_close_reports template to ${to} for shift ${shiftId}...`);
    const storageName = settings?.storage_name?.trim() ?? 'default';
    const now = new Date();
    const date = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;

    const reportOrder = [
      'profit_loss',
      'revenue',
      'expenses',
      'insurance_stats',
      'lab_stats',
      'discounts',
      'doctor_lab',
    ] as const;

    // Payload format: "{storageName}:{shiftId}:{key}" — stays well under the 128-char limit.
    // The webhook resolves this to the full URL via Firestore: {storageName}_shifts/{shiftId}.documents.{key}
    const buttonComponents = reportOrder.map((key, index) => ({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(index),
      parameters: [{ type: 'payload', payload: `${storageName}:${shiftId}:${key}` }],
    }));

    const payload: WhatsAppCloudTemplatePayload = {
      to,
      template_name: 'shift_close_reports',
      language_code: 'ar',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(shiftId) },
            { type: 'text', text: date },
            { type: 'text', text: userName },
          ],
        },
        ...buttonComponents,
      ],
    };

    const response = await sendWhatsAppCloudTemplate(payload);
    return { success: response.success, error: response.error };
  } catch (error) {
    console.error('[WhatsApp] Error sending shift_close_reports template:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

