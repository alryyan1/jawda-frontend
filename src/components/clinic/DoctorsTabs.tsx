git // src/components/clinic/DoctorsTabs.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

// MUI imports
import { Tabs, Tab, Box, IconButton } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';


import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import type { DoctorShift } from '@/types/doctors';
import { getActiveDoctorShifts } from '@/services/clinicService';

interface DoctorsTabsProps {
  onShiftSelect: (shift: DoctorShift | null) => void;
  activeShiftId: number | null;
  setSelectedPatientVisit: (visit: { patient: unknown; visitId: number } | null) => void;
}

const DoctorsTabs: React.FC<DoctorsTabsProps> = ({ onShiftSelect, activeShiftId }) => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  const isRTL = i18n.dir() === 'rtl';
  const { can } = useAuthorization();
  const { user } = useAuth();
  const { currentClinicShift } = useAuth();
  const { theme } = useTheme();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  // Create MUI theme that supports dark mode
  const muiTheme = createTheme({
    palette: {
      mode: theme === 'dark' ? 'dark' : 'light',
      primary: {
        main: theme === 'dark' ? '#3b82f6' : '#2563eb',
      },
      background: {
        default: theme === 'dark' ? '#0f0f23' : '#ffffff',
        paper: theme === 'dark' ? '#1a1a2e' : '#ffffff',
      },
      text: {
        primary: theme === 'dark' ? '#e5e7eb' : '#1f2937',
        secondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
      },
    },
    components: {
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              height: '3px',
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 'auto',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            minWidth: 'auto',
            '&.Mui-selected': {
              fontWeight: 600,
            },
          },
        },
      },
    },
  });

  const { data: doctorShifts, isLoading, error } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShifts', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id || undefined),
    refetchInterval: 30000,
  });

  // Filter doctor shifts to show only the shifts that the user has access to
  let filteredDoctorShifts: DoctorShift[] | undefined = [];
  if (can('list all_doctor_shifts')) {
    filteredDoctorShifts = doctorShifts;
  } else {
    filteredDoctorShifts = doctorShifts?.filter((ds) => ds.user_id === user?.id);
  }

  const checkScrollButtons = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;

      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const resizeObserver = new ResizeObserver(checkScrollButtons);
    if (tabsContainerRef.current) {
      resizeObserver.observe(tabsContainerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [filteredDoctorShifts]);

  useEffect(() => {
    if (!activeShiftId && filteredDoctorShifts && filteredDoctorShifts.length > 0) {
      onShiftSelect(filteredDoctorShifts[0]);
    } else if (activeShiftId && filteredDoctorShifts) {
      const currentActive = filteredDoctorShifts.find(ds => ds.id === activeShiftId);
      if (!currentActive && filteredDoctorShifts.length > 0) {
        onShiftSelect(filteredDoctorShifts[0]);
      } else if (!currentActive && filteredDoctorShifts.length === 0) {
        onShiftSelect(null);
      }
    }
  }, [activeShiftId, filteredDoctorShifts, onShiftSelect]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === -1) {
      onShiftSelect(null);
    } else if (filteredDoctorShifts) {
      onShiftSelect(filteredDoctorShifts[newValue]);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full border rounded-md p-2 bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="text-xs text-destructive p-2 border rounded-md bg-background">
      {t('common:error.fetchFailed', { entity: t('clinic:topNav.activeDoctors') })}
    </div>
  );

  if (!doctorShifts || doctorShifts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground border rounded-md p-2 bg-background">
        {t('clinic:doctorsTabs.noActiveShifts')}
      </div>
    );
  }

  const currentTabIndex = filteredDoctorShifts?.findIndex(ds => ds.id === activeShiftId) ?? 0;

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="h-full flex flex-col border rounded-lg bg-background shadow-sm overflow-hidden">
        <div className="relative flex-grow flex items-center">
          {showLeftButton && (
            <IconButton
              onClick={() => handleScroll(isRTL ? 'right' : 'left')}
              className="absolute left-1 z-10 h-8 w-8 bg-card/80 hover:bg-card shadow-md"
              size="small"
            >
              {isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </IconButton>
          )}

          <Box
            ref={tabsContainerRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            onScroll={checkScrollButtons}
            sx={{
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            <Tabs
              value={currentTabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons={false}
              allowScrollButtonsMobile
              className="min-h-0"
            >
                             {filteredDoctorShifts?.map((shift) => (
                <Tab
                  key={shift.id}
                  label={
                    <div className="flex flex-col items-center">
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium" title={shift.doctor_name}>
                          {shift.doctor_name}
                        </span>
                      </div>
                      <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                        {shift.patients_count > 0 && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[9px] h-4 leading-tight">
                            {shift.patients_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  }
                  className={cn(
                    "min-w-[120px]",
                    shift.is_examining ? "border-blue-500" : "border-green-500"
                  )}
                  sx={{
                    border: shift.is_examining ? '1px solid #3b82f6' : '1px solid #10b981',
                    borderRadius: '6px',
                    margin: '0 4px',
                    '&.Mui-selected': {
                      backgroundColor: shift.is_examining ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {showRightButton && (
            <IconButton
              onClick={() => handleScroll(isRTL ? 'left' : 'right')}
              className="absolute right-1 z-10 h-8 w-8 bg-card/80 hover:bg-card shadow-md"
              size="small"
            >
              {isRTL ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </IconButton>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DoctorsTabs;