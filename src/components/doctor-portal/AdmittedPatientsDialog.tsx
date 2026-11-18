import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
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
  Box,
  Typography,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search, BedDouble } from 'lucide-react';
import { getActiveClinicPatients } from '@/services/clinicService';
import type { ActivePatientVisit } from '@/types/patients';

interface AdmittedPatientsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen visit; the caller is responsible for making it the active patient. */
  onSelectVisit: (visit: ActivePatientVisit) => void;
}

const STATUS_LABELS: Record<string, string> = {
  waiting: 'انتظار',
  with_doctor: 'مع الطبيب',
  lab_pending: 'مختبر',
  imaging_pending: 'تصوير',
  payment_pending: 'دفع',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  no_show: 'غائب',
};

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'secondary' | 'success' | 'error'> = {
  waiting: 'info',
  with_doctor: 'warning',
  lab_pending: 'secondary',
  imaging_pending: 'secondary',
  payment_pending: 'warning',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
};

/**
 * Lists every patient the inpatient admission system has ever registered into
 * the clinic (DoctorVisit::patient.from_admission), filterable by name/phone
 * and a creation-date range. Picking a row makes it the doctor portal's
 * active patient, regardless of which doctor the visit is assigned to.
 */
const AdmittedPatientsDialog: React.FC<AdmittedPatientsDialogProps> = ({ open, onClose, onSelectVisit }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeoutId);
  }, [search, open]);

  const { data: visits = [], isLoading, isFetching } = useQuery<ActivePatientVisit[]>({
    queryKey: ['activePatients', 'admittedDialog', debouncedSearch, dateFrom, dateTo],
    queryFn: () =>
      getActiveClinicPatients({
        from_admission: true,
        search: debouncedSearch || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: open,
  });

  const handleRowClick = (visit: ActivePatientVisit) => {
    onSelectVisit(visit);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { minHeight: '70vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BedDouble size={22} />
        مرضى التنويم
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', md: 'row' } }}>
          <TextField
            size="small"
            placeholder="البحث بالاسم أو الهاتف..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: '100%', md: 280 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#666" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            size="small"
            type="date"
            label="من تاريخ"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', md: 170 } }}
          />
          <TextField
            size="small"
            type="date"
            label="إلى تاريخ"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', md: 170 } }}
          />
          {isFetching && <CircularProgress size={22} sx={{ alignSelf: 'center' }} />}
        </Box>

        {!isLoading && visits.length === 0 && (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
            <BedDouble size={40} />
            <Typography variant="body2">لا يوجد مرضى تنويم مطابقون لمعايير البحث</Typography>
          </Box>
        )}

        {visits.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '55vh' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الهاتف</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>العمر</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ التسجيل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    إجراء
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow
                    key={visit.id}
                    hover
                    onClick={() => handleRowClick(visit)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{visit.patient.name}</TableCell>
                    <TableCell>{visit.patient.phone || '—'}</TableCell>
                    <TableCell>{visit.patient.full_age || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={visit.company ? visit.company.name : 'نقدي'}
                        color={visit.company ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{visit.created_at ? dayjs(visit.created_at).format('DD/MM/YYYY HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABELS[visit.status] ?? visit.status} color={STATUS_COLORS[visit.status] ?? 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="outlined" onClick={(event) => { event.stopPropagation(); handleRowClick(visit); }}>
                        فتح
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdmittedPatientsDialog;
