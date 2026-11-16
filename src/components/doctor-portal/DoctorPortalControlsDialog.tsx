import React from 'react';
import { Users, ShieldCheck, Banknote, LogOut, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/contexts/ThemeModeContext';

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}

// Collapsed by default (icon + number only); the label slides in via a
// max-width transition when the parent `.group` card is hovered.
const StatTile: React.FC<StatTileProps> = ({ label, value, icon, className }) => (
  <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5', className)}>
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background shadow-sm">
      {icon}
    </div>
    <span className="text-sm font-bold tabular-nums">{value}</span>
    <span
      className={cn(
        'max-w-0 overflow-hidden whitespace-nowrap text-[0.7rem] text-muted-foreground',
        'transition-[max-width,margin-inline-start] duration-300 ease-out',
        'group-hover:ms-0.5 group-hover:max-w-[70px]'
      )}
    >
      {label}
    </span>
  </div>
);

interface DoctorPortalControlsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    total: number;
    insurance: number;
    cash: number;
  };
  selectedDate: string;
  onDateChange: (date: string) => void;
  isRealtimeEnabled: boolean;
  isRealtimeConnected: boolean;
  onToggleRealtime: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => void;
}

// Opened via the F9 shortcut (see DoctorPortalHeader) — holds the controls
// that used to sit in the header at all times, to keep the header itself
// uncluttered.
const DoctorPortalControlsDialog: React.FC<DoctorPortalControlsDialogProps> = ({
  open,
  onOpenChange,
  stats,
  selectedDate,
  onDateChange,
  isRealtimeEnabled,
  isRealtimeConnected,
  onToggleRealtime,
  theme,
  onToggleTheme,
  onLogout,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>عناصر التحكم</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
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
          <div className="group flex w-fit items-center rounded-lg border bg-muted/40 transition-colors duration-300 hover:bg-muted/60">
            <StatTile
              label="الإجمالي"
              value={stats.total}
              icon={<Users className="h-3.5 w-3.5 text-foreground" />}
            />
            <Separator orientation="vertical" className="h-6" />
            <StatTile
              label="نقدي"
              value={stats.cash}
              icon={<Banknote className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
            />
            <Separator orientation="vertical" className="h-6" />
            <StatTile
              label="تأمين"
              value={stats.insurance}
              icon={<ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
            />
          </div>

          <Separator />

          {/* Realtime / theme / logout */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleRealtime}
              aria-label="realtime-toggle"
              className="text-muted-foreground"
              title={
                !isRealtimeEnabled
                  ? 'التزامن اللحظي موقوف — اضغط للتفعيل'
                  : isRealtimeConnected
                    ? 'التزامن اللحظي متصل — اضغط للإيقاف'
                    : 'التزامن اللحظي غير متصل — اضغط للإيقاف'
              }
            >
              {!isRealtimeEnabled ? (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              ) : isRealtimeConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <Wifi className="h-5 w-5 text-red-500" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
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
              onClick={onLogout}
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorPortalControlsDialog;
