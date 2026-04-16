import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { Male, Female } from '@mui/icons-material';
import type { ActivePatientVisit } from '@/types/patients';

interface PatientQueueCardProps {
  visit: ActivePatientVisit;
  isSelected: boolean;
  onSelect: (visit: ActivePatientVisit) => void;
}

type StatusKey =
  | 'waiting'
  | 'with_doctor'
  | 'lab_pending'
  | 'imaging_pending'
  | 'payment_pending'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const STATUS_CONFIG: Record<StatusKey, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; dot: string }> = {
  waiting:         { label: 'انتظار',      color: 'info',      dot: 'bg-blue-400' },
  with_doctor:     { label: 'مع الطبيب',  color: 'warning',   dot: 'bg-orange-400' },
  lab_pending:     { label: 'مختبر',       color: 'secondary', dot: 'bg-purple-400' },
  imaging_pending: { label: 'تصوير',       color: 'secondary', dot: 'bg-indigo-400' },
  payment_pending: { label: 'دفع',         color: 'warning',   dot: 'bg-yellow-400' },
  completed:       { label: 'مكتملة',      color: 'success',   dot: 'bg-green-400' },
  cancelled:       { label: 'ملغاة',       color: 'error',     dot: 'bg-red-400' },
  no_show:         { label: 'غائب',        color: 'error',     dot: 'bg-gray-400' },
};

const formatAge = (visit: ActivePatientVisit): string => {
  const p = visit.patient;
  if (p.full_age) return p.full_age;
  const parts: string[] = [];
  if (p.age_year) parts.push(`${p.age_year}س`);
  if (p.age_month) parts.push(`${p.age_month}ش`);
  if (p.age_day) parts.push(`${p.age_day}ي`);
  return parts.join(' ') || '—';
};

const PatientQueueCard: React.FC<PatientQueueCardProps> = ({ visit, isSelected, onSelect }) => {
  const status = (visit.status as StatusKey) || 'waiting';
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'default', dot: 'bg-slate-400' };
  const hasCompany = !!visit.patient.company_id;

  return (
    <Card
      onClick={() => onSelect(visit)}
      className={cn(
        'cursor-pointer transition-all duration-150 p-0 mb-2 overflow-hidden border',
        isSelected
          ? 'ring-2 ring-primary shadow-lg bg-primary/5 border-primary/40'
          : 'hover:shadow-md hover:bg-accent/30',
        hasCompany && !isSelected && 'border-pink-400/50'
      )}
    >
      <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: 40 }}>
        {/* Status bar (left edge) */}
        <Box
          className={cn('w-1.5 flex-shrink-0', cfg.dot)}
          sx={{ borderRadius: '0 0 0 0' }}
        />

        {/* Queue number badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            flexShrink: 0,
            px: 0.5,
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              bgcolor: visit.balance_due > 0 ? 'error.main' : 'success.main',
              color: 'white',
            }}
          >
            {visit.number || visit.queue_number || '—'}
          </Box>
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, py: 1, pr: 1, overflow: 'hidden' }}>
          {/* Name row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            {visit.patient.gender === 'male' ? (
              <Male sx={{ fontSize: 14, color: 'info.main' }} />
            ) : (
              <Female sx={{ fontSize: 14, color: 'error.light' }} />
            )}
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ flex: 1, fontSize: '0.8rem' }}
              title={visit.patient.name}
            >
              {visit.patient.name}
            </Typography>
        
          </Box>

        

        </Box>
      </Box>
    </Card>
  );
};

export default PatientQueueCard;
