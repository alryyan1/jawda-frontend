import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Edit, Trash2, DollarSign, Receipt, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { AdmissionRequestedService } from '@/types/admissions';
import {
  getAdmissionServices,
  deleteAdmissionService,
} from '@/services/admissionServiceService';
import AddAdmissionServiceDialog from './AddAdmissionServiceDialog';
import AdmissionServiceCostsDialog from './AdmissionServiceCostsDialog';
import AdmissionServiceDepositsDialog from './AdmissionServiceDepositsDialog';

interface AdmissionServicesListProps {
  admissionId: number;
}

export default function AdmissionServicesList({ admissionId }: AdmissionServicesListProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editService, setEditService] = useState<AdmissionRequestedService | null>(null);
  const [costsDialogOpen, setCostsDialogOpen] = useState(false);
  const [depositsDialogOpen, setDepositsDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<AdmissionRequestedService | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ['admissionServices', admissionId],
    queryFn: () => getAdmissionServices(admissionId),
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) => deleteAdmissionService(admissionId, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissionServices', admissionId] });
      toast.success('تم حذف الخدمة بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حذف الخدمة');
    },
  });

  const handleDelete = (service: AdmissionRequestedService) => {
    if (service.is_paid) {
      toast.error('لا يمكن حذف خدمة مدفوعة');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف الخدمة "${service.service?.name}"؟`)) {
      deleteMutation.mutate(service.id);
    }
  };

  const handleViewCosts = (service: AdmissionRequestedService) => {
    setSelectedService(service);
    setCostsDialogOpen(true);
  };

  const handleViewDeposits = (service: AdmissionRequestedService) => {
    setSelectedService(service);
    setDepositsDialogOpen(true);
  };

  const handleEdit = (service: AdmissionRequestedService) => {
    setEditService(service);
    setAddDialogOpen(true);
  };

  const totalCost = services?.reduce((sum, s) => sum + (s.total_price || 0), 0) || 0;
  const totalPaid = services?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0;
  const totalBalance = services?.reduce((sum, s) => sum + (s.balance || 0), 0) || 0;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            الخدمات المطلوبة
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setEditService(null);
              setAddDialogOpen(true);
            }}
          >
            إضافة خدمة
          </Button>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              إجمالي التكلفة
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {totalCost.toFixed(2)} ر.س
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              إجمالي المدفوع
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {totalPaid.toFixed(2)} ر.س
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: totalBalance > 0 ? 'error.light' : 'success.light', color: 'common.white' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              الرصيد المستحق
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {totalBalance.toFixed(2)} ر.س
            </Typography>
          </Paper>
        </Box>
      </Box>

      {services && services.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            لا توجد خدمات مطلوبة لهذه الإقامة
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الخدمة</TableCell>
                <TableCell align="center">الكمية</TableCell>
                <TableCell align="center">السعر</TableCell>
                <TableCell align="center">الإجمالي</TableCell>
                <TableCell align="center">المدفوع</TableCell>
                <TableCell align="center">الرصيد</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services?.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {service.service?.name || '-'}
                    </Typography>
                    {service.service?.service_group && (
                      <Typography variant="caption" color="text.secondary">
                        {service.service.service_group.name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{service.count}</TableCell>
                  <TableCell align="center">{service.price.toFixed(2)}</TableCell>
                  <TableCell align="center">{service.total_price?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell align="center">{service.amount_paid.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: (service.balance || 0) > 0 ? 'error.main' : 'success.main',
                      }}
                    >
                      {service.balance?.toFixed(2) || '0.00'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={service.is_paid ? 'مدفوع' : 'غير مدفوع'}
                      color={service.is_paid ? 'success' : 'default'}
                      size="small"
                    />
                    {service.done && (
                      <Chip
                        label="مكتمل"
                        color="info"
                        size="small"
                        sx={{ ml: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="المصروفات">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewCosts(service)}
                        >
                          <Receipt size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="الدفعات">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleViewDeposits(service)}
                        >
                          <DollarSign size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(service)}
                          disabled={service.is_paid || deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddAdmissionServiceDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setEditService(null);
        }}
        admissionId={admissionId}
        editService={editService}
      />

      {selectedService && (
        <>
          <AdmissionServiceCostsDialog
            open={costsDialogOpen}
            onClose={() => {
              setCostsDialogOpen(false);
              setSelectedService(null);
            }}
            service={selectedService}
          />

          <AdmissionServiceDepositsDialog
            open={depositsDialogOpen}
            onClose={() => {
              setDepositsDialogOpen(false);
              setSelectedService(null);
            }}
            service={selectedService}
          />
        </>
      )}
    </>
  );
}

