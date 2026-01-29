import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import type { Admission } from "@/types/admissions";
import type { AdmissionFormData } from "@/types/admissions";
import { updateAdmission } from "@/services/admissionService";
import { getWardsList } from "@/services/wardService";
import { getRooms } from "@/services/roomService";
import { getAvailableBeds } from "@/services/bedService";
import { getDoctorsList } from "@/services/doctorService";

interface AdmissionOverviewTabProps {
  admission: Admission;
}

type AdmissionFormValues = {
  ward_id: string;
  room_id: string;
  bed_id: string;
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

export default function AdmissionOverviewTab({
  admission,
}: AdmissionOverviewTabProps) {
  const queryClient = useQueryClient();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(
    admission.ward?.id || null,
  );
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    admission.room?.id || null,
  );
  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [specialistDoctorSearchTerm, setSpecialistDoctorSearchTerm] =
    useState("");

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

  const { data: doctors } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const form = useForm<AdmissionFormValues>({
    defaultValues: {
      ward_id: admission.ward?.id ? String(admission.ward.id) : "",
      room_id: admission.room?.id ? String(admission.room.id) : "",
      bed_id: admission.bed?.id ? String(admission.bed.id) : "",
      admission_date: admission.admission_date
        ? new Date(admission.admission_date)
        : null,
      admission_time: admission.admission_time || "",
      admission_type: admission.admission_type || "",
      admission_reason: admission.admission_reason || "",
      diagnosis: admission.diagnosis || "",
      doctor_id: admission.doctor?.id ? String(admission.doctor.id) : "",
      specialist_doctor_id: admission.specialist_doctor?.id
        ? String(admission.specialist_doctor.id)
        : "",
      notes: admission.notes || "",
      provisional_diagnosis: admission.provisional_diagnosis || "",
      operations: admission.operations || "",
      medical_history: admission.medical_history || "",
      current_medications: admission.current_medications || "",
      referral_source: admission.referral_source || "",
      expected_discharge_date: admission.expected_discharge_date
        ? new Date(admission.expected_discharge_date)
        : null,
      next_of_kin_name: admission.next_of_kin_name || "",
      next_of_kin_relation: admission.next_of_kin_relation || "",
      next_of_kin_phone: admission.next_of_kin_phone || "",
    },
  });

  const { control, handleSubmit, watch, setValue, reset } = form;

  const wardId = watch("ward_id");
  const roomId = watch("room_id");

  useEffect(() => {
    if (wardId && wardId !== String(admission.ward?.id)) {
      setSelectedWardId(Number(wardId));
      setValue("room_id", "");
      setValue("bed_id", "");
      refetchRooms();
    }
  }, [wardId, setValue, refetchRooms, admission.ward?.id]);

  useEffect(() => {
    if (roomId && roomId !== String(admission.room?.id)) {
      setSelectedRoomId(Number(roomId));
      setValue("bed_id", "");
      refetchBeds();
    }
  }, [roomId, setValue, refetchBeds, admission.room?.id]);

  const mutation = useMutation({
    mutationFn: (data: Partial<AdmissionFormData>) =>
      updateAdmission(admission.id, data),
    onSuccess: () => {
      toast.success("تم تحديث التنويم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admission", admission.id] });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "فشل تحديث التنويم";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: AdmissionFormValues) => {
    if (!data.ward_id) return toast.error("يرجى اختيار القسم");
    if (!data.room_id) return toast.error("يرجى اختيار الغرفة");
    if (!data.bed_id) return toast.error("يرجى اختيار السرير");
    if (!data.admission_date) return toast.error("يرجى اختيار تاريخ التنويم");

    // Convert time from HH:mm to H:i:s format
    let formattedTime: string | null = null;
    if (data.admission_time) {
      if (data.admission_time.length === 5) {
        formattedTime = `${data.admission_time}:00`;
      } else if (data.admission_time.length === 8) {
        formattedTime = data.admission_time;
      } else {
        formattedTime = data.admission_time;
      }
    }

    const submissionData: Partial<AdmissionFormData> = {
      ward_id: data.ward_id,
      room_id: data.room_id,
      bed_id: data.bed_id,
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

    mutation.mutate(submissionData);
  };

  const handleCancel = () => {
    reset();
  };

  return (
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
        {/* Right Column */}
        <Box sx={{ flex: { lg: 2, xs: 1 }, minWidth: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Admission Details Section */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
                      تفاصيل التنويم
                    </Typography>
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <CardContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

        {/* Left Column */}
        <Box sx={{ flex: { lg: 1, xs: 1 }, minWidth: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Location Section */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                </Box>
              </CardContent>
            </Card>

            {/* Doctor Section */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 0.5, display: "block" }}
                    >
                      الطبيب المعالج
                    </Typography>
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
                            field.onChange(newValue ? String(newValue.id) : "");
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

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 0.5, display: "block" }}
                    >
                      الطبيب الأخصائي
                    </Typography>
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
                            field.onChange(newValue ? String(newValue.id) : "");
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
          pt: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleCancel}
          disabled={mutation.isPending}
          sx={{ px: 4 }}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={mutation.isPending}
          sx={{ px: 6 }}
        >
          {mutation.isPending ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "حفظ التعديلات"
          )}
        </Button>
      </Box>
    </Box>
  );
}
