// src/components/doctors/EditDoctorDialog.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  createFilterOptions,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import { toast } from "sonner";

import type { DoctorFormData, Specialist } from "@/types/doctors";
import {
  updateDoctor,
  getDoctorById,
  getSpecialistsList,
  updateDoctorFirebaseId,
} from "@/services/doctorService";
import AddSpecialistDialog from "@/components/doctors/AddSpecialistDialog";
import { getDocs, collection } from "firebase/firestore";
import { firestoreDb as HospitalAppDb } from "@/lib/firebase_hospital";

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
  cash_percentage: string;
  company_percentage: string;
  static_wage: string;
  lab_percentage: string;
  start: string;
  calc_insurance: boolean;
  is_default?: boolean;
}

const hospitalDoctorFilter = createFilterOptions<HospitalDoctor>({
  stringify: (option) => `${option.name ?? ""} ${option.id}`,
});

interface EditDoctorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: number | null;
}

const EditDoctorDialog: React.FC<EditDoctorDialogProps> = ({ isOpen, onOpenChange, doctorId }) => {
  const queryClient = useQueryClient();
  const [selectedHospitalDoctor, setSelectedHospitalDoctor] = useState<HospitalDoctor | null>(null);

  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery<Specialist[], Error>({
    queryKey: ["specialistsList"],
    queryFn: getSpecialistsList,
    enabled: isOpen,
  });

  const { data: doctorData, isLoading: isLoadingDoctor } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => getDoctorById(Number(doctorId)).then((res) => res.data),
    enabled: isOpen && !!doctorId,
  });

  const { data: hospitalDoctors = [], isLoading: isLoadingHospitalDoctors } = useQuery<HospitalDoctor[], Error>({
    queryKey: ["hospitalDoctors"],
    queryFn: async () => {
      const snap = await getDocs(collection(HospitalAppDb, "allDoctors"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HospitalDoctor));
    },
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  const { control, handleSubmit, reset, setValue, formState } = useForm<DoctorFormValues>({
    defaultValues: {
      name: "",
      phone: "0",
      specialist_id: undefined,
      cash_percentage: "0",
      company_percentage: "0",
      static_wage: "0",
      lab_percentage: "0",
      start: "0",
      calc_insurance: false,
      is_default: false,
    },
  });

  useEffect(() => {
    if (isOpen && doctorData) {
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
        is_default: Boolean(doctorData.is_default),
      });
    }
  }, [isOpen, doctorData, reset]);

  useEffect(() => {
    if (isOpen && doctorData?.firebase_id && hospitalDoctors.length) {
      setSelectedHospitalDoctor(
        hospitalDoctors.find((d) => String(d.id) === doctorData.firebase_id) ?? null,
      );
    } else if (!isOpen) {
      setSelectedHospitalDoctor(null);
    }
  }, [isOpen, doctorData, hospitalDoctors]);

  const mutation = useMutation({
    mutationFn: (data: DoctorFormData) => updateDoctor(Number(doctorId), data),
    onSuccess: () => {
      toast.success("تم حفظ بيانات الطبيب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      let respMessage: string | undefined;
      if (typeof error === "object" && error) {
        respMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      }
      const fallback = (error as { message?: string })?.message;
      toast.error(respMessage || fallback || "فشل حفظ بيانات الطبيب");
    },
  });

  const updateFirebaseIdMutation = useMutation({
    mutationFn: ({ doctorId: id, firebaseId }: { doctorId: number; firebaseId: string }) =>
      updateDoctorFirebaseId(id, firebaseId),
    onSuccess: () => {
      toast.success("تم ربط الطبيب بـ Firestore بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "فشل ربط الطبيب بـ Firestore.");
    },
  });

  const onSubmit = (data: DoctorFormValues) => {
    const submissionData: DoctorFormData = {
      ...data,
      specialist_id: String(data.specialist_id!),
      cash_percentage: String(data.cash_percentage),
      company_percentage: String(data.company_percentage),
      static_wage: String(data.static_wage),
      lab_percentage: String(data.lab_percentage),
      start: String(data.start),
      is_default: data.is_default ?? false,
    };
    mutation.mutate(submissionData);
  };

  const handleSpecialistAdded = (newSpecialist: Specialist) => {
    setValue("specialist_id", String(newSpecialist.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
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

  const isSaving = mutation.isPending;

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="md" dir="rtl">
      <DialogTitle>تعديل طبيب</DialogTitle>
      <DialogContent dividers>
        {isLoadingDoctor ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 6, gap: 1 }}>
            <CircularProgress size={24} />
            <Typography>جاري التحميل...</Typography>
          </Box>
        ) : (
          <Box
            component="form"
            id="edit-doctor-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField autoFocus label="الاسم" placeholder="اسم الطبيب" size="small" {...field} />
              )} />
              <Controller name="phone" control={control} render={({ field }) => (
                <TextField label="الهاتف" type="tel" placeholder="رقم الهاتف" size="small" {...field} />
              )} />
            </Box>

            <Controller name="specialist_id" control={control} render={({ field, fieldState }) => (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="edit-doctor-specialist-label">التخصص</InputLabel>
                    <Select
                      labelId="edit-doctor-specialist-label"
                      label="التخصص"
                      value={field.value ?? ""}
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
                  </FormControl>
                  <AddSpecialistDialog onSpecialistAdded={handleSpecialistAdded} />
                </Box>
                {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
              </Box>
            )} />

            {/* <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>ربط بطبيب (مع المنصه)</Typography>
              <Autocomplete
                options={hospitalDoctors}
                getOptionLabel={(option) => option.name ?? option.id}
                filterOptions={hospitalDoctorFilter}
                value={selectedHospitalDoctor}
                onChange={(_, newValue) => handleFirestoreDoctorSelect(newValue)}
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
                    helperText={selectedHospitalDoctor ? `Firebase ID: ${selectedHospitalDoctor.id}` : "اختر طبيب لربطه بالطبيب المحلي"}
                  />
                )}
              />
            </Box> */}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr 1fr" }, gap: 2 }}>
              <Controller name="cash_percentage" control={control} render={({ field }) => (
                <TextField label="نسبة الكاش %" type="number" size="small" {...field} />
              )} />
              <Controller name="company_percentage" control={control} render={({ field }) => (
                <TextField label="نسبة الشركات %" type="number" size="small" {...field} />
              )} />
              <Controller name="static_wage" control={control} render={({ field }) => (
                <TextField label="الثابت" type="number" size="small" {...field} />
              )} />
              {/* <Controller name="lab_percentage" control={control} render={({ field }) => (
                <TextField label="نسبة المختبر %" type="number" size="small" {...field} />
              )} /> */}
            </Box>

            {/* <Controller name="start" control={control} render={({ field }) => (
              <TextField label="بداية الحساب (رقم)" type="number" size="small" {...field} />
            )} /> */}

            <Controller name="calc_insurance" control={control} render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                label="حساب التأمين ضمن النسبة؟"
              />
            )} />

            <Controller name="is_default" control={control} render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={!!field.value} onChange={(_, checked) => field.onChange(checked)} />}
                label="تعيين كطبيب افتراضي"
              />
            )} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onOpenChange(false)} disabled={isSaving}>
          إلغاء
        </Button>
        <Button
          type="submit"
          form="edit-doctor-form"
          variant="contained"
          disabled={isSaving || isLoadingDoctor}
          startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDoctorDialog;
