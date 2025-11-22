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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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

  // Sort appointments by date (newest first)
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      // First compare dates (descending - newest first)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If dates are the same, compare createdAt (descending - latest first)
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [filteredAppointments]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="div">
              المواعيد
            </Typography>
            {appointments && (
              <Chip
                label={appointments.length}
                size="small"
                color="primary"
              />
            )}
          </Box>
        }
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 0 }}>
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

            {/* Appointments Table */}
            {sortedAppointments && sortedAppointments.length > 0 ? (
              <TableContainer component={Paper} sx={{ flexGrow: 1, maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>اسم المريض</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>رقم الهاتف</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الطبيب</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>التخصص</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الإنشاء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedAppointments.map((appointment) => (
                      <TableRow
                        key={appointment.id}
                        sx={{
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {appointment.patientName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {appointment.patientPhone}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateDisplay(appointment.date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {appointment.doctorName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {appointment.specializationName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={appointment.period === "morning" ? "صباح" : "مساء"}
                            size="small"
                            color={appointment.period === "morning" ? "primary" : "warning"}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={appointment.isConfirmed ? "مؤكد" : "غير مؤكد"}
                            size="small"
                            color={appointment.isConfirmed ? "success" : "default"}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          {appointment.createdAt && (
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(appointment.createdAt)}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
