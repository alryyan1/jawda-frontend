// src/components/lab/sample_collection/dialogs/SendPdfToCustomNumberDialogSC.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

import type { PatientLabQueueItem } from "@/types/labWorkflow";

// Define what kind of PDF this dialog might send for sample collection
type SampleCollectionPdfType = 'sample_collection_slip' | 'test_list_for_patient';

interface SendPdfToCustomNumberDialogSCProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queueItem: PatientLabQueueItem | null;
  pdfType?: SampleCollectionPdfType; // To determine which PDF endpoint to call
  onMessageSent?: () => void;
}

const sendPdfSchemaSC = (t: (key: string) => string) => z.object({
  custom_phone_number: z.string()
    .min(9, { message: t("whatsapp:validation.phoneMin") })
    .regex(/^\d+$/, { message: t("whatsapp:validation.phoneNumeric") }),
  caption: z.string().max(1000).optional(),
});
type SendPdfFormValuesSC = z.infer<ReturnType<typeof sendPdfSchemaSC>>;

const SendPdfToCustomNumberDialogSC: React.FC<SendPdfToCustomNumberDialogSCProps> = ({
  isOpen, onOpenChange, queueItem, pdfType = 'sample_collection_slip', onMessageSent,
}) => {
  const { t } = useTranslation(["whatsapp", "common", "labSampleCollection"]);

  const form = useForm<SendPdfFormValuesSC>({
    resolver: zodResolver(sendPdfSchemaSC(t)),
    defaultValues: { custom_phone_number: "", caption: "" },
  });

  const sendPdfMutation = useMutation({
    mutationFn: async (data: SendPdfFormValuesSC) => {
      if (!queueItem) throw new Error("Queue item data missing.");
      
      // Mock implementation for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Sending PDF:", {
        phone: data.custom_phone_number,
        caption: data.caption,
        pdfType,
        visitId: queueItem.visit_id,
        patientName: queueItem.patient_name
      });
      
      return { message: "PDF sent successfully (mock)" };
    },
    onSuccess: (response) => {
      toast.success(response.message || t("whatsapp:pdfSentSuccess"));
      if (onMessageSent) onMessageSent();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error((error as { message?: string }).message || t("whatsapp:pdfSentError"));
    },
  });

  const handleSubmit = (data: SendPdfFormValuesSC) => {
    sendPdfMutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  if (!queueItem && isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("labSampleCollection:contextMenu.sendPdfToOtherNumber")}</DialogTitle>
          <DialogDescription>{t("whatsapp:sendPdfToCustomNumberDesc", { patientName: queueItem?.patient_name || '...' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 py-2">
            <FormField control={form.control} name="custom_phone_number" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("whatsapp:customPhoneNumber")}</FormLabel>
                <FormControl><Input type="tel" {...field} placeholder={t("whatsapp:enterPhoneNumberPlaceholder")} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="caption" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("whatsapp:captionOptional")}</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    value={field.value || ""} 
                    rows={3} 
                    placeholder={t("whatsapp:captionPlaceholder")} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={sendPdfMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={sendPdfMutation.isPending}>
                {sendPdfMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:send')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SendPdfToCustomNumberDialogSC;