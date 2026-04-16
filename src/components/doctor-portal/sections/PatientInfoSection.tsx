import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import type { DoctorVisit } from '@/types/visits';

interface PatientInfoSectionProps {
  visit: DoctorVisit | undefined;
}

interface InfoRowProps {
  label: string;
  value?: string | number | null;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

const GENDER_MAP: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
  other: 'آخر',
};

const SOCIAL_STATUS_MAP: Record<string, string> = {
  single: 'أعزب',
  married: 'متزوج',
  widowed: 'أرمل',
  divorced: 'مطلق',
};

const PatientInfoSection: React.FC<PatientInfoSectionProps> = ({ visit }) => {
  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  const p = visit.patient;
  const hasInsurance = !!p.company_id;

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Demographics */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 1.5 }}>
          البيانات الشخصية
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={4}>
            <InfoRow label="الاسم" value={p.name} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="رقم الهاتف" value={p.phone} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="الجنس" value={GENDER_MAP[p.gender] ?? p.gender} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="العمر" value={p.full_age ?? (p.age_year ? `${p.age_year} سنة` : null)} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="الرقم الوطني" value={p.gov_id} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="الحالة الاجتماعية" value={p.social_status ? SOCIAL_STATUS_MAP[p.social_status] : null} />
          </Grid>
          {p.address && (
            <Grid item xs={12}>
              <InfoRow label="العنوان" value={p.address} />
            </Grid>
          )}
          {p.email && (
            <Grid item xs={6} sm={4}>
              <InfoRow label="البريد الإلكتروني" value={p.email} />
            </Grid>
          )}
          {p.nationality && (
            <Grid item xs={6} sm={4}>
              <InfoRow label="الجنسية" value={p.nationality} />
            </Grid>
          )}
          {p.dob && (
            <Grid item xs={6} sm={4}>
              <InfoRow label="تاريخ الميلاد" value={p.dob} />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Insurance */}
      {hasInsurance && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              التأمين والشركة
            </Typography>
            <Chip
              label={(p.company as any)?.name ?? 'شركة'}
              size="small"
              sx={{ bgcolor: 'rgba(236,72,153,0.12)', color: 'rgb(219,39,119)', border: '1px solid rgba(236,72,153,0.3)' }}
            />
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={4}>
              <InfoRow label="رقم التأمين" value={p.insurance_no} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoRow label="الكفيل" value={p.guarantor} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoRow label="تاريخ الانتهاء" value={p.expire_date} />
            </Grid>
            {p.subcompany && (
              <Grid item xs={6} sm={4}>
                <InfoRow label="الشركة الفرعية" value={(p.subcompany as any)?.name} />
              </Grid>
            )}
            {p.company_relation && (
              <Grid item xs={6} sm={4}>
                <InfoRow label="العلاقة" value={(p.company_relation as any)?.name} />
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Visit info */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 1.5 }}>
          بيانات الزيارة
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={4}>
            <InfoRow label="رقم الملف" value={visit.file_id} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="رقم الزيارة" value={visit.number} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="تاريخ الزيارة" value={visit.visit_date} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="وقت الزيارة" value={visit.visit_time_formatted} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <InfoRow label="نوع الزيارة" value={visit.visit_type ?? (visit.is_new ? 'جديد' : 'متابعة')} />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PatientInfoSection;
