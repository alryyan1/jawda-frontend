import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdmissionById } from "@/services/admissionService";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Button,
  Grid,
  Divider,
} from "@mui/material";
import { ArrowLeft, Edit } from "lucide-react";
import DischargeDialog from "@/components/admissions/DischargeDialog";
import TransferDialog from "@/components/admissions/TransferDialog";
import AdmissionServicesList from "@/components/admissions/AdmissionServicesList";
import { useState } from "react";

export default function AdmissionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const { data: admissionData, isLoading, error } = useQuery({
    queryKey: ['admission', id],
    queryFn: () => getAdmissionById(Number(id)).then(res => res.data),
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted': return 'success';
      case 'discharged': return 'default';
      case 'transferred': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'admitted': return 'مقيم';
      case 'discharged': return 'مخرج';
      case 'transferred': return 'منقول';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !admissionData) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">حدث خطأ أثناء جلب بيانات الإقامة</Typography>
        </CardContent>
      </Card>
    );
  }

  const roomTypeLabel = admissionData.room?.room_type === 'normal' ? 'عادي' : admissionData.room?.room_type === 'vip' ? 'VIP' : '';
  const roomDisplay = admissionData.room?.room_number 
    ? `${admissionData.room.room_number}${roomTypeLabel ? ` (${roomTypeLabel})` : ''}`
    : '-';

  return (
    <>
      <Card className="max-w-6xl mx-auto h-full flex flex-col">
        <CardHeader
          sx={{ flexShrink: 0 }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button component={Link} to="/admissions" startIcon={<ArrowLeft />} variant="outlined" size="small">
                رجوع
              </Button>
              <Typography variant="h5">تفاصيل الإقامة</Typography>
            </Box>
          }
          action={
            admissionData.status === 'admitted' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" color="info" onClick={() => setTransferDialogOpen(true)}>
                  نقل
                </Button>
                <Button variant="contained" color="error" onClick={() => setDischargeDialogOpen(true)}>
                  إخراج
                </Button>
              </Box>
            )
          }
        />
        <CardContent sx={{ flex: 1, overflowY: 'auto', pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Patient and Status Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                معلومات المريض
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>المريض</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.patient?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>الحالة</Typography>
                  <Chip
                    label={getStatusLabel(admissionData.status)}
                    color={getStatusColor(admissionData.status) as any}
                    size="medium"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Location Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                الموقع
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>القسم</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.ward?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>الغرفة</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{roomDisplay}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>السرير</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.bed?.bed_number || '-'}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Admission Details Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                تفاصيل الإقامة
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>تاريخ الإقامة</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.admission_date || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>وقت الإقامة</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.admission_time || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>نوع الإقامة</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.admission_type || '-'}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Discharge Details Section */}
            {admissionData.discharge_date && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                  تفاصيل الإخراج
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>تاريخ الإخراج</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.discharge_date}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>وقت الإخراج</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.discharge_time || '-'}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Medical Information Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                المعلومات الطبية
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>الطبيب</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.doctor?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>سبب الإقامة</Typography>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 400,
                    bgcolor: 'background.paper',
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    minHeight: '48px'
                  }}>
                    {admissionData.admission_reason || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>التشخيص</Typography>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 400,
                    bgcolor: 'background.paper',
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    minHeight: '48px'
                  }}>
                    {admissionData.diagnosis || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Notes Section */}
            {admissionData.notes && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                  الملاحظات
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontWeight: 400,
                  bgcolor: 'background.paper',
                  p: 2,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  whiteSpace: 'pre-wrap'
                }}>
                  {admissionData.notes}
                </Typography>
              </Box>
            )}

            {/* Services Section */}
            <Box>
              <Divider sx={{ my: 2 }} />
              <AdmissionServicesList admissionId={admissionData.id} />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {admissionData && (
        <>
          <DischargeDialog
            open={dischargeDialogOpen}
            onClose={() => setDischargeDialogOpen(false)}
            admission={admissionData}
          />
          <TransferDialog
            open={transferDialogOpen}
            onClose={() => setTransferDialogOpen(false)}
            admission={admissionData}
          />
        </>
      )}
    </>
  );
}

