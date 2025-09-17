import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Loader2, AlertTriangle, DollarSign, Landmark, Coins } from 'lucide-react';
import type { LabUserShiftIncomeSummary } from '@/types/attendance';
import { fetchCurrentUserLabIncomeSummary } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/lib/utils';

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

  const queryKey = ['labUserShiftIncomeSummary', user?.id, currentClinicShiftId] as const;

  const { data: summary, isLoading, error, isFetching } = useQuery<LabUserShiftIncomeSummary, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!currentClinicShiftId) {
        // This should not happen if the dialog is opened correctly, but it's a good safeguard
        throw new Error("Active shift ID is required to fetch summary.");
      }
      return fetchCurrentUserLabIncomeSummary(currentClinicShiftId);
    },
    enabled: isOpen && !!user && !!currentClinicShiftId, // Fetch only when dialog is open and all IDs are available
  });

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

        <Box sx={{ py: 2 }}>
          {(isLoading || (isFetching && !summary)) && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 5,
              gap: 2
            }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                جاري التحميل...
              </Typography>
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertTriangle size={20} />
                <Typography variant="subtitle2">
                  فشل في جلب البيانات
                </Typography>
              </Box>
              <Typography variant="caption">
                {error.message}
              </Typography>
            </Alert>
          )}
          
          {summary && !isLoading && (
            <Card variant="outlined">
              <CardContent sx={{ pt: 3 }}>
                <Typography variant="h6" sx={{ textAlign: 'center', mb: 3, fontWeight: 'bold' }}>
                  إجمالي دخل المختبر
                </Typography>
                <DetailRow
                  label="إجمالي النقد"
                  value={formatNumber(summary.total_cash)}
                  icon={Coins}
                  unit="د.ك"
                  valueClass="text-blue-600 dark:text-blue-400"
                />
                <DetailRow
                  label="إجمالي البنك"
                  value={formatNumber(summary.total_bank)}
                  icon={Landmark}
                  unit="د.ك"
                  valueClass="text-purple-600 dark:text-purple-400"
                />
                <DetailRow
                  label="إجمالي الدخل"
                  value={formatNumber(summary.total_lab_income)}
                  icon={DollarSign}
                  unit="د.ك"
                  valueClass="text-xl text-green-600 dark:text-green-500"
                />
              </CardContent>
            </Card>
          )}
          
          {!summary && !isLoading && !isFetching && !error && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              لا توجد بيانات متاحة
            </Typography>
          )}
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