// src/components/audit/EditAddAuditedServiceDialog.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

import type { AuditedRequestedService, AuditedServiceApiPayload } from '@/types/auditing';
import type { Service as ServiceType } from '@/types/services';
import { storeAuditedService, updateAuditedService } from '@/services/insuranceAuditService';
import { getServices } from '@/services/serviceService';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface EditAddAuditedServiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  auditRecordId: number;
  existingAuditedService?: AuditedRequestedService | null; // Pass for editing, null/undefined for adding
  onSaveSuccess: () => void;
}

// Re-using the schema, but it might be slightly different if IDs are not part of the form directly
const auditedServiceItemFormSchema = z.object({
  service_id: z.string().min(1, "Service selection is required."),
  audited_price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Valid price required."),
  audited_count: z.string(),
  audited_discount_per: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100), "0-100 or empty").optional().nullable(),
  audited_discount_fixed: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), "Positive or empty").optional().nullable(),
  audited_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Valid endurance required."),
  audited_status: z.enum(['approved_for_claim', 'rejected_by_auditor', 'pending_edits', 'pending_review'], { required_error: "Audit status is required."}),
  auditor_notes_for_service: z.string().max(500, "Notes too long").optional().nullable(),
});
type AuditedServiceFormValues = z.infer<typeof auditedServiceItemFormSchema>;

const AUDIT_SERVICE_STATUS_OPTIONS_DIALOG: AuditedRequestedService['audited_status'][] = [
    'pending_review', 'approved_for_claim', 'rejected_by_auditor', 'pending_edits'
];

const EditAddAuditedServiceDialog: React.FC<EditAddAuditedServiceDialogProps> = ({
  isOpen, onOpenChange, auditRecordId, existingAuditedService, onSaveSuccess
}) => {
  const { t } = useTranslation(['audit', 'services', 'common']);
  const isEditMode = !!existingAuditedService;

  const form = useForm<AuditedServiceFormValues>({
    resolver: zodResolver(auditedServiceItemFormSchema),
    defaultValues: {
      service_id: '',
      audited_price: '0',
      audited_count: '1',
      audited_discount_per: '',
      audited_discount_fixed: '',
      audited_endurance: '0',
      audited_status: 'pending_review' as const,
      auditor_notes_for_service: '',
    }
  });

  // Reset form when dialog opens/closes or when editing different service
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && existingAuditedService) {
        form.reset({
          service_id: String(existingAuditedService.service_id),
          audited_price: String(existingAuditedService.audited_price),
          audited_count: String(existingAuditedService.audited_count),
          audited_discount_per: existingAuditedService.audited_discount_per?.toString() ?? '',
          audited_discount_fixed: existingAuditedService.audited_discount_fixed?.toString() ?? '',
          audited_endurance: String(existingAuditedService.audited_endurance),
          audited_status: existingAuditedService.audited_status,
          auditor_notes_for_service: existingAuditedService.auditor_notes_for_service || '',
        });
      } else {
        form.reset({
          service_id: '',
          audited_price: '0',
          audited_count: '1',
          audited_discount_per: '',
          audited_discount_fixed: '',
          audited_endurance: '0',
          audited_status: 'pending_review',
          auditor_notes_for_service: '',
        });
      }
    }
  }, [isOpen, existingAuditedService, isEditMode, form]);

  const { data: allServices = [], isLoading: isLoadingServices } = useQuery<ServiceType[], Error>({
    queryKey: ['allServicesForAuditDialog'],
    queryFn: () => getServices(1, { per_page: 1000, activate: true }).then(res => res.data),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (data: AuditedServiceApiPayload) => {
      if (isEditMode && existingAuditedService?.id) {
        return updateAuditedService(existingAuditedService.id, data);
      } else {
        return storeAuditedService({ ...data, audited_patient_record_id: auditRecordId });
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? t('audit:auditedServices.updatedSuccess') : t('audit:auditedServices.createdSuccess'));
      onSaveSuccess();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || t('common:error.saveFailed')),
  });

  const onSubmit = (data: AuditedServiceFormValues) => {
    const payload: AuditedServiceApiPayload = {
      service_id: parseInt(data.service_id),
      audited_price: parseFloat(data.audited_price),
      audited_count: parseInt(data.audited_count),
      audited_discount_per: data.audited_discount_per ? parseFloat(data.audited_discount_per) : null,
      audited_discount_fixed: data.audited_discount_fixed ? parseFloat(data.audited_discount_fixed) : null,
      audited_endurance: parseFloat(data.audited_endurance),
      audited_status: data.audited_status,
      auditor_notes_for_service: data.auditor_notes_for_service || null,
    };
    mutation.mutate(payload);
  };

  const handleServiceSelectionChange = (serviceId: string) => {
    const selectedService = allServices.find(s => String(s.id) === serviceId);
    if(selectedService) {
      form.setValue('service_id', serviceId);
      form.setValue('audited_price', String(selectedService.price));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('audit:auditedServices.editDialogTitle') : t('audit:auditedServices.addDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? t('audit:auditedServices.editDialogDescription', { serviceName: existingAuditedService?.service?.name || '' })
              : t('audit:auditedServices.addDialogDescription')
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1">
            <FormField control={form.control} name="service_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('audit:auditedServices.service')}</FormLabel>
                <Select value={field.value || ''} onValueChange={handleServiceSelectionChange} disabled={isLoadingServices || mutation.isPending || isEditMode}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t('audit:auditedServices.selectServicePlaceholder')} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {allServices.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="audited_price" render={({ field }) => (
                <FormItem><FormLabel>{t('audit:auditedServices.price')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || '0'} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="audited_count" render={({ field }) => (
                <FormItem><FormLabel>{t('audit:auditedServices.count')}</FormLabel><FormControl><Input type="number" step="1" min="1" {...field} value={field.value || '1'} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="audited_discount_per" render={({ field }) => (
                <FormItem><FormLabel>{t('audit:auditedServices.discountPercShort')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} placeholder="%" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="audited_discount_fixed" render={({ field }) => (
                <FormItem><FormLabel>{t('audit:auditedServices.discountFixedShort')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} placeholder={t('common:currencySymbolShort')} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="audited_endurance" render={({ field }) => (
              <FormItem><FormLabel>{t('audit:auditedServices.endurance')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || '0'} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="audited_status" render={({ field }) => (
              <FormItem><FormLabel>{t('audit:auditedServices.status')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {AUDIT_SERVICE_STATUS_OPTIONS_DIALOG.map(s => <SelectItem key={s} value={s}>{t(`audit:serviceStatus.${s}`)}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="auditor_notes_for_service" render={({ field }) => (
              <FormItem><FormLabel>{t('audit:auditedServices.notes')}</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={2} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending || isLoadingServices}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {isEditMode ? t('common:saveChanges') : t('common:add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default EditAddAuditedServiceDialog;