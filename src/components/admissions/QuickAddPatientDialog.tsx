import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  InputAdornment,
  IconButton,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { User, Phone, Wallet, Heart, X, Activity, Baby } from "lucide-react";
import { registerNewPatient } from "@/services/patientService";
import { getDoctorsList } from "@/services/doctorService";
import type { PatientFormData, PatientSearchResult } from "@/types/patients";

interface QuickAddPatientDialogProps {
  open: boolean;
  onClose: () => void;
  onPatientAdded: (patient: PatientSearchResult) => void;
}

export default function QuickAddPatientDialog({
  open,
  onClose,
  onPatientAdded,
}: QuickAddPatientDialogProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [quickAddFormData, setQuickAddFormData] = useState({
    name: "",
    phone: "",
    dob: "",
    gender: "" as "male" | "female" | "",
    age_year: "",
    age_month: "",
    age_day: "",
    income_source: "",
    social_status: "",
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const quickAddPatientMutation = useMutation({
    mutationFn: async (data: Partial<PatientFormData>) => {
      const firstDoctor = doctors?.[0];
      if (!firstDoctor) {
        throw new Error("لا يوجد أطباء متاحين");
      }

      const patientData: PatientFormData = {
        name: data.name!,
        phone: data.phone!,
        dob: data.dob ? new Date(data.dob) : null,
        gender: data.gender as "male" | "female",
        age_year: data.age_year ? Number(data.age_year) : null,
        age_month: data.age_month ? Number(data.age_month) : null,
        age_day: data.age_day ? Number(data.age_day) : null,
        doctor_id: firstDoctor.id,
        doctor_shift_id: 1,
        income_source: data.income_source || null,
        social_status:
          (data.social_status as
            | "single"
            | "married"
            | "widowed"
            | "divorced"
            | null) || null,
      };

      return registerNewPatient(patientData);
    },
    onSuccess: (patient) => {
      console.log(patient,'patient');
      toast.success("تم إضافة المريض بنجاح");
      const patientResult: PatientSearchResult = {
        id: patient.id,
        name: patient.name,
        phone: patient.phone || null,
        gender: patient.gender,
        age_year: patient.age_year || null,
        patient_id: patient.id,
      };

      onPatientAdded(patientResult);
      onClose();

      setQuickAddFormData({
        name: "",
        phone: "",
        dob: "",
        gender: "",
        age_year: "",
        age_month: "",
        age_day: "",
        income_source: "",
        social_status: "",
      });
      queryClient.invalidateQueries({ queryKey: ["patientSearch"] });
    },
    onError: (error) => {
      console.log(error,'error');
      toast.error(" حدث خطأ أثناء إضافة المريض " + error.message);
    },
  });

  const handleQuickAddSubmit = () => {
    if (
      !quickAddFormData.name ||
      !quickAddFormData.phone ||
      !quickAddFormData.gender
    ) {
      toast.error("يرجى إدخال الاسم والهاتف والنوع");
      return;
    }
    const patientData: PatientFormData = {
      name: quickAddFormData.name,
      phone: quickAddFormData.phone,
      dob: quickAddFormData.dob ? new Date(quickAddFormData.dob) : null,
      gender: quickAddFormData.gender as "male" | "female",
      age_year: quickAddFormData.age_year
        ? Number(quickAddFormData.age_year)
        : null,
      age_month: quickAddFormData.age_month
        ? Number(quickAddFormData.age_month)
        : null,
      age_day: quickAddFormData.age_day
        ? Number(quickAddFormData.age_day)
        : null,
      income_source: quickAddFormData.income_source || null,
      social_status:
        (quickAddFormData.social_status as
          | "single"
          | "married"
          | "widowed"
          | "divorced"
          | null) || null,
      doctor_id: doctors?.[0]?.id,
      doctor_shift_id: 1,
    };
    quickAddPatientMutation.mutate(patientData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
          color: "white",
          py: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <User size={24} />
          <Typography variant="h6" fontWeight="bold">
            إضافة مريض جديد
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "white",
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
          }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1 }}>
        <Box
          component="form"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !(e.target instanceof HTMLTextAreaElement)
            ) {
              e.preventDefault();
              if (
                !quickAddPatientMutation.isPending &&
                quickAddFormData.name &&
                quickAddFormData.phone &&
                quickAddFormData.gender
              ) {
                handleQuickAddSubmit();
              }
            }
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Section: Basic Info */}
            <Box>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontWeight: 600,
                }}
              >
                <Activity size={18} />
                البيانات الأساسية
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="اسم المريض"
                    value={quickAddFormData.name}
                    onChange={(e) =>
                      setQuickAddFormData({
                        ...quickAddFormData,
                        name: e.target.value,
                      })
                    }
                    required
                    disabled={quickAddPatientMutation.isPending}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <User
                            size={18}
                            color={theme.palette.text.secondary}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="رقم الهاتف"
                    value={quickAddFormData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setQuickAddFormData({
                        ...quickAddFormData,
                        phone: value,
                      });
                    }}
                    required
                    disabled={quickAddPatientMutation.isPending}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone
                            size={18}
                            color={theme.palette.text.secondary}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                mt: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth required>
                  <InputLabel>النوع</InputLabel>
                  <Select
                    value={quickAddFormData.gender}
                    label="النوع"
                    onChange={(e) =>
                      setQuickAddFormData({
                        ...quickAddFormData,
                        gender: e.target.value as "male" | "female",
                      })
                    }
                    disabled={quickAddPatientMutation.isPending}
                    startAdornment={
                      <InputAdornment position="start" sx={{ ml: 1 }}>
                        <User size={18} color={theme.palette.text.secondary} />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="male">ذكر</MenuItem>
                    <MenuItem value="female">أنثى</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="تاريخ الميلاد"
                  type="date"
                  value={quickAddFormData.dob}
                  onChange={(e) => {
                    const dob = e.target.value;
                    let updates: Partial<typeof quickAddFormData> = { dob };

                    if (dob) {
                      const birthDate = new Date(dob);
                      const today = new Date();
                      let years = today.getFullYear() - birthDate.getFullYear();
                      let months = today.getMonth() - birthDate.getMonth();
                      let days = today.getDate() - birthDate.getDate();

                      if (days < 0) {
                        months--;
                        const lastMonth = new Date(
                          today.getFullYear(),
                          today.getMonth(),
                          0,
                        );
                        days += lastMonth.getDate();
                      }
                      if (months < 0) {
                        years--;
                        months += 12;
                      }

                      if (years >= 0) {
                        updates = {
                          ...updates,
                          age_year: years.toString(),
                          age_month: months.toString(),
                          age_day: days.toString(),
                        };
                      }
                    }

                    setQuickAddFormData({
                      ...quickAddFormData,
                      ...updates,
                    });
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={quickAddPatientMutation.isPending}
                />
              </Box>
            </Box>

            {/* Section: Age */}
            <Box>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontWeight: 600,
                }}
              >
                <Baby size={18} />
                العمر
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="سنوات"
                      type="number"
                      size="small"
                      value={quickAddFormData.age_year}
                      onChange={(e) =>
                        setQuickAddFormData({
                          ...quickAddFormData,
                          age_year: e.target.value,
                        })
                      }
                      disabled={quickAddPatientMutation.isPending}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="أشهر"
                      type="number"
                      size="small"
                      value={quickAddFormData.age_month}
                      onChange={(e) =>
                        setQuickAddFormData({
                          ...quickAddFormData,
                          age_month: e.target.value,
                        })
                      }
                      disabled={quickAddPatientMutation.isPending}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="أيام"
                      type="number"
                      size="small"
                      value={quickAddFormData.age_day}
                      onChange={(e) =>
                        setQuickAddFormData({
                          ...quickAddFormData,
                          age_day: e.target.value,
                        })
                      }
                      disabled={quickAddPatientMutation.isPending}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Section: Additional Info */}
            <Box>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontWeight: 600,
                }}
              >
                <Wallet size={18} />
                بيانات إضافية
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>الحالة الاجتماعية</InputLabel>
                    <Select
                      value={quickAddFormData.social_status}
                      label="الحالة الاجتماعية"
                      onChange={(e) =>
                        setQuickAddFormData({
                          ...quickAddFormData,
                          social_status: e.target.value,
                        })
                      }
                      disabled={quickAddPatientMutation.isPending}
                      startAdornment={
                        <InputAdornment position="start" sx={{ ml: 1 }}>
                          <Heart
                            size={18}
                            color={theme.palette.text.secondary}
                          />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="single">أعزب</MenuItem>
                      <MenuItem value="married">متزوج</MenuItem>
                      <MenuItem value="widowed">أرمل</MenuItem>
                      <MenuItem value="divorced">مطلق</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="مصدر الدخل"
                    value={quickAddFormData.income_source}
                    onChange={(e) =>
                      setQuickAddFormData({
                        ...quickAddFormData,
                        income_source: e.target.value,
                      })
                    }
                    disabled={quickAddPatientMutation.isPending}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Wallet
                            size={18}
                            color={theme.palette.text.secondary}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2.5,
          bgcolor: "background.default",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          onClick={onClose}
          disabled={quickAddPatientMutation.isPending}
          sx={{ color: "text.secondary" }}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleQuickAddSubmit}
          variant="contained"
          size="large"
          startIcon={!quickAddPatientMutation.isPending && <User size={18} />}
          disabled={
            quickAddPatientMutation.isPending ||
            !quickAddFormData.name ||
            !quickAddFormData.phone ||
            !quickAddFormData.gender
          }
          sx={{ px: 4 }}
        >
          {quickAddPatientMutation.isPending ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "إضافة مريض"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
