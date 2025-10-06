import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LabUserShiftSummary from './LabUserShiftSummary';

// Reusable Detail Row sub-component for consistent styling
interface DetailRowProps {
  label: string;
  value?: string | number | null;
  icon?: React.ElementType;
  unit?: string;
  valueClass?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon: Icon, unit, valueClass }) => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    py: 1.5,
    borderBottom: 1,
    borderColor: 'divider',
    '&:last-child': {
      borderBottom: 0
    }
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {Icon && <Icon size={16} style={{ color: '#666' }} />}
      <Typography variant="body2" color="text.secondary">
        {label}:
      </Typography>
    </Box>
    <Typography 
      variant="body2" 
      sx={{ 
        fontWeight: 'semibold',
        ...(valueClass === 'text-blue-600 dark:text-blue-400' && { color: 'primary.main' }),
        ...(valueClass === 'text-purple-600 dark:text-purple-400' && { color: 'secondary.main' }),
        ...(valueClass === 'text-xl text-green-600 dark:text-green-500' && { 
          color: 'success.main',
          fontSize: '1.1rem',
          fontWeight: 'bold'
        })
      }}
    >
      {value === null || value === undefined ? '-' : value}
      {unit && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          {unit}
        </Typography>
      )}
    </Typography>
  </Box>
);

interface LabUserShiftSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentClinicShiftId: number | null;
}

const LabUserShiftSummaryDialog: React.FC<LabUserShiftSummaryDialogProps> = ({ isOpen, onOpenChange, currentClinicShiftId }) => {
  const { user } = useAuth();

  return (
    <Dialog 
      open={isOpen} 
      onClose={onOpenChange}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        ملخص دخل {user?.name || 'المستخدم'} - المختبر
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          رقم الوردية: {currentClinicShiftId || 'غير محدد'}
        </Typography>
        <Box sx={{ py: 1 }}>
          <LabUserShiftSummary />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => onOpenChange(false)}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default LabUserShiftSummaryDialog;