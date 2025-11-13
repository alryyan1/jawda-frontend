// src/components/clinic/OnlineAppointmentsDialog.tsx
import React, { useState, useEffect } from 'react';
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
import { Refresh as RefreshIcon, Search as SearchIcon, NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { TextField, InputAdornment } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { fetchDoctorAppointments } from '@/services/firestoreDoctorService';
import { registerNewPatientFromLab } from '@/services/patientService';
import { toast } from 'sonner';
import type { DoctorShift } from '@/types/doctors';
import dayjs from 'dayjs';

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
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [searchName, setSearchName] = useState<string>('');
  const [savingAppointmentId, setSavingAppointmentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Get the required IDs from the active doctor shift
  type ShiftWithFirestoreIds = DoctorShift & {
    specialist_firestore_id?: string;
    firebase_id?: string;
  };
  const specialistFirestoreId = (activeDoctorShift as ShiftWithFirestoreIds | null)?.specialist_firestore_id;
  const doctorFirebaseId = (activeDoctorShift as ShiftWithFirestoreIds | null)?.firebase_id;

  const {
    data: appointments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['doctorAppointments', specialistFirestoreId, doctorFirebaseId, selectedDate, searchName, refreshKey],
    queryFn: () => {
      if (!specialistFirestoreId || !doctorFirebaseId) {
        return Promise.resolve([]);
      }
      return fetchDoctorAppointments(specialistFirestoreId, doctorFirebaseId, selectedDate);
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
      return dayjs(date).format('DD/MM/YYYY');
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

  const getPeriodColor = (period: string): ChipProps['color'] => {
    return period === 'morning' ? 'primary' : 'secondary';
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const appointmentDate = dayjs(appointment.date).format('YYYY-MM-DD');
    const matchesDate = selectedDate ? appointmentDate === selectedDate : true;
    const matchesName = searchName
      ? (appointment.patientName || '').toLowerCase().includes(searchName.toLowerCase())
      : true;
    return matchesDate && matchesName;
  });

  // Sort appointments by date and time descending (newest first)
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateCompare = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
    if (dateCompare !== 0) return dateCompare;
    // If dates are equal, compare by time (descending)
    return b.time.localeCompare(a.time);
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = sortedAppointments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchName]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSaveToShift = async (appointment: { id: string; patientName: string; patientPhone: string }) => {
    if (!activeDoctorShift) {
      toast.error('لا توجد وردية نشطة محددة');
      return;
    }
    try {
      setSavingAppointmentId(appointment.id);
      await registerNewPatientFromLab({
        name: appointment.patientName || 'بدون اسم',
        phone: appointment.patientPhone || '',
        gender: 'male',
        age_year: null,
        age_month: null,
        age_day: null,
        doctor_id: activeDoctorShift.doctor_id,
        doctor_shift_id: activeDoctorShift.id,
      });
      toast.success('تم حفظ المريض وإضافته للوردية');
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message) : null;
      toast.error(message || 'فشل حفظ المريض');
    } finally {
      setSavingAppointmentId(null);
    }
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
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography variant="h6" sx={{ flexShrink: 0 }}>
            الحجوزات الإلكترونية - {activeDoctorShift?.doctor_name}
          </Typography>
          <Box display="flex" gap={2} alignItems="center" flexGrow={1} justifyContent="flex-end">
            <TextField
              label="التاريخ"
              type="date"
              size="small"
              value={selectedDate}
              
              onChange={(e) => { setSelectedDate(e.target.value); }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="بحث بالاسم"
              placeholder="اكتب اسم المريض"
              size="small"
              value={searchName}
              onChange={(e) => { setSearchName(e.target.value); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={isLoading}
              size="small"
            >
              تحديث
            </Button>
          </Box>
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
          <>
            {/* Filters moved to header */}
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>اسم المريض</TableCell>
                  <TableCell>رقم الهاتف</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الوقت</TableCell>
                  <TableCell>الفترة</TableCell>
              
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
                ) : sortedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={2}>
                        لا توجد حجوزات إلكترونية لهذا الطبيب
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAppointments.map((appointment) => (
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
                          color={getPeriodColor(appointment.period)}
                          size="small"
                        />
                      </TableCell>
                    
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {dayjs(appointment.createdAt).format('DD/MM/YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          disabled={savingAppointmentId === appointment.id}
                          onClick={() => handleSaveToShift({ id: String(appointment.id), patientName: String(appointment.patientName || ''), patientPhone: String(appointment.patientPhone || '') })}
                        >
                          {savingAppointmentId === appointment.id ? 'جاري الحفظ...' : 'حفظ للوردية'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </TableContainer>
            {/* Pagination Controls */}
            {sortedAppointments.length > 0 && (
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} px={2}>
                <Typography variant="body2" color="text.secondary">
                  عرض {startIndex + 1} - {Math.min(endIndex, sortedAppointments.length)} من {sortedAppointments.length} حجز
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <Button
                    startIcon={<NavigateBeforeIcon />}
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    size="small"
                    variant="outlined"
                  >
                    السابق
                  </Button>
                  <Typography variant="body2" sx={{ minWidth: '80px', textAlign: 'center' }}>
                    صفحة {currentPage} من {totalPages}
                  </Typography>
                  <Button
                    endIcon={<NavigateNextIcon />}
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    size="small"
                    variant="outlined"
                  >
                    التالي
                  </Button>
                </Box>
              </Box>
            )}
          </>
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
