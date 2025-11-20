import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import type { FirestoreDoctor } from "@/services/firestoreSpecialistService";

interface AppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: string | null;
  selectedDate: string;
  selectedDoctor: FirestoreDoctor | null;
  formData: {
    patientName: string;
    patientPhone: string;
    period: "morning" | "evening";
  };
  formatDateDisplay: (dateString: string) => string;
  isPending: boolean;
  onFormDataChange: (data: Partial<AppointmentDialogProps["formData"]>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedDay,
  selectedDate,
  selectedDoctor,
  formData,
  formatDateDisplay,
  isPending,
  onFormDataChange,
  onSubmit,
}) => {
  const daySchedule = selectedDay && selectedDoctor?.workingSchedule
    ? selectedDoctor.workingSchedule[selectedDay]
    : null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>إنشاء موعد جديد</DialogTitle>
      <DialogContent dividers>
        {selectedDay && selectedDate && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedDay} - {formatDateDisplay(selectedDate)}
          </Typography>
        )}
        <form onSubmit={onSubmit} id="appointment-form">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="اسم المريض"
              value={formData.patientName}
              onChange={(e) =>
                onFormDataChange({ patientName: e.target.value })
              }
              placeholder="أدخل اسم المريض"
              required
              fullWidth
              size="small"
            />
            <TextField
              label="رقم الهاتف"
              value={formData.patientPhone}
              onChange={(e) =>
                onFormDataChange({ patientPhone: e.target.value })
              }
              placeholder="أدخل رقم الهاتف"
              required
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small" required>
              <InputLabel>الفترة</InputLabel>
              <Select
                value={formData.period}
                label="الفترة"
                onChange={(e) => {
                  onFormDataChange({ period: e.target.value as "morning" | "evening" });
                }}
              >
                {daySchedule?.morning && (
                  <MenuItem value="morning">صباح</MenuItem>
                )}
                {daySchedule?.evening && (
                  <MenuItem value="evening">مساء</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onOpenChange(false)}
          disabled={isPending}
          variant="outlined"
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          form="appointment-form"
          disabled={isPending}
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} /> : null}
        >
          {isPending ? "جاري الإنشاء..." : "إنشاء الموعد"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentDialog;
