// src/components/clinic/ManageDoctorShiftsDialog.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Chip,
  Box,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Login as LogInIcon,
  Logout as LogOutIcon,
} from '@mui/icons-material';

import { getDoctorsWithShiftStatus, startDoctorShift, endDoctorShift } from '@/services/doctorShiftService';

interface DoctorWithShiftStatus { // Type for the data returned by getDoctorsWithShiftStatus
  id: number; // Doctor ID
  name: string;
  specialist_name?: string | null;
  is_on_shift: boolean;
  current_doctor_shift_id?: number | null; // ID of the DoctorShift record if active
}

interface ManageDoctorShiftsDialogProps {
  triggerButton: React.ReactNode;
  currentClinicShiftId: number | null; // The ID of the general clinic shift
}

const ManageDoctorShiftsDialog: React.FC<ManageDoctorShiftsDialogProps> = ({ triggerButton, currentClinicShiftId }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const doctorsQueryKey = ['doctorsWithShiftStatus', debouncedSearchTerm];

  const { data: doctorsList, isLoading, isFetching } = useQuery<DoctorWithShiftStatus[], Error>({
    queryKey: doctorsQueryKey,
    queryFn: () => getDoctorsWithShiftStatus({ search: debouncedSearchTerm }), // Pass search to service
    enabled: isOpen, // Fetch only when dialog is open
  });

  const openShiftMutation = useMutation({
    mutationFn: (doctorId: number) => startDoctorShift(doctorId),
    onSuccess: () => {
      toast.success('تم فتح النوبة بنجاح');
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'خطأ في فتح النوبة';
      toast.error(errorMessage);
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (doctorShiftId: number) => endDoctorShift(doctorShiftId),
    onSuccess: () => {
      toast.success('تم إغلاق النوبة بنجاح');
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'خطأ في إغلاق النوبة';
      toast.error(errorMessage);
    },
  });
  const handleOpenShift = (doctorId: number) => {
    if (!currentClinicShiftId) {
        toast.error('لم يتم تحديد نوبة العيادة');
        return;
    }
    openShiftMutation.mutate(doctorId);
  };

  const handleCloseShift = (doctorShiftId: number) => {
    closeShiftMutation.mutate(doctorShiftId);
  };

  return (
    <>
      <Box onClick={() => setIsOpen(true)}>
        {triggerButton}
      </Box>
      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        maxWidth="lg"
        fullWidth
        sx={{ direction: 'rtl' }}
      >
        <DialogTitle>إدارة نوبات الأطباء</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="البحث عن الأطباء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {(isLoading || isFetching) && !doctorsList && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {(!isLoading || doctorsList) && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              {doctorsList && doctorsList.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">الاسم</TableCell>
                      <TableCell align="center">التخصص</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {doctorsList?.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                          {doc.name}
                        </TableCell>
                        <TableCell align="center">
                          {doc.specialist_name || '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={doc.is_on_shift ? 'في النوبة' : 'خارج النوبة'}
                            color={doc.is_on_shift ? 'success' : 'default'}
                            variant={doc.is_on_shift ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {doc.is_on_shift && doc.current_doctor_shift_id ? (
                            <Button
                              size="small"
                              color="error"
                              variant="contained"
                              onClick={() => handleCloseShift(doc.current_doctor_shift_id!)}
                              disabled={closeShiftMutation.isPending && closeShiftMutation.variables === doc.current_doctor_shift_id}
                              startIcon={
                                closeShiftMutation.isPending && closeShiftMutation.variables === doc.current_doctor_shift_id 
                                  ? <CircularProgress size={16} />
                                  : <LogOutIcon />
                              }
                            >
                              إغلاق النوبة
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleOpenShift(doc.id)}
                              disabled={openShiftMutation.isPending && openShiftMutation.variables === doc.id}
                              startIcon={
                                openShiftMutation.isPending && openShiftMutation.variables === doc.id 
                                  ? <CircularProgress size={16} />
                                  : <LogInIcon />
                              }
                            >
                              فتح النوبة
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  {searchTerm ? 'لا توجد نتائج' : 'لا يوجد أطباء'}
                </Box>
              )}
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default ManageDoctorShiftsDialog;