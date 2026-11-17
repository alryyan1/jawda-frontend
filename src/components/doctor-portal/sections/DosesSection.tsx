import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { MessageCircle, Plus, Syringe, Trash2 } from 'lucide-react';

import { getVisitDoses, updateVisitDose, deleteVisitDose } from '@/services/visitDoseService';
import AddDoseDialog from '../AddDoseDialog';
import SendDoseWhatsAppDialog from '../SendDoseWhatsAppDialog';
import type { DoctorVisit } from '@/types/visits';
import type { VisitDoseStatus } from '@/types/doses';
import dayjs from 'dayjs';

interface DosesSectionProps {
  visit: DoctorVisit | undefined;
}

const STATUS_OPTIONS: { value: VisitDoseStatus; label: string }[] = [
  { value: 'given', label: 'تم إعطاؤها' },
  { value: 'not_given', label: 'لم تُعطَ' },
  { value: 'postponed', label: 'مؤجلة' },
];

const STATUS_COLORS: Record<VisitDoseStatus, string> = {
  given: '#2e7d32',
  not_given: '#c62828',
  postponed: '#ed6c02',
};

const DosesSection: React.FC<DosesSectionProps> = ({ visit }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [whatsappDoseId, setWhatsappDoseId] = useState<number | null>(null);
  const visitId = visit?.id;

  const { data: doses = [], isLoading } = useQuery({
    queryKey: ['visitDoses', visitId],
    queryFn: () => getVisitDoses(visitId!),
    enabled: !!visitId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ doseId, status }: { doseId: number; status: VisitDoseStatus }) =>
      updateVisitDose(visitId!, doseId, { status }),
    onSuccess: () => {
      toast.success('تم تحديث حالة الجرعة');
      queryClient.invalidateQueries({ queryKey: ['visitDoses', visitId] });
    },
    onError: () => toast.error('فشل تحديث حالة الجرعة'),
  });

  const deleteMutation = useMutation({
    mutationFn: (doseId: number) => deleteVisitDose(visitId!, doseId),
    onSuccess: () => {
      toast.success('تم حذف الجرعة');
      queryClient.invalidateQueries({ queryKey: ['visitDoses', visitId] });
    },
    onError: () => toast.error('فشل حذف الجرعة'),
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
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Syringe size={18} />
          الجرعات المعطاة
        </Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
          تسجيل جرعة
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : doses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
          <Typography>لا توجد جرعات مسجلة لهذه الزيارة</Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الدواء</TableCell>
              <TableCell>الجرعة</TableCell>
              <TableCell>الوقت</TableCell>
              <TableCell>الممرض المسؤول</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>ملاحظات</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {doses.map((dose) => (
              <TableRow key={dose.id}>
                <TableCell>{dose.medication_name}</TableCell>
                <TableCell>{dose.dosage}</TableCell>
                <TableCell>{dayjs(dose.administered_at).format('DD/MM/YYYY HH:mm A')}</TableCell>
                <TableCell>{dose.administered_by?.name ?? '—'}</TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={dose.status}
                    disabled={statusMutation.isPending}
                    onChange={(e) =>
                      statusMutation.mutate({ doseId: dose.id, status: e.target.value as VisitDoseStatus })
                    }
                    sx={{ minWidth: 120, '& .MuiInputBase-input': { color: STATUS_COLORS[dose.status], fontWeight: 600 } }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>{dose.notes ?? '—'}</TableCell>
                <TableCell>
                  <Tooltip title="إرسال إشعار للمرافق عبر واتساب">
                    <IconButton size="small" color="success" onClick={() => setWhatsappDoseId(dose.id)}>
                      <MessageCircle size={16} />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(dose.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AddDoseDialog open={addOpen} onClose={() => setAddOpen(false)} visitId={visit.id} />
      <SendDoseWhatsAppDialog
        open={whatsappDoseId !== null}
        onClose={() => setWhatsappDoseId(null)}
        visitId={visit.id}
        doseId={whatsappDoseId}
      />
    </Box>
  );
};

export default DosesSection;
