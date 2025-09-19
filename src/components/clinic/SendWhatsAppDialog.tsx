// src/components/clinic/SendWhatsAppDialog.tsx
import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns"; // For placeholder replacement in templates
import { arSA, enUS } from "date-fns/locale"; // For date formatting locales

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";

import type { Patient } from "@/types/patients";
import type { Setting } from "@/types/settings"; // For app settings like clinic name
import { getSettings } from "@/services/settingService"; // To fetch clinic name for templates
// NEW: Import your backend WhatsApp service functions
import {
  sendUltramsgText,
  sendUltramsgDocument,
  type UltramsgTextPayload,
  type UltramsgDocumentPayload,
} from "@/services/ultramsgService";
import { fileToBase64 } from "@/services/whatsappService"; // Utility for base64 conversion (can stay or move)

// Interface for templates if fetched from your backend or defined locally
export interface AppWhatsAppTemplate {
  id: string;
  nameKey: string; // Translation key for the template name
  contentKey: string; // Translation key for the template content (with placeholders)
  // You might add a 'type': 'text' | 'media_with_caption' if templates have different structures
}

interface SendWhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  visitId?: number;
  initialMessage?: string;
  initialAttachment?: File | null;
  onMessageSent?: () => void;
}

interface WhatsAppFormValues {
  template_id?: string;
  message_content: string;
  attachment?: FileList | null;
}

// This function would generate the templates using the t function for localization
// In a real app, these might come from your backend API
const getLocalizedTemplates = (): AppWhatsAppTemplate[] => [
  {
    id: "greeting",
    nameKey: "تحية",
    contentKey: "مرحباً {patientName}، نأمل أن تكون بخير.",
  },
  {
    id: "appointment_reminder",
    nameKey: "تذكير بالموعد",
    contentKey: "تذكير: لديك موعد في العيادة رقم {visitId}.",
  },
  {
    id: "lab_results_ready",
    nameKey: "نتائج المختبر جاهزة",
    contentKey: "نتائج فحوصاتك المختبرية جاهزة. يمكنك الحضور لاستلامها.",
  },
  // Add more templates here
];

const SendWhatsAppDialog: React.FC<SendWhatsAppDialogProps> = ({
  isOpen,
  onOpenChange,
  patient,
  visitId,
  initialMessage,
  initialAttachment,
  onMessageSent,
}) => {
  // Added 'whatsapp' namespace
  const dateLocale = "ar".startsWith("ar") ? arSA : enUS;

  const form = useForm<WhatsAppFormValues>({
    defaultValues: {
      message_content: initialMessage || "",
      attachment: null, // Handled by useEffect
      template_id: "",
    },
  });
  const { setValue, reset, control } = form; // Removed watch to avoid re-render loops
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Fetch application settings (e.g., for clinic name in templates)
  const { data: appSettings, isLoading: isLoadingSettings } = useQuery<
    Setting | null,
    Error
  >({
    queryKey: ["appSettingsForWhatsApp"],
    queryFn: getSettings,
    enabled: isOpen,
    staleTime: 1000 * 60 * 60,
  });

  const templates = useMemo(() => getLocalizedTemplates(), []);

  const onSubmit = (data: WhatsAppFormValues) => {
    sendMutation.mutate(data);
  };

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      if (!patient.phone) {
        throw new Error("رقم هاتف المريض غير متوفر");
      }
      // The backend WhatsAppController will use instance_id and token from its config/settings
      const file = data.attachment?.[0];

      if (file) {
        const mediaBase64 = await fileToBase64(file);
        const payload: UltramsgDocumentPayload = {
          to: patient.phone,
          document: mediaBase64,
          filename: file.name,
          caption: data.message_content, // Message content becomes caption for media
        };
        return sendUltramsgDocument(payload);
      } else {
        const payload: UltramsgTextPayload = {
          to: patient.phone,
          body: data.message_content,
        };
        return sendUltramsgText(payload);
      }
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("تم إرسال الرسالة بنجاح");
        if (onMessageSent) onMessageSent();
        onOpenChange(false);
      } else {
        toast.error(response.error || "فشل إرسال الرسالة");
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message
        : error && typeof error === 'object' && 'message' in error
        ? (error as { message?: string }).message
        : "فشل في إرسال الرسالة";
      toast.error(errorMessage);
    },
  });

  const applyTemplateContent = useCallback((templateId?: string) => {
    if (!templateId) {
      setValue("message_content", initialMessage || "");
      return;
    }
    const selectedTemplate = templates.find((tpl) => tpl.id === templateId);
    if (selectedTemplate) {
      const clinicName =
        appSettings?.hospital_name ||
        appSettings?.lab_name ||
        "العيادة";
      // Dynamic placeholder replacement
      const replacedContent = selectedTemplate.contentKey
        .replace("{patientName}", patient.name)
        .replace("{visitId}", String(visitId || "N/A"))
        .replace("{date}", format(new Date(), "PPP", { locale: dateLocale }))
        .replace("{time}", format(new Date(), "p", { locale: dateLocale }))
        .replace("{clinicName}", clinicName);
      setValue("message_content", replacedContent);
    }
  }, [setValue, initialMessage, templates, appSettings, patient.name, visitId, dateLocale]);

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      setSelectedFileName(null);
      reset();
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    const defaultTemplateId = initialMessage ? "" : templates[0]?.id || "";
    // Initialize base values once when dialog opens
    reset({
      message_content: initialMessage || "",
      template_id: defaultTemplateId,
    });

    if (defaultTemplateId && !initialMessage) {
      // Inline apply template to avoid depending on external callback and causing re-renders
      const selectedTemplate = templates.find((tpl) => tpl.id === defaultTemplateId);
      if (selectedTemplate) {
        const clinicName =
          appSettings?.hospital_name || appSettings?.lab_name || "العيادة";
        const replacedContent = selectedTemplate.contentKey
          .replace("{patientName}", patient.name)
          .replace("{visitId}", String(visitId || "N/A"))
          .replace("{date}", format(new Date(), "PPP", { locale: dateLocale }))
          .replace("{time}", format(new Date(), "p", { locale: dateLocale }))
          .replace("{clinicName}", clinicName);
        setValue("message_content", replacedContent, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      }
    }
    // Intentionally only dependent on isOpen to prevent update loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isPhoneNumberMissing = !patient.phone;
  // Backend now handles waapi config check, so remove isConfigMissing from frontend
  // const isConfigMissing = !appSettings?.instance_id || !appSettings?.token;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            إرسال واتساب إلى {patient.name}
          </DialogTitle>
          <DialogDescription>
            إرسال رسالة إلى: {patient.phone || "غير متوفر"}
            {isPhoneNumberMissing && (
              <p className="text-destructive text-xs mt-1">
                رقم هاتف المريض غير متوفر
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1"
          >
            <FormField
              control={control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    اختر قالب الرسالة
                  </FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      applyTemplateContent(val);
                    }}
                    value={field.value}
                    disabled={sendMutation.isPending || templates.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="اختر قالب..."
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value=" ">
                        بدون قالب
                      </SelectItem>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.nameKey}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    محتوى الرسالة
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={7}
                      placeholder="اكتب رسالتك هنا..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachment"
              render={({ field: { onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4" />
                    مرفق (اختياري)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={(e) => {
                        const files = e.target.files;
                        onChange(files);
                        setSelectedFileName(files && files[0] ? files[0].name : null);
                      }}
                      {...rest}
                      className="text-xs"
                      disabled={sendMutation.isPending}
                    />
                  </FormControl>
                  {selectedFileName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      الملف المحدد: {selectedFileName}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={sendMutation.isPending}
                >
                  إلغاء
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  sendMutation.isPending ||
                  isLoadingSettings ||
                  isPhoneNumberMissing
                }
              >
                {sendMutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                إرسال
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SendWhatsAppDialog;
