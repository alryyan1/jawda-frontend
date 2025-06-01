// src/components/clinic/SendWhatsAppDialog.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, MessageSquare, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";

import type { Patient } from "@/types/patients";
import type { Setting } from "@/types/settings"; // For app settings like clinic name
import { getSettings } from "@/services/settingService"; // To fetch clinic name for templates
// NEW: Import your backend WhatsApp service functions
import {
  sendBackendWhatsAppText,
  sendBackendWhatsAppMedia,
  type BackendWhatsAppTextPayload,
  type BackendWhatsAppMediaPayload,
} from "@/services/backendWhatsappService";
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

const getWhatsAppSchema = (t: Function) =>
  z.object({
    template_id: z.string().optional(),
    message_content: z
      .string()
      .min(1, {
        message: t("common:validation.requiredField", {
          field: t("whatsapp:message"),
        }),
      })
      .max(4096),
    attachment: z.custom<FileList | null>().optional(),
  });
type WhatsAppFormValues = z.infer<ReturnType<typeof getWhatsAppSchema>>;

// This function would generate the templates using the t function for localization
// In a real app, these might come from your backend API
const getLocalizedTemplates = (t: Function): AppWhatsAppTemplate[] => [
  {
    id: "greeting",
    nameKey: "whatsapp:templates.greetingName",
    contentKey: "whatsapp:templates.greetingContent",
  },
  {
    id: "appointment_reminder",
    nameKey: "whatsapp:templates.reminderName",
    contentKey: "whatsapp:templates.reminderContent",
  },
  {
    id: "lab_results_ready",
    nameKey: "whatsapp:templates.labResultsReadyName",
    contentKey: "whatsapp:templates.labResultsReadyContent",
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
  const { t, i18n } = useTranslation(["clinic", "common", "whatsapp"]); // Added 'whatsapp' namespace
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(getWhatsAppSchema(t)),
    defaultValues: {
      message_content: initialMessage || "",
      attachment: null, // Handled by useEffect
      template_id: "",
    },
  });
  const { watch, setValue, reset, control } = form; // Added control
  const attachmentFile = watch("attachment");
  const selectedTemplateId = watch("template_id");

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

  const templates = useMemo(() => getLocalizedTemplates(t), [t]);

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      if (!patient.phone) {
        throw new Error(t("whatsapp:errors.patientPhoneMissing"));
      }
      // The backend WhatsAppController will use instance_id and token from its config/settings
      const file = data.attachment?.[0];

      if (file) {
        const mediaBase64 = await fileToBase64(file);
        const payload: BackendWhatsAppMediaPayload = {
          patient_id: patient.id,
          media_base64: mediaBase64,
          media_name: file.name,
          media_caption: data.message_content, // Message content becomes caption for media
          as_document:
            file.type === "application/pdf" ||
            file.type.startsWith("application/msword") || // .doc
            file.type.startsWith(
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) || // .docx
            file.type.startsWith("application/vnd.ms-excel") || // .xls
            file.type.startsWith(
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ) || // .xlsx
            !file.type.startsWith("image/"), // Treat as document if not clearly an image
        };
        return sendBackendWhatsAppMedia(payload);
      } else {
        const payload: BackendWhatsAppTextPayload = {
          patient_id: patient.id,
          message: data.message_content,
          // template_id: data.template_id, // Backend could handle template hydration if needed
        };
        return sendBackendWhatsAppText(payload);
      }
    },
    onSuccess: (response) => {
      toast.success(
        response.message || t("clinic:visit.whatsAppDialog.sendSuccess")
      );
      if (onMessageSent) onMessageSent();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          t("clinic:visit.whatsAppDialog.sendError")
      );
    },
  });

  const applyTemplateContent = (templateId?: string) => {
    if (!templateId) {
      setValue("message_content", initialMessage || "");
      return;
    }
    const selectedTemplate = templates.find((tpl) => tpl.id === templateId);
    if (selectedTemplate) {
      const clinicName =
        appSettings?.hospital_name ||
        appSettings?.lab_name ||
        t("common:defaultClinicName");
      // Dynamic placeholder replacement
      const replacedContent = t(selectedTemplate.contentKey, {
        patientName: patient.name,
        visitId: visitId || "N/A",
        date: format(new Date(), "PPP", { locale: dateLocale }), // Example: current date
        time: format(new Date(), "p", { locale: dateLocale }), // Example: current time
        clinicName: clinicName,
        // Add more placeholders as your templates require
        // e.g., doctorName: visit?.doctor?.name || 'Your Doctor'
      });
      setValue("message_content", replacedContent);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const defaultTemplateId = initialMessage ? "" : templates[0]?.id || "";
      reset({
        message_content: initialMessage || "",
        attachment: initialAttachment
          ? ({ 0: initialAttachment, length: 1 } as FileList)
          : null,
        template_id: defaultTemplateId,
      });
      if (defaultTemplateId) {
        // Apply initial template content if no initialMessage
        applyTemplateContent(defaultTemplateId);
      } else if (initialMessage) {
        // If there is an initial message, don't override with template
        setValue("message_content", initialMessage);
      }
    } else {
      reset(); // Clear form when dialog closes
    }
  }, [
    isOpen,
    reset,
    initialMessage,
    initialAttachment,
    templates,
    patient.name,
    visitId,
    appSettings,
    t,
    dateLocale,
  ]); // Added dependencies

  const isPhoneNumberMissing = !patient.phone;
  // Backend now handles waapi config check, so remove isConfigMissing from frontend
  // const isConfigMissing = !appSettings?.instance_id || !appSettings?.token;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("clinic:visit.whatsAppDialog.titleShort", {
              patientName: patient.name,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("clinic:visit.whatsAppDialog.descriptionTo", {
              phone: patient.phone || t("common:notAvailable_short"),
            })}
            {isPhoneNumberMissing && (
              <p className="text-destructive text-xs mt-1">
                {t("whatsapp:errors.patientPhoneMissingAdmin")}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(sendMutation.mutate)}
            className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1"
          >
            <FormField
              control={control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("clinic:visit.whatsAppDialog.selectTemplate")}
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
                          placeholder={t(
                            "clinic:visit.whatsAppDialog.templatePlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value=" ">
                        {t("whatsapp:noTemplate")}
                      </SelectItem>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {t(tpl.nameKey)}
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
                    {t("clinic:visit.whatsAppDialog.messageContent")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={7}
                      placeholder={t(
                        "clinic:visit.whatsAppDialog.messagePlaceholder"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachment"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4" />
                    {t("whatsapp:attachmentOptional")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={(e) => onChange(e.target.files)}
                      {...rest}
                      className="text-xs"
                      disabled={sendMutation.isPending}
                    />
                  </FormControl>
                  {attachmentFile?.[0] && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("common:selectedFile")}: {attachmentFile[0].name}
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
                  {t("common:cancel")}
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
                {t("common:send")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SendWhatsAppDialog;
