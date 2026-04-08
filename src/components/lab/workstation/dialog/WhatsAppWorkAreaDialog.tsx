// src/components/lab/workstation/dialog/WhatsAppWorkAreaDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { Send } from "lucide-react";

import type { Patient } from "@/types/patients";
import type { LabRequest } from "@/types/visits";
import apiClient from "@/services/api";

interface WhatsAppWorkAreaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPatient: Patient | null;
  selectedLabRequest?: LabRequest | null;
  onMessageSent?: () => void;
}

const schema = z.object({
  phoneNumber: z
    .string()
    .min(1, { message: "رقم الهاتف مطلوب" })
    .regex(/^[0-9+]{7,20}$/, { message: "رقم هاتف غير صحيح" }),
});

type FormValues = z.infer<typeof schema>;

const WhatsAppWorkAreaDialog: React.FC<WhatsAppWorkAreaDialogProps> = ({
  isOpen,
  onOpenChange,
  currentPatient,
  onMessageSent,
}) => {
  const [isSending, setIsSending] = useState(false);

  const { control, setValue, reset, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phoneNumber: "" },
  });

  // Pre-fill phone from patient
  useEffect(() => {
    if (isOpen && currentPatient?.phone) {
      setValue("phoneNumber", currentPatient.phone);
    }
    if (!isOpen) reset();
  }, [isOpen, currentPatient, setValue, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!currentPatient?.patient_id) {
      toast.error("بيانات المريض غير مكتملة");
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Upload PDF to Firebase → get download URL
      toast.info("جاري رفع التقرير...");
      const uploadRes = await apiClient.post(
        `/patients/${currentPatient.patient_id}/upload-to-firebase`,
      );

      if (!uploadRes.data?.success || !uploadRes.data?.result_url) {
        toast.error("فشل رفع التقرير: " + (uploadRes.data?.message || "حدث خطأ ما"));
        return;
      }

      const pdfUrl: string = uploadRes.data.result_url;
      const visitId = currentPatient.doctor_visit?.id ?? currentPatient.id;

      // Step 2: Send via WhatsApp Cloud template `result_direct`
      toast.info("جاري إرسال التقرير عبر واتساب...");
      const waRes = await apiClient.post("/whatsapp-cloud/send-template", {
        to: data.phoneNumber,
        template_name: "result_direct",
        language_code: "ar",
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  link: pdfUrl,
                  filename: `result_${visitId}.pdf`,
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: currentPatient.name ?? String(visitId),
              },
            ],
          },
        ],
      });

      if (waRes.data?.success) {
        toast.success("تم إرسال التقرير عبر واتساب بنجاح");
        onMessageSent?.();
        onOpenChange(false);
      } else {
        toast.error("فشل إرسال واتساب: " + (waRes.data?.error || "حدث خطأ ما"));
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || err.message || "حدث خطأ أثناء الإرسال",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSending && onOpenChange(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Send style={{ width: 20, height: 20 }} />
        <Typography variant="h6" component="span">
          إرسال نتيجة واتساب
        </Typography>
      </DialogTitle>

      <DialogContent>
        {currentPatient && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            إرسال إلى: {currentPatient.name}
          </Typography>
        )}

        <Box component="form" sx={{ pt: 1 }}>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="رقم الهاتف"
                placeholder="9665XXXXXXXX"
                disabled={isSending}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber?.message}
                fullWidth
                autoFocus
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onOpenChange(false)} disabled={isSending}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isSending}
          startIcon={isSending ? <CircularProgress size={16} /> : <Send style={{ width: 16, height: 16 }} />}
        >
          {isSending ? "جاري الإرسال..." : "إرسال"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppWorkAreaDialog;
