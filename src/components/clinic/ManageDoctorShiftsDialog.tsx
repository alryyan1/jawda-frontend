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
  Box,
  CircularProgress,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Login as LogInIcon,
  Logout as LogOutIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';

import { getDoctorsWithShiftStatus, startDoctorShift, endDoctorShift } from '@/services/doctorShiftService';
import { getFavoriteDoctors, type FavoriteDoctor } from '@/services/favoriteDoctorsService';
import FavoriteDoctorsDialog from './FavoriteDoctorsDialog';
import { webUrl } from '@/pages/constants';

interface FavoriteDoctorWithShiftStatus extends FavoriteDoctor {
  is_on_shift: boolean;
  current_doctor_shift_id?: number | null;
}

interface ManageDoctorShiftsDialogProps {
  triggerButton: React.ReactNode;
  currentClinicShiftId: number | null; // The ID of the general clinic shift
  currentUserId: number | null; // The current user ID for favorite doctors
}

const ManageDoctorShiftsDialog: React.FC<ManageDoctorShiftsDialogProps> = ({ triggerButton, currentClinicShiftId, currentUserId }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const doctorsQueryKey = ['favoriteDoctorsWithShiftStatus', debouncedSearchTerm];

  // Function to get favorite doctors with their shift status
  const getFavoriteDoctorsWithShiftStatus = async (): Promise<FavoriteDoctorWithShiftStatus[]> => {
    // Get favorite doctors
    const favoriteDoctors = await getFavoriteDoctors();
    
    // Get all doctors with shift status
    const allDoctorsWithShiftStatus = await getDoctorsWithShiftStatus({ search: debouncedSearchTerm });
    
    // Filter to only include favorite doctors and combine with shift status
    const favoriteDoctorsWithShiftStatus = favoriteDoctors
      .filter(doc => 
        // Apply search filter
        !debouncedSearchTerm || 
        doc.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (doc.specialist_name && doc.specialist_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      )
      .map(favoriteDoc => {
        const shiftStatus = allDoctorsWithShiftStatus.find(doc => doc.id === favoriteDoc.id);
        return {
          ...favoriteDoc,
          is_on_shift: shiftStatus?.is_on_shift || false,
          current_doctor_shift_id: shiftStatus?.current_doctor_shift_id || null,
        };
      });
    
    return favoriteDoctorsWithShiftStatus;
  };

  const { data: doctorsList, isLoading, isFetching } = useQuery<FavoriteDoctorWithShiftStatus[], Error>({
    queryKey: doctorsQueryKey,
    queryFn: getFavoriteDoctorsWithShiftStatus,
    enabled: isOpen, // Fetch only when dialog is open
  });

  const openShiftMutation = useMutation({
    mutationFn: (doctorId: number) => startDoctorShift({ 
      doctor_id: doctorId, 
      shift_id: currentClinicShiftId! 
    }),
    onSuccess: () => {
      toast.success('تم فتح الورديه بنجاح');
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
      // Invalidate all active doctor shifts queries
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts'] });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts', currentClinicShiftId] });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShiftsForNewVisit'] });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShiftsForCostDialog'] });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShiftsForFinderDialog'] });
      queryClient.invalidateQueries({ queryKey: ['favoriteDoctors'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'خطأ في فتح الورديه';
      toast.error(errorMessage);
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (doctorShiftId: number) => endDoctorShift({ doctor_shift_id: doctorShiftId }),
    onSuccess: () => {
      toast.success('تم إغلاق الورديه بنجاح');
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
      // Invalidate all active doctor shifts queries
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts'] });
      queryClient.invalidateQueries({ queryKey: ['activeDoctorShifts', currentClinicShiftId] });
      // queryClient.invalidateQueries({ queryKey: ['activeDoctorShiftsForNewVisit'] });
      // queryClient.invalidateQueries({ queryKey: ['activeDoctorShiftsForCostDialog'] });
      // queryClient.invalidateQueries({ queryKey: ['activeDoctorShiftsForFinderDialog'] });
      // queryClient.invalidateQueries({ queryKey: ['favoriteDoctors'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'خطأ في إغلاق الورديه';
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

  const handleViewReport = (doctorShiftId: number) => {
    // Open doctor's clinic report in a new tab
    const reportUrl = `${webUrl}reports/clinic-report-old/pdf?doctor_shift_id=${doctorShiftId}`;
    window.open(reportUrl, '_blank');
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
      >
        <DialogTitle>ورديات الأطباء المفضلين</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="البحث عن الأطباء المفضلين..."
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
            <TableContainer  component={Paper} sx={{ maxHeight: 400 }}>
              {doctorsList && doctorsList.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">الاسم</TableCell>
                      <TableCell align="center">التخصص</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                      <TableCell align="center">التقرير</TableCell>
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
                              إغلاق الورديه
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
                              فتح الورديه
                            </Button>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="عرض تقرير الطبيب في تبويب جديد">
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={doc.current_doctor_shift_id == null}
                              onClick={() => handleViewReport(doc.current_doctor_shift_id!)}
                              startIcon={<PdfIcon />}
                            >
                              عرض التقرير
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  {searchTerm ? (
                    'لا توجد نتائج'
                  ) : (
                    <Box>
                      <Box sx={{ mb: 2 }}>لا يوجد أطباء مفضلين</Box>
                      <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                        استخدم زر "الأطباء المفضلين" لإضافة أطباء إلى قائمة المفضلة
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <FavoriteDoctorsDialog
            currentUserId={currentUserId}
            onClose={() => {
              queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
              queryClient.invalidateQueries({ queryKey: ['favoriteDoctors'] });
            }}
            triggerButton={
              <Button
                variant="outlined"
                color="error"
                startIcon={<FontAwesomeIcon icon={faHeart} />}
                sx={{ mr: 1 }}
              >
                الأطباء المفضلين
              </Button>
            }
          />
          <Button onClick={() => setIsOpen(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default ManageDoctorShiftsDialog;