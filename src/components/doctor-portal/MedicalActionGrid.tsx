import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import {
  User,
  Stethoscope,
  FlaskConical,
  FileText,
  BookOpen,
  Activity,
  Scan,
  Pill,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivePatientVisit } from '@/types/patients';

export type SectionKey =
  | 'info'
  | 'services'
  | 'lab'
  | 'notes'
  | 'history'
  | 'vitals'
  | 'systems'
  | 'prescriptions';

interface ActionDef {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  placeholder?: boolean;
}

const ACTIONS: ActionDef[] = [
  { key: 'info',          label: 'بيانات المريض',    icon: User },
  { key: 'services',      label: 'الخدمات',           icon: Stethoscope },
  { key: 'lab',           label: 'المختبر',            icon: FlaskConical },
  { key: 'notes',         label: 'ملاحظات الزيارة',   icon: FileText },
  { key: 'history',       label: 'السجل الطبي',       icon: BookOpen },
  { key: 'vitals',        label: 'العلامات الحيوية',  icon: Activity },
  { key: 'systems',       label: 'مراجعة الأجهزة',   icon: Scan },
  { key: 'prescriptions', label: 'الوصفات الطبية',   icon: Pill, placeholder: true },
];

interface MedicalActionGridProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
  visit: ActivePatientVisit | null;
}

const MedicalActionGrid: React.FC<MedicalActionGridProps> = ({
  activeSection,
  onSectionChange,
  visit,
}) => {
  const getBadgeCount = (key: SectionKey): number | undefined => {
    if (!visit) return undefined;
    if (key === 'services') return visit.requested_services_count || undefined;
    if (key === 'lab') return visit.lab_requests?.length || undefined;
    return undefined;
  };

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <Grid container spacing={1} columns={8}>
        {ACTIONS.map(action => {
          const Icon = action.icon;
          const isActive = activeSection === action.key;
          const badgeCount = getBadgeCount(action.key);

          const card = (
            <Paper
              onClick={() => onSectionChange(action.key)}
              elevation={isActive ? 3 : 0}
              sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                borderRadius: 2,
                border: '1px solid',
                transition: 'all 0.15s ease',
                borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isActive
                  ? 'primary.main'
                  : action.placeholder
                    ? 'action.disabledBackground'
                    : 'background.paper',
                opacity: action.placeholder ? 0.6 : 1,
                '&:hover': {
                  borderColor: isActive ? 'primary.main' : 'primary.light',
                  bgcolor: isActive ? 'primary.dark' : 'primary.50',
                  transform: action.placeholder ? 'none' : 'translateY(-1px)',
                  boxShadow: action.placeholder ? 'none' : 2,
                },
              }}
            >
              <Icon
                size={20}
                className={cn(isActive ? 'text-white' : action.placeholder ? 'text-gray-400' : 'text-primary')}
              />
              <Typography
                variant="caption"
                textAlign="center"
                sx={{
                  fontSize: '0.65rem',
                  lineHeight: 1.2,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'white' : action.placeholder ? 'text.disabled' : 'text.primary',
                }}
              >
                {action.label}
              </Typography>
            </Paper>
          );

          return (
            <Grid item xs={1} key={action.key}>
              <Tooltip title={action.placeholder ? 'قريباً' : action.label} placement="top">
                <Box>
                  {badgeCount ? (
                    <Badge badgeContent={badgeCount} color="error" sx={{ width: '100%' }}>
                      {card}
                    </Badge>
                  ) : (
                    card
                  )}
                </Box>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default MedicalActionGrid;
