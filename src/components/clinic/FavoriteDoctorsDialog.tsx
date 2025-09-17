// src/components/clinic/FavoriteDoctorsDialog.tsx
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
  IconButton,
  Typography,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faHeartBroken } from '@fortawesome/free-solid-svg-icons';
import { 
  getDoctorsWithFavorites, 
  toggleFavoriteDoctor,
  getServices,
  type Doctor,
  type Service 
} from '@/services/favoriteDoctorsService';

interface FavoriteDoctorsDialogProps {
  triggerButton: React.ReactNode;
  currentUserId: number | null;
  onClose?: () => void;
}

const FavoriteDoctorsDialog: React.FC<FavoriteDoctorsDialogProps> = ({ 
  triggerButton, 
  currentUserId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<{[doctorId: number]: Service | null}>({});

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const doctorsQueryKey = ['doctorsWithFavorites', debouncedSearchTerm];
  const servicesQueryKey = ['services'];

  const { data: doctorsList, isLoading: doctorsLoading, error: doctorsError } = useQuery<Doctor[], Error>({
    queryKey: doctorsQueryKey,
    queryFn: () => getDoctorsWithFavorites(debouncedSearchTerm),
    enabled: isOpen,
    retry: 1,
  });

  const { data: servicesList = [], isLoading: servicesLoading } = useQuery<Service[], Error>({
    queryKey: servicesQueryKey,
    queryFn: () => getServices(),
    enabled: isOpen,
    retry: 1,
  });

  // Initialize selected services when doctors and services data are available
  useEffect(() => {
    if (doctorsList && servicesList.length > 0) {
      const initialServices: {[doctorId: number]: Service | null} = {};
      doctorsList.forEach(doctor => {
        if (doctor.fav_service_id) {
          const service = servicesList.find(s => s.id === doctor.fav_service_id);
          initialServices[doctor.id] = service || null;
        }
      });
      setSelectedServices(prev => ({ ...prev, ...initialServices }));
    }
  }, [doctorsList, servicesList]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ doctorId, favService }: { doctorId: number; favService?: number }) =>
      toggleFavoriteDoctor({ doc_id: doctorId, fav_service: favService }),
    onSuccess: () => {
      toast.success('تم تحديث المفضلة بنجاح');
      queryClient.invalidateQueries({ queryKey: doctorsQueryKey });
    },
    onError: (error: unknown) => {
      // Error toast is already shown by the service, just log for debugging
      console.error('Toggle favorite mutation error:', error);
    },
  });

  const handleToggleFavorite = (doctorId: number) => {
    if (!currentUserId) {
      toast.error('لم يتم تحديد المستخدم');
      return;
    }
    
    const selectedService = selectedServices[doctorId];
    toggleFavoriteMutation.mutate({ 
      doctorId, 
      favService: selectedService?.id 
    });
  };

  const handleServiceChange = (doctorId: number, service: Service | null) => {
    setSelectedServices(prev => ({
      ...prev,
      [doctorId]: service
    }));
  };

  const isFavorite = (doctorId: number) => {
    const doctor = doctorsList?.find(d => d.id === doctorId);
    return doctor?.is_favorite || false;
  };

  return (
    <>
      <Box onClick={() => setIsOpen(true)}>
        {triggerButton}
      </Box>
      <Dialog 
        open={isOpen} 
        onClose={() => { setIsOpen(false); onClose?.(); }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FontAwesomeIcon icon={faHeart} color="#e91e63" />
            <Typography variant="h6">إدارة الأطباء المفضلين</Typography>
          </Box>
        </DialogTitle>
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

          {doctorsLoading && !doctorsList && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {doctorsError && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
              <Typography variant="body1" color="error">
                فشل في تحميل البيانات
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                تحقق من رسائل التنبيه أو حاول مرة أخرى
              </Typography>
            </Box>
          )}

          {(!doctorsLoading || doctorsList) && !doctorsError && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              {doctorsList && doctorsList.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">الاسم</TableCell>
                      <TableCell align="center">التخصص</TableCell>
                      <TableCell align="center">الخدمة المفضلة</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {doctorsList?.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                          {doctor.name}
                        </TableCell>
                        <TableCell align="center">
                          {doctor.specialist_name || '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 200 }}>
                          <Autocomplete
                            size="small"
                            options={servicesList}
                            getOptionLabel={(option) => option.name}
                            value={selectedServices[doctor.id] || null}
                            onChange={(_, newValue) => handleServiceChange(doctor.id, newValue)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="اختر خدمة..."
                                variant="outlined"
                                size="small"
                              />
                            )}
                            disabled={servicesLoading}
                            sx={{ minWidth: 180 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={isFavorite(doctor.id) ? 'مفضل' : 'غير مفضل'}
                            color={isFavorite(doctor.id) ? 'error' : 'default'}
                            variant={isFavorite(doctor.id) ? 'filled' : 'outlined'}
                            icon={isFavorite(doctor.id) ? 
                              <FontAwesomeIcon icon={faHeart} /> : 
                              <FontAwesomeIcon icon={faHeartBroken} />
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => handleToggleFavorite(doctor.id)}
                            disabled={toggleFavoriteMutation.isPending}
                            color={isFavorite(doctor.id) ? 'error' : 'default'}
                            sx={{ 
                              '&:hover': { 
                                backgroundColor: isFavorite(doctor.id) ? 'error.light' : 'action.hover' 
                              }
                            }}
                          >
                            {toggleFavoriteMutation.isPending ? (
                              <CircularProgress size={20} />
                            ) : isFavorite(doctor.id) ? (
                              <FontAwesomeIcon icon={faHeart} />
                            ) : (
                              <FontAwesomeIcon icon={faHeartBroken} />
                            )}
                          </IconButton>
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
          <Button onClick={() => { setIsOpen(false); onClose?.(); }} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FavoriteDoctorsDialog;
