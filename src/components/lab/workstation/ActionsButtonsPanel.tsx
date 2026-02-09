import React, { useState, useCallback, useEffect } from "react";
import {
  Button as MuiButton,
  CircularProgress,
  Box,
  IconButton,
} from "@mui/material";
import {
  FileText,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  X,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/types/patients";
import type {
  PatientLabQueueItem,
  MainTestWithChildrenResults,
  ChildTestWithResult,
} from "@/types/labWorkflow";
import { getLabRequestForEntry } from "@/services/labWorkflowService";
import LabReportPdfPreviewDialog from "@/components/common/LabReportPdfPreviewDialog";
import apiClient from "@/services/api";
import { hasPatientResultUrl } from "@/services/firebaseStorageService";
import { useAuthorization } from "@/hooks/useAuthorization";
import { smsService } from "@/services/smsService";
import echo from "@/services/echoService";
interface ActionsButtonsPanelProps {
  visitId: number | null;
  patient: Patient | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  resultsLocked: boolean;
  onPatientUpdate?: (updatedPatient: PatientLabQueueItem) => void;
  settings?: any;
}

const ActionsButtonsPanel: React.FC<ActionsButtonsPanelProps> = ({
  visitId,
  patient,
  patientLabQueueItem,
  resultsLocked,
  onPatientUpdate,
  settings,
}) => {
  // console.log(patientLabQueueItem, "patientLabQueueItem",patient, "patient",visitId, "visitId");
  // State for PDF Preview
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");
  const [pdfFileName, setPdfFileName] = useState("document.pdf");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [waStatus, setWaStatus] = useState<{
    type: "loading" | "success" | "error" | "read" | null;
    message?: string;
    description?: string;
    messageId?: string;
  }>({ type: null });

  // Listen for real-time WhatsApp status updates
  useEffect(() => {
    if (!waStatus.messageId) return;

    const handleStatusUpdate = (payload: {
      message_id: string;
      status: string;
      error?: any;
    }) => {
      console.log(
        "Pusher WhatsApp Update:",
        payload.status,
        payload.message_id,
      );
      // Only care about failures and if it matches the current tracked message
      if (
        payload.status === "failed" &&
        waStatus.messageId === payload.message_id
      ) {
        console.log("Matched failure ID, showing error box");
        setWaStatus((prev) => ({
          ...prev,
          type: "error",
          message: "فشل توصيل الرسالة (WhatsApp)",
          description:
            payload.error?.message ||
            payload.error?.error_data?.details ||
            payload.error?.title ||
            "Meta ecosystem restriction",
        }));
      } else if (
        payload.status === "delivered" &&
        waStatus.messageId === payload.message_id
      ) {
        // Optionally update success message if specifically delivered
        setWaStatus((prev) => ({
          ...prev,
          type: "success",
          message: "تم تسليم الرسالة بنجاح",
          description: `ID: ${payload.message_id}`,
        }));
        // Auto-hide after 5 seconds of definite success
        setTimeout(
          () => setWaStatus((prev) => ({ ...prev, type: null })),
          5000,
        );
      } else if (
        payload.status === "read" &&
        waStatus.messageId === payload.message_id
      ) {
        setWaStatus((prev) => ({
          ...prev,
          type: "read",
          message: "تم قراءة الرسالة",
          description: `ID: ${payload.message_id}`,
        }));
        // Auto-hide after 5 seconds
        setTimeout(
          () => setWaStatus((prev) => ({ ...prev, type: null })),
          5000,
        );
      }
    };

    const channel = echo.channel("whatsapp-updates");
    channel.listen(".whatsapp.status.updated", handleStatusUpdate);

    return () => {
      channel.stopListening(".whatsapp.status.updated", handleStatusUpdate);
    };
  }, [waStatus.messageId]);
  const { can } = useAuthorization();
  // Helpers to evaluate results
  const isValueEmpty = useCallback((value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    // For option object with { name }
    if (
      typeof value === "object" &&
      "name" in (value as Record<string, unknown>)
    ) {
      const name = (value as { name?: string }).name || "";
      return String(name).trim() === "";
    }
    return false;
  }, []);

  const toComparableName = useCallback((value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "boolean") return value ? "Positive" : "Negative";
    if (
      typeof value === "object" &&
      value !== null &&
      "name" in (value as Record<string, unknown>)
    ) {
      return String((value as { name?: string }).name || "");
    }
    return String(value ?? "");
  }, []);

  const isQualitativeAbnormal = useCallback(
    (ct: ChildTestWithResult, value: unknown): boolean => {
      const vName = toComparableName(value);
      const positiveLike = /positive|reactive|detected|present|yes|true/i;
      const negativeLike =
        /negative|non\s*reactive|not\s*detected|absent|no|false/i;
      if (positiveLike.test(vName)) return true;
      if (negativeLike.test(vName)) return false;
      if (ct.defval && typeof ct.defval === "string") {
        return vName.trim().toLowerCase() !== ct.defval.trim().toLowerCase();
      }
      return false;
    },
    [toComparableName],
  );

  const isNumericAbnormal = useCallback(
    (ct: ChildTestWithResult, value: unknown): boolean => {
      const hasBounds =
        (ct.low !== null && ct.low !== undefined) ||
        (ct.upper !== null && ct.upper !== undefined);
      if (!hasBounds) return false;
      const parsed =
        typeof value === "string"
          ? parseFloat(value)
          : typeof value === "number"
            ? value
            : NaN;
      if (!Number.isFinite(parsed)) return false;
      const low =
        typeof ct.low === "number"
          ? ct.low
          : ct.low != null
            ? Number(ct.low)
            : undefined;
      const upper =
        typeof ct.upper === "number"
          ? ct.upper
          : ct.upper != null
            ? Number(ct.upper)
            : undefined;
      if (low !== undefined && upper !== undefined)
        return parsed < low || parsed > upper;
      if (low !== undefined) return parsed < low;
      if (upper !== undefined) return parsed > upper;
      return false;
    },
    [],
  );

  const validateAllLabRequests = useCallback(
    async (
      labRequestIds: number[],
    ): Promise<{ abnormal: string[]; empty: string[] }> => {
      const abnormal: string[] = [];
      const empty: string[] = [];
      const requests = await Promise.all(
        labRequestIds.map((id) => getLabRequestForEntry(id)),
      );
      console.log(requests, "requests");
      requests
        .filter((req) => req.is_trailer_hidden === false)
        .forEach((req: MainTestWithChildrenResults) => {
          console.log(req, "req");
          (req.child_tests_with_results || []).forEach((ct) => {
            const value = ct.result_value ?? "";
            if (isValueEmpty(value)) {
              empty.push(`${req.main_test_name}: ${ct.child_test_name}`);
              return;
            }
            const abnormalNumeric = isNumericAbnormal(ct, value);
            const abnormalQual = isQualitativeAbnormal(ct, value);
            if (abnormalNumeric || abnormalQual) {
              abnormal.push(
                `${req.main_test_name}: ${
                  ct.child_test_name
                } (${toComparableName(value)})`,
              );
            }
          });
        });
      return { abnormal, empty };
    },
    [isValueEmpty, isNumericAbnormal, isQualitativeAbnormal, toComparableName],
  );

  const handleAuthenticateResults = useCallback(async () => {
    if (!patient?.id || !visitId) return;

    setIsAuthenticating(true);
    try {
      // Validate results before authenticating
      const labRequestIds = patientLabQueueItem?.lab_request_ids || [];
      if (labRequestIds.length > 0) {
        const { abnormal, empty } = await validateAllLabRequests(labRequestIds);

        // Block authentication only if there are empty fields
        if (empty.length > 0) {
          setIsAuthenticating(false);
          toast.error("لا يمكن اعتماد النتائج لوجود حقول فارغة", {
            description: [
              `حقول فارغة: ${empty.length}`,
              ...empty.slice(0, 5).map((t) => `• ${t}`),
              empty.length > 5 ? `وغيرها ${empty.length - 5}...` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          });
          return; // Block authenticate
        }

        // Show warning for abnormal results but don't block
        if (abnormal.length > 0) {
          toast.warning("تحذير: توجد نتائج غير طبيعية", {
            description: [
              `نتائج غير طبيعية: ${abnormal.length}`,
              ...abnormal.slice(0, 5).map((t) => `• ${t}`),
              abnormal.length > 5 ? `وغيرها ${abnormal.length - 5}...` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          });
        }
      }

      const response = await apiClient.patch(
        `/patients/${patient.id}/authenticate-results`,
      );
      const updatedQueueItem = response.data.data as PatientLabQueueItem;
      console.log(
        updatedQueueItem,
        "updatedQueueItem from authenticate-results",
      );

      // Update the queue item immediately after authentication using the response directly
      if (onPatientUpdate && updatedQueueItem) {
        onPatientUpdate(updatedQueueItem);
      }

      toast.success("تم اعتماد النتائج بنجاح");

      // Upload to Firebase synchronously from frontend
      toast.info("جاري رفع النتيجة إلى السحابة...");
      try {
        const uploadResponse = await apiClient.post(
          `/patients/${patient.id}/upload-to-firebase`,
        );
        if (uploadResponse.data?.success) {
          toast.success("تم رفع النتيجة إلى السحابة بنجاح");
          // If the upload returned an updated result_url, we might want to update the patient object again
          // but usually result_auth is enough for the UI to show the ☁️ icon if it re-renders
        } else {
          toast.error(
            "فشل رفع النتيجة إلى السحابة: " +
              (uploadResponse.data?.message || "Error"),
          );
        }
      } catch (uploadError: any) {
        console.error("Firebase upload failed:", uploadError);
        toast.error("حدث خطأ أثناء رفع النتيجة إلى السحابة");
      }

      // Send SMS from frontend if enabled
      if (settings?.send_sms_after_auth && patient?.phone) {
        try {
          const waNumber = settings.whatsapp_number || "96878622990";
          const message = `عزيزي الزائر نفيدك بانتهاء التحاليل الطبيه\nشكرا لزيارتك\n\nللحصول على النتيجة واتساب اضغط علي الرابط:\nhttps://wa.me/${waNumber}?text=${visitId}`;

          await smsService.sendSms(patient.phone, message);
          toast.info("تم إرسال رسالة SMS عبر النظام");
        } catch (smsError) {
          console.error("Failed to send frontend SMS:", smsError);
          toast.error("فشل إرسال رسالة SMS من المتصفح");
        }
      }

      // Send WhatsApp from frontend if enabled (temporarily moved from backend job)
      if (settings?.send_whatsapp_after_auth && patient?.phone) {
        setWaStatus({ type: "loading", message: "جاري الإرسال واتساب..." });
        try {
          const waResponse = await apiClient.post(
            "/whatsapp-cloud/send-template",
            {
              to: patient.phone,
              template_name: "test_notification",
              language_code: "ar",
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: visitId,
                    },
                  ],
                },
              ],
            },
          );

          if (waResponse.data?.success) {
            const msgId =
              waResponse.data.message_id ||
              waResponse.data.data?.messages?.[0]?.id;
            setWaStatus({
              type: "success",
              message: "تم إرسال رسالة واتساب بنجاح",
              description: `ID: ${msgId || "N/A"}`,
              messageId: msgId,
            });
            setTimeout(
              () => setWaStatus((prev) => ({ ...prev, type: null })),
              7000,
            );
          } else {
            setWaStatus((prev) => ({
              ...prev,
              type: "error",
              message: "فشل إرسال رسالة واتساب",
              description: waResponse.data?.error || "حدث خطأ ما",
            }));
          }
        } catch (waError: any) {
          console.error("Failed to send frontend WhatsApp:", waError);
          const errorMsg = waError.response?.data?.error || waError.message;
          setWaStatus((prev) => ({
            ...prev,
            type: "error",
            message: "حدث خطأ أثناء الإرسال",
            description: errorMsg,
          }));
        }
      }
    } catch (error: unknown) {
      console.error("Error authenticating results:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("حدث خطأ أثناء اعتماد النتائج", {
        description: errorMessage,
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [
    patient,
    visitId,
    onPatientUpdate,
    patientLabQueueItem?.lab_request_ids,
    validateAllLabRequests,
  ]);

  const generateAndShowPdf = useCallback(
    async (
      title: string,
      fileNamePrefix: string,
      fetchFunction: () => Promise<Blob>,
      shouldMarkPrinted: boolean = false,
    ) => {
      setIsGeneratingPdf(true);
      setPdfUrl(null);
      setPdfPreviewTitle(title);
      setIsPdfPreviewOpen(true);

      try {
        const blob = await fetchFunction();
        const objectUrl = URL.createObjectURL(blob);
        console.log(patient, "patient");
        setPdfUrl(objectUrl);
        const patientNameSanitized =
          patient?.name.replace(/[^A-Za-z0-9-_]/g, "_") || "patient";
        setPdfFileName(
          `${fileNamePrefix}_${visitId}_${patientNameSanitized}_${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`,
        );

        // Mark report as printed if requested and update queue item via realtime
        if (shouldMarkPrinted && visitId) {
          try {
            const response = await apiClient.post(
              `/visits/${visitId}/lab-report/mark-printed`,
            );
            const updatedQueueItem = response.data.data as PatientLabQueueItem;
            console.log(updatedQueueItem, "updatedQueueItem from mark-printed");

            // Update the queue item immediately using the response directly
            // No need to make additional requests - the backend returns PatientLabQueueItemResource
            // and emits a realtime event for other clients
            if (onPatientUpdate && updatedQueueItem) {
              onPatientUpdate(updatedQueueItem);
            }
          } catch (markError) {
            console.error("Error marking report as printed:", markError);
            // Don't show error toast for this - it's not critical
          }
        }
      } catch (error: unknown) {
        console.error(`Error generating ${title}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast.error("حدث خطأ أثناء إنشاء ملف PDF", {
          description: errorMessage,
        });
        setIsPdfPreviewOpen(false); // Close dialog on error
      } finally {
        setIsGeneratingPdf(false);
      }
    },
    [patient, visitId, onPatientUpdate],
  );

  const handleViewReportPreview = useCallback(() => {
    if (!visitId) return;
    generateAndShowPdf(
      "معاينة تقرير المختبر",
      "LabReport",
      () =>
        apiClient
          .get(`/visits/${visitId}/lab-report/pdf`, { responseType: "blob" })
          .then((res) => res.data),
      true, // Mark as printed after viewing
    );
  }, [visitId, generateAndShowPdf]);

  const handlePdfDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsPdfPreviewOpen(open);
      if (!open && pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    },
    [pdfUrl],
  );
  console.log(
    patientLabQueueItem,
    "patientLabQueueItem in ActionsButtonsPanel",
  );
  return (
    <>
      <div className="mt-2">
        {/* Show authenticate button if results are not authenticated */}
        {patientLabQueueItem && patientLabQueueItem.result_auth != true && (
          <MuiButton
            variant="contained"
            className="w-full justify-start text-xs bg-green-600 hover:bg-green-700"
            onClick={handleAuthenticateResults}
            disabled={
              !patient?.id ||
              resultsLocked ||
              patientLabQueueItem?.all_requests_paid === false ||
              isAuthenticating ||
              !can("تحقيق نتيجه")
            }
            title={resultsLocked ? "النتائج مقفلة" : "اعتماد النتائج"}
          >
            <ShieldCheck
              className={`ltr:mr-2 rtl:ml-2 h-3.5 w-3.5 ${
                isAuthenticating ? "animate-spin" : ""
              }`}
            />
            {isAuthenticating ? "جاري الاعتماد..." : "اعتماد النتائج"}
          </MuiButton>
        )}

        {/* Show preview button only if results are authenticated */}
        {patientLabQueueItem && patientLabQueueItem.result_auth == true && (
          <MuiButton
            variant="outlined"
            className="w-full justify-start text-xs"
            onClick={handleViewReportPreview}
            disabled={
              !visitId ||
              isGeneratingPdf ||
              resultsLocked ||
              patientLabQueueItem?.all_requests_paid === false
            }
            title={resultsLocked ? "النتائج مقفلة" : "معاينة التقرير"}
          >
            <FileText className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
            معاينة التقرير
            {hasPatientResultUrl(patientLabQueueItem) && (
              <span className="ltr:ml-1 rtl:mr-1 text-green-500 text-xs">
                ☁️
              </span>
            )}
          </MuiButton>
        )}
      </div>

      {/* Lab Report PDF Preview Dialog */}
      <LabReportPdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={handlePdfDialogOpenChange}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={pdfPreviewTitle}
        fileName={pdfFileName}
      />
      {/* WhatsApp Status/Indicator Box */}
      {waStatus.type && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 2,
            backgroundColor: "white",
            padding: "12px 16px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            border: `1px solid ${
              waStatus.type === "success"
                ? "#4caf50"
                : waStatus.type === "read"
                  ? "#2196f3"
                  : waStatus.type === "error"
                    ? "#f44336"
                    : "#e0e0e0"
            }`,
            animation: "fadeInUp 0.3s ease-out",
            maxWidth: "300px",
          }}
        >
          {waStatus.type === "loading" && (
            <CircularProgress size={20} thickness={5} color="success" />
          )}
          {waStatus.type === "success" && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {waStatus.type === "error" && (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          {waStatus.type === "read" && (
            <CheckCheck className="h-5 w-5 text-blue-600" />
          )}

          <div className="flex flex-col flex-1 min-w-0">
            <span
              className={`text-sm font-bold truncate ${
                waStatus.type === "success"
                  ? "text-green-700"
                  : waStatus.type === "error"
                    ? "text-red-700"
                    : "text-gray-900"
              }`}
            >
              {waStatus.message}
            </span>
            {waStatus.description && (
              <span className="text-[10px] text-gray-500 mt-0.5 truncate">
                {waStatus.description}
              </span>
            )}
          </div>

          {waStatus.type !== "loading" ? (
            <IconButton
              size="small"
              onClick={() => setWaStatus({ type: null })}
              sx={{ padding: 0.5 }}
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          ) : (
            <MessageCircle className="h-5 w-5 text-green-600 animate-pulse" />
          )}
        </Box>
      )}

      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
};

export default ActionsButtonsPanel;
