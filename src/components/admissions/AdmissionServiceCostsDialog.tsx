import { useQuery } from '@tanstack/react-query';
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
  CircularProgress,
  Typography,
} from '@mui/material';
import type { AdmissionRequestedService } from '@/types/admissions';
import { getAdmissionServiceCosts } from '@/services/admissionServiceService';

interface AdmissionServiceCostsDialogProps {
  open: boolean;
  onClose: () => void;
  service: AdmissionRequestedService;
}

export default function AdmissionServiceCostsDialog({
  open,
  onClose,
  service,
}: AdmissionServiceCostsDialogProps) {
  const { data: costs, isLoading } = useQuery({
    queryKey: ['admissionServiceCosts', service.id],
    queryFn: () => getAdmissionServiceCosts(service.id),
    enabled: open,
  });

  const totalCosts = costs?.reduce((sum, cost) => sum + cost.amount, 0) || 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">تفاصيل المصروفات</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {service.service?.name}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : costs && costs.length > 0 ? (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>نوع المصروف</TableCell>
                    <TableCell align="center">المبلغ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>
                        {cost.sub_service_cost?.name || cost.service_cost?.name || '-'}
                      </TableCell>
                      <TableCell align="center">{cost.amount.toFixed(2)} ر.س</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.contrastText' }}>
                إجمالي المصروفات: {totalCosts.toFixed(2)} ر.س
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              لا توجد مصروفات مسجلة لهذه الخدمة
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

