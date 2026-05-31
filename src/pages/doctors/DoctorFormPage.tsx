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
import { DarkThemeAutocomplete } from "@/components/ui/mui-autocomplete";
import AddSpecialistDialog from "@/components/doctors/AddSpecialistDialog";
import ManageDoctorServicesDialog from "@/components/doctors/ManageDoctorServicesDialog";
import { getDocs, collection, writeBatch, doc } from "firebase/firestore";
import { firestoreDb, firestoreDb as HospitalAppDb } from "@/lib/firebase_hospital";

interface HospitalDoctor {
  id: string;
  name: string;
  phone?: string;
  specialization?: string;
  [key: string]: unknown;
}
interface DoctorFormValues {
  name: string;
  phone: string;
  specialist_id?: string;
  sub_specialist_id?: string;
  cash_percentage: string;
  company_percentage: string;
  static_wage: string;
  lab_percentage: string;
  start: string;
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
  const [selectedHospitalDoctor, setSelectedHospitalDoctor] = useState<HospitalDoctor | null>(null);
  console.log(selectedHospitalDoctor, 'selected hospital doctor');
  const [showManageServicesDialog, setShowManageServicesDialog] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number>(window.innerHeight - 100);
  useEffect(() => {
    const handleResize = () => {
      setContainerHeight(window.innerHeight - 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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


  const fixMistakenyFirestoreIds = async () => {
    console.log('start migration');
    //1-  fetch all doctors from firestore
    const snap = await getDocs(collection(firestoreDb, 'allDoctors'));

    //2- find the maximum numeric id in the snap
    const numericIds = snap.docs.map(doc => doc.id).filter(id => /^\d+$/.test(id)).map(id => Number(id));
    console.log('numeric ids in firestore', numericIds);

    let maxNumber = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    console.log('max numeric id in firestore', maxNumber);

    //3- loop through the snap and update documents with non-numeric ids to have new numeric ids starting from maxNumber + 1
    const batch = writeBatch(firestoreDb);
    let updatesCount = 0;
    let changesStaged = false; // Track if we actually have anything to update
    snap.docs.forEach(doctorDoc => {
      const oldId = doctorDoc.id;
      if (!/^\d+$/.test(doctorDoc.id)) {
        changesStaged = true;
        const doctorData = doctorDoc.data();
        console.log(`Scheduling update for doc with old id ${oldId} to new id ${maxNumber + 1}`, doctorData);
        const newId = String(++maxNumber);
        const newDocRef = doc(firestoreDb, 'allDoctors', newId);
        batch.set(newDocRef, doctorData)
        const oldDocRef = doc(firestoreDb, 'allDoctors', oldId);
        batch.delete(oldDocRef);
        console.log(`Staged: ${oldId} ---> ${newId}`);
      }

    })
    if (changesStaged) {
      try {
        await batch.commit();
        console.log('Batch update committed successfully. All non-numeric IDs have been replaced with numeric IDs.');
      } catch (error) {
        console.error('Error committing batch update:', error);
      }
    } else {
      console.log('No non-numeric IDs found. No updates needed.');
    }
  }

  const { data: hospitalDoctors = [], isLoading: isLoadingHospitalDoctors } = useQuery<HospitalDoctor[], Error>({
    queryKey: ['hospitalDoctors'],
    queryFn: async () => {
      const snap = await getDocs(collection(HospitalAppDb, 'allDoctors'));
      const idsInFirestore = snap.docs.filter(doc => {
        return /^\d+$/.test(doc.id); // Only consider documents with numeric IDs, assuming they represent doctor IDs from the local database
      }).length
      console.log(idsInFirestore, 'doctors found in Hospital Firestore');

      return snap.docs.map(d => ({ id: d.id, ...d.data() } as HospitalDoctor));
    },
    staleTime: 5 * 60 * 1000,
  });
  console.log(hospitalDoctors, 'hospital doctors from Firestore');
  const form = useForm<DoctorFormValues>({
    defaultValues: {
      name: "",
      phone: "0",
      specialist_id: undefined,
      sub_specialist_id: undefined,
      cash_percentage: "0",
      company_percentage: "0",
      static_wage: "0",
      lab_percentage: "0",
      start: "0",
      calc_insurance: false,
      is_default: false,
    },
  });
  const { control, handleSubmit, reset, watch, setValue, formState } = form;
  useEffect(() => {
    if (!isEditMode && specialists && specialists.length > 0) {
      //auto select the first specialist for better UX when creating a new doctor
      setValue("specialist_id", String(specialists[0].id));
    }
  }, [isEditMode, specialists, setValue])
  useEffect(() => {
    if (isEditMode && doctorData) {
      reset({
        name: doctorData.name,
        phone: doctorData.phone,
        specialist_id: String(doctorData.specialist_id),
        cash_percentage: String(doctorData.cash_percentage),
        company_percentage: String(doctorData.company_percentage),
        static_wage: String(doctorData.static_wage),
        lab_percentage: String(doctorData.lab_percentage),
        start: String(doctorData.start),
        calc_insurance: doctorData.calc_insurance,
        is_default: Boolean((doctorData as Doctor & { is_default?: boolean }).is_default),
      });
    }
  }, [isEditMode, doctorData, reset]);

  useEffect(() => {
    console.log('Checking for hospital doctor match...', { isEditMode, doctorData, hospitalDoctors });
    if (isEditMode && doctorData?.firebase_id && hospitalDoctors.length) {
      console.log(hospitalDoctors.find(d => String(d.id) === doctorData.firebase_id) ?? null , 'Match result for firebase_id:', doctorData.firebase_id);
      setSelectedHospitalDoctor(
        hospitalDoctors.find(d => String(d.id) === doctorData.firebase_id) ?? null
      );
    }
  }, [isEditMode, doctorData, hospitalDoctors]);



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


    // Ensure numeric fields are numbers, not strings, if backend expects numbers
    const submissionData: DoctorFormData & { finanace_account_id_insurance?: string; sub_specialist_id?: string } = {
      ...data,
      specialist_id: String(data.specialist_id!),
      sub_specialist_id: data.sub_specialist_id ? String(data.sub_specialist_id) : undefined,
      cash_percentage: String(data.cash_percentage),
      company_percentage: String(data.company_percentage),
      static_wage: String(data.static_wage),
      lab_percentage: String(data.lab_percentage),
      start: String(data.start),
      // Backend column is misspelled as 'finanace_account_id_insurance'
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

  const handleFirestoreDoctorSelect = (doctor: HospitalDoctor | null) => {
    if (doctor && doctorId) {
      setSelectedHospitalDoctor(doctor);
      updateFirebaseIdMutation.mutate({
        doctorId: Number(doctorId),
        firebaseId: String(doctor.id),
      });
    }
  };
  const isLoading =
    isLoadingDoctor ||
    isLoadingSpecialists ||
    mutation.status === 'pending';

  if (isEditMode && isLoadingDoctor)
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 1 }}>جاري التحميل...</Typography>
      </Box>
    );
  return (
    <Box sx={{ height: `${containerHeight}px`, overflow: 'auto', py: 2 }}>
      <Card sx={{ maxWidth: 960, mx: 'auto' }}>
        {/* <Button   onClick={fixMistakenyFirestoreIds} >fix mistaken ids </Button> */}
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
                <TextField autoFocus={true} label="الاسم" placeholder="اسم الطبيب" {...field} />
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
                    <Select
                      labelId="specialist-label"
                      label="التخصص"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={isLoadingSpecialists || formState.isSubmitting}
                    >
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

            {isEditMode && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>ربط بطبيب (مع المنصه)</Typography>
                <DarkThemeAutocomplete
                  options={hospitalDoctors}
                  getOptionLabel={(option) => (option as HospitalDoctor).name ?? option.id}
                  value={selectedHospitalDoctor}
                  onChange={(_, newValue) => handleFirestoreDoctorSelect(newValue as HospitalDoctor | null)}
                  loading={isLoadingHospitalDoctors || updateFirebaseIdMutation.isPending}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  noOptionsText="لا توجد أطباء متاحة"
                  loadingText="جاري التحميل..."
                  disabled={updateFirebaseIdMutation.isPending}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اختر طبيب من Hospital"
                      placeholder="ابحث في الأطباء..."
                      size="small"
                      helperText="اختر طبيب لربطه بالطبيب المحلي"
                    />
                  )}
                />
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
              <Controller name="cash_percentage" control={control} render={({ field }) => (
                <TextField label="نسبة الكاش %" type="number"  {...field} />
              )} />
              <Controller name="company_percentage" control={control} render={({ field }) => (
                <TextField label="نسبة الشركات %" type="number"  {...field} />
              )} />
              <Controller name="static_wage" control={control} render={({ field }) => (
                <TextField label=" الثابت" type="number"  {...field} />
              )} />
              <Controller name="lab_percentage" control={control} render={({ field }) => (
                <TextField label="نسبة المختبر %" type="number"  {...field} />
              )} />
            </Box>

            <Controller name="start" control={control} render={({ field }) => (
              <TextField label="بداية الحساب (رقم)" type="number" {...field} />
            )} />




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
    </Box>
  );
};

export default DoctorFormPage;
