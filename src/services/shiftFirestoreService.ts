import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { webUrl } from '@/pages/constants';
import { getFinancialSummary } from './dashboardService';
import { getSettings } from './settingService';
import { sendWhatsAppCloudTemplate, type WhatsAppCloudTemplatePayload } from './whatsappCloudApiService';
import { formatNumber } from '@/lib/utils';

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
): Promise<string> => {
  if (!storage) throw new Error('Firebase Storage is not initialized');

  const fileName = `${reportType}_report.pdf`;
  const storagePath = `medical_shifts/${shiftId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

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

    // 2. Upload to Storage
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

    // 3. Save metadata to Firestore at /pharmacies/one_care/medical_shift/{shiftId}
    const shiftDocRef = doc(db, 'pharmacies', 'one_care', 'medical_shift', shiftId.toString());
    
    await setDoc(
      shiftDocRef,
      {
        shift_id: shiftId,
        discount_report_url: discountUrl,
        refund_report_url: refundUrl,
        reconciliation_report_url: reconciliationUrl,
        uploaded_at: serverTimestamp(),
        status: "closed",
      },
      { merge: true },
    );

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

/**
 * Send the daily closing summary via WhatsApp template
 */
export const sendShiftSummaryWhatsApp = async (shiftId: number, userName: string) => {
  try {
    const summary = await getFinancialSummary({ shift_id: shiftId });
    const settings = await getSettings();
    const to = settings?.whatsapp_number;

    if (!to) {
      console.warn('No WhatsApp number configured in settings');
      return { success: false, error: 'WhatsApp number not configured' };
    }

    const totalRevenue = (summary.lab_revenue.total || 0) + (summary.services_revenue.total || 0);
    const totalCash = (summary.lab_revenue.cash || 0) + (summary.services_revenue.cash || 0);
    const totalBank = (summary.lab_revenue.bank || 0) + (summary.services_revenue.bank || 0);

    const payload: WhatsAppCloudTemplatePayload = {
      to: '249991961111',
      template_name: 'daily_closing_summary',
      language_code: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: formatNumber(totalRevenue, 0) }, // {{1}} الإيرادات الإجمالية
            { type: 'text', text: formatNumber(totalCash, 0) },    // {{2}} نقداً (كاش)
            { type: 'text', text: formatNumber(totalBank, 0) },    // {{3}} تحويل (بنكك)
            { type: 'text', text: formatNumber(summary.costs.total || 0, 0) }, // {{4}} إجمالي المصروفات
            { type: 'text', text: formatNumber(summary.total_refunds || 0, 0) }, // {{5}} إجمالي المبالغ المستردة
            { type: 'text', text: formatNumber(summary.total_discounts || 0, 0) }, // {{6}} إجمالي التخفيضات الممنوحة
            { type: 'text', text: userName }, // {{7}} الموظف المسؤول
            { type: 'text', text: formatNumber(summary.net_cash || 0, 0) }, // {{8}} الصافي (كاش)
            { type: 'text', text: formatNumber(summary.net_bank || 0, 0) }, // {{9}} الصافي (بنكك)
          ],
        },
      ],
    };

    const response = await sendWhatsAppCloudTemplate(payload);
    return { success: response.success, data: response.data };
  } catch (error) {
    console.error('Error sending WhatsApp summary:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
