// src/components/audit/InsuranceAuditExportFiltersDialog.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { formatISO, startOfMonth, endOfMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2 } from 'lucide-react';

import type { Company } from '@/types/companies';
import type { ServiceGroup } from '@/types/services';
import { getCompaniesList } from '@/services/companyService';
import { getServiceGroupsList } from '@/services/serviceGroupService';

export interface AuditExportFilters {
  company_id: string;
  date_from: string;
  date_to: string;
  service_group_ids?: string[];
}

interface TranslationFunction {
  (key: string, options?: Record<string, unknown>): string;
}

const getExportFilterSchema = (t: TranslationFunction) => z.object({
  company_id: z.string().min(1, { message: t('common:validation.requiredField', { field: t('audit:filters.company') }) }),
  date_range: z.object({
    from: z.date({ required_error: t('common:validation.dateRequired') }),
    to: z.date({ required_error: t('common:validation.dateRequired') }),
  }).refine(data => data.from <= data.to, {
    message: t('common:validation.dateFromAfterTo'),
    path: ["to"],
  }),
  service_group_ids: z.array(z.string()).optional(),
});

type ExportFilterFormValues = z.infer<ReturnType<typeof getExportFilterSchema>>;

interface InsuranceAuditExportFiltersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (filters: AuditExportFilters, format: 'pdf' | 'xlsx') => void;
  isExporting: boolean;
}

const InsuranceAuditExportFiltersDialog: React.FC<InsuranceAuditExportFiltersDialogProps> = ({
  isOpen, onOpenChange, onExport, isExporting
}) => {
  const { t, i18n } = useTranslation(['audit', 'common', 'services']);
  const exportFilterSchema = getExportFilterSchema(t);

  const form = useForm<ExportFilterFormValues>({
    resolver: zodResolver(exportFilterSchema),
    defaultValues: {
      company_id: '',
      date_range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      service_group_ids: [],
    },
  });

  const { data: companies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companiesListForAuditExport'],
    queryFn: () => getCompaniesList({ status: true }),
    enabled: isOpen,
  });

  const { data: allServiceGroups, isLoading: isLoadingServiceGroups } = useQuery<ServiceGroup[], Error>({
    queryKey: ['allServiceGroupsForAuditExport'],
    queryFn: () => getServiceGroupsList().then(res => res.data || []),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        company_id: '',
        date_range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
        service_group_ids: [],
      });
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: ExportFilterFormValues, format: 'pdf' | 'xlsx') => {
    onExport({
      company_id: data.company_id,
      date_from: formatISO(data.date_range.from, { representation: 'date' }),
      date_to: formatISO(data.date_range.to, { representation: 'date' }),
      service_group_ids: data.service_group_ids,
    }, format);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('audit:export.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('audit:export.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audit:filters.company')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} dir={i18n.dir()} disabled={isLoadingCompanies || isExporting}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('audit:filters.selectCompany')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {companies?.map(comp => <SelectItem key={comp.id} value={String(comp.id)}>{comp.name}</SelectItem>)}
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
                  <DatePickerWithRange date={field.value} onDateChange={field.onChange} align="start" disabled={isExporting}/>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service_group_ids"
              render={() => (
                <FormItem>
                  <FormLabel>{t('audit:export.selectServiceGroups')}</FormLabel>
                  <FormDescription>{t('audit:export.selectServiceGroupsDescription')}</FormDescription>
                  {isLoadingServiceGroups ? <Loader2 className="h-5 w-5 animate-spin"/> :
                    <ScrollArea className="h-40 rounded-md border p-2">
                      <div className="space-y-1.5">
                        {allServiceGroups?.map((group) => (
                          <FormField
                            key={group.id}
                            control={form.control}
                            name="service_group_ids"
                            render={({ field: checkboxField }) => {
                              return (
                                <FormItem className="flex flex-row items-center space-x-2 rtl:space-x-reverse space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={checkboxField.value?.includes(String(group.id))}
                                      onCheckedChange={(checked) => {
                                        const currentValues = checkboxField.value || [];
                                        return checked
                                          ? checkboxField.onChange([...currentValues, String(group.id)])
                                          : checkboxField.onChange(currentValues.filter(id => id !== String(group.id)));
                                      }}
                                      disabled={isExporting}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">{group.name}</FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  }
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isExporting}>{t('common:cancel')}</Button></DialogClose>
              <Button type="button" onClick={form.handleSubmit(data => handleFormSubmit(data, 'xlsx'))} disabled={isExporting || !form.formState.isValid}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
                {t('common:exportExcel')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InsuranceAuditExportFiltersDialog;