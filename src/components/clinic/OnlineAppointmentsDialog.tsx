// src/components/clinic/OnlineAppointmentsDialog.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { fetchDoctorAppointments } from '@/services/firestoreDoctorService';
import type { OnlineAppointment, DoctorShift } from '@/types/doctors';

interface OnlineAppointmentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeDoctorShift: DoctorShift | null;
}

const OnlineAppointmentsDialog: React.FC<OnlineAppointmentsDialogProps> = ({
  isOpen,
  onClose,
  activeDoctorShift
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Get the required IDs from the active doctor shift
  const specialistFirestoreId = activeDoctorShift?.specialist_firestore_id;
  const doctorFirebaseId = activeDoctorShift?.firebase_id;

  const {
    data: appointments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['doctorAppointments', specialistFirestoreId, doctorFirebaseId, refreshKey],
    queryFn: () => {
      if (!specialistFirestoreId || !doctorFirebaseId) {
        return Promise.resolve([]);
      }
      return fetchDoctorAppointments(specialistFirestoreId, doctorFirebaseId);
    },
    enabled: isOpen && !!specialistFirestoreId && !!doctorFirebaseId,
    staleTime: 30000, // 30 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getPeriodText = (period: string) => {
    return period === 'morning' ? 'صباحي' : 'مسائي';
  };

  const getPeriodColor = (period: string) => {
    return period === 'morning' ? 'primary' : 'secondary';
  };

  const getConfirmationStatus = (isConfirmed: boolean) => {
    return isConfirmed ? 'مؤكد' : 'غير مؤكد';
  };

  const getConfirmationColor = (isConfirmed: boolean) => {
    return isConfirmed ? 'success' : 'warning';
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      dir="rtl"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            الحجوزات الإلكترونية - {activeDoctorShift?.doctor_name}
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
            size="small"
          >
            تحديث
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {!activeDoctorShift ? (
          <Alert severity="warning">
            يرجى اختيار طبيب أولاً لعرض الحجوزات الإلكترونية
          </Alert>
        ) : !specialistFirestoreId || !doctorFirebaseId ? (
          <Alert severity="error">
            لا يمكن العثور على معرفات الطبيب المطلوبة في Firestore
          </Alert>
        ) : error ? (
          <Alert severity="error">
            حدث خطأ في تحميل الحجوزات: {(error as Error).message}
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>اسم المريض</TableCell>
                  <TableCell>رقم الهاتف</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الوقت</TableCell>
                  <TableCell>الفترة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ الإنشاء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        <Typography>جاري التحميل...</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={2}>
                        لا توجد حجوزات إلكترونية لهذا الطبيب
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow key={appointment.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {appointment.patientName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appointment.patientPhone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(appointment.date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTime(appointment.time)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPeriodText(appointment.period)}
                          color={getPeriodColor(appointment.period) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getConfirmationStatus(appointment.isConfirmed)}
                          color={getConfirmationColor(appointment.isConfirmed) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {appointment.createdAt.toLocaleDateString('ar-SA')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OnlineAppointmentsDialog;
