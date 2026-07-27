import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { getSameFileVisits } from '@/services/visitService';
import type { DoctorVisit } from '@/types/visits';

interface FileVisitsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Any visit belonging to the file — used to resolve the file's other visits. */
  visitId: number | null;
  /** Highlighted as the current row; clicking it is a no-op. */
  currentVisitId?: number | null;
  /** Switches the workspace to the clicked visit and closes the dialog. */
  onSelectVisit: (visitId: number) => void;
}

const FileVisitsDialog: React.FC<FileVisitsDialogProps> = ({
  isOpen, onOpenChange, visitId, currentVisitId, onSelectVisit,
}) => {
  const { data: visits = [], isLoading } = useQuery<DoctorVisit[]>({
    queryKey: ['sameFileVisits', visitId],
    queryFn: () => getSameFileVisits(visitId!),
    enabled: isOpen && !!visitId,
  });

  const handleRowClick = (id: number) => {
    if (id === currentVisitId) return;
    onSelectVisit(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="md">
      <DialogTitle>زيارات نفس الملف</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : visits.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={5}>
            لا توجد زيارات أخرى لهذا الملف
          </Typography>
        ) : (
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center">رقم الزيارة</TableCell>
                <TableCell align="center">تاريخ الزيارة</TableCell>
                <TableCell align="center">الطبيب</TableCell>
                <TableCell align="right">اسم المريض</TableCell>
                <TableCell align="center">وقت الزيارة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visits.map(v => {
                const isCurrent = v.id === currentVisitId;
                return (
                  <TableRow
                    key={v.id}
                    hover={!isCurrent}
                    onClick={() => handleRowClick(v.id)}
                    sx={
                      isCurrent
                        ? { bgcolor: 'primary.50', fontWeight: 600, borderInlineStart: 4, borderColor: 'primary.main' }
                        : { cursor: 'pointer' }
                    }
                  >
                    <TableCell align="center">{v.id}</TableCell>
                    <TableCell align="center">
                      {v.visit_date ?? '—'}
                      {isCurrent && (
                        <Typography component="span" variant="caption" color="primary" fontWeight={700} sx={{ ms: 0.5 }}>
                          {' '}(الحالية)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{v.doctor?.name ?? v.doctor_name ?? 'غير محدد'}</TableCell>
                    <TableCell>{v.patient?.name ?? '—'}</TableCell>
                    <TableCell align="center">{v.visit_time_formatted ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onOpenChange(false)}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileVisitsDialog;
