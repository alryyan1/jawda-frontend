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
import type { Setting } from "@/types/settings";
import { doc, getDoc } from "firebase/firestore";
import { labToLabDb } from "@/lib/firebase";

interface ActionsButtonsPanelProps {
  visitId: number | null;
  patient: Patient | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  resultsLocked: boolean;
  onPatientUpdate?: (updatedPatient: PatientLabQueueItem) => void;
  settings?: Setting;
}

// Best-effort extraction of a human-readable message from an unknown error
// (typically an Axios error), without introducing a hard dependency on axios types.
const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object") {
    const maybeAxios = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
    return (
      maybeAxios.response?.data?.error ||
      maybeAxios.response?.data?.message ||
      maybeAxios.message ||
      "Unknown error"
    );
  }
  return err instanceof Error ? err.message : "Unknown error";
};

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
                `${req.main_test_name}: ${ct.child_test_name
                } (${toComparableName(value)})`,
              );
            }
          });
        });
      return { abnormal, empty };
    },
    [isValueEmpty, isNumericAbnormal, isQualitativeAbnormal, toComparableName],
  );

  // Returns false (and toasts) when empty/abnormal results should block authentication.
  const checkResultsBeforeAuth = useCallback(async (): Promise<boolean> => {
    const labRequestIds = patientLabQueueItem?.lab_request_ids || [];
    if (labRequestIds.length === 0) return true;

    const { abnormal, empty } = await validateAllLabRequests(labRequestIds);

    if (empty.length > 0) {
      const shouldBlock = settings?.block_auth_on_empty_results ?? true;
      const description = [
        `حقول فارغة: ${empty.length}`,
        ...empty.slice(0, 5).map((t: string) => `• ${t}`),
        empty.length > 5 ? `وغيرها ${empty.length - 5}...` : "",
      ]
        .filter(Boolean)
        .join("\n");

      if (shouldBlock) {
        toast.error("لا يمكن اعتماد النتائج لوجود حقول فارغة", { description });
        return false;
      }
      toast.warning("تحذير: توجد حقول نتائج فارغة", { description });
    }

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

    return true;
  }, [patientLabQueueItem?.lab_request_ids, validateAllLabRequests, settings?.block_auth_on_empty_results]);

  // Uploads the authenticated result PDF to Firebase Storage. Returns whether it succeeded.
  const uploadResultToFirebase = useCallback(async (patientId: number): Promise<boolean> => {
    toast.info("جاري رفع النتيجة إلى السحابة...");
    try {
      const uploadResponse = await apiClient.post(`/patients/${patientId}/upload-to-firebase`);
      if (!uploadResponse.data?.success) {
        toast.error("فشل رفع النتيجة إلى السحابة: " + (uploadResponse.data?.message || "Error"));
        return false;
      }
      toast.success("تم رفع النتيجة إلى السحابة بنجاح");
      return true;
    } catch (uploadError) {
      console.error("Firebase upload failed:", uploadError);
      toast.error("حدث خطأ أثناء رفع النتيجة إلى السحابة");
      return false;
    }
  }, []);

  const sendResultSms = useCallback(
    async (phone: string, currentVisitId: number) => {
      try {
        const waNumber = settings?.whatsapp_number || "96878622990";
        const message = `عزيزي الزائر نفيدك بانتهاء التحاليل الطبيه\nشكرا لزيارتك\n\nللحصول على النتيجة واتساب اضغط علي الرابط:\nhttps://wa.me/${waNumber}?text=${currentVisitId}`;

        await smsService.sendSms(phone, message);
        toast.info("تم إرسال رسالة SMS عبر النظام");
      } catch (smsError) {
        console.error("Failed to send frontend SMS:", smsError);
        toast.error("فشل إرسال رسالة SMS من المتصفح");
      }
    },
    [settings?.whatsapp_number],
  );

  const sendResultWhatsapp = useCallback(
    async (phone: string, currentVisitId: number) => {
      setWaStatus({ type: "loading", message: "جاري الإرسال واتساب..." });
      try {
        const waResponse = await apiClient.post("/whatsapp-cloud/send-template", {
          to: phone,
          template_name: settings?.whatsapp_result_template_name ?? "result_download",
          language_code: settings?.whatsapp_result_language_code ?? "ar",
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: String(currentVisitId) }],
            },
            {
              type: "button",
              sub_type: "quick_reply",
              index: "0",
              parameters: [
                {
                  type: "payload",
                  payload: JSON.stringify({
                    visitId: currentVisitId,
                    collection: settings?.firestore_result_collection || "one_care",
                  }),
                },
              ],
            },
          ],
        });

        if (waResponse.data?.success) {
          const msgId = waResponse.data.message_id || waResponse.data.data?.messages?.[0]?.id;
          setWaStatus({
            type: "success",
            message: "تم إرسال رسالة واتساب بنجاح",
            description: `ID: ${msgId || "N/A"}`,
            messageId: msgId,
          });
          setTimeout(() => setWaStatus((prev) => ({ ...prev, type: null })), 7000);
        } else {
          setWaStatus((prev) => ({
            ...prev,
            type: "error",
            message: "فشل إرسال رسالة واتساب",
            description: waResponse.data?.error || "حدث خطأ ما",
          }));
        }
      } catch (waError) {
        console.error("Failed to send frontend WhatsApp:", waError);
        setWaStatus((prev) => ({
          ...prev,
          type: "error",
          message: "حدث خطأ أثناء الإرسال",
          description: getErrorMessage(waError),
        }));
      }
    },
    [settings?.whatsapp_result_template_name, settings?.whatsapp_result_language_code, settings?.firestore_result_collection],
  );

  // Resolves the referring lab's WhatsApp number for a lab-to-lab patient:
  // labToLap/global/patients/{lab_to_lab_object_id} -> labId -> labToLap/{labId} -> whatsapp
  const getLab2LabWhatsappNumber = useCallback(async (labToLabObjectId: string): Promise<string | null> => {
    if (!labToLabDb) return null;

    const patientDocSnap = await getDoc(doc(labToLabDb, "labToLap", "global", "patients", labToLabObjectId));
    const labId = patientDocSnap.data()?.labId as string | undefined;
    if (!labId) return null;

    const labDocSnap = await getDoc(doc(labToLabDb, "labToLap", labId));
    return (labDocSnap.data()?.whatsapp as string | undefined) || null;
  }, []);

  const sendLab2LabResultWhatsapp = useCallback(
    async (phone: string) => {
      setWaStatus({ type: "loading", message: "جاري الإرسال إلى المعمل المحيل عبر واتساب..." });
      try {
        const whatsappNumber = phone;
        if (!whatsappNumber) {
          setWaStatus((prev) => ({
            ...prev,
            type: "error",
            message: "تعذر إرسال واتساب للمعمل المحيل",
            description: "لم يتم العثور على رقم واتساب الخاص بالمعمل",
          }));
          return;
        }

        const testNames = (
          await Promise.all(
            (patientLabQueueItem?.lab_request_ids || []).map((id) => getLabRequestForEntry(id)),
          )
        )
          .map((req) => req.main_test_name)
          .filter(Boolean)
          .join("، ");
        // alert(whatsappNumber)
        const waResponse = await apiClient.post("/whatsapp-cloud/send-template", {
          to: whatsappNumber,
          template_name: "lab2lab_result",
          language_code: "ar",
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: patientLabQueueItem?.lab_to_lab_object_id },
                { type: "text", text: patient?.name ?? "" },
                { type: "text", text: '-' },
                { type: "text", text: testNames || "-" },
                { type: "text", text: settings?.lab_name || settings?.hospital_name || "مختبرنا" },
              ],
            },
            {
              type:'button',
              sub_type:'quick_reply',
              index:0,
              parameters:[
                {
                  type:'payload',
                  payload: JSON.stringify({
                    collection: settings?.firestore_result_collection ,
                    visitId: visitId,
                  })
                }
              ]

            }
          ],
        });

        if (waResponse.data?.success) {
          const msgId = waResponse.data.message_id || waResponse.data.data?.messages?.[0]?.id;
          setWaStatus({
            type: "success",
            message: "تم إرسال النتيجة إلى المعمل المحيل عبر واتساب",
            description: `ID: ${msgId || "N/A"}`,
            messageId: msgId,
          });
          setTimeout(() => setWaStatus((prev) => ({ ...prev, type: null })), 7000);
        } else {
          setWaStatus((prev) => ({
            ...prev,
            type: "error",
            message: "فشل إرسال رسالة واتساب للمعمل المحيل",
            description: waResponse.data?.error || "حدث خطأ ما",
          }));
        }
      } catch (waError) {
        console.error("Failed to send lab2lab result WhatsApp:", waError);
        setWaStatus((prev) => ({
          ...prev,
          type: "error",
          message: "حدث خطأ أثناء إرسال النتيجة للمعمل المحيل",
          description: getErrorMessage(waError),
        }));
      }
    },
    [getLab2LabWhatsappNumber, patientLabQueueItem?.lab_request_ids, patientLabQueueItem?.lab_number, patient?.name, settings?.lab_name, settings?.hospital_name],
  );

  const handleAuthenticateResults = useCallback(async () => {
    if (!patient?.id || !visitId) return;

    setIsAuthenticating(true);
    try {
      const canProceed = await checkResultsBeforeAuth();
      if (!canProceed) return;

      const response = await apiClient.patch(`/patients/${patient.id}/authenticate-results`);
      const updatedQueueItem = response.data.data as PatientLabQueueItem;

      if (onPatientUpdate && updatedQueueItem) {
        onPatientUpdate(updatedQueueItem);
      }

      toast.success("تم اعتماد النتائج بنجاح");

      const uploaded = await uploadResultToFirebase(patient.id);
      if (!uploaded) return;
      console.log(patient,'patient in actionsbuttonpanel',patient.lab_to_lab_object_id,'patient.labtolab')
      if (patient.lab_to_lab_object_id != null) {
        console.log(patient,'patient before sending')
        // alert(patient.company?.phone)
        await sendLab2LabResultWhatsapp(patient.company?.phone ?? '0');
      } else {
        if (settings?.send_sms_after_auth && patient.phone) {
          await sendResultSms(patient.phone, visitId);
        }

        if (settings?.send_whatsapp_after_auth && patient.phone) {
          await sendResultWhatsapp(patient.phone, visitId);
        }
      }

    } catch (error) {
      console.error("Error authenticating results:", error);
      toast.error("حدث خطأ أثناء اعتماد النتائج", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [
    patient,
    visitId,
    onPatientUpdate,
    checkResultsBeforeAuth,
    uploadResultToFirebase,
    sendResultSms,
    sendResultWhatsapp,
    sendLab2LabResultWhatsapp,
    settings?.send_sms_after_auth,
    settings?.send_whatsapp_after_auth,
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
              className={`ltr:mr-2 rtl:ml-2 h-3.5 w-3.5 ${isAuthenticating ? "animate-spin" : ""
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
            border: `1px solid ${waStatus.type === "success"
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
              className={`text-sm font-bold truncate ${waStatus.type === "success"
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
