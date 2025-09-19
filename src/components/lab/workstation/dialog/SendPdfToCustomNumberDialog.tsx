// src/components/lab/workstation/dialogs/SendWhatsAppTextDialog.tsx (New file)
import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import type { Setting } from "@/types/settings";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import { getSettings } from "@/services/settingService";
import { sendUltramsgText, type UltramsgTextPayload } from "@/services/ultramsgService";

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

type WhatsAppFormValues = {
  message_content: string;
  template_id?: string;
};

const getLocalizedTemplatesLab = (): AppWhatsAppTemplate[] => [
  { id: "lab_results_ready_simple", nameKey: "نتائج المختبر جاهزة", contentKey: "نتائج المختبر جاهزة" },
  { id: "lab_follow_up", nameKey: "متابعة المختبر", contentKey: "متابعة المختبر" },
  // Add more lab-specific templates
];

const SendWhatsAppTextDialog: React.FC<SendWhatsAppTextDialogProps> = ({
  isOpen, onOpenChange, queueItem, onMessageSent,
}) => {

  const form = useForm<WhatsAppFormValues>({
    defaultValues: { message_content: "", template_id: "" },
  });
  const { setValue, reset, control } = form;

  const { data: appSettings } = useQuery<Setting | null, Error>({
    queryKey: ["appSettingsForWhatsAppLab"],
    queryFn: getSettings,
    enabled: isOpen, staleTime: Infinity,
  });

  const templates = useMemo(() => getLocalizedTemplatesLab(), []);

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      if (!queueItem?.phone) { // Use phone property from queueItem
        throw new Error("رقم هاتف المريض غير متوفر");
      }
      const payload: UltramsgTextPayload = {
        to: queueItem.phone, // Use phone property from queueItem
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
      const replacedContent = selectedTemplate.contentKey
        .replace("{patientName}", queueItem.patient_name)
        .replace("{labVisitId}", queueItem.visit_id.toString())
        .replace("{date}", format(new Date(), "dd/MM/yyyy"))
        .replace("{clinicName}", clinicName);
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
          <DialogTitle>إرسال رسالة واتساب - {queueItem.patient_name}</DialogTitle>
          <DialogDescription>إرسال إلى: {queueItem.phone || "غير متوفر"}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => sendMutation.mutate(data))} className="space-y-3 py-2">
            <FormField control={control} name="template_id" render={({ field }) => (
              <FormItem>
                <FormLabel>اختر قالب</FormLabel>
                <Select onValueChange={(val) => { field.onChange(val); applyTemplateContent(val); }} value={field.value} disabled={sendMutation.isPending || templates.length === 0}>
                  <FormControl><SelectTrigger><SelectValue placeholder="اختر قالب" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value=" ">بدون قالب</SelectItem>
                    {templates.map((tpl) => (<SelectItem key={tpl.id} value={tpl.id}>{tpl.nameKey}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="message_content" render={({ field }) => (
              <FormItem>
                <FormLabel>الرسالة</FormLabel>
                <FormControl><Textarea {...field} rows={7} placeholder="اكتب رسالتك هنا..." /></FormControl>
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