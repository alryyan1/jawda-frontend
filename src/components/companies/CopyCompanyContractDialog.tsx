// src/components/companies/CopyCompanyContractDialog.tsx
import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
} from '@mui/material';

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
  source_company_id: z.number().min(1, "يرجى اختيار الشركة المصدر"),
});
type CopyContractFormValues = z.infer<typeof copyContractSchema>;

const CopyCompanyContractDialog: React.FC<CopyCompanyContractDialogProps> = ({
  isOpen, onOpenChange, targetCompanyId, targetCompanyName, onContractsCopied
}) => {
  const queryClient = useQueryClient();

  const form = useForm<CopyContractFormValues>({
    resolver: zodResolver(copyContractSchema),
    defaultValues: { source_company_id: 0 },
  });

  // Fetch list of all other companies to select from
  const { data: allCompanies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companiesListForCopyContract'],
    queryFn: () => getCompaniesList({ status: true ,per_page: 1000}), // Fetch active companies
    enabled: isOpen,
  });

  const sourceCompanyOptions = useMemo(() => {
    return allCompanies?.filter(c => c.id !== targetCompanyId) || [];
  }, [allCompanies, targetCompanyId]);

  const copyMutation = useMutation({
    mutationFn: (data: { sourceCompanyId: number }) => 
        copyServiceContractsFromCompany(targetCompanyId, data.sourceCompanyId),
    onSuccess: (response) => {
      toast.success(response.message || 'تم نسخ العقود بنجاح');
      queryClient.invalidateQueries({ 
        queryKey: ['companyContractedServices'],
        refetchType: 'all'
      });
      onContractsCopied();
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'فشلت العملية');
    },
  });

  const onSubmit = (data: CopyContractFormValues) => {
    copyMutation.mutate({ sourceCompanyId: data.source_company_id });
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        نسخ عقود الخدمات من شركة أخرى إلى {targetCompanyName}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          <Controller
            name="source_company_id"
            control={form.control}
            render={({ field, fieldState: { error } }) => (
              <Autocomplete
                options={sourceCompanyOptions}
                getOptionLabel={(option) => option.name || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={isLoadingCompanies}
                value={sourceCompanyOptions.find(c => c.id === field.value) || null}
                onChange={(_e, newValue) => {
                  field.onChange(newValue?.id || 0);
                }}
                disabled={copyMutation.isPending}
                noOptionsText={
                  isLoadingCompanies 
                    ? 'جاري التحميل...' 
                    : sourceCompanyOptions.length === 0 
                    ? 'لا توجد شركات أخرى متاحة'
                    : 'لا توجد خيارات'
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="اختر الشركة المصدر"
                    fullWidth
                    margin="normal"
                    error={!!error}
                    helperText={error?.message}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingCompanies ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => onOpenChange(false)} 
          disabled={copyMutation.isPending}
          variant="outlined"
        >
          إلغاء
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoadingCompanies || copyMutation.isPending || sourceCompanyOptions.length === 0}
          variant="contained"
          startIcon={copyMutation.isPending ? <CircularProgress size={16} /> : null}
        >
          نسخ
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default CopyCompanyContractDialog;