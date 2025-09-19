// src/components/lab/workstation/dialogs/SendWhatsAppTextDialog.tsx (New file)
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

import type { Setting } from "@/types/settings";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import { getSettings } from "@/services/settingService";
import { sendUltramsgText, type UltramsgTextPayload } from "@/services/ultramsgService";

interface AppWhatsAppTemplate { // Static Arabic templates
  id: string;
  name: string;
  content: string;
}

interface SendWhatsAppTextDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queueItem: PatientLabQueueItem | null; // From the queue
  onMessageSent?: () => void;
}

const whatsappSchema = z.object({
  template_id: z.string().optional(),
  message_content: z.string().min(1, { message: "الرسالة مطلوبة" }).max(4096),
});
type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const getLocalizedTemplatesLab = (): AppWhatsAppTemplate[] => [
  { id: "lab_results_ready_simple", name: "نتائج المختبر جاهزة", content: "عزيزي/عزيزتي {patientName}، نتائج فحوصاتك جاهزة للزيارة رقم {labVisitId} بتاريخ {date} في {clinicName}." },
  { id: "lab_follow_up", name: "متابعة بعد النتائج", content: "مرحبا {patientName}، نرجو التواصل معنا للاستفسار عن نتائج الزيارة رقم {labVisitId}. شكراً لك." },
];

const SendWhatsAppTextDialog: React.FC<SendWhatsAppTextDialogProps> = ({
  isOpen, onOpenChange, queueItem, onMessageSent,
}) => {
  const dateLocale = arSA;

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: { message_content: "", template_id: "" },
  });
  const { setValue, reset, control } = form;
  const initializedRef = useRef(false);

  const { data: appSettings } = useQuery<Setting | null, Error>({
    queryKey: ["appSettingsForWhatsAppLab"],
    queryFn: getSettings,
    enabled: isOpen, staleTime: Infinity,
  });

  const templates = useMemo(() => getLocalizedTemplatesLab(), []);

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      if (!queueItem?.phone) { // Assuming phone on queueItem
        throw new Error("رقم هاتف المريض غير متوفر");
      }
      const payload: UltramsgTextPayload = {
        to: queueItem.phone, // Use formatted phone from queueItem
        body: data.message_content,
      };
      return sendUltramsgText(payload);
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
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || "فشل إرسال الرسالة");
    },
  });
  
  const applyTemplateContent = (templateId?: string) => {
    if (!templateId || !queueItem) {
      setValue("message_content", ""); return;
    }
    const selectedTemplate = templates.find((tpl) => tpl.id === templateId);
    if (selectedTemplate) {
      const clinicName = appSettings?.hospital_name || appSettings?.lab_name || "العيادة";
      const replacedContent = selectedTemplate.content
        .replace("{patientName}", queueItem.patient_name)
        .replace("{labVisitId}", String(queueItem.visit_id))
        .replace("{date}", format(new Date(), "PPP", { locale: dateLocale }))
        .replace("{clinicName}", clinicName);
      setValue("message_content", replacedContent);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      reset();
      return;
    }
    if (initializedRef.current || !queueItem) return;
    initializedRef.current = true;
    const defaultTemplateId = templates[0]?.id || "";
    reset({ message_content: "", template_id: defaultTemplateId });
    applyTemplateContent(defaultTemplateId);
    // Only run once per dialog open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!queueItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إرسال واتساب إلى {queueItem.patient_name}</DialogTitle>
          <DialogDescription>إرسال إلى: {queueItem.phone || "غير متوفر"}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(sendMutation.mutate)} className="space-y-3 py-2">
            <FormField control={control} name="template_id" render={({ field }) => (
              <FormItem>
                <FormLabel>اختر قالب الرسالة</FormLabel>
                <Select onValueChange={(val) => { field.onChange(val); applyTemplateContent(val); }} value={field.value} disabled={sendMutation.isPending || templates.length === 0}>
                  <FormControl><SelectTrigger><SelectValue placeholder="اختر قالبًا" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value=" ">بدون قالب</SelectItem>
                    {templates.map((tpl) => (<SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="message_content" render={({ field }) => (
              <FormItem>
                <FormLabel>محتوى الرسالة</FormLabel>
                <FormControl><Textarea {...field} rows={7} placeholder="اكتب رسالتك هنا..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={sendMutation.isPending}>إلغاء</Button></DialogClose>
              <Button type="submit" disabled={sendMutation.isPending || !queueItem.phone}>
                {sendMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                إرسال
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SendWhatsAppTextDialog;