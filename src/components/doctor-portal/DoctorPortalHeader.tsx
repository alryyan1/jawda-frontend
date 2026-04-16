import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { Stethoscope, Users, Building2, Banknote } from 'lucide-react';
import type { DoctorShift } from '@/types/doctors';

interface DoctorPortalHeaderProps {
  shift: DoctorShift | null;
  stats: {
    total: number;
    insurance: number;
    cash: number;
  };
}

interface StatTileProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, color, bgColor, icon }) => (
  <Paper
    elevation={0}
    sx={{
      px: 2,
      py: 1.25,
      borderRadius: 2,
      bgcolor: bgColor,
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      minWidth: 110,
      border: '1px solid',
      borderColor: `${color}30`,
    }}
  >
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1, color }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
        {label}
      </Typography>
    </Box>
  </Paper>
);

const DoctorPortalHeader: React.FC<DoctorPortalHeaderProps> = ({ shift, stats }) => {
  const isActive = shift?.status === true;

  return (
    <Paper
      elevation={0}
      square
      sx={{
        px: 3,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        flexWrap: 'wrap',
        bgcolor: 'background.paper',
      }}
    >
      {/* Doctor identity */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <Stethoscope size={22} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {shift?.doctor_name ?? 'الطبيب'}
          </Typography>
          {shift?.doctor_specialist_name && (
            <Typography variant="caption" color="text.secondary">
              {shift.doctor_specialist_name}
            </Typography>
          )}
        </Box>
        <Chip
          label={isActive ? 'نوبة نشطة' : 'لا توجد نوبة'}
          size="small"
          color={isActive ? 'success' : 'default'}
          sx={{ mr: 1 }}
        />
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* Stat tiles */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <StatTile
          label="إجمالي المرضى"
          value={stats.total}
          color="#6366f1"
          bgColor="rgba(99,102,241,0.08)"
          icon={<Users size={18} />}
        />
        <StatTile
          label="تأمين (شركة)"
          value={stats.insurance}
          color="#0ea5e9"
          bgColor="rgba(14,165,233,0.08)"
          icon={<Building2 size={18} />}
        />
        <StatTile
          label="نقدي"
          value={stats.cash}
          color="#22c55e"
          bgColor="rgba(34,197,94,0.08)"
          icon={<Banknote size={18} />}
        />
      </Box>

      {/* Shift time */}
      {shift?.formatted_start_time && (
        <>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="caption" color="text.secondary">بدء النوبة</Typography>
            <Typography variant="body2" fontWeight={600}>{shift.formatted_start_time}</Typography>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default DoctorPortalHeader;
