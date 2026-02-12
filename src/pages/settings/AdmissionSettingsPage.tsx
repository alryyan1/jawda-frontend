import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { Clock } from "lucide-react";
import {
  getAdmissionSettings,
  updateAdmissionSettings,
} from "@/services/admissionSettingService";
import type { AdmissionSetting, AdmissionSettingFormData } from "@/types/admissionSettings";

const defaultValues: AdmissionSettingFormData = {
  morning_start: "07:00",
  morning_end: "12:00",
  evening_start: "13:00",
  evening_end: "06:00",
  full_day_boundary: "12:00",
  default_period_start: "06:00",
  default_period_end: "07:00",
};

export default function AdmissionSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery<AdmissionSetting>({
    queryKey: ["admissionSettings"],
    queryFn: getAdmissionSettings,
  });

  const { control, handleSubmit, reset } = useForm<AdmissionSettingFormData>({
    defaultValues,
  });

  useEffect(() => {
    if (settings) {
      reset({
        morning_start: settings.morning_start?.slice(0, 5) ?? defaultValues.morning_start,
        morning_end: settings.morning_end?.slice(0, 5) ?? defaultValues.morning_end,
        evening_start: settings.evening_start?.slice(0, 5) ?? defaultValues.evening_start,
        evening_end: settings.evening_end?.slice(0, 5) ?? defaultValues.evening_end,
        full_day_boundary: settings.full_day_boundary?.slice(0, 5) ?? defaultValues.full_day_boundary,
        default_period_start: settings.default_period_start?.slice(0, 5) ?? defaultValues.default_period_start,
        default_period_end: settings.default_period_end?.slice(0, 5) ?? defaultValues.default_period_end,
      });
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: AdmissionSettingFormData) => updateAdmissionSettings(data),
    onSuccess: () => {
      toast.success("تم تحديث إعدادات احتساب رسوم التنويم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissionSettings"] });
    },
    onError: (error: unknown) => {
      const msg = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(msg || "فشل تحديث الإعدادات");
    },
  });

  const onSubmit = (data: AdmissionSettingFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Clock size={28} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          إعدادات احتساب رسوم التنويم
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        تحديد الفترات الزمنية المستخدمة في احتساب عدد أيام الإقامة ورسوم التنويم. يتم تطبيق هذه القواعد تلقائياً عند فتح صفحة حساب التنويم.
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="نظام الـ 24 ساعة (الدخول الصباحي)"
            subheader="إذا دخل المريض بين وقت البداية والنهاية، يُحتسب يومه بعد 24 ساعة من وقت الدخول (مثال: دخل 9:00 ص → ينتهي يومه 9:00 ص اليوم التالي)."
          />
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Controller
                name="morning_start"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="بداية الفترة (ص)"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
              <Controller
                name="morning_end"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="نهاية الفترة (ظ)"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="نظام اليوم الكامل (الدخول المسائي/المتأخر)"
            subheader="إذا دخل المريض من بداية الفترة حتى نهاية الفترة (من 1 ظ حتى 6 ص اليوم التالي)، يومه ينتهي حكماً عند وقت «حد انتهاء اليوم» من اليوم التالي (مثال: دخل 4 عصراً → عند 12 ظهر اليوم التالي يُعتبر أتمّ يوماً كاملاً)."
          />
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
              <Controller
                name="evening_start"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="بداية الفترة المسائية"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
              <Controller
                name="evening_end"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="نهاية الفترة (صباح اليوم التالي)"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
              <Controller
                name="full_day_boundary"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="حد انتهاء اليوم (ظهر)"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="الفترة الافتراضية (6:00 ص – 7:00 ص)"
            subheader="إذا دخل المريض بين وقت البداية والنهاية، يتم احتساب المدة بالطريقة التقليدية: عدد الأيام بين تاريخ الدخول والخروج + 1 (يوم واحد على الأقل)."
          />
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Controller
                name="default_period_start"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="بداية الفترة الافتراضية"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
              <Controller
                name="default_period_end"
                control={control}
                rules={{ required: "مطلوب" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="نهاية الفترة الافتراضية"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    size="small"
                    sx={{ minWidth: 140 }}
                  />
                )}
              />
            </Box>
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="contained"
          disabled={updateMutation.isPending}
          startIcon={updateMutation.isPending ? <CircularProgress size={18} /> : null}
        >
          {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </form>
    </Box>
  );
}
