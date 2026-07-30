import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Stethoscope, Users, ShieldCheck, Banknote, LogOut, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { cn } from '@/lib/utils';
import realtimeService from '@/services/realtimeService';
import { getDoctorById } from '@/services/doctorService';
import type { DoctorShift } from '@/types/doctors';

interface DoctorPortalHeaderProps {
  shift: DoctorShift | null;
  stats: {
    total: number;
    insurance: number;
    cash: number;
  };
  selectedDate: string;
  onDateChange: (date: string) => void;
}

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, icon, className }) => (
  <div
    className={cn(
      'flex min-w-[82px] items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2',
      className
    )}
  >
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background shadow-sm">
      {icon}
    </div>
    <div className="flex flex-col leading-tight">
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[0.7rem] text-muted-foreground">{label}</span>
    </div>
  </div>
);

const DoctorPortalHeader: React.FC<DoctorPortalHeaderProps> = ({
  shift,
  stats,
  selectedDate,
  onDateChange,
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

      {/* Date filter */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="doctor-portal-date" className="text-[0.68rem] text-muted-foreground">
          التاريخ
        </Label>
        <Input
          id="doctor-portal-date"
          type="date"
          value={selectedDate}
          onChange={e => onDateChange(e.target.value)}
          className="h-9 w-[150px] text-[0.8rem]"
        />
      </div>

      {/* Stat tiles */}
      <div className="flex items-center gap-1">
        <StatTile
          label="الإجمالي"
          value={stats.total}
          icon={<Users className="h-4 w-4 text-foreground" />}
        />
        <Separator orientation="vertical" className="h-9" />
            <StatTile
          label="نقدي"
          value={stats.cash}
          icon={<Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />}
        />
        <StatTile
          label="تأمين"
          value={stats.insurance}
          icon={<ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
        />
    
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleRealtime}
              aria-label="realtime-toggle"
              className="text-muted-foreground"
            >
              {!isRealtimeEnabled ? (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              ) : isRealtimeConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <Wifi className="h-5 w-5 text-red-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {!isRealtimeEnabled
                ? 'التزامن اللحظي موقوف — اضغط للتفعيل'
                : isRealtimeConnected
                  ? 'التزامن اللحظي متصل — اضغط للإيقاف'
                  : 'التزامن اللحظي غير متصل — اضغط للإيقاف'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        title={theme === 'light' ? 'التبديل إلى الوضع المظلم' : 'التبديل إلى الوضع المضيء'}
        aria-label="تبديل المظهر"
        className="text-muted-foreground"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="تسجيل الخروج"
        aria-label="تسجيل الخروج"
        className="text-muted-foreground hover:text-destructive"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </header>
  );
};

export default DoctorPortalHeader;
