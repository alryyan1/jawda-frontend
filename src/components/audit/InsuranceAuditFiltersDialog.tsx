// src/components/audit/InsuranceAuditFiltersDialog.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Assuming you have this
import type { DateRange } from 'react-day-picker';
import { Filter } from 'lucide-react';

import type { Company } from '@/types/companies';
import { getCompaniesList } from '@/services/companyService';
import type { AuditStatus } from '@/types/auditing';
import { formatISO } from 'date-fns';

export interface InsuranceAuditFilterValues {
  date_range?: DateRange;
  company_id: string; // Will be string from select, convert to number on submit
  patient_name?: string;
  audit_status?: AuditStatus | 'all';
}

const getAuditFilterSchema = (t: Function) => z.object({
  date_range: z.custom<DateRange>().optional(),
  company_id: z.string().min(1, { message: t('common:validation.required', { field: t('audit:filters.company') }) }),
  patient_name: z.string().optional(),
  audit_status: z.string().optional(), // Will map to AuditStatus or 'all'
});

interface InsuranceAuditFiltersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: Omit<InsuranceAuditFilterValues, 'date_range'> & {date_from?: string; date_to?: string}; // Parent passes current filters
  onApplyFilters: (filters: Omit<InsuranceAuditFilterValues, 'date_range'> & {date_from?: string; date_to?: string}) => void;
}

const AUDIT_STATUS_OPTIONS: Array<{ value: AuditStatus | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'audit:status.all' },
  { value: 'pending_review', labelKey: 'audit:status.pending_review' },
  { value: 'verified', labelKey: 'audit:status.verified' },
  { value: 'needs_correction', labelKey: 'audit:status.needs_correction' },
  { value: 'rejected', labelKey: 'audit:status.rejected' },
];

const InsuranceAuditFiltersDialog: React.FC<InsuranceAuditFiltersDialogProps> = ({
  isOpen, onOpenChange, currentFilters, onApplyFilters
}) => {
  const { t, i18n } = useTranslation(['audit', 'common']);
  const auditFilterSchema = getAuditFilterSchema(t);

  const form = useForm<InsuranceAuditFilterValues>({
    resolver: zodResolver(auditFilterSchema),
    defaultValues: {
      company_id: currentFilters.company_id || '',
      patient_name: currentFilters.patient_name || '',
      audit_status: currentFilters.audit_status || 'all',
      date_range: {
        from: currentFilters.date_from ? new Date(currentFilters.date_from) : undefined,
        to: currentFilters.date_to ? new Date(currentFilters.date_to) : undefined,
      }
    },
  });

  const { data: companies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companiesListForAuditFilter'],
    queryFn: () => getCompaniesList({ status: true }), // Fetch active companies
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        company_id: currentFilters.company_id || '',
        patient_name: currentFilters.patient_name || '',
        audit_status: currentFilters.audit_status || 'all',
        date_range: {
            from: currentFilters.date_from ? new Date(currentFilters.date_from) : undefined,
            to: currentFilters.date_to ? new Date(currentFilters.date_to) : undefined,
        }
      });
    }
  }, [isOpen, currentFilters, form]);

  const onSubmit = (data: InsuranceAuditFilterValues) => {
    onApplyFilters({
      company_id: data.company_id,
      patient_name: data.patient_name,
      audit_status: data.audit_status as AuditStatus | 'all',
      date_from: data.date_range?.from ? formatISO(data.date_range.from, { representation: 'date' }) : undefined,
      date_to: data.date_range?.to ? formatISO(data.date_range.to, { representation: 'date' }) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('audit:filters.title')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audit:filters.company')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    dir={i18n.dir()}
                    disabled={isLoadingCompanies}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder={t('audit:filters.selectCompany')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingCompanies && <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem>}
                      {companies?.map(comp => (
                        <SelectItem key={comp.id} value={String(comp.id)}>{comp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date_range"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('audit:filters.dateRange')}</FormLabel>
                   <DatePickerWithRange
                      date={field.value}
                      onDateChange={field.onChange}
                      align="start"
                      numberOfMonths={1}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audit:filters.patientName')}</FormLabel>
                  <FormControl><Input {...field} placeholder={t('audit:filters.patientNamePlaceholder')} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="audit_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audit:filters.auditStatus')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} dir={i18n.dir()}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('audit:filters.selectStatus')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {AUDIT_STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">{t('common:cancel')}</Button></DialogClose>
              <Button type="submit">
                <Filter className="ltr:mr-2 rtl:ml-2 h-4 w-4" />{t('audit:filters.applyButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default InsuranceAuditFiltersDialog;