// src/components/lab/workstation/LabQueueFilterDialog.tsx (New File)
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"; // shadcn Form
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

import type { Package, MainTestStripped } from '@/types/labTests';
import type { LabQueueFilters } from '@/types/labWorkflow';
import { getPackagesList } from '@/services/packageService';
import { getMainTestsListForSelection } from '@/services/mainTestService'; // For main test autocomplete

interface LabQueueFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: LabQueueFilters;
  onApplyFilters: (filters: LabQueueFilters) => void;
}

const LabQueueFilterDialog: React.FC<LabQueueFilterDialogProps> = ({
  isOpen, onOpenChange, currentFilters, onApplyFilters
}) => {
  const { t, i18n } = useTranslation(['labResults', 'common', 'labTests']);

  const form = useForm<LabQueueFilters>({
    defaultValues: currentFilters,
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (isOpen) {
      reset(currentFilters);
    }
  }, [isOpen, currentFilters, reset]);

  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[], Error>({
    queryKey: ['packagesListForFilter'],
    queryFn: getPackagesList,
    enabled: isOpen,
  });

  const { data: mainTests, isLoading: isLoadingMainTests } = useQuery<MainTestStripped[], Error>({
    queryKey: ['mainTestsListForFilter'], // Fetch all available tests for selection
    queryFn: () => getMainTestsListForSelection({ pack_id: 'all' }),
    enabled: isOpen,
  });

  const onSubmit = (data: LabQueueFilters) => {
    console.log(data,'data')
    onApplyFilters(data);
    onOpenChange(false);
  };
 console.log(currentFilters,'currentFilters')
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('labResults:filters.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('labResults:filters.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={control}
              name="package_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labResults:filters.byPackage')}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'all' ? null : parseInt(value))}
                    value={field.value ? String(field.value) : 'all'}
                    dir={i18n.dir()}
                    disabled={isLoadingPackages}
                  >
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="all">{t('common:allPackages')}</SelectItem>
                      {packages?.map(pkg => <SelectItem key={pkg.id} value={String(pkg.id)}>{pkg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="main_test_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labResults:filters.byMainTest')}</FormLabel>
                  <Autocomplete
                    options={mainTests || []}
                    getOptionLabel={(option) => option.main_test_name}
                    onChange={(_, newValue) => {
                      console.log(newValue,'newValue')
                      field.onChange(newValue ? newValue.id : null)
                    }}
                    isOptionEqualToValue={(option, value) => value ? option.id === value.id : false}
                    loading={isLoadingMainTests}
                    size="small"
                    PaperComponent={props => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100"/>}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={t('labResults:filters.selectMainTestPlaceholder')}
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoadingMainTests ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        sx={{'& .MuiOutlinedInput-root': {fontSize: '0.875rem', backgroundColor: 'var(--background)'}}}
                      />
                    )}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="has_unfinished_results"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={(checked) => field.onChange(checked === 'indeterminate' ? null : checked)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal text-sm">{t('labResults:filters.onlyUnfinishedResults')}</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => {
                  const defaultFilters: LabQueueFilters = { package_id: null, has_unfinished_results: null, main_test_id: null };
                  reset(defaultFilters); // Reset form
                  onApplyFilters(defaultFilters); // Apply cleared filters
                  onOpenChange(false);
              }}>
                {t('common:clearFilters')}
              </Button>
              <Button type="submit">{t('common:applyFilters')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default LabQueueFilterDialog;