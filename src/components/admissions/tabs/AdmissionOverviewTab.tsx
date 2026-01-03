import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Paper,
} from '@mui/material';
import { formatNumber } from '@/lib/utils';
import type { Admission } from '@/types/admissions';

interface AdmissionOverviewTabProps {
  admission: Admission;
}

interface InfoItemProps {
  label: string;
  value: string | React.ReactNode;
  fullWidth?: boolean;
}

const InfoItem = ({ label, value, fullWidth = false }: InfoItemProps) => (
  <Box sx={{ flex: fullWidth ? '1 1 100%' : '1 1 auto', minWidth: { xs: '100%', sm: '200px' }, mb: 2 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
      {label}
    </Typography>
    <Typography variant="body1" sx={{ fontWeight: 500 }}>
      {value}
    </Typography>
  </Box>
);

export default function AdmissionOverviewTab({ admission }: AdmissionOverviewTabProps) {
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
      case 'discharged': return 'مُخرج';
      case 'transferred': return 'منقول';
      default: return status;
    }
  };

  const roomTypeLabel = admission.room?.room_type === 'normal' ? 'عادي' : admission.room?.room_type === 'vip' ? 'VIP' : '';
  const roomDisplay = admission.room?.room_number 
    ? `${admission.room.room_number}${roomTypeLabel ? ` (${roomTypeLabel})` : ''}`
    : '-';
  
  const daysAdmitted = admission.days_admitted ?? 0;
  const pricePerDay = admission.room?.price_per_day ?? 0;
  const roomCharges = daysAdmitted * pricePerDay;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.0 }}>
      {/* Days Admitted Counter */}
      {admission.status === 'admitted' && (
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, pb: 1.5, borderBottom: 2, borderColor: 'primary.main' }}>
              عدد أيام الإقامة
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {daysAdmitted}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                يوم
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Main Info Card */}
      <Card elevation={1}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, pb: 1.5, borderBottom: 2, borderColor: 'primary.main' }}>
            معلومات التنويم
          </Typography>
          
          {/* Patient Info Row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <InfoItem 
              label="المريض" 
              value={admission.patient?.name || '-'} 
            />
            <InfoItem 
              label="الحالة" 
              value={
                <Chip
                  label={getStatusLabel(admission.status)}
                  color={getStatusColor(admission.status) as any}
                  size="small"
                />
              } 
            />
          </Box>

          {/* Location Info Row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <InfoItem label="القسم" value={admission.ward?.name || '-'} />
            <InfoItem 
              label="الغرفة" 
              value={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {roomDisplay}
                  </Typography>
                  {pricePerDay > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      السعر اليومي: {formatNumber(pricePerDay)}
                    </Typography>
                  )}
                </Box>
              } 
            />
            <InfoItem label="السرير" value={admission.bed?.bed_number || '-'} />
          </Box>

          {/* Admission Dates Row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: pricePerDay > 0 && daysAdmitted > 0 ? 2.5 : 0, pb: pricePerDay > 0 && daysAdmitted > 0 ? 2.5 : 0, borderBottom: pricePerDay > 0 && daysAdmitted > 0 ? 1 : 0, borderColor: 'divider' }}>
            <InfoItem label="تاريخ التنويم" value={admission.admission_date || '-'} />
            <InfoItem label="وقت التنويم" value={admission.admission_time || '-'} />
            {admission.admission_type && (
              <InfoItem label="نوع التنويم" value={admission.admission_type} />
            )}
          </Box>

          {/* Room Charges */}
          {pricePerDay > 0 && daysAdmitted > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  تكلفة الإقامة
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {formatNumber(roomCharges)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  ({daysAdmitted} يوم × {formatNumber(pricePerDay)}/يوم)
                </Typography>
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Discharge Details */}
      {admission.discharge_date && (
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, pb: 1.5, borderBottom: 2, borderColor: 'primary.main' }}>
              تفاصيل الخروج
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <InfoItem label="تاريخ الخروج" value={admission.discharge_date} />
              <InfoItem label="وقت الخروج" value={admission.discharge_time || '-'} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Medical Information */}
      <Card elevation={1}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, pb: 1.5, borderBottom: 2, borderColor: 'primary.main' }}>
            المعلومات الطبية
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {admission.doctor?.name && (
              <InfoItem label="الطبيب" value={admission.doctor.name} fullWidth />
            )}
            {admission.specialist_doctor?.name && (
              <InfoItem label="الطبيب الأخصائي" value={admission.specialist_doctor.name} fullWidth />
            )}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                سبب التنويم
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                  {admission.admission_reason || '-'}
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                التشخيص الطبي
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                  {admission.diagnosis || '-'}
                </Typography>
              </Paper>
            </Box>
            {admission.provisional_diagnosis && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                  التشخيص المؤقت
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                    {admission.provisional_diagnosis}
                  </Typography>
                </Paper>
              </Box>
            )}
            {admission.operations && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                  العمليات (مع التواريخ)
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                    {admission.operations}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Notes Section */}
      {admission.notes && (
        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, pb: 1.5, borderBottom: 2, borderColor: 'primary.main' }}>
              الملاحظات الطبية
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2.5, 
                bgcolor: 'background.default',
                borderRadius: 1,
                minHeight: '80px'
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {admission.notes}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}


