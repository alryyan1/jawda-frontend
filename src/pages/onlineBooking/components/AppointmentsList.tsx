import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Box,
  CircularProgress,
  InputAdornment,
  Chip,
  Divider,
} from "@mui/material";
import { Search as SearchIcon, Close as CloseIcon } from "@mui/icons-material";
import type { FacilityAppointment } from "@/services/firestoreSpecialistService";

interface AppointmentsListProps {
  appointments: FacilityAppointment[] | undefined;
  isLoading: boolean;
  error: Error | null;
  formatDateDisplay: (dateString: string) => string;
  formatRelativeTime: (createdAt: unknown) => string;
  onSearchChange: (value: string) => void;
  appointmentSearch: string;
}

const AppointmentsList: React.FC<AppointmentsListProps> = ({
  appointments,
  isLoading,
  error,
  formatDateDisplay,
  formatRelativeTime,
  onSearchChange,
  appointmentSearch,
}) => {
  // Filter appointments based on search query (patient name or doctor name)
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    if (!appointmentSearch.trim()) {
      return appointments;
    }
    
    const searchLower = appointmentSearch.toLowerCase();
    return appointments.filter((appointment) => {
      return (
        appointment.patientName?.toLowerCase().includes(searchLower) ||
        appointment.doctorName?.toLowerCase().includes(searchLower) ||
        appointment.patientPhone?.includes(searchLower)
      );
    });
  }, [appointments, appointmentSearch]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Typography variant="h6" component="div">
            المواعيد
            {appointments && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                ({appointments.length})
              </Typography>
            )}
          </Typography>
        }
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flexGrow: 1 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
            <Typography>فشل تحميل المواعيد</Typography>
          </Box>
        ) : (
          <>
            {/* Search Input */}
            <TextField
              fullWidth
              placeholder="بحث بالاسم أو الطبيب..."
              value={appointmentSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: appointmentSearch ? (
                  <InputAdornment position="end">
                    <Box
                      component="button"
                      onClick={() => onSearchChange("")}
                      sx={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        p: 0.5,
                        '&:hover': { opacity: 0.7 }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </Box>
                  </InputAdornment>
                ) : null,
              }}
            />

            {/* Appointments List */}
            {filteredAppointments && filteredAppointments.length > 0 ? (
              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '500px' }}>
                {filteredAppointments.map((appointment, index) => (
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
                          <Typography variant="caption" color="text.secondary">
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
                    {index < filteredAppointments.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            ) : appointmentSearch ? (
              <Box sx={{ textAlign: 'center', py: 8, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  لا توجد نتائج للبحث
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  لا توجد مواعيد متاحة
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsList;
