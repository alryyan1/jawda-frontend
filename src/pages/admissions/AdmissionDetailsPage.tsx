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
  Paper,
} from "@mui/material";
import { formatNumber } from "@/lib/utils";
import { ArrowLeft, FileText } from "lucide-react";
import DischargeDialog from "@/components/admissions/DischargeDialog";
import TransferDialog from "@/components/admissions/TransferDialog";
import AdmissionServicesList from "@/components/admissions/AdmissionServicesList";
import VitalSignsList from "@/components/admissions/VitalSignsList";
import { useState } from "react";
import {
  generateServicesPdf,
  generatePatientDetailsPdf,
  generateVitalSignsPdf,
  generateFullAdmissionPdf,
  generateFilePdf,
  downloadPdf,
} from "@/services/admissionPdfService";
import { getAdmissionServices } from "@/services/admissionServiceService";
import { getAdmissionVitalSigns } from "@/services/admissionVitalSignService";
import { Menu, MenuItem } from "@mui/material";

export default function AdmissionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState<null | HTMLElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
          <Typography color="error">حدث خطأ أثناء جلب بيانات التنويم</Typography>
        </CardContent>
      </Card>
    );
  }

  const roomTypeLabel = admissionData.room?.room_type === 'normal' ? 'عادي' : admissionData.room?.room_type === 'vip' ? 'VIP' : '';
  const roomDisplay = admissionData.room?.room_number 
    ? `${admissionData.room.room_number}${roomTypeLabel ? ` (${roomTypeLabel})` : ''}`
    : '-';
  
  // Calculate room charges
  const daysAdmitted = admissionData.days_admitted ?? 0;
  const pricePerDay = admissionData.room?.price_per_day ?? 0;
  const roomCharges = daysAdmitted * pricePerDay;

  const handlePdfMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setPdfMenuAnchor(event.currentTarget);
  };

  const handlePdfMenuClose = () => {
    setPdfMenuAnchor(null);
  };

  const handleGeneratePdf = async (type: 'services' | 'patient' | 'vital-signs' | 'full' | 'file') => {
    if (!admissionData) return;
    setGeneratingPdf(true);
    handlePdfMenuClose();

    try {
      let blob: Blob;
      const filename = `admission-${admissionData.id}-${type}-${new Date().toISOString().split('T')[0]}.pdf`;

      switch (type) {
        case 'services': {
          const services = await getAdmissionServices(admissionData.id);
          blob = await generateServicesPdf(admissionData, services);
          break;
        }
        case 'patient':
          blob = await generatePatientDetailsPdf(admissionData);
          break;
        case 'vital-signs': {
          const vitalSigns = await getAdmissionVitalSigns(admissionData.id);
          blob = await generateVitalSignsPdf(admissionData, vitalSigns);
          break;
        }
        case 'full': {
          const [services, vitalSigns] = await Promise.all([
            getAdmissionServices(admissionData.id),
            getAdmissionVitalSigns(admissionData.id),
          ]);
          blob = await generateFullAdmissionPdf(admissionData, services, vitalSigns);
          break;
        }
        case 'file': {
          const [services, vitalSigns] = await Promise.all([
            getAdmissionServices(admissionData.id),
            getAdmissionVitalSigns(admissionData.id),
          ]);
          blob = await generateFilePdf(admissionData, services, vitalSigns);
          break;
        }
      }

      downloadPdf(blob, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

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
              <Typography variant="h5">تفاصيل التنويم</Typography>
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FileText size={16} />}
                onClick={handlePdfMenuOpen}
                disabled={generatingPdf}
              >
                طباعة PDF
              </Button>
              {admissionData.status === 'admitted' && (
                <>
                  <Button variant="outlined" color="info" onClick={() => setTransferDialogOpen(true)}>
                    نقل
                  </Button>
                  <Button variant="contained" color="error" onClick={() => setDischargeDialogOpen(true)}>
                    إخراج
                  </Button>
                </>
              )}
            </Box>
          }
        />
        <CardContent sx={{ flex: 1, overflowY: 'auto', pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Days Admitted Counter */}
            {admissionData.status === 'admitted' && (
              <Paper
                elevation={3}
                sx={{
                  p: 1,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                  عدد أيام الإقامة
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {admissionData.days_admitted ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  يوم
                </Typography>
              </Paper>
            )}

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
                  {pricePerDay > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      السعر اليومي: {pricePerDay.toFixed(2)} ر.س
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>السرير</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.bed?.bed_number || '-'}</Typography>
                </Grid>
                {pricePerDay > 0 && daysAdmitted > 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        تكلفة الإقامة
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {formatNumber(roomCharges)} ر.س
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        ({daysAdmitted} يوم × {formatNumber(pricePerDay)} ر.س/يوم)
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Admission Details Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                تفاصيل التنويم
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>تاريخ التنويم</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.admission_date || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>وقت التنويم</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{admissionData.admission_time || '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>نوع التنويم</Typography>
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
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>سبب التنويم</Typography>
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

            {/* Vital Signs Section */}
            <Box>
              <Divider sx={{ my: 2 }} />
              <VitalSignsList admissionId={admissionData.id} />
            </Box>

            {/* Services Section */}
            <Box>
              <Divider sx={{ my: 2 }} />
              <AdmissionServicesList admissionId={admissionData.id} />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Menu
        anchorEl={pdfMenuAnchor}
        open={Boolean(pdfMenuAnchor)}
        onClose={handlePdfMenuClose}
      >
        <MenuItem onClick={() => handleGeneratePdf('services')}>
          طباعة الخدمات
        </MenuItem>
        <MenuItem onClick={() => handleGeneratePdf('patient')}>
          طباعة تفاصيل المريض
        </MenuItem>
        <MenuItem onClick={() => handleGeneratePdf('vital-signs')}>
          طباعة العلامات الحيوية
        </MenuItem>
        <MenuItem onClick={() => handleGeneratePdf('full')}>
          طباعة التقرير الكامل
        </MenuItem>
        <MenuItem onClick={() => handleGeneratePdf('file')}>
          طباعة الملف
        </MenuItem>
      </Menu>

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

