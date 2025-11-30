import React, { useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import type { FirestoreSpecialist, FirestoreDoctor } from '@/services/firestoreSpecialistService';
import './SpecialistsTabs.css';

interface SpecialistsTabsProps {
  specialists: FirestoreSpecialist[] | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedSpecialistId: string | null;
  onSelectSpecialist: (specialistId: string) => void;
  doctors?: FirestoreDoctor[];
  doctorAppointmentCounts?: Record<string, number>;
}

const SpecialistsTabs: React.FC<SpecialistsTabsProps> = ({ 
  specialists, 
  isLoading, 
  error, 
  selectedSpecialistId,
  onSelectSpecialist,
  doctors,
  doctorAppointmentCounts = {}
}) => {
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Scroll active tab into view when selectedSpecialistId changes
  useEffect(() => {
    if (selectedSpecialistId && tabRefs.current[selectedSpecialistId]) {
      const timeoutId = setTimeout(() => {
        const activeTab = tabRefs.current[selectedSpecialistId];
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
  }, [selectedSpecialistId]);

  // Calculate doctor count per specialist
  const specialistDoctorCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!doctors || !specialists) return counts;
    
    specialists.forEach((specialist) => {
      const specialistDoctors = doctors.filter(
        (doctor) => doctor.specialistId === specialist.id
      );
      counts[specialist.id] = specialistDoctors.length;
    });
    
    return counts;
  }, [doctors, specialists]);

  // Calculate total appointment count per specialist
  const specialistAppointmentCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!doctors || !specialists) return counts;
    
    specialists.forEach((specialist) => {
      const specialistDoctors = doctors.filter(
        (doctor) => doctor.specialistId === specialist.id
      );
      const totalAppointments = specialistDoctors.reduce((sum, doctor) => {
        return sum + (doctorAppointmentCounts[doctor.id] || 0);
      }, 0);
      counts[specialist.id] = totalAppointments;
    });
    
    return counts;
  }, [doctors, specialists, doctorAppointmentCounts]);

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
          فشل في تحميل التخصصات
        </Typography>
        <Typography className="error-message">
          {error.message || 'حدث خطأ غير متوقع'}
        </Typography>
      </Box>
    </Paper>
  );

  if (!specialists || specialists.length === 0) {
    return (
      <Paper className="flex justify-center items-center h-full">
        <Typography className="">
          لا توجد تخصصات متاحة
        </Typography>
      </Paper>
    );
  }

  return (
    <Box 
      sx={{ overflowY: 'visible', overflowX: 'auto', width: '100%' }}
    >
      <Box   
        className="specialists-tabs-flex-container" 
        sx={{ 
          overflowY: 'visible',
          overflowX: 'auto',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          scrollBehavior: 'smooth',
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
          scrollbarWidth: 'thin',
          scrollbarColor: '#3b82f6 rgba(0, 0, 0, 0.05)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        {specialists.map((specialist) => {
          const isActive = selectedSpecialistId === specialist.id;
          const doctorCount = specialistDoctorCounts[specialist.id] || 0;
          const appointmentCount = specialistAppointmentCounts[specialist.id] || 0;

          // Determine CSS class based on state
          const getTabClassName = () => {
            if (isActive) {
              return 'specialist-tab specialist-tab--active';
            } else {
              return specialist.isActive 
                ? 'specialist-tab specialist-tab--inactive-active'
                : 'specialist-tab specialist-tab--inactive-inactive';
            }
          };

          return (
            <Box
              key={specialist.id}
              ref={(el) => {
                tabRefs.current[specialist.id] = el as HTMLDivElement | null;
              }}
              onClick={() => onSelectSpecialist(specialist.id)}
              className={getTabClassName()}
              sx={{ position: 'relative' }}
            >
              {/* Doctor Count Badge - Top Left Corner */}
              {doctorCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    left: -8,
                    backgroundColor: '#3b82f6', // blue-500
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
                  }}
                  title={`عدد الأطباء: ${doctorCount}`}
                >
                  {doctorCount > 99 ? '99+' : doctorCount}
                </Box>
              )}

              {/* Appointment Count Badge - Top Right Corner */}
              {appointmentCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
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
                    animation: appointmentCount > 0 ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.1)' },
                      '100%': { transform: 'scale(1)' }
                    }
                  }}
                  title={`عدد المواعيد: ${appointmentCount}`}
                >
                  {appointmentCount > 99 ? '99+' : appointmentCount}
                </Box>
              )}

              {/* Specialist Name */}
              <Typography
                style={{ fontWeight: 'bold' }}
                className={`specialist-name ${isActive ? 'specialist-name--active' : ''}`}
                title={specialist.specName}
              >
                {specialist.specName}
              </Typography>

              {/* Active Tab Indicator */}
              {isActive && (
                <Box
                  className="active-tab-indicator active-tab-indicator--specialist"
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default SpecialistsTabs;

