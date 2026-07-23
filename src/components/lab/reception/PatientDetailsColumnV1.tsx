// src/components/lab/reception/PatientDetailsColumnV1.tsx
import React, { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import apiClient from "@/services/api";
import { getSettings } from "@/services/settingService";
import { sendWhatsAppCloudTemplate } from "@/services/whatsappCloudApiService";
import { hasPatientResultUrl } from "@/services/firebaseStorageService";
import { useAuthorization } from "@/hooks/useAuthorization";

import PatientCompanyDetails from "./PatientCompanyDetails";
import EditPatientInfoDialog from "@/components/clinic/EditPatientInfoDialog";
import LabReportPdfPreviewDialog from "@/components/common/LabReportPdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Edit } from "lucide-react";

import type { DoctorVisit } from "@/types/visits";

interface PatientDetailsColumnV1Props {
  activeVisitId: number | null;
  visit?: DoctorVisit;
  onPrintReceipt: () => void;
}

export interface PatientDetailsColumnV1Ref {
  triggerPayment: () => void;
}

const getAge = (visit: DoctorVisit): string => {
  const age_year = visit?.patient?.age_year || 0;
  const age_month = visit?.patient?.age_month || 0;
  const age_day = visit?.patient?.age_day || 0;
  return `${age_year} سنة ${age_month} شهر ${age_day} يوم`;
};

/* ----------------------------- Subcomponents ------------------------------ */

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-border py-1.5">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium text-foreground">{value ?? "—"}</dd>
  </div>
);

const FinancialSummary: React.FC<{ total?: number; received?: number; balance?: number }> = ({
  total,
  received,
  balance,
}) => (
  <section aria-label="الملخص المالي" className="mb-2 w-full overflow-hidden rounded-lg border border-border bg-muted/40">
    <div className="grid grid-cols-3 divide-x divide-border">
      <div className="p-2 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">الإجمالي</div>
        <div className="text-xl font-bold text-foreground">{total?.toLocaleString()}</div>
      </div>
      <div className="p-2 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">المدفوع</div>
        <div className="text-xl font-bold text-green-600">{received?.toLocaleString()}</div>
      </div>
      <div className="p-2 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">المتبقي</div>
        <div className="text-xl font-bold text-red-600">{balance?.toLocaleString()}</div>
      </div>
    </div>
  </section>
);

/* -------------------------------- Column ---------------------------------- */

const PatientDetailsColumnV1 = forwardRef<PatientDetailsColumnV1Ref, PatientDetailsColumnV1Props>(
  ({ activeVisitId, visit, onPrintReceipt }, ref) => {
    const queryClient = useQueryClient();
    const { can } = useAuthorization();

    const [isEditPatientInfoDialogOpen, setIsEditPatientInfoDialogOpen] = useState(false);

    // PDF preview state
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");
    const [pdfFileName, setPdfFileName] = useState("document.pdf");

    const payAllMutation = useMutation({
      mutationFn: async () => {
        const response = await apiClient.post(`/doctor-visits/${activeVisitId}/pay-all-lab-requests`);
        return response.data;
      },
      onSuccess: async () => {
        onPrintReceipt();

        // Discount approval request over WhatsApp when any discount was applied
        if (
          visit &&
          ((visit.total_lab_discount && visit.total_lab_discount > 0) ||
            (visit.total_discount && visit.total_discount > 0))
        ) {
          try {
            const discountVal = visit.total_lab_discount || visit.total_discount || 0;
            const totalVal = visit.total_lab_amount || visit.total_amount || 0;
            const patientNameStr = visit.patient?.name || "مريض غير معروف";
            const usernameStr = visit.patient?.user?.username || visit.created_by_user?.username || "غير محدد";

            const settings = await getSettings();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const to = (settings as any)?.discount_request_phone ?? settings?.whatsapp_number;
            if (!to) throw new Error("no discount_request_phone configured");

            const waRes = await sendWhatsAppCloudTemplate({
              to,
              template_name: "discount_lab_request",
              language_code: "ar",
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: patientNameStr },
                    { type: "text", text: String(totalVal) },
                    { type: "text", text: String(discountVal) },
                    { type: "text", text: usernameStr },
                  ],
                },
              ],
            });

            if (waRes.success && visit.patient?.id) {
              try {
                await apiClient.post("/discount-lab-requests", { patient_id: visit.patient.id });
              } catch (err) {
                console.error("Failed to create discount lab request record:", err);
              }
            }
          } catch (error) {
            console.error("Failed to send discount WhatsApp template:", error);
            toast.error("فشل إرسال طلب الخصم عبر واتساب");
          }
        }

        // Barcode print order to the Zebra printer
        try {
          if (activeVisitId) {
            await apiClient.post(`/visits/${activeVisitId}/print-barcode`);
          }
        } catch (error) {
          // Payment itself succeeded — don't surface print errors to the user
          console.error("Failed to send print order to Zebra:", error);
        }

        queryClient.invalidateQueries({ queryKey: ["activeVisitForLabRequests", activeVisitId] });
        queryClient.invalidateQueries({ queryKey: ["doctorVisit", activeVisitId] });
      },
      onError: (error: Error) => {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || "فشل الدفع");
      },
    });

    useImperativeHandle(ref, () => ({
      triggerPayment: () => {
        if (activeVisitId && balance !== 0 && !payAllMutation.isPending) {
          payAllMutation.mutate();
        }
      },
    }));

    /* ------------------------------ PDF helpers ---------------------------- */

    const generateAndShowPdf = useCallback(
      async (title: string, fileNamePrefix: string, fetchFunction: () => Promise<Blob>) => {
        setIsGeneratingPdf(true);
        setPdfUrl(null);
        setPdfPreviewTitle(title);
        setIsPdfPreviewOpen(true);

        try {
          const blob = await fetchFunction();
          setPdfUrl(URL.createObjectURL(blob));
          const patientNameSanitized = visit?.patient?.name?.replace(/[^A-Za-z0-9-_]/g, "_") || "patient";
          setPdfFileName(
            `${fileNamePrefix}_${activeVisitId}_${patientNameSanitized}_${new Date().toISOString().slice(0, 10)}.pdf`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          toast.error("حدث خطأ أثناء إنشاء ملف PDF", { description: errorMessage });
          setIsPdfPreviewOpen(false);
        } finally {
          setIsGeneratingPdf(false);
        }
      },
      [visit?.patient?.name, activeVisitId]
    );

    const handleViewReportPreview = useCallback(() => {
      if (!activeVisitId) return;
      generateAndShowPdf("معاينة تقرير المختبر", "LabReport", () =>
        apiClient.get(`/visits/${activeVisitId}/lab-report/pdf`, { responseType: "blob" }).then((res) => res.data)
      );
    }, [activeVisitId, generateAndShowPdf]);

    const handlePdfDialogOpenChange = useCallback(
      (open: boolean) => {
        setIsPdfPreviewOpen(open);
        if (!open && pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
        }
      },
      [pdfUrl]
    );

    /* ------------------------------- Derived ------------------------------- */

    const patientName = visit?.patient?.name;
    const doctorName = visit?.patient.doctor?.name;
    const phone = visit?.patient?.phone;
    const date = visit?.created_at ? visit.created_at.slice(0, 10) : "";
    const serial = visit?.id?.toString();
    const registeredBy = visit?.patient?.user?.username;
    const paymentMethod = "cash";
    const total = visit?.total_lab_amount;
    const received = visit?.total_lab_paid;
    const balance = visit?.total_lab_balance;
    const age = getAge(visit!);

    return (
      <div className="flex h-full w-full flex-col justify-between p-2">
        <div className="flex h-full w-full flex-col items-center justify-start">
          {/* Patient name */}
          <h2 className="mb-1 w-full border-b border-border pb-1 text-center text-xl font-bold text-foreground">
            {patientName}
          </h2>

          {visit && can("تعديل بيانات") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditPatientInfoDialogOpen(true)}
              className="mb-1 flex w-full items-center justify-center gap-2"
            >
              <Edit className="h-4 w-4" />
              تعديل البيانات
            </Button>
          )}

          {/* Visit details */}
          <dl className="mb-1 w-full">
            <DetailRow label="الطبيب" value={doctorName} />
            <DetailRow label="الهاتف" value={phone} />
            <DetailRow label="التاريخ" value={date} />
            <DetailRow label="الكود" value={serial} />
            <DetailRow label="سُجل بواسطة" value={registeredBy} />
            <DetailRow label="طريقة الدفع" value={paymentMethod} />
            <DetailRow label="العمر" value={age} />
          </dl>

          {/* Insurance details */}
          {visit?.patient && <PatientCompanyDetails patient={visit.patient} />}

          {/* Discount comment */}
          {visit?.patient?.discount_comment && (
            <div className="w-full rounded border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
              <div className="mb-1 font-semibold">تعليق الخصم</div>
              <div className="whitespace-pre-wrap">{visit.patient.discount_comment}</div>
            </div>
          )}

          <FinancialSummary total={total} received={received} balance={balance} />

          {/* Pay all */}
          {activeVisitId && (
            <Button
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-blue-600 py-2 font-bold text-white transition hover:bg-blue-700"
              onClick={() => payAllMutation.mutate()}
              disabled={
                !can("سداد فحص") ||
                (!visit?.patient.company && balance == 0 && visit?.lab_requests?.every((req) => req.is_paid))
              }
            >
              {payAllMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              دفع الكل
            </Button>
          )}

          {/* Report preview — only after result authentication */}
          {visit?.patient && visit.patient.result_auth && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 flex w-full items-center justify-center gap-2"
              onClick={handleViewReportPreview}
              disabled={!activeVisitId || isGeneratingPdf}
              title="معاينة التقرير"
            >
              <FileText className="h-4 w-4" />
              معاينة التقرير
              {hasPatientResultUrl(visit.patient) && <span className="ml-1 text-xs text-green-500">☁️</span>}
            </Button>
          )}

          <LabReportPdfPreviewDialog
            isOpen={isPdfPreviewOpen}
            onOpenChange={handlePdfDialogOpenChange}
            pdfUrl={pdfUrl}
            isLoading={isGeneratingPdf && !pdfUrl}
            title={pdfPreviewTitle}
            fileName={pdfFileName}
          />

          {visit && (
            <EditPatientInfoDialog
              isOpen={isEditPatientInfoDialogOpen}
              onOpenChange={setIsEditPatientInfoDialogOpen}
              patientId={visit.patient.id}
              visit={visit}
              onPatientInfoUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["activeVisitForLabRequests", activeVisitId] });
                queryClient.invalidateQueries({ queryKey: ["doctorVisit", activeVisitId] });
                queryClient.invalidateQueries({ queryKey: ["patientDetailsForInfoPanel", visit.patient.id] });
                toast.success("تم تحديث بيانات المريض بنجاح");
              }}
            />
          )}
        </div>
      </div>
    );
  }
);

PatientDetailsColumnV1.displayName = "PatientDetailsColumnV1";

export default PatientDetailsColumnV1;
