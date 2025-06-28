// src/components/lab/reception/LabFilterDialog.tsx (New File)
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

// Shadcn UI & Custom Components
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Filter, Loader2, X } from 'lucide-react';

// MUI Imports for Autocomplete
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

// Services & Types
import { getCompaniesList } from '@/services/companyService';
import { getDoctorsList, getSpecialistsList } from '@/services/doctorService';
import type { Company } from '@/types/companies';
import type { DoctorStripped, Specialist } from '@/types/doctors';

export interface LabQueueFilters {
  isBankak?: boolean | null;
  company?: Company | null;
  doctor?: DoctorStripped | null;
  specialist?: Specialist | null;
}

const filterSchema = z.object({
  isBankak: z.boolean().optional(),
  company: z.custom<Company>().nullable().optional(),
  doctor: z.custom<DoctorStripped>().nullable().optional(),
  specialist: z.custom<Specialist>().nullable().optional(),
});

type FilterFormValues = z.infer<typeof filterSchema>;

interface LabFilterDialogProps {
  currentFilters: LabQueueFilters;
  onApplyFilters: (filters: LabQueueFilters) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const LabFilterDialog: React.FC<LabFilterDialogProps> = ({
  currentFilters, onApplyFilters, onClearFilters, activeFilterCount
}) => {
  const { t } = useTranslation(['labReception', 'common']);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      isBankak: currentFilters.isBankak ?? false,
      company: currentFilters.company ?? null,
      doctor: currentFilters.doctor ?? null,
      specialist: currentFilters.specialist ?? null,
    },
  });

  // Sync form with external filter changes
  useEffect(() => {
    form.reset({
      isBankak: currentFilters.isBankak ?? false,
      company: currentFilters.company ?? null,
      doctor: currentFilters.doctor ?? null,
      specialist: currentFilters.specialist ?? null,
    });
  }, [currentFilters, form.reset]);

  // Data fetching for Autocomplete options
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companiesListActive'], queryFn: () => getCompaniesList({ status: true }), enabled: isOpen,
  });
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctorsListActive'], queryFn: () => getDoctorsList({ active: true }), enabled: isOpen,
  });
  const { data: specialists = [], isLoading: isLoadingSpecialists } = useQuery({
    queryKey: ['specialistsList'], queryFn: getSpecialistsList, enabled: isOpen,
  });

  const onSubmit = (data: FilterFormValues) => {
    console.log(data)
    onApplyFilters({
      isBankak: data.isBankak || null, // Convert false to null to clear filter
      company_id: data.company?.id || null,
      doctor_id: data.doctor?.id || null,
      specialist: data.specialist || null,
    });
    setIsOpen(false);
  };
  
  const handleClear = () => {
    form.reset({ isBankak: false, company: null, doctor: null, specialist: null });
    onClearFilters();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 relative">
          <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t('actions.filter')}
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('filterDialog.title')}</DialogTitle>
          <DialogDescription>{t('filterDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <Controller
              name="company"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={companies}
                  loading={isLoadingCompanies}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, data) => field.onChange(data)}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label={t('filterDialog.companyLabel')} variant="outlined" InputProps={{...params.InputProps, endAdornment: (<>{isLoadingCompanies ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>)}}/>
                  )}
                  PaperComponent={(props) => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />}
                />
              )}
            />
            <Controller
              name="doctor"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={doctors}
                  loading={isLoadingDoctors}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, data) => field.onChange(data)}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label={t('filterDialog.doctorLabel')} variant="outlined" InputProps={{...params.InputProps, endAdornment: (<>{isLoadingDoctors ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>)}}/>
                  )}
                  PaperComponent={(props) => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />}
                />
              )}
            />
             <Controller
              name="specialist"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={specialists}
                  loading={isLoadingSpecialists}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, data) => field.onChange(data)}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label={t('filterDialog.specialistLabel')} variant="outlined" InputProps={{...params.InputProps, endAdornment: (<>{isLoadingSpecialists ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>)}}/>
                  )}
                  PaperComponent={(props) => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />}
                />
              )}
            />
            <FormField
              control={form.control}
              name="isBankak"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t('filterDialog.bankPaymentOnly')}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={handleClear} disabled={activeFilterCount === 0}>
                <X className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t('actions.clearFilters')}
              </Button>
              <div className="flex gap-2">
                <DialogClose asChild><Button type="button" variant="secondary">{t('common:cancel')}</Button></DialogClose>
                <Button type="submit">{t('actions.applyFilters')}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default LabFilterDialog;