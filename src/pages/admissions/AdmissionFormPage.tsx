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
} from "@mui/material";
import {
  ArrowRight,
  Plus,
  User,
  MapPin,
  Calendar,
  Stethoscope,
  Contact,
  FileText,
  UserRound,
  Building2,
  Bed,
  DoorOpen,
  Clock,
  Activity,
  Users,
  Phone,
} from "lucide-react";
import type { AdmissionFormData } from "@/types/admissions";
import { createAdmission } from "@/services/admissionService";
import { getWardsList } from "@/services/wardService";
import { getRooms } from "@/services/roomService";
import { getAvailableBeds } from "@/services/bedService";
import { searchExistingPatients } from "@/services/patientService";
import QuickAddPatientDialog from "@/components/admissions/QuickAddPatientDialog";
import { getDoctorsList } from "@/services/doctorService";
import type { PatientSearchResult } from "@/types/patients";

type AdmissionFormValues = {
  patient_id: string;
  ward_id: string;
  room_id: string;
  bed_id: string;
  booking_type: "bed" | "room";
  admission_date: Date | null;
  admission_time: string;
  admission_type: string;
  admission_reason: string;
  diagnosis: string;
  doctor_id: string;
  specialist_doctor_id: string;
  notes: string;
  provisional_diagnosis: string;
  operations: string;
  medical_history: string;
  current_medications: string;
  referral_source: string;
  expected_discharge_date: Date | null;
  next_of_kin_name: string;
  next_of_kin_relation: string;
  next_of_kin_phone: string;
};

export default function AdmissionFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);

  const { data: wards } = useQuery({
    queryKey: ["wardsList"],
    queryFn: () => getWardsList({ status: true }),
  });

  const {
    data: rooms,
    refetch: refetchRooms,
    isFetching: isFetchingRooms,
  } = useQuery({
    queryKey: ["rooms", selectedWardId],
    queryFn: () =>
      getRooms(1, { ward_id: selectedWardId!, per_page: 1000 }).then(
        (res) => res.data,
      ),
    enabled: !!selectedWardId,
  });

  const {
    data: beds,
    refetch: refetchBeds,
    isFetching: isFetchingBeds,
  } = useQuery({
    queryKey: ["availableBeds", selectedRoomId],
    queryFn: () => getAvailableBeds({ room_id: selectedRoomId! }),
    enabled: !!selectedRoomId,
  });

  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [specialistDoctorSearchTerm, setSpecialistDoctorSearchTerm] =
    useState("");

  const { data: doctors } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const { data: patientSearchResults, isLoading: isSearchingPatients } =
    useQuery({
      queryKey: ["patientSearch", patientSearchTerm],
      queryFn: () => searchExistingPatients(patientSearchTerm),
      enabled: patientSearchTerm.length >= 2,
    });

  const form = useForm<AdmissionFormValues>({
    defaultValues: {
      patient_id: "",
      ward_id: "",
      room_id: "",
      bed_id: "",
      booking_type: "bed",
      admission_date: new Date(),
      admission_time: new Date().toTimeString().slice(0, 5),
      admission_type: "",
      admission_reason: "",
      diagnosis: "",
      doctor_id: "",
      specialist_doctor_id: "",
      notes: "",
      provisional_diagnosis: "",
      operations: "",
      medical_history: "",
      current_medications: "",
      referral_source: "",
      expected_discharge_date: null,
      next_of_kin_name: "",
      next_of_kin_relation: "",
      next_of_kin_phone: "",
    },
  });
  const { control, handleSubmit, watch, setValue } = form;

  const wardId = watch("ward_id");
  const roomId = watch("room_id");
  const bookingType = watch("booking_type");

  useEffect(() => {
    if (wardId) {
      setSelectedWardId(Number(wardId));
      setValue("room_id", "");
      setValue("bed_id", "");
      refetchRooms();
    }
  }, [wardId, setValue, refetchRooms]);

  useEffect(() => {
    if (roomId) {
      setSelectedRoomId(Number(roomId));
      setValue("bed_id", "");
      refetchBeds();
    }
  }, [roomId, setValue, refetchBeds]);

  useEffect(() => {
    if (bookingType === "room") {
      setValue("bed_id", "");
    }
  }, [bookingType, setValue]);

  const mutation = useMutation({
    mutationFn: (data: AdmissionFormData) => createAdmission(data),
    onSuccess: () => {
      toast.success("تم إضافة التنويم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      navigate("/admissions/list");
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "فشل إضافة التنويم";
      const errorDetails = error.response?.data?.errors;

      if (errorDetails?.patient_id) {
        toast.error("خطأ في بيانات المريض", {
          description: "يرجى التأكد من اختيار مريض صحيح أو إنشاء مريض جديد",
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const onSubmit = (data: AdmissionFormValues) => {
    if (!selectedPatient) return toast.error("يرجى اختيار المريض");
    if (!data.ward_id) return toast.error("يرجى اختيار القسم");
    if (!data.room_id) return toast.error("يرجى اختيار الغرفة");
    if (data.booking_type === "bed" && !data.bed_id)
      return toast.error("يرجى اختيار السرير");
    if (!data.admission_date) return toast.error("يرجى اختيار تاريخ التنويم");

    // Convert time from HH:mm to H:i:s format
    let formattedTime: string | null = null;
    if (data.admission_time) {
      // If time is in HH:mm format, add :00 for seconds
      if (data.admission_time.length === 5) {
        formattedTime = `${data.admission_time}:00`;
      } else if (data.admission_time.length === 8) {
        // Already in H:i:s format
        formattedTime = data.admission_time;
      } else {
        formattedTime = data.admission_time;
      }
    }

    const submissionData: AdmissionFormData = {
      patient_id: String(selectedPatient.patient_id),
      ward_id: data.ward_id,
      room_id: data.room_id,
      bed_id: data.booking_type === "bed" ? data.bed_id : undefined,
      booking_type: data.booking_type,
      admission_date: data.admission_date,
      admission_time: formattedTime,
      admission_type: data.admission_type || null,
      admission_reason: data.admission_reason || null,
      diagnosis: data.diagnosis || null,
      doctor_id: data.doctor_id || undefined,
      specialist_doctor_id: data.specialist_doctor_id || undefined,
      notes: data.notes || null,
      provisional_diagnosis: data.provisional_diagnosis || null,
      operations: data.operations || null,
      medical_history: data.medical_history || null,
      current_medications: data.current_medications || null,
      referral_source: data.referral_source || null,
      expected_discharge_date: data.expected_discharge_date || undefined,
      next_of_kin_name: data.next_of_kin_name || null,
      next_of_kin_relation: data.next_of_kin_relation || null,
      next_of_kin_phone: data.next_of_kin_phone || null,
    };

    console.log("Submission Data:", submissionData);
    mutation.mutate(submissionData);
  };

  return (
    <Box
      sx={{
        maxWidth: "1200px",
        mx: "auto",
        p: 3,
        height: window.innerHeight - 100,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
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
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ color: "text.primary" }}
          >
            تسجيل تنويم جديد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            قم بملء البيانات التالية لتسجيل دخول مريض جديد
          </Typography>
        </Box>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 3,
          }}
        >
          {/* Right Column: Patient & Location */}
          <Box sx={{ flex: { lg: 2, xs: 1 }, minWidth: 0 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Patient Info Section */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "primary.lighter",
                          color: "primary.main",
                          display: "flex",
                        }}
                      >
                        <User size={20} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        بيانات المريض
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Box
                    sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Autocomplete
                        options={patientSearchResults || []}
                        getOptionLabel={(option) =>
                          `${option.name} - ${option.phone || "بدون هاتف"}`
                        }
                        loading={isSearchingPatients}
                        value={selectedPatient}
                        onInputChange={(_, value) =>
                          setPatientSearchTerm(value)
                        }
                        onChange={(_, value) => {
                          console.log(value);
                          setSelectedPatient(value);
                          if (value)
                            setValue("patient_id", String(value.patient_id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="البحث عن مريض"
                            placeholder="اسم المريض أو رقم الهاتف..."
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <User
                                    size={18}
                                    style={{ marginLeft: 8, opacity: 0.5 }}
                                  />
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        noOptionsText="لا يوجد نتائج"
                      />
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={18} />}
                      onClick={() => setQuickAddDialogOpen(true)}
                      sx={{ height: 56, px: 3, whiteSpace: "nowrap" }}
                      disabled={mutation.isPending}
                    >
                      مريض جديد
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Admission Details Section */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "info.lighter",
                          color: "info.main",
                          display: "flex",
                        }}
                      >
                        <FileText size={20} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        تفاصل التنويم
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: { xs: "column", md: "row" },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="admission_date"
                          control={control}
                          rules={{ required: "تاريخ التنويم مطلوب" }}
                          render={({ field, fieldState }) => (
                            <TextField
                              fullWidth
                              label="تاريخ الدخول"
                              type="date"
                              value={
                                field.value
                                  ? field.value.toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? new Date(e.target.value)
                                    : null,
                                )
                              }
                              InputLabelProps={{ shrink: true }}
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                              disabled={mutation.isPending}
                              InputProps={{
                                startAdornment: (
                                  <Calendar
                                    size={18}
                                    style={{ marginLeft: 8, opacity: 0.5 }}
                                  />
                                ),
                              }}
                            />
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="admission_time"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="وقت الدخول"
                              type="time"
                              {...field}
                              InputLabelProps={{ shrink: true }}
                              disabled={mutation.isPending}
                              InputProps={{
                                startAdornment: (
                                  <Clock
                                    size={18}
                                    style={{ marginLeft: 8, opacity: 0.5 }}
                                  />
                                ),
                              }}
                            />
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="admission_type"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>نوع الإقامة</InputLabel>
                              <Select
                                {...field}
                                label="نوع الإقامة"
                                disabled={mutation.isPending}
                              >
                                <MenuItem value="اقامه قصيره">
                                  إقامة قصيرة (يوم واحد)
                                </MenuItem>
                                <MenuItem value="اقامه طويله">
                                  إقامة طويلة (مبيت)
                                </MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: { xs: "column", md: "row" },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="expected_discharge_date"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="تاريخ الخروج المتوقع"
                              type="date"
                              value={
                                field.value
                                  ? field.value.toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? new Date(e.target.value)
                                    : null,
                                )
                              }
                              InputLabelProps={{ shrink: true }}
                              disabled={mutation.isPending}
                            />
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="referral_source"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>جهة الإحالة</InputLabel>
                              <Select
                                {...field}
                                label="جهة الإحالة"
                                disabled={mutation.isPending}
                                startAdornment={
                                  <Building2
                                    size={18}
                                    style={{ marginLeft: 8, opacity: 0.5 }}
                                  />
                                }
                              >
                                <MenuItem value="emergency">الطوارئ</MenuItem>
                                <MenuItem value="outpatient">
                                  العيادات الخارجية
                                </MenuItem>
                                <MenuItem value="external">مستشفى آخر</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Medical Info Section */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "error.lighter",
                          color: "error.main",
                          display: "flex",
                        }}
                      >
                        <Activity size={20} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        بيانات طبية
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box sx={{ width: "100%" }}>
                      <Controller
                        name="admission_reason"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            label="سبب التنويم"
                            multiline
                            rows={2}
                            {...field}
                            disabled={mutation.isPending}
                            placeholder="وصف حالة المريض وسبب التنويم..."
                          />
                        )}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: { xs: "column", md: "row" },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="diagnosis"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="التشخيص المبدئي"
                              multiline
                              rows={3}
                              {...field}
                              disabled={mutation.isPending}
                            />
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="provisional_diagnosis"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="التشخيص المؤقت"
                              multiline
                              rows={3}
                              {...field}
                              disabled={mutation.isPending}
                            />
                          )}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ width: "100%" }}>
                      <Controller
                        name="operations"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            label="العمليات (مع التواريخ)"
                            multiline
                            rows={2}
                            {...field}
                            disabled={mutation.isPending}
                            placeholder="اسم العملية - التاريخ"
                          />
                        )}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: { xs: "column", md: "row" },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="medical_history"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="التاريخ الطبي"
                              multiline
                              rows={3}
                              {...field}
                              disabled={mutation.isPending}
                              placeholder="الأمراض السابقة والحالات الطبية..."
                            />
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Controller
                          name="current_medications"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="الأدوية الحالية"
                              multiline
                              rows={3}
                              {...field}
                              disabled={mutation.isPending}
                              placeholder="قائمة الأدوية التي يتناولها المريض..."
                            />
                          )}
                        />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Left Column: Location, Doctor, Contact */}
          <Box sx={{ flex: { lg: 1, xs: 1 }, minWidth: 0 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Location Section */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "warning.lighter",
                          color: "warning.main",
                          display: "flex",
                        }}
                      >
                        <MapPin size={20} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        الموقع
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Controller
                      name="ward_id"
                      control={control}
                      rules={{ required: "القسم مطلوب" }}
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth error={!!fieldState.error}>
                          <InputLabel>القسم</InputLabel>
                          <Select
                            {...field}
                            label="القسم"
                            disabled={mutation.isPending}
                            startAdornment={
                              <Building2
                                size={16}
                                style={{ marginLeft: 8, opacity: 0.5 }}
                              />
                            }
                          >
                            {wards?.map((ward) => (
                              <MenuItem key={ward.id} value={String(ward.id)}>
                                {ward.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />

                    <Controller
                      name="booking_type"
                      control={control}
                      rules={{ required: "نوع الحجز مطلوب" }}
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth error={!!fieldState.error}>
                          <InputLabel>نوع الحجز</InputLabel>
                          <Select
                            {...field}
                            label="نوع الحجز"
                            disabled={mutation.isPending}
                          >
                            <MenuItem value="bed">حجز عن طريق السرير</MenuItem>
                            <MenuItem value="room">حجز عن طريق الغرفة</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />

                    <Controller
                      name="room_id"
                      control={control}
                      rules={{ required: "الغرفة مطلوبة" }}
                      render={({ field, fieldState }) => (
                        <FormControl
                          fullWidth
                          error={!!fieldState.error}
                          disabled={!selectedWardId || mutation.isPending}
                        >
                          <InputLabel>الغرفة</InputLabel>
                          <Select
                            {...field}
                            label="الغرفة"
                            startAdornment={
                              <DoorOpen
                                size={16}
                                style={{ marginLeft: 8, opacity: 0.5 }}
                              />
                            }
                            endAdornment={
                              isFetchingRooms ? (
                                <CircularProgress size={20} sx={{ mr: 2 }} />
                              ) : null
                            }
                          >
                            {rooms?.map((room) => {
                              const roomTypeLabel =
                                room.room_type === "normal"
                                  ? "عادي"
                                  : room.room_type === "vip"
                                    ? "VIP"
                                    : "";
                              const roomTypeDisplay = roomTypeLabel
                                ? ` (${roomTypeLabel})`
                                : "";
                              return (
                                <MenuItem key={room.id} value={String(room.id)}>
                                  {room.room_number}
                                  {roomTypeDisplay}
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      )}
                    />

                    {watch("booking_type") === "bed" && (
                      <Controller
                        name="bed_id"
                        control={control}
                        rules={{ required: "السرير مطلوب" }}
                        render={({ field, fieldState }) => (
                          <FormControl
                            fullWidth
                            error={!!fieldState.error}
                            disabled={!selectedRoomId || mutation.isPending}
                          >
                            <InputLabel>السرير</InputLabel>
                            <Select
                              {...field}
                              label="السرير"
                              startAdornment={
                                <Bed
                                  size={16}
                                  style={{ marginLeft: 8, opacity: 0.5 }}
                                />
                              }
                              endAdornment={
                                isFetchingBeds ? (
                                  <CircularProgress size={20} sx={{ mr: 2 }} />
                                ) : null
                              }
                            >
                              {beds?.map((bed) => (
                                <MenuItem key={bed.id} value={String(bed.id)}>
                                  {bed.bed_number}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Doctor Section */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "success.lighter",
                          color: "success.main",
                          display: "flex",
                        }}
                      >
                        <Stethoscope size={20} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        الأطباء
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
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
                        <Button
                          component={Link}
                          to="/doctors/new"
                          target="_blank"
                          sx={{ minWidth: 40, px: 0 }}
                          variant="outlined"
                        >
                          <Plus size={18} />
                        </Button>
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
                        <Button
                          component={Link}
                          to="/doctors/new"
                          target="_blank"
                          sx={{ minWidth: 40, px: 0 }}
                          variant="outlined"
                        >
                          <Plus size={18} />
                        </Button>
                      </Box>
                    </Box>

                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          label="ملاحظات إضافية"
                          multiline
                          rows={3}
                          size="small"
                          {...field}
                          disabled={mutation.isPending}
                        />
                      )}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: "secondary.lighter",
                          color: "secondary.main",
                          display: "flex",
                        }}
                      >
                        <Contact size={20} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        اتصال الطوارئ
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Controller
                      name="next_of_kin_name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          size="small"
                          label="الاسم"
                          {...field}
                          disabled={mutation.isPending}
                          InputProps={{
                            startAdornment: (
                              <UserRound
                                size={16}
                                style={{ marginLeft: 8, opacity: 0.5 }}
                              />
                            ),
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="next_of_kin_relation"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          size="small"
                          label="القرابة"
                          {...field}
                          disabled={mutation.isPending}
                          InputProps={{
                            startAdornment: (
                              <Users
                                size={16}
                                style={{ marginLeft: 8, opacity: 0.5 }}
                              />
                            ),
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="next_of_kin_phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          size="small"
                          label="رقم الهاتف"
                          {...field}
                          disabled={mutation.isPending}
                          InputProps={{
                            startAdornment: (
                              <Phone
                                size={16}
                                style={{ marginLeft: 8, opacity: 0.5 }}
                              />
                            ),
                          }}
                        />
                      )}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
            mt: 2,
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => navigate(-1)}
            disabled={mutation.isPending}
            sx={{ px: 4 }}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={mutation.isPending || !selectedPatient}
            sx={{ px: 6 }}
          >
            {mutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "حفظ التنويم"
            )}
          </Button>
        </Box>
      </Box>

      {/* Quick Add Patient Dialog */}
      <QuickAddPatientDialog
        open={quickAddDialogOpen}
        onClose={() => setQuickAddDialogOpen(false)}
        onPatientAdded={(patient) => {
          setSelectedPatient(patient);
          setValue("patient_id", String(patient.id));
        }}
      />
    </Box>
  );
}
