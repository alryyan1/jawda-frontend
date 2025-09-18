// src/components/lab/workstation/dialogs/SendWhatsAppTextDialog.tsx (New file)
import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import type { Patient } from "@/types/patients"; // Assuming PatientLabQueueItem has patient name and phone
import type { Setting } from "@/types/settings";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import { getSettings } from "@/services/settingService";
import { sendBackendWhatsAppText, BackendWhatsAppTextPayload } from "@/services/backendWhatsappService";

interface AppWhatsAppTemplate { // Same as before
  id: string;
  nameKey: string;
  contentKey: string;
}

interface SendWhatsAppTextDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queueItem: PatientLabQueueItem | null; // From the queue
  onMessageSent?: () => void;
}

const getWhatsAppSchema = (t: Function) => z.object({
  template_id: z.string().optional(),
  message_content: z.string().min(1, { message: t("common:validation.requiredField", { field: t("whatsapp:message") }) }).max(4096),
});
type WhatsAppFormValues = z.infer<ReturnType<typeof getWhatsAppSchema>>;

const getLocalizedTemplatesLab = (t: Function): AppWhatsAppTemplate[] => [
  { id: "lab_results_ready_simple", nameKey: "whatsapp:templates.labResultsReadyName", contentKey: "whatsapp:templates.labResultsReadyContentSimple" },
  { id: "lab_follow_up", nameKey: "whatsapp:templates.labFollowUpName", contentKey: "whatsapp:templates.labFollowUpContent" },
  // Add more lab-specific templates
];

const SendWhatsAppTextDialog: React.FC<SendWhatsAppTextDialogProps> = ({
  isOpen, onOpenChange, queueItem, onMessageSent,
}) => {
  const { t, i18n } = useTranslation(["whatsapp", "common", "labResults"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(getWhatsAppSchema(t)),
    defaultValues: { message_content: "", template_id: "" },
  });
  const { watch, setValue, reset, control } = form;
  const selectedTemplateId = watch("template_id");

  const { data: appSettings } = useQuery<Setting | null, Error>({
    queryKey: ["appSettingsForWhatsAppLab"],
    queryFn: getSettings,
    enabled: isOpen, staleTime: Infinity,
  });

  const templates = useMemo(() => getLocalizedTemplatesLab(t), [i18n.language]);

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      if (!queueItem?.patient_phone_for_whatsapp) { // Assuming patient_phone_for_whatsapp on queueItem
        throw new Error(t("whatsapp:errors.patientPhoneMissing"));
      }
      const payload: BackendWhatsAppTextPayload = {
        chat_id: queueItem.patient_phone_for_whatsapp, // Use formatted phone from queueItem
        message: data.message_content,
      };
      return sendBackendWhatsAppText(payload);
    },
    onSuccess: (response) => {
      toast.success(response.message || t("whatsapp:sendSuccess"));
      if (onMessageSent) onMessageSent();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || t("whatsapp:sendError"));
    },
  });
  
  const applyTemplateContent = (templateId?: string) => {
    if (!templateId || !queueItem) {
      setValue("message_content", ""); return;
    }
    const selectedTemplate = templates.find((tpl) => tpl.id === templateId);
    if (selectedTemplate) {
      const clinicName = appSettings?.hospital_name || appSettings?.lab_name || t("common:defaultClinicName");
      const replacedContent = t(selectedTemplate.contentKey, {
        patientName: queueItem.patient_name,
        labVisitId: queueItem.visit_id, // or specific lab request id if more relevant
        date: format(new Date(), "PPP", { locale: dateLocale }),
        clinicName: clinicName,
      });
      setValue("message_content", replacedContent);
    }
  };

  useEffect(() => {
    if (isOpen && queueItem) {
      const defaultTemplateId = templates[0]?.id || "";
      reset({ message_content: "", template_id: defaultTemplateId });
      applyTemplateContent(defaultTemplateId);
    } else if (!isOpen) {
      reset();
    }
    // Intentionally limit deps to avoid re-running each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, queueItem, templates, appSettings]);

  if (!queueItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("whatsapp:sendDialogTitle", { patientName: queueItem.patient_name })}</DialogTitle>
          <DialogDescription>{t("whatsapp:sendTo", { phone: queueItem.patient_phone_for_whatsapp || t("common:notAvailable_short")})}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(sendMutation.mutate)} className="space-y-3 py-2">
            <FormField control={control} name="template_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("whatsapp:selectTemplate")}</FormLabel>
                <Select onValueChange={(val) => { field.onChange(val); applyTemplateContent(val); }} value={field.value} disabled={sendMutation.isPending || templates.length === 0}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("whatsapp:templatePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value=" ">{t("whatsapp:noTemplate")}</SelectItem>
                    {templates.map((tpl) => (<SelectItem key={tpl.id} value={tpl.id}>{t(tpl.nameKey)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="message_content" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("whatsapp:messageContent")}</FormLabel>
                <FormControl><Textarea {...field} rows={7} placeholder={t("whatsapp:messagePlaceholder")} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={sendMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={sendMutation.isPending || !queueItem.patient_phone_for_whatsapp}>
                {sendMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:send')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SendWhatsAppTextDialog;