import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { FolderOpen } from 'lucide-react';
import { getSameFileVisits } from '@/services/visitService';
import type { DoctorVisit } from '@/types/visits';

interface FileVisitsSectionProps {
  visit: DoctorVisit | undefined;
  /** Switches the workspace to another visit from the same file, if the caller supports it. */
  onSelectVisit?: (visitId: number) => void;
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

const FileVisitsSection: React.FC<FileVisitsSectionProps> = ({ visit, onSelectVisit }) => {
  const visitId = visit?.id;

  const { data: visits = [], isLoading } = useQuery<DoctorVisit[]>({
    queryKey: ['sameFileVisits', visitId],
    queryFn: () => getSameFileVisits(visitId!),
    enabled: !!visitId,
  });

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            زيارات السابقه لنفس رقم الملف {visit.file_id ? `(رقم الملف ${visit.file_id})` : ''} — عدد الزيارات {visits.length}
          </Typography>
          {isLoading && <CircularProgress size={16} />}
        </Box>

        {!isLoading && visits.length === 0 && (
          <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
            <FolderOpen size={36} />
            <Typography variant="body2">لا توجد زيارات أخرى لهذا الملف</Typography>
          </Box>
        )}

        {visits.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>الطبيب</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>السبب أو الخدمات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map(v => {
                  const isCurrent = v.id === visitId;
                  const isClickable = !isCurrent && !!onSelectVisit;

                  return (
                    <TableRow
                      key={v.id}
                      hover={isClickable}
                      selected={isCurrent}
                      onClick={isClickable ? () => onSelectVisit(v.id) : undefined}
                      sx={{ cursor: isClickable ? 'pointer' : 'default' }}
                    >
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {v.visit_date || '—'}
                    
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {v.doctor?.name ?? v.doctor_name ?? 'غير محدد'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {v.reason_for_visit || v.requested_services_summary?.map(rs => rs.service_name).filter(Boolean).join(', ') || '—'}
                      </TableCell>
                   
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default FileVisitsSection;
