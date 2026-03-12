import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  ArrowRight,
  Plus,
  Stethoscope,
  Contact,
  FileText,
  Activity,
  Bed,
} from "lucide-react";
import type { Admission, AdmissionFormData, AdmissionPurpose } from "@/types/admissions";
import { createAdmission, getAdmissionById, updateAdmission } from "@/services/admissionService";
import BedMap from "@/components/admissions/BedMap";
import { getDoctorsList } from "@/services/doctorService";
import type { PatientSearchResult } from "@/types/patients";

type AdmissionFormValues = {
  patient_id: string;
  bed_id: string;
  admission_days: string;
  admission_purpose: string;
  admission_reason: string;
  diagnosis: string;
  doctor_id: string;
  specialist_doctor_id: string;
  notes: string;
  provisional_diagnosis: string;
  operations: string;
  medical_history: string;
  current_medications: string;
  next_of_kin_name: string;
  next_of_kin_relation: string;
  next_of_kin_phone: string;
};

export interface AdmissionFormPageProps {
  embedded?: boolean;
  /** When set, form loads in edit mode (fetch admission and call update on submit). */
  admissionId?: number | null;
  initialPatient?: PatientSearchResult | null;
  initialBedId?: number | null;
  initialBedSummary?: string | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

function admissionToFormValues(a: Admission): AdmissionFormValues {
  return {
    patient_id: String(a.patient_id),
    bed_id: a.bed_id != null ? String(a.bed_id) : "",
    admission_days: a.admission_days != null ? String(a.admission_days) : "",
    admission_purpose: a.admission_purpose ?? "",
    admission_reason: a.admission_reason ?? "",
    diagnosis: a.diagnosis ?? "",
    doctor_id: a.doctor_id != null ? String(a.doctor_id) : "",
    specialist_doctor_id: a.specialist_doctor_id != null ? String(a.specialist_doctor_id) : "",
    notes: a.notes ?? "",
    provisional_diagnosis: a.provisional_diagnosis ?? "",
    operations: a.operations ?? "",
    medical_history: a.medical_history ?? "",
    current_medications: a.current_medications ?? "",
    next_of_kin_name: a.next_of_kin_name ?? "",
    next_of_kin_relation: a.next_of_kin_relation ?? "",
    next_of_kin_phone: a.next_of_kin_phone ?? "",
  };
}

export default function AdmissionFormPage(props: AdmissionFormPageProps = {}) {
  const { embedded, admissionId, initialPatient, initialBedId, initialBedSummary, onSuccess, onClose } = props;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bedMapOpen, setBedMapOpen] = useState(false);
  const [selectedBedSummary, setSelectedBedSummary] = useState<string | null>(
    null,
  );

  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [specialistDoctorSearchTerm, setSpecialistDoctorSearchTerm] =
    useState("");

  const isEditMode = admissionId != null && admissionId > 0;

  const { data: admissionData, isLoading: isLoadingAdmission } = useQuery({
    queryKey: ["admission", admissionId],
    queryFn: () => getAdmissionById(admissionId!).then((r) => r.data),
    enabled: isEditMode && !!admissionId,
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const form = useForm<AdmissionFormValues>({
    defaultValues: {
      patient_id: "",
      bed_id: "",
      admission_days: "",
      admission_purpose: "",
      admission_reason: "",
      diagnosis: "",
      doctor_id: "",
      specialist_doctor_id: "",
      notes: "",
      provisional_diagnosis: "",
      operations: "",
      medical_history: "",
      current_medications: "",
      next_of_kin_name: "",
      next_of_kin_relation: "",
      next_of_kin_phone: "",
    },
  });
  const { control, handleSubmit, watch, setValue } = form;

  useEffect(() => {
    if (embedded && initialPatient && !isEditMode) {
      setValue("patient_id", String(initialPatient.patient_id ?? initialPatient.id));
    }
  }, [embedded, initialPatient, isEditMode, setValue]);

  useEffect(() => {
    if (embedded && initialBedId != null && !isEditMode) {
      setValue("bed_id", String(initialBedId));
      setSelectedBedSummary(initialBedSummary ?? null);
    }
  }, [embedded, initialBedId, initialBedSummary, isEditMode, setValue]);

  // Populate form when editing an existing admission
  useEffect(() => {
    if (!admissionData || !isEditMode) return;
    const values = admissionToFormValues(admissionData);
    Object.entries(values).forEach(([key, value]) => {
      setValue(key as keyof AdmissionFormValues, value);
    });
    if (admissionData.bed) {
      const parts = [
        admissionData.ward?.name,
        admissionData.room?.room_number != null ? `غرفة ${admissionData.room.room_number}` : null,
        admissionData.bed?.bed_number != null ? `سرير ${admissionData.bed.bed_number}` : null,
      ].filter(Boolean);
      setSelectedBedSummary(parts.length > 0 ? parts.join(" - ") : null);
    }
  }, [admissionData, isEditMode, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: AdmissionFormData) => {
      if (isEditMode && admissionId) {
        return updateAdmission(admissionId, data);
      }
      return createAdmission(data);
    },
    onSuccess: () => {
      toast.success(isEditMode ? "تم تحديث ملف التنويم بنجاح" : "تم إضافة التنويم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      if (admissionId) queryClient.invalidateQueries({ queryKey: ["admission", admissionId] });
      if (embedded && onSuccess) {
        onSuccess();
      } else {
        navigate("/admissions/list");
      }
    },
    onError: (error: {
      response?: {
        data?: { message?: string; errors?: { patient_id?: string } };
      };
    }) => {
      const errorMessage = error.response?.data?.message || (isEditMode ? "فشل تحديث ملف التنويم" : "فشل إضافة التنويم");
      const errorDetails = error.response?.data?.errors;

      if (errorDetails?.patient_id) {
        toast.error("خطأ في بيانات المريض", {
          description: "يرجى التأكد من اختيار مريض صحيح",
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const onSubmit = (data: AdmissionFormValues) => {
    if (!data.patient_id) return toast.error("يرجى اختيار المريض");

    const submissionData: AdmissionFormData = {
      patient_id: String(data.patient_id),
      bed_id: data.bed_id,
      admission_days: data.admission_days ? parseInt(data.admission_days, 10) : undefined,
      admission_purpose: (data.admission_purpose || undefined) as AdmissionPurpose | undefined,
      admission_reason: data.admission_reason || null,
      diagnosis: data.diagnosis || null,
      doctor_id: data.doctor_id || undefined,
      specialist_doctor_id: data.specialist_doctor_id || undefined,
      notes: data.notes || null,
      provisional_diagnosis: data.provisional_diagnosis || null,
      operations: data.operations || null,
      medical_history: data.medical_history || null,
      current_medications: data.current_medications || null,
      next_of_kin_name: data.next_of_kin_name || null,
      next_of_kin_relation: data.next_of_kin_relation || null,
      next_of_kin_phone: data.next_of_kin_phone || null,
    };

    console.log("Submission Data:", submissionData);
    mutation.mutate(submissionData);
  };

  if (isEditMode && isLoadingAdmission) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: embedded ? "100%" : "1000px",
        mx: embedded ? 0 : "auto",
        p: embedded ? 0 : 1,
        height: embedded ? "auto" : window.innerHeight - 100,
        overflowY: "auto",
      }}
    >
      {/* Header - hide when embedded (dialog has its own title/close) */}
      {!embedded && (
        <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            onClick={() => navigate(-1)}
            variant="outlined"
            sx={{
              minWidth: 40,
              width: 40,
              height: 40,
              borderRadius: "50%",
              p: 0,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "primary.main", color: "primary.main" },
            }}
          >
            <ArrowRight size={20} />
          </Button>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: "text.primary" }}>
              {isEditMode ? "تعديل ملف التنويم" : "ملف تنويم جديد"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode ? "تعديل بيانات ملف التنويم" : "قم بملء البيانات التالية لتسجيل ملف تنويم جديد"}
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 1.5,
          }}
        >
          {/* Right Column: Patient & Location */}
          <Box sx={{ flex: { lg: 2, xs: 1 }, minWidth: 0 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {/* Bed selection: only when not embedded (when embedded, bed is set from registration page) */}
              {!embedded && (
                <Controller
                  name="bed_id"
                  control={control}
                  render={({ fieldState }) => (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<Bed size={20} />}
                        onClick={() => setBedMapOpen(true)}
                        disabled={mutation.isPending}
                        color={fieldState.error ? "error" : "primary"}
                        sx={{ minWidth: 140 }}
                      >
                        اختر السرير
                      </Button>
                      {selectedBedSummary && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {selectedBedSummary}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => {
                              setValue("bed_id", "");
                              setSelectedBedSummary(null);
                            }}
                          >
                            تغيير السرير
                          </Button>
                        </>
                      )}
                      {fieldState.error && (
                        <Typography variant="caption" color="error">
                          {fieldState.error.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                />
              )}

              {/* Admission Details Section */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "info.lighter", color: "info.main", display: "flex" }}>
                        <FileText size={18} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={600}>تفاصيل التنويم</Typography>
                    </Box>
                  }
                  sx={{ py: 0.75, px: 1.5, "& .MuiCardHeader-content": { minWidth: 0 } }}
                />
                <CardContent sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 1.5, flexDirection: { xs: "column", sm: "row" } }}>
                    <Controller
                      name="admission_days"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 1, step: 1 }}
                          label="عدد أيام التنويم"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          disabled={mutation.isPending}
                        />
                      )}
                    />
                    <Controller
                      name="admission_purpose"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small">
                          <InputLabel>الغرض من التنويم</InputLabel>
                          <Select {...field} label="الغرض من التنويم" disabled={mutation.isPending}>
                            <MenuItem value="surgery">عملية جراحية</MenuItem>
                            <MenuItem value="follow_up">متابعة</MenuItem>
                            <MenuItem value="intermediate_care">عناية وسيطة</MenuItem>
                            <MenuItem value="intensive_care">عناية مكثفة</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Medical Info Section */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "error.lighter", color: "error.main", display: "flex" }}>
                        <Activity size={18} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={600}>بيانات طبية</Typography>
                    </Box>
                  }
                  sx={{ py: 0.75, px: 1.5, "& .MuiCardHeader-content": { minWidth: 0 } }}
                />
                <CardContent sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Controller
                      name="admission_reason"
                      control={control}
                      render={({ field }) => (
                        <TextField fullWidth size="small" label="سبب التنويم" multiline rows={1} {...field} disabled={mutation.isPending} placeholder="وصف حالة المريض وسبب التنويم..." />
                      )}
                    />
                    <Box sx={{ display: "flex", gap: 1.5, flexDirection: { xs: "column", md: "row" } }}>
                      <Controller name="diagnosis" control={control} render={({ field }) => (
                        <TextField fullWidth size="small" label="التشخيص المبدئي" multiline rows={2} {...field} disabled={mutation.isPending} sx={{ flex: 1 }} />
                      )} />
                      <Controller name="provisional_diagnosis" control={control} render={({ field }) => (
                        <TextField fullWidth size="small" label="التشخيص المؤقت" multiline rows={2} {...field} disabled={mutation.isPending} sx={{ flex: 1 }} />
                      )} />
                    </Box>
                    <Controller name="operations" control={control} render={({ field }) => (
                      <TextField fullWidth size="small" label="العمليات (مع التواريخ)" multiline rows={1} {...field} disabled={mutation.isPending} placeholder="اسم العملية - التاريخ" />
                    )} />
                    <Box sx={{ display: "flex", gap: 1.5, flexDirection: { xs: "column", md: "row" } }}>
                      <Controller name="medical_history" control={control} render={({ field }) => (
                        <TextField fullWidth size="small" label="التاريخ الطبي" multiline rows={2} {...field} disabled={mutation.isPending} placeholder="الأمراض السابقة..." sx={{ flex: 1 }} />
                      )} />
                      <Controller name="current_medications" control={control} render={({ field }) => (
                        <TextField fullWidth size="small" label="الأدوية الحالية" multiline rows={2} {...field} disabled={mutation.isPending} placeholder="الأدوية الحالية..." sx={{ flex: 1 }} />
                      )} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Left Column: Doctor, Contact */}
          <Box sx={{ flex: { lg: 1, xs: 1 }, minWidth: 0 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {/* Doctor Section */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "success.lighter", color: "success.main", display: "flex" }}>
                        <Stethoscope size={18} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={600}>الأطباء</Typography>
                    </Box>
                  }
                  sx={{ py: 0.75, px: 1.5, "& .MuiCardHeader-content": { minWidth: 0 } }}
                />
                <CardContent sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        الطبيب المعالج
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Controller
                          name="doctor_id"
                          control={control}
                          render={({ field }) => (
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={doctors || []}
                              getOptionLabel={(option) => option.name || ""}
                              value={
                                doctors?.find(
                                  (d) => String(d.id) === field.value,
                                ) || null
                              }
                              onChange={(_, newValue) => {
                                field.onChange(
                                  newValue ? String(newValue.id) : "",
                                );
                              }}
                              onInputChange={(_, value) =>
                                setDoctorSearchTerm(value)
                              }
                              inputValue={doctorSearchTerm}
                              disabled={mutation.isPending}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="بحث..." />
                              )}
                              noOptionsText="لا يوجد أطباء"
                            />
                          )}
                        />
                     
                      </Box>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        الطبيب الأخصائي
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Controller
                          name="specialist_doctor_id"
                          control={control}
                          render={({ field }) => (
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={doctors || []}
                              getOptionLabel={(option) => option.name || ""}
                              value={
                                doctors?.find(
                                  (d) => String(d.id) === field.value,
                                ) || null
                              }
                              onChange={(_, newValue) => {
                                field.onChange(
                                  newValue ? String(newValue.id) : "",
                                );
                              }}
                              onInputChange={(_, value) =>
                                setSpecialistDoctorSearchTerm(value)
                              }
                              inputValue={specialistDoctorSearchTerm}
                              disabled={mutation.isPending}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="بحث..." />
                              )}
                              noOptionsText="لا يوجد أطباء"
                            />
                          )}
                        />
                    
                      </Box>
                    </Box>

                    <Controller name="notes" control={control} render={({ field }) => (
                      <TextField fullWidth size="small" label="ملاحظات إضافية" multiline rows={2} {...field} disabled={mutation.isPending} />
                    )} />
                  </Box>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "secondary.lighter", color: "secondary.main", display: "flex" }}>
                        <Contact size={18} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={600}>اتصال الطوارئ</Typography>
                    </Box>
                  }
                  sx={{ py: 0.75, px: 1.5, "& .MuiCardHeader-content": { minWidth: 0 } }}
                />
                <CardContent sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Controller name="next_of_kin_name" control={control} render={({ field }) => (
                      <TextField fullWidth size="small" label="الاسم" {...field} disabled={mutation.isPending} />
                    )} />
                    <Controller name="next_of_kin_relation" control={control} render={({ field }) => (
                      <TextField fullWidth size="small" label="القرابة" {...field} disabled={mutation.isPending} />
                    )} />
                    <Controller name="next_of_kin_phone" control={control} render={({ field }) => (
                      <TextField fullWidth size="small" label="رقم الهاتف" {...field} disabled={mutation.isPending} />
                    )} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Button variant="outlined" color="inherit" size="medium" onClick={() => (embedded && onClose ? onClose() : navigate(-1))} disabled={mutation.isPending} sx={{ px: 3 }}>
            إلغاء
          </Button>
          <Button type="submit" variant="contained" size="medium" disabled={mutation.isPending || (!isEditMode && !watch("patient_id"))} sx={{ px: 4 }}>
            {mutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : isEditMode ? (
              "تحديث ملف التنويم"
            ) : (
              "حفظ ملف التنويم"
            )}
          </Button>
        </Box>
      </Box>

      {/* BedMap Dialog: only when not embedded */}
      {!embedded && (
        <Dialog
          open={bedMapOpen}
          onClose={() => setBedMapOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle>اختر السرير</DialogTitle>
          <DialogContent>
            <BedMap
              selectedBedId={watch("bed_id") ? Number(watch("bed_id")) : null}
              onSelectBed={(selection) => {
                setValue("bed_id", String(selection.id));
                const summary = [
                  selection.wardName,
                  selection.room?.room_number != null
                    ? `غرفة ${selection.room.room_number}`
                    : "",
                  `سرير ${selection.bed_number}`,
                ]
                  .filter(Boolean)
                  .join(" - ");
                setSelectedBedSummary(summary);
                setBedMapOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
