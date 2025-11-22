import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { FacilityAppointment } from "@/services/firestoreSpecialistService";

interface AppointmentsColumnProps {
  appointments: FacilityAppointment[] | undefined;
  isLoading: boolean;
  selectedDate: string;
  selectedDoctorName: string;
  formatRelativeTime: (createdAt: unknown) => string;
  formatDateDisplay: (dateString: string) => string;
  onClose: () => void;
}

const AppointmentsColumn: React.FC<AppointmentsColumnProps> = ({
  appointments,
  isLoading,
  selectedDate,
  selectedDoctorName,
  formatRelativeTime, // eslint-disable-line @typescript-eslint/no-unused-vars
  formatDateDisplay,
  onClose,
}) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" component="div">
                مواعيد اليوم
              </Typography>
              {selectedDate && (
                <Chip
                  label={formatDateDisplay(selectedDate)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedDoctorName && (
                <Chip
                  label={`الطبيب: ${selectedDoctorName}`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
              {appointments && (
                <Chip
                  label={`${appointments.length} موعد`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ ml: 1 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : appointments && appointments.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: window.innerHeight - 100, flexGrow: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '50px' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>اسم </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}> الهاتف</TableCell>
                  {/* <TableCell sx={{ fontWeight: 'bold' }}>التخصص</TableCell> */}
                  <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                  {/* <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell> */}
                  {/* <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الإنشاء</TableCell> */}
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.map((appointment, index) => (
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
                      <Typography variant="body2" color="text.secondary">
                        {index + 1}
                      </Typography>
                    </TableCell>
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
                    {/* <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {appointment.specializationName}
                      </Typography>
                    </TableCell> */}
                    <TableCell>
                      <Chip
                        label={appointment.period === "morning" ? "صباح" : "مساء"}
                        size="small"
                        color={appointment.period === "morning" ? "primary" : "warning"}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    {/* <TableCell>
                      <Chip
                        label={appointment.isConfirmed ? "مؤكد" : "غير مؤكد"}
                        size="small"
                        color={appointment.isConfirmed ? "success" : "default"}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell> */}
                    {/* <TableCell>
                      {appointment.createdAt && (
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(appointment.createdAt)}
                        </Typography>
                      )}
                    </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              لا توجد مواعيد متاحة لهذا اليوم
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsColumn;

