// src/components/clinic/DoctorsTabs.tsx
import React, { useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { DoctorShift } from '@/types/doctors';
import type { Patient } from '@/types/patients';
import { getActiveDoctorShifts } from '@/services/clinicService';
import './DoctorsTabs.css';
import showJsonDialog from '@/lib/showJsonDialog';
import { useAuthorization } from '@/hooks/useAuthorization';

interface DoctorsTabsProps {
  onShiftSelect: (shift: DoctorShift | null) => void;
  activeShiftId: number | null;
  setSelectedPatientVisit: (visit: { patient: Patient; visitId: number } | null) => void;
}

const DoctorsTabs: React.FC<DoctorsTabsProps> = ({ onShiftSelect, activeShiftId }) => {
  const { currentClinicShift, user } = useAuth();
  const tabRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const { hasRole } = useAuthorization();
  // Use React Query to fetch doctor shifts
  // This will automatically update when shifts are opened/closed from ManageDoctorShiftsDialog
  const { 
    data: doctorShifts = [], 
    isLoading, 
    error 
  } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShifts', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id),
    enabled: !!currentClinicShift?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Scroll active tab into view when activeShiftId changes
  // This ensures that when a patient is selected from the search and their doctor shift
  // becomes active, the corresponding doctor tab is automatically scrolled into view
  useEffect(() => {
    if (activeShiftId && tabRefs.current[activeShiftId]) {
      // Small delay to ensure the DOM has updated
      const timeoutId = setTimeout(() => {
        const activeTab = tabRefs.current[activeShiftId];
        if (activeTab) {
          activeTab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [activeShiftId]);


  


  if (isLoading) return (
    <Paper className="loading-container">
      <Box className="loading-content">
        <CircularProgress size={24} />
        <Typography className="loading-text">
          جاري التحميل...
        </Typography>
      </Box>
    </Paper>
  );

  if (error) return (
    <Paper className="error-container">
      <Box className="error-content">
        <Typography className="error-title">
          فشل في تحميل الأطباء النشطين
        </Typography>
        <Typography className="error-message">
          {error.message || 'حدث خطأ غير متوقع'}
        </Typography>
      </Box>
    </Paper>
  );

  if (doctorShifts.length === 0 && !isLoading) {
    return (
      <Paper className="empty-container">
        <Box className="empty-content">
          <Typography className="empty-title">
            لا توجد نوبات نشطة
          </Typography>
          <Typography className="empty-description">
            لا يوجد أطباء في النوبة حالياً
          </Typography>
        </Box>
      </Paper>
    );
  }
  // showJsonDialog(user,'user')
  return (
      <Box sx={{
        width:`${window.innerWidth - 300}px`,
        overflowX:'auto'
      }} className="doctors-tabs-flex-wrapper">
    
          <Box className="doctors-tabs-flex-container">
            {doctorShifts.filter(shift =>shift.user_id_opened == user?.id || hasRole('admin')).map((shift) => {
              const isActive = activeShiftId === shift.id;
              const isExamining = shift.is_examining;

              // showJsonDialog(shift,'shift')
              // Determine CSS class based on state
              const getTabClassName = () => {
                if (isActive) {
                  return isExamining 
                    ? 'doctor-tab doctor-tab--active-examining'
                    : 'doctor-tab doctor-tab--active-not-examining';
                } else {
                  return isExamining
                    ? 'doctor-tab doctor-tab--inactive-examining'
                    : 'doctor-tab doctor-tab--inactive-not-examining';
                }
              };

              return (
                <Box
                  key={shift.id}
                  ref={(el) => {
                    tabRefs.current[shift.id] = el;
                  }}
                  onClick={() => onShiftSelect(shift)}
                  className={getTabClassName()}
                >
                  {/* Doctor Name */}
                  <Typography
                    variant="body2"
                    className={`doctor-name ${isActive ? 'doctor-name--active' : ''}`}
                    title={shift.doctor_name}
                  >
                    {shift.doctor_name}
                  </Typography>

                  {/* Status Indicators */}
                  <Box className="status-indicators">
                    {/* Patient Count Badge */}
                    {shift.patients_count > 0 && (
                      <span
                        className={`patient-count-badge ${
                          isActive 
                            ? 'patient-count-badge--active'
                            : isExamining
                              ? 'patient-count-badge--inactive-examining'
                              : 'patient-count-badge--inactive-not-examining'
                        }`}
                      >
                        {shift.patients_count}
                      </span>
                    )}
                  </Box>

                  {/* Active Tab Indicator */}
                  {isActive && (
                    <Box
                      className={`active-tab-indicator ${
                        isExamining 
                          ? 'active-tab-indicator--examining'
                          : 'active-tab-indicator--not-examining'
                      }`}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
      </Box>
  );
};

export default DoctorsTabs;