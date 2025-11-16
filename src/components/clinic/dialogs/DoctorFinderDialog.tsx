// src/components/clinic/dialogs/DoctorFinderDialog.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  Box,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  Chip,
} from '@mui/material';
import { Users2, Stethoscope } from 'lucide-react';

import type { DoctorShift } from '@/types/doctors';
import { getActiveDoctorShifts } from '@/services/clinicService';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  
  onDoctorShiftSelect: (shift: DoctorShift) => void; // Callback when a doctor's shift is selected
}

const DoctorFinderDialog: React.FC<DoctorFinderDialogProps> = ({
  isOpen, onOpenChange, onDoctorShiftSelect
}) => {
  const { currentClinicShift } = useAuth();

  // State for DoctorFinderDialog visibility, now controlled by F9 too
  const [selectedSpecialistName, setSelectedSpecialistName] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'allShifts' | 'bySpecialist'>('allShifts');

  const { data: activeDoctorShifts = [], isLoading } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShiftsForFinderDialog', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id),
    enabled: isOpen, // Only fetch when dialog is open
  });

  const uniqueSpecialistsOnDuty = useMemo(() => {
    if (!activeDoctorShifts) return [];
    const specialistMap = new Map<string, number>(); // name -> count
    activeDoctorShifts.forEach(shift => {
      const specName = shift.doctor_specialist_name || 'غير محدد';
      specialistMap.set(specName, (specialistMap.get(specName) || 0) + 1);
    });
    return Array.from(specialistMap.entries()).map(([name, count]) => ({ name, count })).sort((a,b) => a.name.localeCompare(b.name));
  }, [activeDoctorShifts]);

  const filteredDoctorsBySpecialist = useMemo(() => {
    if (!selectedSpecialistName) return activeDoctorShifts; // Should not happen if bySpecialist tab active
    return activeDoctorShifts.filter(shift => 
      (shift.doctor_specialist_name || 'غير محدد') === selectedSpecialistName
    );
  }, [activeDoctorShifts, selectedSpecialistName]);
  
  // Reset specialist selection when main tab changes or dialog closes
  useEffect(() => {
    if (!isOpen || activeMainTab === 'allShifts') {
      setSelectedSpecialistName(null);
    }
    if (isOpen && activeMainTab === 'bySpecialist' && uniqueSpecialistsOnDuty.length > 0 && !selectedSpecialistName) {
        setSelectedSpecialistName(uniqueSpecialistsOnDuty[0].name); // Select first specialist by default
    }
  }, [isOpen, activeMainTab, uniqueSpecialistsOnDuty, selectedSpecialistName]);


  const handleDoctorSelectAndClose = (shift: DoctorShift) => {
    onDoctorShiftSelect(shift);
    onOpenChange(false);
  };

  const getInitials = (name?: string | null) => { /* ... (same getInitials function as in AppLayout) ... */ 
    if (!name?.trim()) return "Dr";
    const names = name.trim().split(" ");
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    if (names[0]) return names[0][0].toUpperCase();
    return "Dr";
  };


  const DoctorShiftCard: React.FC<{shift: DoctorShift}> = ({ shift }) => (
    <Card
      sx={{
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
      onClick={() => handleDoctorSelectAndClose(shift)}
    >
    
      <Typography variant="subtitle2" fontWeight="medium" textAlign="center">
        {shift.doctor_name}
      </Typography>
      <Typography variant="caption" color="text.secondary" textAlign="center">
        {shift.doctor_specialist_name || 'لا يوجد تخصص'}
      </Typography>
    </Card>
  );
 // NEW: useEffect for F9 keyboard shortcut


  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="lg"
      fullWidth
      dir="rtl"
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: '80vh',
          direction: 'rtl',
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        البحث عن الأطباء
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 3, pb: 2 }}>
        اختر طبيباً من القائمة النشطة
      </Typography>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'row-reverse', minHeight: 400 }}>
        {/* Side Tabs for All Shifts / Specialists */}
        <Box sx={{ 
          width: 200, 
          p: 2, 
          borderLeft: 1, 
          borderColor: 'divider',
          backgroundColor: 'grey.50',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Tabs
            orientation="vertical"
            value={activeMainTab}
            onChange={(_, value) => setActiveMainTab(value as 'allShifts' | 'bySpecialist')}
            sx={{ flexGrow: 1 }}
          >
            <Tab
              value="allShifts"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textAlign: 'right' }}>
                  <Users2 size={16} />
                  جميع النوبات النشطة
                </Box>
              }
              sx={{ 
                textAlign: 'right',
                alignItems: 'flex-start',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                }
              }}
            />
            <Tab
              value="bySpecialist"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textAlign: 'right' }}>
                  <Stethoscope size={16} />
                  حسب التخصص
                </Box>
              }
              disabled={uniqueSpecialistsOnDuty.length === 0}
              sx={{ 
                textAlign: 'right',
                alignItems: 'flex-start',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                }
              }}
            />
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {activeMainTab === 'bySpecialist' && (
            <>
              {/* Specialists List */}
              <Box sx={{ 
                width: 200, 
                p: 2, 
                borderLeft: 1, 
                borderColor: 'divider',
                overflow: 'auto'
              }}>
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {uniqueSpecialistsOnDuty.map(spec => (
                      <Chip
                        key={spec.name}
                        label={`${spec.name} (${spec.count})`}
                        variant={selectedSpecialistName === spec.name ? "filled" : "outlined"}
                        onClick={() => setSelectedSpecialistName(spec.name)}
                        sx={{ 
                          justifyContent: 'flex-start',
                          textAlign: 'right',
                          '& .MuiChip-label': { textAlign: 'right' }
                        }}
                      />
                    ))}
                    {!isLoading && uniqueSpecialistsOnDuty.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                        لا يوجد أطباء في النوبة
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              {/* Doctors Grid */}
              <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: 2 
                }}>
                  {filteredDoctorsBySpecialist.map(shift => (
                    <DoctorShiftCard key={shift.id} shift={shift} />
                  ))}
                  {!isLoading && selectedSpecialistName && filteredDoctorsBySpecialist.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      textAlign: 'center', 
                      py: 4, 
                      gridColumn: '1 / -1' 
                    }}>
                      لا يوجد أطباء لهذا التخصص
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          )}

          {activeMainTab === 'allShifts' && (
            <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: 2 
                }}>
                  {activeDoctorShifts.map(shift => (
                    <DoctorShiftCard key={shift.id} shift={shift} />
                  ))}
                  {!isLoading && activeDoctorShifts.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      textAlign: 'center', 
                      py: 10, 
                      gridColumn: '1 / -1' 
                    }}>
                      لا توجد نوبات نشطة
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button 
          variant="outlined" 
          onClick={() => onOpenChange(false)}
          sx={{ minWidth: 100 }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoctorFinderDialog;