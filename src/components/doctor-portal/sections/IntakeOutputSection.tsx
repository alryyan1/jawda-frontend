import React, { useMemo, useState } from 'react';
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
import TableFooter from '@mui/material/TableFooter';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';

import { getVisitIntakeOutputs, deleteVisitIntakeOutput } from '@/services/visitIntakeOutputService';
import AddIntakeOutputDialog from '../AddIntakeOutputDialog';
import type { DoctorVisit } from '@/types/visits';

interface IntakeOutputSectionProps {
  visit: DoctorVisit | undefined;
}

const formatMl = (value: number): string => `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const IntakeOutputSection: React.FC<IntakeOutputSectionProps> = ({ visit }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const visitId = visit?.id;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['visitIntakeOutputs', visitId],
    queryFn: () => getVisitIntakeOutputs(visitId!),
    enabled: !!visitId,
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: number) => deleteVisitIntakeOutput(visitId!, entryId),
    onSuccess: () => {
      toast.success('تم حذف القراءة');
      queryClient.invalidateQueries({ queryKey: ['visitIntakeOutputs', visitId] });
    },
    onError: () => toast.error('فشل حذف القراءة'),
  });

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => ({
          feeding: acc.feeding + entry.feeding,
          iv_fluid: acc.iv_fluid + entry.iv_fluid,
          maintenance: acc.maintenance + entry.maintenance,
          urine_output: acc.urine_output + entry.urine_output,
          insensible_loss: acc.insensible_loss + entry.insensible_loss,
          total_intake: acc.total_intake + entry.total_intake,
          total_output: acc.total_output + entry.total_output,
          balance: acc.balance + entry.balance,
        }),
        {
          feeding: 0,
          iv_fluid: 0,
          maintenance: 0,
          urine_output: 0,
          insensible_loss: 0,
          total_intake: 0,
          total_output: 0,
          balance: 0,
        }
      ),
    [entries]
  );

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ direction: 'rtl', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Droplets size={18} />
          Input and Output chart
        </Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
          تسجيل قراءة
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : entries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
          <Typography>لا توجد قراءات مسجلة لهذه الزيارة</Typography>
        </Box>
      ) : (
        <TableContainer dir="rtl" component={Paper} variant="outlined">
          <Table size="small" sx={{ direction: 'rtl' }}>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell align="center">Feeding</TableCell>
                <TableCell align="center">IV fluid</TableCell>
                <TableCell align="center">Maintance</TableCell>
                <TableCell align="center">Urine pure</TableCell>
                <TableCell align="center">Essnspulless</TableCell>
                <TableCell align="center">Total intake</TableCell>
                <TableCell align="center">Total output</TableCell>
                <TableCell align="center">Balance</TableCell>
                <TableCell>Recorded by</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{dayjs(entry.recorded_at).format('DD/MM HH:mm')}</TableCell>
                  <TableCell align="center">{formatMl(entry.feeding)}</TableCell>
                  <TableCell align="center">{formatMl(entry.iv_fluid)}</TableCell>
                  <TableCell align="center">{formatMl(entry.maintenance)}</TableCell>
                  <TableCell align="center">{formatMl(entry.urine_output)}</TableCell>
                  <TableCell align="center">{formatMl(entry.insensible_loss)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{formatMl(entry.total_intake)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{formatMl(entry.total_output)}</TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, color: entry.balance >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {entry.balance >= 0 ? '+' : ''}{formatMl(entry.balance)}
                  </TableCell>
                  <TableCell>{entry.recorded_by?.name ?? '—'}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(entry.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.feeding)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.iv_fluid)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.maintenance)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.urine_output)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.insensible_loss)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.total_intake)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatMl(totals.total_output)}</TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 700, color: totals.balance >= 0 ? 'success.main' : 'error.main' }}
                >
                  {totals.balance >= 0 ? '+' : ''}{formatMl(totals.balance)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}

      <AddIntakeOutputDialog open={addOpen} onClose={() => setAddOpen(false)} visitId={visit.id} />
    </Box>
  );
};

export default IntakeOutputSection;
