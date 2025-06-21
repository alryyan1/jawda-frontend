// src/components/lab/sample_collection/SendWhatsAppTextDialogSC.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import type { PatientLabQueueItem } from "@/types/labWorkflow";

interface SendWhatsAppTextDialogSCProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queueItem: PatientLabQueueItem | null;
  onMessageSent?: () => void;
}

const getWhatsAppSchema = (t: (key: string) => string) => z.object({
  message_content: z.string().min(1, { message: t("common:validation.requiredField") }).max(4096),
});
type WhatsAppFormValues = z.infer<ReturnType<typeof getWhatsAppSchema>>;

const SendWhatsAppTextDialogSC: React.FC<SendWhatsAppTextDialogSCProps> = ({
  isOpen, onOpenChange, queueItem, onMessageSent,
}) => {
  const { t } = useTranslation(["whatsapp", "common", "labResults"]);

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(getWhatsAppSchema(t)),
    defaultValues: { message_content: "" },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      if (!queueItem) {
        throw new Error(t("whatsapp:errors.patientPhoneMissing"));
      }
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Sending WhatsApp message:", {
        message: data.message_content,
        patientName: queueItem.patient_name,
        visitId: queueItem.visit_id
      });
      
      return { message: "Message sent successfully (mock)" };
    },
    onSuccess: (response) => {
      toast.success(response.message || t("whatsapp:sendSuccess"));
      if (onMessageSent) onMessageSent();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error((error as { message?: string }).message || t("whatsapp:sendError"));
    },
  });

  const handleSubmit = (data: WhatsAppFormValues) => {
    sendMutation.mutate(data);
  };

  useEffect(() => {
    if (isOpen && queueItem) {
      form.reset({ message_content: "" });
    } else if (!isOpen) {
      form.reset();
    }
  }, [isOpen, queueItem, form]);

  if (!queueItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("whatsapp:sendDialogTitle", { patientName: queueItem.patient_name })}</DialogTitle>
          <DialogDescription>{t("whatsapp:sendTo", { phone: t("common:notAvailable_short")})}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 py-2">
            <FormField control={form.control} name="message_content" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("whatsapp:messageContent")}</FormLabel>
                <FormControl><Textarea {...field} rows={7} placeholder={t("whatsapp:messagePlaceholder")} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={sendMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={sendMutation.isPending}>
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
export default SendWhatsAppTextDialogSC;