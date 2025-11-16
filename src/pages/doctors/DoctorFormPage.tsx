// src/pages/doctors/DoctorFormPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  CircularProgress,
  FormHelperText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Save as SaveIcon } from '@mui/icons-material';
import { toast } from "sonner";

import type { DoctorFormData, Specialist, FinanceAccount, DoctorStripped, Doctor } from "@/types/doctors";
import {
  createDoctor,
  updateDoctor,
  getDoctorById,
  getSpecialistsList,
  getFinanceAccountsList,
  updateDoctorFirebaseId,
  DoctorFormMode,
} from "@/services/doctorService";
import { fetchFirestoreDoctors, type FirestoreDoctor } from "@/services/firestoreDoctorService";
import { DarkThemeAutocomplete } from "@/components/ui/mui-autocomplete";
import AddSpecialistDialog from "./AddSpecialistDialog";
import ManageDoctorServicesDialog from "@/components/doctors/ManageDoctorServicesDialog";

interface DoctorFormValues {
  name: string;
  phone: string;
  specialist_id?: string;
  cash_percentage: string;
  company_percentage: string;
  static_wage: string;
  lab_percentage: string;
  start: string;
  image_file?: File | null;
  image?: string | null;
  finance_account_id?: string;
  finanace_account_id_insurance?: string;
  calc_insurance: boolean;
  is_default?: boolean;
}

interface DoctorFormPageProps {
  mode: DoctorFormMode;
}

const DoctorFormPage: React.FC<DoctorFormPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { doctorId } = useParams<{ doctorId?: string }>();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFirestoreDoctor, setSelectedFirestoreDoctor] = useState<FirestoreDoctor | null>(null);
  const [showManageServicesDialog, setShowManageServicesDialog] = useState(false);

  const isEditMode = mode === DoctorFormMode.EDIT;
  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery<
    Specialist[],
    Error
  >({
    queryKey: ["specialistsList"],
    queryFn: getSpecialistsList,
  });
  const { data: doctorData, isLoading: isLoadingDoctor } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => getDoctorById(Number(doctorId)).then((res) => res.data),
    enabled: isEditMode && !!doctorId,
  });

  // showJsonDialog(doctorData);

  // Handle image preview side effect when doctorData changes
  useEffect(() => {
    if (doctorData?.image) {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL?.replace("/api", "/storage/") ||
        "/storage/";
      setImagePreview(
        doctorData.image.startsWith("http")
          ? doctorData.image
          : `${baseUrl}${doctorData.image}`
      );
    }
  }, [doctorData]);


  const { data: financeAccounts, isLoading: isLoadingFinanceAccounts } =
    useQuery<FinanceAccount[], Error>({
      queryKey: ["financeAccountsList"],
      queryFn: getFinanceAccountsList,
    });

  // Get the specialist's firestore_id to fetch Firestore doctors
  const specialistFirestoreId = doctorData?.specialist_firestore_id;
  
  // Fetch Firestore doctors based on specialist's firestore_id
  const { data: firestoreDoctors, isLoading: isLoadingFirestoreDoctors } = useQuery<FirestoreDoctor[], Error>({
    queryKey: ['firestoreDoctors', specialistFirestoreId],
    queryFn: () => fetchFirestoreDoctors(specialistFirestoreId!),
    enabled: !!specialistFirestoreId && isEditMode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<DoctorFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      specialist_id: undefined,
      cash_percentage: "0",
      company_percentage: "0",
      static_wage: "0",
      lab_percentage: "0",
      start: "0",
      image_file: undefined,
      image: null,
      finance_account_id: undefined,
      finanace_account_id_insurance: undefined,
      calc_insurance: false,
      is_default: false,
    },
  });
  const { control, handleSubmit, reset, watch, setValue, formState } = form;
  // console.log("Form State:", doctorData?.specialist_id); // Debugging line
  // Populate form with doctorData when it loads in edit mode
  useEffect(() => {
    console.log("useEffect ran");
    if (isEditMode && doctorData) {
      console.log(doctorData, "doctorData");
      reset({
        name: doctorData.name,
        phone: doctorData.phone,
        specialist_id: String(doctorData.specialist_id),
        cash_percentage: String(doctorData.cash_percentage),
        company_percentage: String(doctorData.company_percentage),
        static_wage: String(doctorData.static_wage),
        lab_percentage: String(doctorData.lab_percentage),
        start: String(doctorData.start),
        image: doctorData.image || null, // Store existing image path
        image_file: undefined, // Clear any stale file object
        finance_account_id: doctorData.finance_account_id
          ? String(doctorData.finance_account_id)
          : undefined,
        finanace_account_id_insurance: String(
          doctorData.finanace_account_id_insurance
        ),
        calc_insurance: doctorData.calc_insurance,
        is_default: Boolean((doctorData as Doctor & { is_default?: boolean }).is_default),
      });
    }
  }, [isEditMode, doctorData, reset]);
 console.log(doctorData,'doctorData')
  // Set the selected Firestore doctor when doctor data loads
  useEffect(() => {
    if (isEditMode && doctorData?.firebase_id && firestoreDoctors) {
      const linkedFirestoreDoctor = firestoreDoctors.find(fd => fd.centralDoctorId === doctorData.firebase_id);
      console.log(linkedFirestoreDoctor,'linked')
      setSelectedFirestoreDoctor(linkedFirestoreDoctor || null);
    }
  }, [isEditMode, doctorData, firestoreDoctors]);

  const imageFileWatch = watch("image_file");
  useEffect(() => {
    if (imageFileWatch && imageFileWatch instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(imageFileWatch);
    } else if (!imageFileWatch && isEditMode && doctorData?.image) {
      // Revert to existing image if new file is removed
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL?.replace("/api", "/storage/") ||
        "/storage/";
      setImagePreview(
        doctorData.image.startsWith("http")
          ? doctorData.image
          : `${baseUrl}${doctorData.image}`
      );
    } else if (!imageFileWatch) {
      setImagePreview(null);
    }
  }, [imageFileWatch, isEditMode, doctorData]);

  const mutation = useMutation({
    mutationFn: (data: DoctorFormData) =>
      isEditMode && doctorId
        ? updateDoctor(Number(doctorId), data)
        : createDoctor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] }); // Refetch doctors list
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] }); // Refetch this doctor if editing
      navigate("/doctors"); // Redirect to doctors list
    },
    onError: (error: unknown) => {
      let respMessage: string | undefined;
      if (typeof error === 'object' && error) {
        respMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      }
      const fallback = (error as { message?: string })?.message;
      toast.error(respMessage || fallback || 'فشل حفظ بيانات الطبيب');
    },
  });

  const updateFirebaseIdMutation = useMutation({
    mutationFn: ({ doctorId, firebaseId }: { doctorId: number; firebaseId: string }) =>
      updateDoctorFirebaseId(doctorId, firebaseId),
    onSuccess: () => {
      toast.success("تم ربط الطبيب بـ Firestore بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "فشل ربط الطبيب بـ Firestore.");
    },
  });

  const onSubmit = (data: DoctorFormValues) => {
    // تحقق بسيط بدلاً من Zod
    if (!data.name?.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    if (!data.phone?.trim()) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    if (!data.specialist_id || String(data.specialist_id).trim() === '') {
      toast.error('التخصص مطلوب');
      return;
    }
    const toNum = (v: string) => Number.parseFloat(v);
    const isValidPercent = (v: string) => {
      const n = toNum(v);
      return !Number.isNaN(n) && n >= 0 && n <= 100;
    };
    const isValidNonNegative = (v: string) => {
      const n = toNum(v);
      return !Number.isNaN(n) && n >= 0;
    };
    if (!isValidPercent(data.cash_percentage)) {
      toast.error('نسبة الكاش يجب أن تكون بين 0 و 100');
      return;
    }
    if (!isValidPercent(data.company_percentage)) {
      toast.error('نسبة الشركات يجب أن تكون بين 0 و 100');
      return;
    }
    if (!isValidNonNegative(data.static_wage)) {
      toast.error('الأجر الثابت يجب أن يكون رقمًا ≥ 0');
      return;
    }
    if (!isValidPercent(data.lab_percentage)) {
      toast.error('نسبة المختبر يجب أن تكون بين 0 و 100');
      return;
    }
    if (!/^\d+$/.test(String(data.start))) {
      toast.error('بداية الحساب يجب أن تكون رقمًا صحيحًا');
      return;
    }
    // Ensure numeric fields are numbers, not strings, if backend expects numbers
    const submissionData: DoctorFormData & { finanace_account_id_insurance?: string } = {
      ...data,
      specialist_id: String(data.specialist_id!),
      cash_percentage: String(data.cash_percentage),
      company_percentage: String(data.company_percentage),
      static_wage: String(data.static_wage),
      lab_percentage: String(data.lab_percentage),
      start: String(data.start),
      finance_account_id: data.finance_account_id ?? undefined,
      // Backend column is misspelled as 'finanace_account_id_insurance'
      finanace_account_id_insurance: data.finanace_account_id_insurance ?? "",
      is_default: data.is_default ?? false,
    };
    // if (!isEditMode && !data.image_file) {
    //     form.setError("image_file", { type: "manual", message: t('common:validation.required', { field: t('doctors:form.imageLabel')}) });
    //     return;
    // }
    mutation.mutate(submissionData);
  };

  const handleSpecialistAdded = (newSpecialist: Specialist) => {
    // Optionally, automatically select the newly added specialist
    console.log(watch("specialist_id"), newSpecialist.id);
    // Ensure newSpecialist.id is a string if your form field expects a string
    setValue("specialist_id", String(newSpecialist.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
    // The specialistsList query is already invalidated by the dialog, so the dropdown will update.
  };

  const handleFirestoreDoctorSelect = (firestoreDoctor: FirestoreDoctor | null) => {
    if (firestoreDoctor && doctorId) {
      updateFirebaseIdMutation.mutate({
        doctorId: Number(doctorId),
        firebaseId: firestoreDoctor.centralDoctorId
      });
    }
  };
  const isLoading =
    isLoadingDoctor ||
    isLoadingSpecialists ||
    isLoadingFinanceAccounts ||
    mutation.status === 'pending';

  if (isEditMode && isLoadingDoctor)
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 1 }}>جاري التحميل...</Typography>
      </Box>
    );
  return (
    <Card sx={{ maxWidth: 960, mx: 'auto' }}>
      <CardHeader
        title={isEditMode ? 'تعديل طبيب' : 'إضافة طبيب'}
        subheader="يرجى تعبئة البيانات التالية"
        action={isEditMode ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              size="small" 
              onClick={() => setShowManageServicesDialog(true)}
              disabled={!doctorId || !doctorData}
            >
              إدارة الخدمات
            </Button>
            <Button variant="outlined" size="small" onClick={() => navigate(-1)} startIcon={<ArrowBackIcon fontSize="small" />}>
              رجوع
            </Button>
          </Box>
        ) : null}
      />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField label="الاسم" placeholder="اسم الطبيب" {...field} />
            )} />
            <Controller name="phone" control={control} render={({ field }) => (
              <TextField label="الهاتف" type="tel" placeholder="رقم الهاتف" {...field} />
            )} />
          </Box>

          <Controller name="specialist_id" control={control} render={({ field, fieldState }) => (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="specialist-label">التخصص</InputLabel>
                  <Select labelId="specialist-label" label="التخصص" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} disabled={isLoadingSpecialists || formState.isSubmitting}>
                        {isLoadingSpecialists ? (
                      <MenuItem value="" disabled>جاري التحميل...</MenuItem>
                    ) : (
                      (specialists || []).map((s) => (
                        <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                      ))
                    )}
                    </Select>
                  <FormHelperText />
                </FormControl>
                <AddSpecialistDialog onSpecialistAdded={handleSpecialistAdded} />
              </Box>
              {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
            </Box>
          )} />

          {/* Firestore Doctor Selection - Only show in edit mode when specialist has firestore_id */}
          {isEditMode && specialistFirestoreId && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ربط بـ Firestore
              </Typography>
              <DarkThemeAutocomplete
                options={firestoreDoctors || []}
                getOptionLabel={(option) => option.docName}
                value={selectedFirestoreDoctor}
                onChange={(_, newValue) => handleFirestoreDoctorSelect(newValue)}
                loading={isLoadingFirestoreDoctors || updateFirebaseIdMutation.isPending}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="اختر طبيب من Firestore"
                    placeholder="ابحث في الأطباء..."
                    size="small"
                    helperText="اختر طبيب من Firestore لربطه بالطبيب المحلي"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.docName}</span>
                      <span className="text-sm text-muted-foreground">
                        الهاتف: {option.phoneNumber || 'غير محدد'} | 
                        الحد الصباحي: {option.morningPatientLimit} | 
                        الحد المسائي: {option.eveningPatientLimit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        المعرف المركزي: {option.centralDoctorId}
                      </span>
                    </div>
                  </li>
                )}
                isOptionEqualToValue={(option, value) => option.centralDoctorId === value?.centralDoctorId}
                noOptionsText="لا توجد أطباء متاحة"
                loadingText="جاري التحميل..."
                disabled={updateFirebaseIdMutation.isPending}
              />
              {/* {selectedFirestoreDoctor && (
                <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    الطبيب المحدد من Firestore:
                  </Typography>
                  <Typography variant="body2">
                    <strong>الاسم:</strong> {selectedFirestoreDoctor.docName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الهاتف:</strong> {selectedFirestoreDoctor.phoneNumber || 'غير محدد'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الحد الصباحي:</strong> {selectedFirestoreDoctor.morningPatientLimit} مريض
                  </Typography>
                  <Typography variant="body2">
                    <strong>الحد المسائي:</strong> {selectedFirestoreDoctor.eveningPatientLimit} مريض
                  </Typography>
                  <Typography variant="body2">
                    <strong>الحالة:</strong> {selectedFirestoreDoctor.isActive ? 'نشط' : 'غير نشط'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الحجز متاح:</strong> {selectedFirestoreDoctor.isBookingEnabled ? 'نعم' : 'لا'}
                  </Typography>
                </Box>
              )} */}
            </Box>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
            <Controller name="cash_percentage" control={control} render={({ field }) => (
              <TextField label="نسبة الكاش %" type="number" inputProps={{ step: '0.01' }} {...field} />
            )} />
            <Controller name="company_percentage" control={control} render={({ field }) => (
              <TextField label="نسبة الشركات %" type="number" inputProps={{ step: '0.01' }} {...field} />
            )} />
            <Controller name="static_wage" control={control} render={({ field }) => (
              <TextField label="الأجر الثابت" type="number" inputProps={{ step: '0.01' }} {...field} />
            )} />
            <Controller name="lab_percentage" control={control} render={({ field }) => (
              <TextField label="نسبة المختبر %" type="number" inputProps={{ step: '0.01' }} {...field} />
            )} />
          </Box>

          <Controller name="start" control={control} render={({ field }) => (
            <TextField label="بداية الحساب (رقم)" type="number" {...field} />
          )} />

          <Controller name="image_file" control={control} render={({ field: { onChange, ...rest } }) => (
            <Box>
              <Typography variant="subtitle2">صورة الطبيب</Typography>
              <TextField type="file" inputProps={{ accept: 'image/*' }} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.files ? e.target.files[0] : null)} name={rest.name} onBlur={rest.onBlur} inputRef={rest.ref} />
                  {imagePreview && (
                <Box component="img" src={imagePreview} alt="Preview" sx={{ mt: 1, width: 128, height: 128, objectFit: 'cover', borderRadius: 1 }} />
              )}
            </Box>
          )} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Controller name="finance_account_id" control={control} render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel id="finance-label">حساب مالي (كاش/شركة)</InputLabel>
                <Select labelId="finance-label" label="حساب مالي (كاش/شركة)" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                        {isLoadingFinanceAccounts ? (
                    <MenuItem value="" disabled>جاري التحميل...</MenuItem>
                  ) : (
                    (financeAccounts || []).map((fa) => (
                      <MenuItem key={fa.id} value={String(fa.id)}>{fa.name}</MenuItem>
                    ))
                  )}
                    </Select>
                      </FormControl>
            )} />
            <Controller name="finanace_account_id_insurance" control={control} render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel id="finance-ins-label">حساب مالي للتأمين</InputLabel>
                <Select labelId="finance-ins-label" label="حساب مالي للتأمين" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                        {isLoadingFinanceAccounts ? (
                    <MenuItem value="" disabled>جاري التحميل...</MenuItem>
                  ) : (
                    (financeAccounts || []).map((fa) => (
                      <MenuItem key={fa.id} value={String(fa.id)}>{fa.name}</MenuItem>
                    ))
                  )}
                    </Select>
              </FormControl>
            )} />
          </Box>

          <Controller name="calc_insurance" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="حساب التأمين ضمن النسبة؟" />
          )} />

          <Controller name="is_default" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={!!field.value} onChange={(_, checked) => field.onChange(checked)} />} label="تعيين كطبيب افتراضي" />
          )} />

          <CardActions sx={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="outlined" onClick={() => navigate('/doctors')}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={isLoading} startIcon={isLoading ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}>حفظ</Button>
          </CardActions>
        </Box>
      </CardContent>

      {/* Manage Doctor Services Dialog - Only in edit mode */}
      {isEditMode && doctorData && (
        <ManageDoctorServicesDialog
          isOpen={showManageServicesDialog}
          onOpenChange={setShowManageServicesDialog}
          doctor={{
            id: doctorData.id,
            name: doctorData.name,
            specialist_name: doctorData.specialist_name || null,
          } as DoctorStripped}
        />
      )}
    </Card>
  );
};

export default DoctorFormPage;
