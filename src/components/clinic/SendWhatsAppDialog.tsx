// src/components/clinic/SendWhatsAppDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query'; // If fetching templates
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, MessageSquare } from 'lucide-react';
import type { Patient } from '@/types/patients';
// import { getWhatsAppTemplates, sendWhatsAppMessage } from '@/services/communicationService'; // Example services

interface WhatsAppTemplate { id: string; name: string; content: string; } // Example type

interface SendWhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  visitId?: number; // Optional visit context for templates
  onMessageSent?: () => void;
}

const getWhatsAppSchema = (t: Function) => z.object({
  template_id: z.string().optional(), // If using templates
  message_content: z.string().min(5, { message: t('common:validation.minLength', {min: 5}) }).max(1000),
  // recipient_number: z.string().optional(), // Could default to patient.phone
});
type WhatsAppFormValues = z.infer<ReturnType<typeof getWhatsAppSchema>>;

const SendWhatsAppDialog: React.FC<SendWhatsAppDialogProps> = ({
  isOpen, onOpenChange, patient, visitId, onMessageSent
}) => {
  const { t } = useTranslation(['clinic', 'common']);
  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(getWhatsAppSchema(t)),
    defaultValues: { message_content: '' },
  });

  // Placeholder for fetching templates
  // const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<WhatsAppTemplate[]>({
  //   queryKey: ['whatsappTemplates'],
  //   queryFn: getWhatsAppTemplates,
  //   enabled: isOpen,
  // });

  const sendMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
        // Replace with actual API call or logic
        console.log("Sending WhatsApp:", { phone: patient.phone, message: data.message_content, template: data.template_id });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        // If direct API integration:
        // return sendWhatsAppMessage({ recipient: patient.phone, message: data.message_content, templateId: data.template_id });
        return { success: true };
    },
    onSuccess: () => {
      toast.success(t('clinic:visit.whatsAppDialog.sendSuccess'));
      if (onMessageSent) onMessageSent();
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || t('clinic:visit.whatsAppDialog.sendError'));
    },
  });

  const handleTemplateChange = (templateId: string) => {
    // const selectedTemplate = templates.find(tpl => tpl.id === templateId);
    // if (selectedTemplate) {
    //   // Placeholder replacement logic (e.g., replace {{patientName}} with patient.name)
    //   let content = selectedTemplate.content.replace(/{{patientName}}/gi, patient.name);
    //   if (visitId) content = content.replace(/{{visitId}}/gi, String(visitId));
    //   form.setValue('message_content', content);
    // }
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('clinic:visit.whatsAppDialog.title', { patientName: patient.name })}</DialogTitle>
          <DialogDescription>{t('clinic:visit.whatsAppDialog.description', { phone: patient.phone })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(sendMutation.mutate)} className="space-y-4 py-2">
            {/* <FormField control={form.control} name="template_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clinic:visit.whatsAppDialog.selectTemplate')}</FormLabel>
                <Select onValueChange={(val) => {field.onChange(val); handleTemplateChange(val);}} value={field.value} disabled={isLoadingTemplates || sendMutation.isPending}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t('clinic:visit.whatsAppDialog.templatePlaceholder')} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {templates.map(tpl => <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} /> */}
            <FormField control={form.control} name="message_content" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clinic:visit.whatsAppDialog.messageContent')}</FormLabel>
                <FormControl><Textarea {...field} rows={5} placeholder={t('clinic:visit.whatsAppDialog.messagePlaceholder')} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={sendMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={sendMutation.isPending /*|| isLoadingTemplates*/}>
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
export default SendWhatsAppDialog;