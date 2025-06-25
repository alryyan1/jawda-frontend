// src/components/lab/workstation/dialogs/SendReportWhatsAppDialog.tsx (New File)
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send, MessageSquare } from 'lucide-react';

import type { Patient } from '@/types/patients';
import type { DoctorVisit } from '@/types/visits'; // For context
import apiClient from '@/services/api'; // Your main API client
import { WhatsAppService } from '@/services/whatsappService'; // If static methods are used by frontend, else backend handles it

// This service function will call your NEW Laravel backend endpoint
const sendLabReportViaWhatsAppAPI = async (payload: {
  visitId: number;
  chatId: string; // Formatted phone number: 249xxxx@c.us
  caption?: string;
  reportType: 'full_lab_report' | 'thermal_lab_receipt'; // To tell backend which PDF to generate
}): Promise<any> => { // Define a proper response type from your backend
  // Example endpoint: POST /api/visits/{visitId}/send-whatsapp-report
  const response = await apiClient.post(`/visits/${payload.visitId}/send-whatsapp-report`, {
    chat_id: payload.chatId,
    caption: payload.caption,
    report_type: payload.reportType,
  });
  return response.data;
};


interface SendReportWhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  visitId: number | null; // For visit context and ID
  reportType: 'full_lab_report' | 'thermal_lab_receipt'; // Specify which report
}

const getSendSchema = (t: Function) => z.object({
  phoneNumber: z.string().min(9, t('common:validation.invalidPhone')).max(15, t('common:validation.invalidPhone')), // Basic validation
  caption: z.string().max(1000).optional(),
});

type SendFormValues = z.infer<ReturnType<typeof getSendSchema>>;

const SendReportWhatsAppDialog: React.FC<SendReportWhatsAppDialogProps> = ({
  isOpen, onOpenChange, patient, visitId, reportType
}) => {
  const { t } = useTranslation(['labResults', 'common', 'whatsapp']);

  const form = useForm<SendFormValues>({
    resolver: zodResolver(getSendSchema(t)),
    defaultValues: { phoneNumber: '', caption: '' },
  });


  useEffect(() => {
    if (isOpen && patient) {
      form.reset({
        phoneNumber: patient.phone || '',
        caption: 'نتيجة التحاليل'
      });
    }
  }, [isOpen, patient, form, t]);

  const sendMutation = useMutation({
    mutationFn: sendLabReportViaWhatsAppAPI,
    onSuccess: (response) => {
      toast.success(response.message || t('whatsapp:sendSuccessGeneric'));
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('whatsapp:sendErrorGeneric'));
    }
  });

  const onSubmit = (data: SendFormValues) => {
    if (!visitId || !patient) return;

    // Assuming WhatsAppService is not used directly by frontend for formatting if backend handles it
    // Or, if your backend expects the raw phone and formats it:
    // const formattedChatId = WhatsAppService.formatPhoneNumberForWaApi(data.phoneNumber);
    // if (!formattedChatId) {
    //   toast.error(t('common:validation.invalidPhoneFormatForWhatsApp'));
    //   return;
    // }

    sendMutation.mutate({
      visitId: visitId,
      chatId: data.phoneNumber, // Send raw phone, let backend format with country code
      caption: data.caption,
      reportType: reportType,
    });
  };

  if (!patient || !visitId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600"/>
            {reportType === 'full_lab_report' 
                ? t('whatsapp:sendDialogTitle.fullReport', { patientName: patient.name }) 
                : t('whatsapp:sendDialogTitle.receipt', { patientName: patient.name })
            }
          </DialogTitle>
          <DialogDescription>
            {t('whatsapp:sendDialogDescription', { contactType: t('common:phone')})}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:phone')}</FormLabel>
                  <FormControl><Input type="tel" {...field} placeholder="e.g. 912345678" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('whatsapp:captionOptional')}</FormLabel>
                  <FormControl><Textarea rows={3} {...field} placeholder={t('whatsapp:captionPlaceholder')} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-3">
              <DialogClose asChild><Button type="button" variant="outline" disabled={sendMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={sendMutation.isPending}>
                {sendMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                <Send className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>
                {t('common:send')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SendReportWhatsAppDialog;