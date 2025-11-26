// src/components/lab/workstation/dialog/WhatsAppWorkAreaDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { Send, Wifi, WifiOff, FileText, CheckCircle, XCircle } from "lucide-react";

import type { Patient } from "@/types/patients";
import type { LabRequest } from "@/types/visits";
import { 
  sendUltramsgDocumentFromUrl, 
  getUltramsgInstanceStatus, 
  isUltramsgConfigured,
  type UltramsgInstanceStatus 
} from "@/services/ultramsgService";
import { getPatientById } from "@/services/patientService";
import type { AxiosError } from "axios";
import apiClient from "@/services/api";

interface WhatsAppWorkAreaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPatient: Patient | null;
  selectedLabRequest?: LabRequest | null; // Made optional since it's not used
  onMessageSent?: () => void;
}

const whatsappSchema = z.object({
  phoneNumber: z.string().min(1, { message: "رقم الهاتف مطلوب" }).regex(/^0?[1-9]\d{8,14}$/, { message: "رقم هاتف غير صحيح (مثال: 0991961111)" }),
});

type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const WhatsAppWorkAreaDialog: React.FC<WhatsAppWorkAreaDialogProps> = ({
  isOpen,
  onOpenChange,
  currentPatient,
  onMessageSent,
}) => {
  const [instanceStatus, setInstanceStatus] = useState<UltramsgInstanceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSendingDoc, setIsSendingDoc] = useState(false);

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const { setValue, reset, control } = form;
  
  // Check if Ultramsg is configured
  const { data: configStatus } = useQuery({
    queryKey: ["ultramsgConfigured"],
    queryFn: isUltramsgConfigured,
    enabled: isOpen,
  });

  // Use currentPatient directly
  const effectivePatientData = currentPatient;

  // Initialize form with patient data when dialog opens
  useEffect(() => {
    if (isOpen && effectivePatientData?.phone) {
      // Format phone number to local format (remove + and country code if present)
      let formattedPhone = effectivePatientData.phone;
      
      // Remove + if present
      if (formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.substring(1);
      }
      
      // Remove country code 249 if present and add 0 prefix
      if (formattedPhone.startsWith('249')) {
        formattedPhone = '0' + formattedPhone.substring(3);
      }
      
      // If it doesn't start with 0, add it
      if (!formattedPhone.startsWith('0')) {
        formattedPhone = '0' + formattedPhone;
      }
      
      setValue("phoneNumber", formattedPhone);
    } else if (!isOpen) {
      reset();
      setInstanceStatus(null);
    }
  }, [isOpen, effectivePatientData, setValue, reset]);


  // Generate default message
  const generateDefaultMessage = (): string => {
    const date = format(new Date(), "PPP", { locale: arSA });
    return `عزيزي/عزيزتي ${effectivePatientData?.name}، نتائج فحص جاهزة بتاريخ ${date}. يمكنك مراجعة العيادة أو التواصل معنا للاستفسار.`;
  };

  // Send document mutation (if lab request has PDF)
  const sendDocumentMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      // Check if patient has result_url from Firebase
      if (!effectivePatientData?.result_url) {
        throw new Error("لا يوجد رابط للتقرير. يرجى التأكد من رفع التقرير إلى التخزين السحابي أولاً.");
      }
      
      // Use the result_url from the patient data (Firebase URL)
      const documentUrl = effectivePatientData.result_url;
      
      // Use simple filename as per the new requirement
      const filename = 'result.pdf';
      
      return sendUltramsgDocumentFromUrl({
        to: data.phoneNumber,
        document_url: documentUrl,
        filename: filename,
        caption: filename,
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("تم إرسال التقرير بنجاح");
        if (onMessageSent) onMessageSent();
        onOpenChange(false);
      } else {
        toast.error(response.error || "فشل إرسال التقرير");
      }
    },
    onError: (error: AxiosError) => {
      const errorMessage = error instanceof Error ? error.message : 
        (error as { response?: { data?: { data?: { error?: string } } } }).response?.data?.data?.error || "فشل إرسال التقرير";
      toast.error(errorMessage);
    },
  });

  // Check instance status
  const checkInstanceStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await getUltramsgInstanceStatus();
      setInstanceStatus(status);
      
      if (status.success) {
        toast.success("حالة الخدمة: متصلة");
      } else {
        toast.error(status.error || "فشل في التحقق من حالة الخدمة");
      }
    } catch {
      toast.error("فشل في التحقق من حالة الخدمة");
      setInstanceStatus({ success: false, error: "فشل في التحقق من حالة الخدمة" });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSendDocument = (data: WhatsAppFormValues) => {
    // Pre-checks instead of disabling the button
    if (!isConfigured) {
      toast.error("خدمة واتساب غير مُعدة. يرجى ضبط الإعدادات أولاً.");
      return;
    }
    if (isLoading) {
      toast.info("جاري تنفيذ عملية أخرى، يرجى الإنتظار...");
      return;
    }
    const ensureUploadedAndSend = async () => {
      // alert('sss')
      console.log(effectivePatientData,'effectivePatientData');

      try {
        setIsSendingDoc(true);
        let resultUrl = effectivePatientData?.result_url;
        console.log(resultUrl,'resultUrl');
        // Always upload latest PDF to ensure newest version is sent
        if (effectivePatientData?.patient_id) {
          toast.info("جاري رفع أحدث نسخة من التقرير إلى التخزين السحابي...");
          const uploadRes = await apiClient.post(`/patients/${effectivePatientData.patient_id}/upload-to-firebase`);
          resultUrl = (uploadRes?.data as { result_url?: string })?.result_url || resultUrl;
          if (!resultUrl) {
            // Fallback to fetch patient if API didn't return URL for any reason
            const fresh = await getPatientById(effectivePatientData.patient_id);
            resultUrl = fresh?.result_url;
          }
        }
        if (!resultUrl) {
          throw new Error("لا يوجد رابط للتقرير بعد الرفع. يرجى المحاولة مرة أخرى.");
        }
        // Send using the (newest) URL
        toast.info("جاري إرسال التقرير عبر واتساب...");
        const resp = await sendUltramsgDocumentFromUrl({
          to: data.phoneNumber,
          document_url: resultUrl,
          filename: 'result.pdf',
          caption: 'result.pdf',
        });
        if (resp.success) {
          toast.success("تم إرسال التقرير بنجاح");
          if (onMessageSent) onMessageSent();
          onOpenChange(false);
        } else {
          throw new Error(resp.error || "فشل إرسال التقرير");
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        toast.error(err?.message || "فشل في رفع التقرير أو إرساله.");
      } finally {
        setIsSendingDoc(false);
      }
    };
    ensureUploadedAndSend();
  };

  const isConfigured = configStatus?.configured ?? false;
  const isLoading = sendDocumentMutation.isPending;
  const { errors } = form.formState;

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Send style={{ width: 20, height: 20 }} />
        <Typography variant="h6" component="span">
          إرسال واتساب - نتائج المختبر
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {effectivePatientData && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            إرسال إلى: {effectivePatientData.name}
          </Typography>
        )}

        {/* Configuration Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              حالة الخدمة:
            </Typography>
            <Chip 
              label={isConfigured ? "مُعدة" : "غير مُعدة"} 
              color={isConfigured ? "primary" : "error"}
              size="small"
            />
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={checkInstanceStatus}
            disabled={isCheckingStatus || !isConfigured}
            startIcon={
              isCheckingStatus ? (
                <CircularProgress size={16} />
              ) : instanceStatus?.success ? (
                <Wifi style={{ width: 16, height: 16, color: 'green' }} />
              ) : (
                <WifiOff style={{ width: 16, height: 16, color: 'red' }} />
              )
            }
          >
            فحص الحالة
          </Button>
        </Box>

        {/* Document Status */}
        {effectivePatientData && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                حالة التقرير:
              </Typography>
              <Chip 
                label={effectivePatientData.result_url ? "متوفر في السحابة" : "غير متوفر"} 
                color={effectivePatientData.result_url ? "primary" : "default"}
                size="small"
              />
            </Box>
            {effectivePatientData.result_url && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                <Typography variant="caption">☁️</Typography>
                <Typography variant="caption">متاح للإرسال</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Instance Status Display */}
        {instanceStatus && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
            {instanceStatus.success ? (
              <>
                <CheckCircle style={{ width: 16, height: 16, color: 'green' }} />
                <Typography variant="body2" color="success.main">
                  الخدمة متصلة ومتاحة
                </Typography>
              </>
            ) : (
              <>
                <XCircle style={{ width: 16, height: 16, color: 'red' }} />
                <Typography variant="body2" color="error.main">
                  {instanceStatus.error || "الخدمة غير متاحة"}
                </Typography>
              </>
            )}
          </Box>
        )}

        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="رقم الهاتف"
                placeholder="0991961111"
                disabled={isLoading}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber?.message}
                fullWidth
              />
            )}
          />

          <Divider />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={form.handleSubmit(handleSendDocument)}
              disabled={isSendingDoc}
              fullWidth
              startIcon={
                isSendingDoc || sendDocumentMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  <FileText style={{ width: 16, height: 16 }} />
                )
              }
            >
              {isSendingDoc || sendDocumentMutation.isPending ? "جاري الإرسال..." : "إرسال تقرير"}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onOpenChange(false)} disabled={isLoading}>
          إلغاء
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppWorkAreaDialog;
