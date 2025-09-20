// src/components/lab/workstation/ShiftFinderDialog.tsx (New File)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarToday, Close } from '@mui/icons-material';

import type { Shift } from '@/types/shifts';
import { getShiftsList } from '@/services/shiftService'; // Your existing service

interface ShiftFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftSelected: (shift: Shift) => void;
}

const ShiftFinderDialog: React.FC<ShiftFinderDialogProps> = ({
  isOpen, onOpenChange, onShiftSelected
}) => {
  const { t, i18n } = useTranslation(['labResults', 'common', 'shifts']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const shiftsQueryKey = ['shiftsByDateForFinder', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null] as const;

  const { data: shiftsOnDate, isLoading, error, isFetching } = useQuery<Shift[], Error>({
    queryKey: shiftsQueryKey,
    queryFn: () => {
      if (!selectedDate) return Promise.resolve([]);
      return getShiftsList({ per_page: 0 ,date_from: format(selectedDate, 'yyyy-MM-dd'),date_to: format(selectedDate, 'yyyy-MM-dd')}); // Fetch all shifts (you may need to add date filtering in the service)
    },
    enabled: isOpen && !!selectedDate,
  });

  const handleSelectShiftAndClose = (shift: Shift) => {
    onShiftSelected(shift);
    onOpenChange(false);
  };
  
  useEffect(() => {
    if (!isOpen) {
        // Optionally reset selectedDate when dialog closes, or keep it for next open
        // setSelectedDate(new Date()); 
    }
  }, [isOpen]);


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
      <Dialog 
        open={isOpen} 
        onClose={() => onOpenChange(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '85vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday color="primary" />
          {t('shifts:shiftFinder.dialogTitle')}
        </DialogTitle>
        
        <DialogContent sx={{ flexGrow: 1, overflow: 'hidden', p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('shifts:shiftFinder.dialogDescription')}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, height: '100%' }}>
            <Box sx={{ width: { md: '33%' }, display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Paper sx={{ p: 1 }}>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue || undefined)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Paper>
            </Box>
            
            <Box sx={{ width: { md: '67%' }, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2">
                    {selectedDate ? 
                      t('shifts:shiftFinder.shiftsOnDate', { date: format(selectedDate, 'PPP', {locale: dateLocale}) })
                      : t('shifts:shiftFinder.selectDatePrompt')
                    }
                  </Typography>
                </Box>
                
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                  {(isLoading || isFetching) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {t('common:error.fetchFailed')}: {error.message}
                    </Alert>
                  )}
                  
                  {!isLoading && !isFetching && !error && (!shiftsOnDate || shiftsOnDate.length === 0) && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ textAlign: 'center', py: 6 }}
                    >
                      {selectedDate ? t('shifts:shiftFinder.noShiftsFoundOnDate') : t('shifts:shiftFinder.selectDatePrompt')}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {shiftsOnDate?.map(shift => (
                      <Card 
                        key={shift.id} 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { 
                            boxShadow: 2,
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={() => handleSelectShiftAndClose(shift)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {shift.name || `${t('common:shift')} #${shift.id}`}
                            </Typography>
                            <Chip 
                              label={shift.is_closed ? t('shifts:status.closed') : t('shifts:status.open')}
                              color={shift.is_closed ? 'error' : 'success'}
                              size="small"
                              sx={{ fontSize: '0.6rem', height: 20 }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {t('common:openedAt')}: {format(parseISO(shift.created_at), 'p', {locale: dateLocale})}
                            {shift.user_opened && ` ${t('common:by')} ${shift.user_opened.name}`}
                            {shift.is_closed && shift.closed_at && 
                              ` | ${t('common:closedAt')}: ${format(parseISO(shift.closed_at), 'p', {locale: dateLocale})}`
                            }
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => onOpenChange(false)}
            variant="outlined"
            startIcon={<Close />}
          >
            {t('common:close')}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};
export default ShiftFinderDialog;