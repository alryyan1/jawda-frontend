import React, { useState } from 'react';
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
import Button from '@mui/material/Button';
import { Stethoscope, Plus } from 'lucide-react';
import type { DoctorVisit } from '@/types/visits';
import AddServicesDialog from '../AddServicesDialog';

interface ServicesSectionProps {
  visit: DoctorVisit | undefined;
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ visit }) => {
  const [addOpen, setAddOpen] = useState(false);
  const services = visit?.requested_services ?? [];

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Add dialog */}
      <AddServicesDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        visitId={visit.id}
      />

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={700}>
            الخدمات المطلوبة ({services.length})
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<Plus size={14} />}
            onClick={() => setAddOpen(true)}
            sx={{ fontSize: '0.75rem', py: 0.5 }}
          >
            إضافة خدمة
          </Button>
        </Box>

        {services.length === 0 && (
          <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
            <Stethoscope size={36} />
            <Typography variant="body2">لا توجد خدمات — اضغط "إضافة خدمة" لإضافة خدمة جديدة</Typography>
          </Box>
        )}
        {services.length > 0 && <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>الخدمة</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>المجموعة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>العدد</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>السعر</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>الحالة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>الدفع</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>ملاحظة الطبيب</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map(svc => (
                <TableRow key={svc.id} hover>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{svc.service?.name ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {svc.service?.service_group_name ?? svc.service?.service_group?.name ?? '—'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{svc.count}</TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{svc.price}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={svc.done ? 'مكتملة' : 'معلقة'}
                      size="small"
                      color={svc.done ? 'success' : 'default'}
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={svc.is_paid ? 'مدفوعة' : 'غير مدفوعة'}
                      size="small"
                      color={svc.is_paid ? 'success' : 'warning'}
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 150 }}>
                    <Typography noWrap variant="caption" title={svc.doctor_note}>
                      {svc.doctor_note || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>}

        {/* Financial summary */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 3,
            bgcolor: 'background.default',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">الإجمالي</Typography>
            <Typography variant="body2" fontWeight={700}>{visit.total_services_amount ?? 0}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">المدفوع</Typography>
            <Typography variant="body2" fontWeight={700} color="success.main">{visit.total_services_paid ?? 0}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">المتبقي</Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              color={(visit.balance_due ?? 0) > 0 ? 'error.main' : 'text.primary'}
            >
              {visit.balance_due ?? 0}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ServicesSection;
