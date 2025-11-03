// src/pages/doctors/DoctorsListPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getDoctors, deleteDoctor } from '../../services/doctorService';
import type { Doctor } from '../../types/doctors';
import { toast } from 'sonner';
// MUI
import { Box, Button, Card, CardContent, TextField, IconButton, CircularProgress, Avatar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Menu, MenuItem, Divider, Typography } from '@mui/material';
import { MoreHoriz as MoreHorizIcon, Delete as DeleteIcon, Edit as EditIcon, Search as SearchIcon, Checklist as ChecklistIcon, Person as PersonIcon, NavigateBefore, NavigateNext, Star as StarIcon, PictureAsPdf as PictureAsPdfIcon } from '@mui/icons-material';
import { useDebounce } from '@/hooks/useDebounce';
import ManageDoctorServicesDialog from '@/components/doctors/ManageDoctorServicesDialog';

interface ErrorWithMessage {
  message: string;
}

export default function DoctorsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isExporting, setIsExporting] = useState(false);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    doctor: Doctor | null;
  }>({
    isOpen: false,
    doctor: null
  });
  // Menu state (must be declared before any early returns)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDoctor, setMenuDoctor] = useState<Doctor | null>(null);
  const openMenu = Boolean(menuAnchorEl);

  const handleManageDoctorServices = (doctor: Doctor) => {
    setDialogState({
      isOpen: true,
      doctor
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogState(prev => ({
      ...prev,
      isOpen: open
    }));
    
    // If dialog is closing, clear the doctor
    if (!open) {
      setTimeout(() => {
        setDialogState(prev => ({
          ...prev,
          doctor: null
        }));
      }, 300); // Wait for dialog animation
    }
  };

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['doctors', currentPage, debouncedSearch],
    queryFn: () => getDoctors(currentPage, { search: debouncedSearch }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDoctor,
    onSuccess: () => {
      toast.success("تم حذف الطبيب بنجاح!");
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (err: ErrorWithMessage) => {
      toast.error("فشل حذف الطبيب.", { description: err.message || "حدث خطأ غير متوقع."});
    }
  });

  const handleDelete = (id: number) => {
    // Use shadcn dialog for confirmation later if desired
    if (window.confirm("هل أنت متأكد من حذف هذا الطبيب؟")) {
      deleteMutation.mutate(id);
    }
  };

  
  const getImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '/storage/') || '/storage/';
    return `${baseUrl}${imagePath}`;
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const url = `${apiBase}/reports/doctors-list/pdf${params.toString() ? `?${params.toString()}` : ''}`;
      window.open(url, '_blank');
      toast.success('فتح ملف PDF في تبويب جديد');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع.';
      toast.error('فشل إنشاء ملف PDF', { description: message });
    } finally {
      setIsExporting(false);
    }
  };


  if (isLoading && !isFetching) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, gap: 1 }}>
      <CircularProgress size={24} /> جارٍ تحميل الأطباء...
    </Box>
  );
  if (error) return <Box sx={{ color: 'error.main', p: 2 }}>{`فشل تحميل الأطباء: ${error.message}`}</Box>;

  const doctors = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, doctor: Doctor) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuDoctor(doctor);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: { xs: 2, sm: 3, lg: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>إدارة الأطباء</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleExportPdf} variant="outlined" size="small" startIcon={isExporting ? <CircularProgress size={14} /> : <PictureAsPdfIcon fontSize="small" />} disabled={isExporting}>
            تصدير PDF
          </Button>
          <Button component={Link} to="/doctors/new" variant="contained" size="small">إضافة طبيب جديد</Button>
        </Box>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon fontSize="small" color="action" />
            <TextField
              variant="outlined"
              size="small"
              placeholder="ابحث بالاسم..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              sx={{ maxWidth: 320 }}
            />
          </Box>
        </CardContent>
      </Card>

      {isFetching && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>جاري تحديث القائمة...</Typography>}

      {doctors.length === 0 && !isLoading ? (
        <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>لم يتم العثور على أطباء</Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: 80 }}>الصورة</TableCell>
                <TableCell align="center">الاسم</TableCell>
                <TableCell align="center">الهاتف</TableCell>
                <TableCell align="center">الاختصاص</TableCell>
                <TableCell align="center">نسبة النقد</TableCell>
                <TableCell align="center">نسبة الشركة</TableCell>
                <TableCell align="center">الراتب الثابت</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id} hover onClick={() => navigate(`/doctors/${doctor.id}/edit`)} sx={{ cursor: 'pointer' }}>
                  <TableCell align="center">
                    <Avatar sx={{ width: 40, height: 40, mx: 'auto' }} src={getImageUrl(doctor.image)} alt={doctor.name}>
                      <PersonIcon />
                    </Avatar>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 500 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {doctor.name}
                      {doctor.is_default ? (<StarIcon sx={{ color: 'gold', fontSize: 16 }} />) : null}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{doctor.phone}</TableCell>
                  <TableCell align="center">{doctor.specialist?.name || doctor.specialist_name || 'N/A'}</TableCell>
                  <TableCell align="center">{doctor.cash_percentage || 'N/A'}</TableCell>
                  <TableCell align="center">{doctor.company_percentage || 'N/A'}</TableCell>
                  <TableCell align="center">{doctor.static_wage || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, doctor); }}>
                      <MoreHorizIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Button startIcon={<NavigateBefore />} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching} variant="outlined" size="small">السابق</Button>
          <Typography variant="body2" color="text.secondary">{`صفحة ${meta.current_page} من ${meta.last_page}`}</Typography>
          <Button endIcon={<NavigateNext />} onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching} variant="outlined" size="small">التالي</Button>
        </Box>
      )}

      <Menu anchorEl={menuAnchorEl} open={openMenu} onClose={handleMenuClose} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <MenuItem component={Link} to={menuDoctor ? `/doctors/${menuDoctor.id}/edit` : '#'} onClick={handleMenuClose}>
          <EditIcon fontSize="small" sx={{ ml: 1 }} /> تعديل
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (menuDoctor) handleManageDoctorServices(menuDoctor); handleMenuClose(); }}>
          <ChecklistIcon fontSize="small" sx={{ ml: 1 }} /> إدارة الخدمات
        </MenuItem>
        <MenuItem disabled={deleteMutation.isPending && (!!menuDoctor && deleteMutation.variables === menuDoctor.id)} onClick={() => { if (menuDoctor) handleDelete(menuDoctor.id); handleMenuClose(); }} sx={{ color: 'error.main' }}>
          {deleteMutation.isPending && (!!menuDoctor && deleteMutation.variables === menuDoctor.id) ? (
            <CircularProgress size={16} sx={{ ml: 1 }} />
          ) : (
            <DeleteIcon fontSize="small" sx={{ ml: 1 }} />
          )}
          حذف
        </MenuItem>
      </Menu>

      {dialogState.doctor && (
        <ManageDoctorServicesDialog
          isOpen={dialogState.isOpen}
          onOpenChange={handleDialogOpenChange}
          doctor={dialogState.doctor}
          onConfigurationUpdated={() => {}}
        />
      )}
    </Box>
  );
}