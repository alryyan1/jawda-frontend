// src/components/companies/CopyCompanyContractDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

import type { Company } from '@/types/companies';
import { getCompaniesList, copyServiceContractsFromCompany } from '@/services/companyService';

interface CopyCompanyContractDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetCompanyId: number;
  targetCompanyName: string;
  onContractsCopied: () => void; // Callback after successful copy
}

const copyContractSchema = z.object({
  source_company_id: z.string().min(1, "Please select a source company."),
});
type CopyContractFormValues = z.infer<typeof copyContractSchema>;

const CopyCompanyContractDialog: React.FC<CopyCompanyContractDialogProps> = ({
  isOpen, onOpenChange, targetCompanyId, targetCompanyName, onContractsCopied
}) => {
  const { t, i18n } = useTranslation(['companies', 'common']);
  const queryClient = useQueryClient();

  const form = useForm<CopyContractFormValues>({
    resolver: zodResolver(copyContractSchema),
    defaultValues: { source_company_id: '' },
  });

  // Fetch list of all other companies to select from
  const { data: allCompanies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companiesListForCopyContract'],
    queryFn: () => getCompaniesList({ status: true }), // Fetch active companies
    enabled: isOpen,
  });

  const sourceCompanyOptions = useMemo(() => {
    return allCompanies?.filter(c => c.id !== targetCompanyId) || [];
  }, [allCompanies, targetCompanyId]);

  const copyMutation = useMutation({
    mutationFn: (data: { sourceCompanyId: number }) => 
        copyServiceContractsFromCompany(targetCompanyId, data.sourceCompanyId),
    onSuccess: (response) => {
      toast.success(response.message || t('companies:serviceContracts.copiedSuccess'));
      queryClient.invalidateQueries({ 
        queryKey: ['companyContractedServices'],
        refetchType: 'all'
      });
      onContractsCopied();
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || t('common:error.operationFailed'));
    },
  });

  const onSubmit = (data: CopyContractFormValues) => {
    copyMutation.mutate({ sourceCompanyId: parseInt(data.source_company_id) });
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('companies:serviceContracts.copyDialogTitle', { companyName: targetCompanyName })}</DialogTitle>
          <DialogDescription>{t('companies:serviceContracts.copyDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="source_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companies:serviceContracts.selectSourceCompany')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                    dir={i18n.dir()}
                    disabled={isLoadingCompanies || copyMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('companies:serviceContracts.sourceCompanyPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCompanies ? (
                        <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem>
                      ) : sourceCompanyOptions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('companies:serviceContracts.noOtherCompanies')}
                        </div>
                      ) : (
                        sourceCompanyOptions.map(comp => (
                          <SelectItem key={comp.id} value={String(comp.id)}>{comp.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={copyMutation.isPending}>{t('common:cancel')}</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoadingCompanies || copyMutation.isPending || sourceCompanyOptions.length === 0}>
                {copyMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('companies:serviceContracts.copyButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CopyCompanyContractDialog;