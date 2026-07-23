import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import { ChevronDown, Pill, Plus, Printer, Trash2 } from 'lucide-react';

import {
  getVisitPrescriptions,
  deleteVisitPrescription,
  openVisitPrescriptionPdf,
} from '@/services/visitPrescriptionService';
import AddPrescriptionDialog from '../AddPrescriptionDialog';
import type { DoctorVisit } from '@/types/visits';

interface PrescriptionsSectionProps {
  visit: DoctorVisit | undefined;
}

const PrescriptionsSection: React.FC<PrescriptionsSectionProps> = ({ visit }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const visitId = visit?.id;

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['visitPrescriptions', visitId],
    queryFn: () => getVisitPrescriptions(visitId!),
    enabled: !!visitId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVisitPrescription(id),
    onSuccess: () => {
      toast.success('تم حذف الوصفة الطبية');
      queryClient.invalidateQueries({ queryKey: ['visitPrescriptions', visitId] });
    },
    onError: () => toast.error('فشل حذف الوصفة الطبية'),
  });

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          الوصفات الطبية
        </Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
          وصفة جديدة
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : prescriptions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
          <Typography>لا توجد وصفات طبية لهذه الزيارة</Typography>
        </Box>
      ) : (
        prescriptions.map((rx) => (
          <Accordion key={rx.id} defaultExpanded>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Pill size={16} />
                <Typography variant="body2" fontWeight={600}>
                  وصفة #{rx.id} — {new Date(rx.created_at).toLocaleString('ar-EG')}
                </Typography>
                <Chip label={`${rx.items.length} دواء`} size="small" sx={{ ml: 1 }} />
                <Box sx={{ flex: 1 }} />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openVisitPrescriptionPdf(rx.id);
                  }}
                >
                  <Printer size={16} />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(rx.id);
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الدواء</TableCell>
                    <TableCell>الجرعة</TableCell>
                    <TableCell>التكرار</TableCell>
                    <TableCell>المدة</TableCell>
                    <TableCell>تعليمات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rx.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.medication_name}</TableCell>
                      <TableCell>{item.dosage ?? '—'}</TableCell>
                      <TableCell>{item.frequency ?? '—'}</TableCell>
                      <TableCell>{item.duration ?? '—'}</TableCell>
                      <TableCell>{item.instructions ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rx.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  ملاحظات: {rx.notes}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <AddPrescriptionDialog open={addOpen} onClose={() => setAddOpen(false)} visitId={visit.id} />
    </Box>
  );
};

export default PrescriptionsSection;
