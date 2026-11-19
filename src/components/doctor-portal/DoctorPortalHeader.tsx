import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Stethoscope, BedDouble } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { cn } from '@/lib/utils';
import realtimeService from '@/services/realtimeService';
import { getDoctorById } from '@/services/doctorService';
import type { DoctorShift } from '@/types/doctors';
import type { ActivePatientVisit } from '@/types/patients';
import DoctorPortalControlsDialog from './DoctorPortalControlsDialog';
import DoctorPortalDatePicker from './DoctorPortalDatePicker';
import AdmittedPatientsDialog from './AdmittedPatientsDialog';

interface DoctorPortalHeaderProps {
  shift: DoctorShift | null;
  stats: {
    total: number;
    insurance: number;
    cash: number;
  };
  selectedDate: string;
  onDateChange: (date: string) => void;
  /** Called when a patient is picked from the "admitted patients" dialog — makes it the active patient. */
  onSelectAdmittedVisit: (visit: ActivePatientVisit) => void;
}

const DoctorPortalHeader: React.FC<DoctorPortalHeaderProps> = ({
  shift,
  stats,
  selectedDate,
  onDateChange,
  onSelectAdmittedVisit,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeMode();

  const { data: doctor } = useQuery({
    queryKey: ['doctor', user?.doctor_id],
    queryFn: () => getDoctorById(user!.doctor_id!).then(res => res.data),
    enabled: !!user?.doctor_id,
  });

  const doctorName = shift?.doctor_name ?? doctor?.name ?? '—';

  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(() => realtimeService.isEnabled());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(() => realtimeService.getConnectionStatus());

  useEffect(() => {
    const checkConnection = () => {
      setIsRealtimeConnected(realtimeService.getConnectionStatus());
    };
    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleRealtime = (): void => {
    const next = !realtimeService.isEnabled();
    realtimeService.setEnabled(next);
    setIsRealtimeEnabled(next);
    setIsRealtimeConnected(realtimeService.getConnectionStatus());
  };

  const handleLogout = async () => {
    await logout();
    navigate('/doctor-portal/login', { replace: true });
  };

  // F9 opens the controls dialog (date filter, stats, realtime/theme/logout)
  // instead of keeping them permanently visible in the header.
  const [isControlsDialogOpen, setIsControlsDialogOpen] = useState(false);
  const [isAdmittedPatientsDialogOpen, setIsAdmittedPatientsDialogOpen] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsControlsDialogOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-1 border-b bg-card px-6 py-3">
      {/* Doctor identity */}
      <div style={{ borderRadius: '15px' }} className={cn("flex min-w-0 items-center  p-2 gap-1",shift ? 'bg-[#00a63e3d]' : 'bg-red-200')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative shrink-0">
              <Avatar className="h-11 w-11 border">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Stethoscope className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                  shift ? 'bg-green-500' : 'bg-red-500'
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>{shift ? 'الورديه مفتوحة' : 'الورديه مغلقة'}</TooltipContent>
        </Tooltip>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate  font-semibold leading-tight">
              {doctorName}
            </h2>
            {shift && (
              <Badge variant="success" className="shrink-0">
                ورديه نشطة
              </Badge>
            )}
          </div>
          {shift?.doctor_specialist_name && (
            <p className="truncate text-xs ">
              {shift.doctor_specialist_name}
              <span className="mx-1.5 text-black">•</span>
              رقم الطبيب #{shift.doctor_id}
              <span className="mx-1.5 text-black">•</span>
              رقم الورديه #{shift.id}
            </p>
          )}
        </div>
      </div>

      {/* Stats, realtime/theme/logout moved into the F9 controls dialog */}
      <div className="flex items-center gap-2">
        <DoctorPortalDatePicker selectedDate={selectedDate} onDateChange={onDateChange} />
        <button
          type="button"
          onClick={() => setIsAdmittedPatientsDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
          title="مرضى التنويم"
        >
          <BedDouble className="h-3.5 w-3.5" />
          مرضى التنويم
        </button>
        <button
          type="button"
          onClick={() => setIsControlsDialogOpen(true)}
          className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
          title="عناصر التحكم (F9)"
        >
          F9
        </button>
      </div>

      <AdmittedPatientsDialog
        open={isAdmittedPatientsDialogOpen}
        onClose={() => setIsAdmittedPatientsDialogOpen(false)}
        onSelectVisit={onSelectAdmittedVisit}
      />

      <DoctorPortalControlsDialog
        open={isControlsDialogOpen}
        onOpenChange={setIsControlsDialogOpen}
        stats={stats}
        isRealtimeEnabled={isRealtimeEnabled}
        isRealtimeConnected={isRealtimeConnected}
        onToggleRealtime={toggleRealtime}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
    </header>
  );
};

export default DoctorPortalHeader;
