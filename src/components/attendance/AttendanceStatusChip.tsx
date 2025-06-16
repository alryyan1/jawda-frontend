// src/components/attendance/AttendanceStatusChip.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Chip from '@mui/material/Chip'; // Using MUI Chip for this example
import type { AttendanceRecord } from '@/types/attendance'; // Assuming status is part of this
import { cn } from '@/lib/utils';

interface AttendanceStatusChipProps {
  status: AttendanceRecord['status'];
  size?: 'small' | 'medium';
  className?: string;
}

const AttendanceStatusChip: React.FC<AttendanceStatusChipProps> = ({ status, size = 'small', className }) => {
  const { t } = useTranslation(['attendance', 'common']);

  const getStatusProperties = (): { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' } => {
    switch (status) {
      case 'present':
        return { label: t('attendance:statusEnum.present'), color: 'success' };
      case 'absent':
        return { label: t('attendance:statusEnum.absent'), color: 'error' };
      case 'late_present':
        return { label: t('attendance:statusEnum.late_present'), color: 'warning' };
      case 'early_leave':
        return { label: t('attendance:statusEnum.early_leave'), color: 'warning' };
      case 'on_leave':
        return { label: t('attendance:statusEnum.on_leave'), color: 'info' };
      case 'sick_leave':
        return { label: t('attendance:statusEnum.sick_leave'), color: 'info' };
      case 'holiday':
        return { label: t('attendance:statusEnum.holiday'), color: 'default' }; // Or a specific color like 'secondary'
      case 'off_day':
        return { label: t('attendance:statusEnum.off_day'), color: 'default' };
      default:
        return { label: status, color: 'default' };
    }
  };

  const { label, color } = getStatusProperties();

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant="outlined"
      className={cn("font-medium", className)}
      sx={{ 
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem', // 11px or 12px
        height: size === 'small' ? '20px' : '24px',
        padding: '0 6px',
        '& .MuiChip-label': {
            paddingLeft: '6px',
            paddingRight: '6px',
        }
       }}
    />
  );
};

export default AttendanceStatusChip;