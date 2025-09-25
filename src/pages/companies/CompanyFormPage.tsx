// src/pages/companies/CompanyFormPage.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// MUI
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Loader2 } from 'lucide-react';

import type { CompanyFormData, Company, FinanceAccount } from '@/types/companies';
import { createCompany, updateCompany, getCompanyById } from '@/services/companyService';
import { getFinanceAccountsList } from '@/services/doctorService';

export enum CompanyFormMode { CREATE = 'create', EDIT = 'edit' }

type CompanyFormValues = {
  name: string;
  phone: string;
  email: string;
  status: boolean;
  lab_endurance: string;
  service_endurance: string;
  lab_roof: string;
  service_roof: string;
  finance_account_id?: string;
};

const CompanyFormPage: React.FC<{ mode: CompanyFormMode }> = ({ mode }) => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === CompanyFormMode.EDIT;

  const { data: companyData, isLoading: isLoadingCompany, isFetching: isFetchingCompany } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompanyById(Number(companyId)).then(res => res.data as Company),
    enabled: isEditMode && !!companyId,
  });

  const { data: financeAccounts = [], isLoading: isLoadingFinanceAccounts } = useQuery<FinanceAccount[], Error>({
    queryKey: ['financeAccountsList'],
    queryFn: getFinanceAccountsList,
  });

  const form = useForm<CompanyFormValues>({
    defaultValues: {
      name: '', phone: '', email: '', status: true,
      lab_endurance: '0', service_endurance: '0',
      lab_roof: '0', service_roof: '0',
      finance_account_id: undefined,
    },
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (isEditMode && companyData) {
      reset({
        name: companyData.name ?? '',
        phone: companyData.phone ?? '',
        email: companyData.email ?? '',
        status: Boolean(companyData.status),
        lab_endurance: String(companyData.lab_endurance ?? '0'),
        service_endurance: String(companyData.service_endurance ?? '0'),
        lab_roof: String(companyData.lab_roof ?? '0'),
        service_roof: String(companyData.service_roof ?? '0'),
        finance_account_id: companyData.finance_account_id ? String(companyData.finance_account_id) : undefined,
      });
    }
  }, [isEditMode, companyData, reset]);

  const mutation = useMutation({
    mutationFn: (data: CompanyFormData) =>
      isEditMode && companyId ? updateCompany(Number(companyId), data) : createCompany(data),
    onSuccess: () => {
      toast.success('تم حفظ بيانات الشركة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      if (isEditMode && companyId) queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      navigate('/settings/companies');
    },
    onError: (error: any) => {
      let msg = 'فشل حفظ بيانات الشركة';
      if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        msg = `${msg}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      toast.error(msg);
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    if (!data.name.trim()) return toast.error('الاسم مطلوب');
    if (!data.phone.trim()) return toast.error('رقم الهاتف مطلوب');
    if (!data.email.trim()) return toast.error('البريد الإلكتروني مطلوب');

    const submissionData: CompanyFormData = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      status: Boolean(data.status),
      lab_endurance: parseFloat(data.lab_endurance || '0'),
      service_endurance: parseFloat(data.service_endurance || '0'),
      lab_roof: parseInt(data.lab_roof || '0'),
      service_roof: parseInt(data.service_roof || '0'),
      finance_account_id: data.finance_account_id ? parseInt(data.finance_account_id) : undefined,
    } as CompanyFormData;

    mutation.mutate(submissionData);
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingCompany || isFetchingCompany || isLoadingFinanceAccounts;

  if (isEditMode && isLoadingCompany) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="rtl:ml-2 ltr:mr-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <Typography variant="h5">{isEditMode ? 'تعديل شركة' : 'إضافة شركة'}</Typography>
        <Typography variant="body2" color="text.secondary">يرجى تعبئة الحقول التالية</Typography>
      </CardHeader>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller name="name" control={control} rules={{ required: 'الاسم مطلوب' }} render={({ field, fieldState }) => (
            <TextField fullWidth label="اسم الشركة" placeholder="اسم الشركة" {...field} disabled={dataIsLoading || formIsSubmitting} error={!!fieldState.error} helperText={fieldState.error?.message} />
          )} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller name="phone" control={control} rules={{ required: 'رقم الهاتف مطلوب' }} render={({ field, fieldState }) => (
                <TextField fullWidth label="رقم الهاتف" type="tel" placeholder="0xxxxxxxxx" {...field} disabled={dataIsLoading || formIsSubmitting} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller name="email" control={control}  render={({ field, fieldState }) => (
                <TextField fullWidth label="البريد الإلكتروني" placeholder="example@email.com" {...field} disabled={dataIsLoading || formIsSubmitting} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )} />
            </Grid>
          </Grid>

          <Controller name="finance_account_id" control={control} render={({ field }) => (
            <FormControl fullWidth size="small" disabled={dataIsLoading || formIsSubmitting}>
              <InputLabel id="finance-account-label">الحساب المالي</InputLabel>
              <Select labelId="finance-account-label" label="الحساب المالي" value={field.value || ''} onChange={(e) => field.onChange(e.target.value)}>
                <MenuItem value=" ">لا يوجد</MenuItem>
                {isLoadingFinanceAccounts ? (
                  <MenuItem value="loading_fa" disabled>جار التحميل...</MenuItem>
                ) : (
                  financeAccounts.map((fa) => (
                    <MenuItem key={fa.id} value={String(fa.id)}>{fa.name} ({fa.code})</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )} />
        <h1>تتحمل الشركه النسب التاليه</h1>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller name="lab_endurance" control={control} render={({ field }) => (
                <TextField onFocus={
                  (e)=>e.target.select()
                } fullWidth label="تحمل المختبر %" type="number" inputProps={{ step: '0.01' }} {...field} disabled={dataIsLoading || formIsSubmitting} />
              )} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller name="service_endurance" control={control} render={({ field }) => (
                <TextField fullWidth label="تحمل الخدمات %" type="number" inputProps={{ step: '0.01' }} {...field} disabled={dataIsLoading || formIsSubmitting} />
              )} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller name="lab_roof" control={control} render={({ field }) => (
                <TextField fullWidth label="سقف المختبر" type="number" {...field} disabled={dataIsLoading || formIsSubmitting} />
              )} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller name="service_roof" control={control} render={({ field }) => (
                <TextField fullWidth label="سقف الخدمات" type="number" {...field} disabled={dataIsLoading || formIsSubmitting} />
              )} />
            </Grid>
          </Grid>

          <Controller name="status" control={control} render={({ field }) => (
            <FormControlLabel control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} disabled={dataIsLoading || formIsSubmitting} />} label={field.value ? 'الحالة: نشط' : 'الحالة: غير نشط'} />
          )} />

          <Box sx={{ display: 'flex', justifyContent: 'end', gap: 1.5, pt: 2 }}>
            <Button type="button" variant="outlined" onClick={() => navigate('/settings/companies')} disabled={formIsSubmitting}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={dataIsLoading || formIsSubmitting} startIcon={formIsSubmitting ? <CircularProgress size={16} /> : undefined}>
              حفظ
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CompanyFormPage;