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
      <Paper className="flex justify-center items-center h-full">
        {/* <Box className="empty-content"> */}
          <Typography className="">
            لا توجد ورديات اطباء نشطة
          </Typography>
        
        {/* </Box> */}
      </Paper>
    );
  }
  // showJsonDialog(user,'user')
  return (
    <Box 
    sx={{ overflowY: 'visible',overflowX:'auto',width:`${window.innerWidth - 350}px` }}
    >
      <Box   
        className="doctors-tabs-flex-container" 
        sx={{ 
          overflowY: 'visible',
          overflowX: 'auto',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0, // Allow flex item to shrink below its content size
          scrollBehavior: 'smooth',
          // Webkit scrollbar styling
          '&::-webkit-scrollbar': {
            height: '10px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '5px',
            margin: '0 8px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
            borderRadius: '5px',
            border: '2px solid transparent',
            backgroundClip: 'content-box',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(45deg, #2563eb, #1e40af)',
              transform: 'scaleY(1.1)',
            },
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'linear-gradient(45deg, #2563eb, #1e40af)',
            transform: 'scaleY(1.1)',
          },
          '&::-webkit-scrollbar-corner': {
            background: 'transparent',
          },
          // Firefox scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: '#3b82f6 rgba(0, 0, 0, 0.05)',
          // Add subtle shadow for depth
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
            {doctorShifts.filter(shift =>shift.user_id_opened == user?.id || hasRole('admin') || user?.user_type == 'خزنه موحده' || user?.user_type == 'تامين').map((shift) => {
              const isActive = activeShiftId === shift.id;
              const isExamining = shift.is_examining;

              // showJsonDialog(shift,'shift')
              // Determine CSS class based on state
              const getTabClassName = () => {
                if (isActive) {
                  return isExamining 
                    ? 'doctor-tab doctor-tab--active-examining '
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
                    tabRefs.current[shift.id] = el as HTMLDivElement | null;
                  }}
                  onClick={() => onShiftSelect(shift)}
                  className={getTabClassName()}
                  sx={{ position: 'relative' }}
                >
                  {/* Patient Count Badge - Top Left Corner */}
                  {shift.patients_count > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -8,
                        left: -8,
                        backgroundColor: '#ef4444', // red-500
                        color: 'white',
                        borderRadius: '50%',
                        minWidth: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 10,
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        animation: shift.patients_count > 0 ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)' },
                          '50%': { transform: 'scale(1.1)' },
                          '100%': { transform: 'scale(1)' }
                        }
                      }}
                    >
                      {shift.patients_count > 99 ? '99+' : shift.patients_count}
                    </Box>
                  )}

                  {/* Doctor Name */}
                  <Typography
                  style={{fontWeight:'bold'}}
                    className={`text-black! doctor-name ${isActive ? 'doctor-name--active text-2xl font-bold text-white! ' : ''}`}
                    title={shift.doctor_name}
                  >
                    {shift.doctor_name}
                  </Typography>

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