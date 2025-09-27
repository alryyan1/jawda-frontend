// src/components/clinic/EditPatientInfoDialog.tsx
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Grid,
  Divider,
} from '@mui/material';
import { Add as PlusCircle } from '@mui/icons-material';

import type { Patient, PatientFormData } from '@/types/patients';
import type { Subcompany, CompanyRelation } from '@/types/companies';
import { getPatientById, updatePatient } from '@/services/patientService';
import { getSubcompaniesList, getCompanyRelationsList } from '@/services/companyService';
import AddSubcompanyDialog from './AddSubcompanyDialog';
import AddCompanyRelationDialog from './AddCompanyRelationDialog';

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface EditPatientInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  onPatientInfoUpdated: (updatedPatient: Patient) => void;
}

interface EditPatientFormValues {
  name: string;
  phone?: string | null;
  gender: 'male' | 'female' | 'other';
  age_year?: string | null;
  age_month?: string | null;
  age_day?: string | null;
  insurance_no?: string | null;
  guarantor?: string | null;
  subcompany_id?: string | null;
  company_relation_id?: string | null;
}

const EditPatientInfoDialog: React.FC<EditPatientInfoDialogProps> = ({
  isOpen, onOpenChange, patientId, onPatientInfoUpdated
}) => {
  // Translation hook removed since we're not using translations
  const queryClient = useQueryClient();
  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  const { data: patientData, isLoading: isLoadingPatient } = useQuery<Patient, Error>({
    queryKey: ['patientDetailsForEdit', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: isOpen && !!patientId,
  });
  
  const isCompanyPatient = !!patientData?.company_id;

  const form = useForm<EditPatientFormValues>({
    defaultValues: {
      name: '',
      phone: '',
      gender: 'male',
      age_year: '',
      age_month: '',
      age_day: '',
      insurance_no: '',
      guarantor: '',
      subcompany_id: '',
      company_relation_id: '',
    },
  });
  const { control, handleSubmit, reset, setValue, formState: { errors } } = form;

  const currentCompanyId = patientData?.company_id; // Fixed, not editable here

  const { data: subcompanies, isLoading: isLoadingSubcompanies } = useQuery<Subcompany[], Error>({
    queryKey: ['subcompaniesListForEdit', currentCompanyId],
    queryFn: () => currentCompanyId ? getSubcompaniesList(currentCompanyId) : Promise.resolve([]),
    enabled: isOpen && !!currentCompanyId,
  });

  const { data: companyRelations, isLoading: isLoadingRelations } = useQuery<CompanyRelation[], Error>({
    queryKey: ['companyRelationsListForEdit'],
    queryFn: getCompanyRelationsList,
    enabled: isOpen && !!currentCompanyId, // Only if company patient
  });

  useEffect(() => {
    if (isOpen && patientData) {
      reset({
        name: patientData.name || '',
        phone: patientData.phone || '',
        gender: patientData.gender || 'male',
        age_year: patientData.age_year !== null && patientData.age_year !== undefined ? String(patientData.age_year) : '',
        age_month: patientData.age_month !== null && patientData.age_month !== undefined ? String(patientData.age_month) : '',
        age_day: patientData.age_day !== null && patientData.age_day !== undefined ? String(patientData.age_day) : '',
        insurance_no: patientData.insurance_no || '',
        guarantor: patientData.guarantor || '',
        subcompany_id: patientData.subcompany_id ? String(patientData.subcompany_id) : '',
        company_relation_id: patientData.company_relation_id ? String(patientData.company_relation_id) : '',
      });
    } else if (!isOpen) {
      reset();
    }
  }, [isOpen, patientData, reset]);

  const updateMutation = useMutation<Patient, ApiError, Partial<PatientFormData>>({
    mutationFn: (data: Partial<PatientFormData>) => updatePatient(patientId, data),
    onSuccess: (updatedPatient) => {
      toast.success("تم تحديث بيانات المريض بنجاح");
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForInfoPanel', patientId] }); // Invalidate info dialog query
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForEdit', patientId] }); // Invalidate this dialog's query
      queryClient.invalidateQueries({ queryKey: ['activePatients'] }); // Invalidate active patient lists
      queryClient.invalidateQueries({ queryKey: ['patientVisitsSummary'] }); // Invalidate TodaysPatients list
      onPatientInfoUpdated(updatedPatient);
      onOpenChange(false); // Close dialog
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "فشل في التحديث");
    },
  });

  const onSubmit = (data: EditPatientFormValues) => {
    // Basic validation
    if (!data.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    
    if (!data.gender) {
      toast.error("الجنس مطلوب");
      return;
    }
    
    if (isCompanyPatient && !data.insurance_no?.trim()) {
      toast.error("رقم التأمين مطلوب عند وجود شركة");
      return;
    }

    const payload: Partial<PatientFormData> = {
      name: data.name,
      phone: data.phone || '',
      gender: data.gender,
      age_year: data.age_year ? parseInt(data.age_year) : null,
      age_month: data.age_month ? parseInt(data.age_month) : null,
      age_day: data.age_day ? parseInt(data.age_day) : null,
    };
    
    if (isCompanyPatient) {
      payload.insurance_no = data.insurance_no || undefined;
      payload.guarantor = data.guarantor || undefined;
      payload.subcompany_id = data.subcompany_id || undefined;
      payload.company_relation_id = data.company_relation_id || undefined;
    }
    
    updateMutation.mutate(payload);
  };
  
  const handleSubcompanyAdded = (newSubcompany: Subcompany) => {
    queryClient.invalidateQueries({ queryKey: ['subcompaniesListForEdit', currentCompanyId] }).then(() => {
      setValue('subcompany_id', String(newSubcompany.id), { shouldValidate: true, shouldDirty: true });
    });
    toast.success(`تم إضافة ${newSubcompany.name} إلى القائمة واختياره`);
    setShowSubcompanyDialog(false);
  };

  const handleRelationAdded = (newRelation: CompanyRelation) => {
    queryClient.invalidateQueries({ queryKey: ['companyRelationsListForEdit'] }).then(() => {
      setValue('company_relation_id', String(newRelation.id), { shouldValidate: true, shouldDirty: true });
    });
    toast.success(`تم إضافة ${newRelation.name} إلى القائمة واختياره`);
    setShowRelationDialog(false);
  };

  if (!isOpen) return null;
  if (isLoadingPatient && !patientData) {
    return (
      <Dialog open={isOpen} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={() => onOpenChange(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          تعديل بيانات {patientData?.name || 'المريض'}
        </DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
          تعديل المعلومات الشخصية والتأمينية للمريض
        </Typography>
        <DialogContent sx={{ maxHeight: 'calc(90vh - 180px)', overflow: 'auto' }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ py: 2 }}>
            {/* Basic Info */}
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="الاسم"
                  fullWidth
                  margin="normal"
                  error={!!error}
                  helperText={error?.message}
                  required
                />
              )}
            />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="الهاتف"
                      type="tel"
                      fullWidth
                      margin="normal"
                      error={!!error}
                      helperText={error?.message}
                      value={field.value || ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <FormControl fullWidth margin="normal" error={!!error}>
                      <InputLabel>الجنس</InputLabel>
                      <Select
                        {...field}
                        label="الجنس"
                        value={field.value || 'male'}
                      >
                        <MenuItem value="female">أنثى</MenuItem>
                        <MenuItem value="male">ذكر</MenuItem>
                      </Select>
                      {error && <Typography variant="caption" color="error">{error.message}</Typography>}
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>العمر</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Controller
                  name="age_year"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="سنوات"
                      type="number"
                      fullWidth
                      margin="normal"
                      error={!!error}
                      helperText={error?.message}
                      value={field.value || ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="age_month"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="أشهر"
                      type="number"
                      fullWidth
                      margin="normal"
                      error={!!error}
                      helperText={error?.message}
                      value={field.value || ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="age_day"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="أيام"
                      type="number"
                      fullWidth
                      margin="normal"
                      error={!!error}
                      helperText={error?.message}
                      value={field.value || ''}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* Insurance Info (only if company_id exists on patientData) */}
            {isCompanyPatient && currentCompanyId && (
              <Paper elevation={1} sx={{ mt: 3, p: 3, border: 1, borderColor: 'divider' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    معلومات التأمين
                  </Typography>
                  {patientData?.company?.name && (
                    <Typography variant="caption" color="text.secondary">
                      ({patientData.company.name})
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Controller
                    name="insurance_no"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label="رقم التأمين"
                        fullWidth
                        size="small"
                        error={!!error}
                        helperText={error?.message}
                        value={field.value || ''}
                      />
                    )}
                  />
                  
                  <Controller
                    name="guarantor"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label="الضامن"
                        fullWidth
                        size="small"
                        error={!!error}
                        helperText={error?.message}
                        value={field.value || ''}
                      />
                    )}
                  />
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <Controller
                      name="subcompany_id"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth size="small" error={!!error}>
                          <InputLabel>الشركة الفرعية</InputLabel>
                          <Select
                            {...field}
                            label="الشركة الفرعية"
                            value={field.value || ''}
                            disabled={isLoadingSubcompanies}
                          >
                            <MenuItem value="">لا يوجد</MenuItem>
                            {subcompanies?.map(sub => (
                              <MenuItem key={sub.id} value={String(sub.id)}>
                                {sub.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && <Typography variant="caption" color="error">{error.message}</Typography>}
                        </FormControl>
                      )}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => setShowSubcompanyDialog(true)}
                      sx={{ flexShrink: 0 }}
                    >
                      <PlusCircle fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <Controller
                      name="company_relation_id"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth size="small" error={!!error}>
                          <InputLabel>العلاقة</InputLabel>
                          <Select
                            {...field}
                            label="العلاقة"
                            value={field.value || ''}
                            disabled={isLoadingRelations}
                          >
                            <MenuItem value="">لا يوجد</MenuItem>
                            {companyRelations?.map(rel => (
                              <MenuItem key={rel.id} value={String(rel.id)}>
                                {rel.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && <Typography variant="caption" color="error">{error.message}</Typography>}
                        </FormControl>
                      )}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => setShowRelationDialog(true)}
                      sx={{ flexShrink: 0 }}
                    >
                      <PlusCircle fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => onOpenChange(false)} 
            disabled={updateMutation.isPending}
            variant="outlined"
          >
            إلغاء
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={updateMutation.isPending}
            onClick={handleSubmit(onSubmit)}
            startIcon={updateMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            حفظ التغييرات
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Quick Add Dialogs */}
      {currentCompanyId && (
        <AddSubcompanyDialog
            companyId={currentCompanyId}
            open={showSubcompanyDialog}
            onOpenChange={setShowSubcompanyDialog}
            onSubcompanyAdded={handleSubcompanyAdded}
        />
      )}
      {currentCompanyId && (
        <AddCompanyRelationDialog
            companyId={currentCompanyId}
            open={showRelationDialog}
            onOpenChange={setShowRelationDialog}
            onCompanyRelationAdded={handleRelationAdded}
        />
      )}
    </>
  );
};
export default EditPatientInfoDialog;