import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import type { FacilityAppointment } from "@/services/firestoreSpecialistService";

interface AllAppointmentsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: FacilityAppointment[] | undefined;
  isLoading: boolean;
  formatRelativeTime: (createdAt: unknown) => string;
  formatDateDisplay: (dateString: string) => string;
}

const AllAppointmentsDialog: React.FC<AllAppointmentsDialogProps> = ({
  isOpen,
  onOpenChange,
  appointments,
  isLoading,
  formatRelativeTime,
  formatDateDisplay,
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        جميع المواعيد
        {appointments && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ({appointments.length} موعد)
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : appointments && appointments.length > 0 ? (
          <Box sx={{ maxHeight: '600px', overflowY: 'auto' }}>
            {appointments.map((appointment, index) => (
              <Box key={appointment.id}>
                <Box
                  sx={{
                    py: 2,
                    px: 1,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {appointment.patientName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {appointment.patientPhone}
                      </Typography>
                    </Box>
                    {appointment.createdAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(appointment.createdAt)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateDisplay(appointment.date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        الطبيب: {appointment.doctorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        التخصص: {appointment.specializationName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip
                        label={appointment.period === "morning" ? "صباح" : "مساء"}
                        size="small"
                        color={appointment.period === "morning" ? "primary" : "warning"}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                      <Chip
                        label={appointment.isConfirmed ? "مؤكد" : "غير مؤكد"}
                        size="small"
                        color={appointment.isConfirmed ? "success" : "default"}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                  </Box>
                </Box>
                {index < appointments.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              لا توجد مواعيد متاحة
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AllAppointmentsDialog;
