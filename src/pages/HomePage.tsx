// src/pages/HomePage.tsx
import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Info,
  ShieldCheck,
  ServerCrash,
} from "lucide-react";
import type { Shift } from "@/types/shifts";
import type { DashboardSummary } from "@/types/dashboard";
import type { UserStripped } from "@/types/auth";
import {
  getCurrentOpenShift,
  openNewShift,
  closeShift,
  getCurrentShift,
} from "@/services/shiftService";
import { getDashboardSummary } from "@/services/dashboardService";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
// import { AxiosError } from "axios";

// --- Reusable Stat Card Component ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  actionLink?: string;
  actionTextKey?: string;
  isLoading?: boolean;
  variant?: "default" | "success" | "warning" | "info" | "danger";
  unit?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  actionLink,
  actionTextKey,
  isLoading,
  variant = "default",
  unit,
  className,
}) => {
  // i18n removed; use direct labels
  const colorClasses = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
    danger: "text-red-600 dark:text-red-400",
  };
  const bgGradientClasses = {
    default: "from-primary/20 to-primary/5",
    success:
      "from-green-500/20 to-green-500/5 dark:from-green-500/30 dark:to-green-500/10",
    warning:
      "from-amber-500/20 to-amber-500/5 dark:from-amber-500/30 dark:to-amber-500/10",
    info: "from-blue-500/20 to-blue-500/5 dark:from-blue-500/30 dark:to-blue-500/10",
    danger:
      "from-red-500/20 to-red-500/5 dark:from-red-500/30 dark:to-red-500/10",
  };

  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out flex flex-col",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4 px-4">
        <div className="space-y-0.5">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {isLoading ? (
            <Skeleton className="h-7 w-20 mt-1" />
          ) : (
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold",
                colorClasses[variant]
              )}
            >
              {value}
              {unit && (
                <span className="text-xs text-muted-foreground font-normal ml-1 rtl:mr-1">
                  {unit}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "p-2 rounded-lg bg-gradient-to-br",
            bgGradientClasses[variant]
          )}
        >
          <Icon
            className={cn("h-4 w-4 sm:h-5 sm:w-5", colorClasses[variant])}
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 flex-grow">
        {isLoading ? (
          <Skeleton className="h-4 w-full mt-1" />
        ) : (
          description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )
        )}
      </CardContent>
      {actionLink && !isLoading && (
        <CardFooter className="pt-2 pb-3 px-4 border-t mt-auto">
          <Button
            asChild
            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
          >
            <Link to={actionLink}>{actionTextKey || 'عرض التفاصيل'}</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
StatCard.displayName = "StatCard";

// --- Quick Action Button component ---
interface QuickActionProps {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  descriptionKey?: string;
  className?: string;
}
const QuickActionButton: React.FC<QuickActionProps> = ({
  to,
  labelKey,
  icon: Icon,
  descriptionKey,
  className,
}) => {
  // i18n removed; expect direct Arabic keys passed in
  return (
    <Button
      className={cn(
        "h-auto p-3 sm:p-4 flex flex-col items-start sm:items-center sm:text-center shadow-sm hover:shadow-lg hover:bg-muted/80 dark:hover:bg-muted/50 transition-all duration-300 w-full transform active:scale-95",
        className
      )}
      asChild
    >
      <Link to={to}>
        <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5">
          <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-full mb-0 sm:mb-2">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="text-left sm:text-center">
            <p className="font-semibold text-sm">{labelKey}</p>
            {descriptionKey ? (
              <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">{descriptionKey}</p>
            ) : null}
          </div>
        </div>
      </Link>
    </Button>
  );
};
QuickActionButton.displayName = "QuickActionButton";

// --- Shift Management Component ---
interface ShiftManagementCardProps {
  currentShift: Shift | null | undefined;
  currentOpenShift: Shift | null | undefined;
  isLoadingShift: boolean;
  openShiftError?: Error | null;
  isFetchingShift: boolean;
  isFetchingSummary: boolean;
  onOpenShift: () => void;
  onConfirmCloseShift: (shiftId: number) => void;
  onRefresh: () => void;
  isOpeningShift: boolean;
  isClosingShift: boolean;
  userName?: string;
}

const ShiftManagementCard: React.FC<ShiftManagementCardProps> = ({
  currentShift,
  currentOpenShift,
  isLoadingShift,
  openShiftError,
  isFetchingShift,
  isFetchingSummary,
  onOpenShift,
  onConfirmCloseShift,
  onRefresh,
  isOpeningShift,
  isClosingShift,
  userName,
}) => {
  const dateLocale = arSA;
  const [isCloseShiftConfirmOpen, setIsCloseShiftConfirmOpen] = useState(false);

  const handleCloseShiftTrigger = useCallback(() => {
    if (currentOpenShift) {
      setIsCloseShiftConfirmOpen(true);
    }
  }, [currentOpenShift]);

  const handleDialogConfirmClose = useCallback(() => {
    if (currentOpenShift) {
      onConfirmCloseShift(currentOpenShift.id);
    }
    setIsCloseShiftConfirmOpen(false);
  }, [currentOpenShift, onConfirmCloseShift]);

  const getUserName = (user?: UserStripped | null) => user?.name || 'مستخدم';

  return (
    <Card className="overflow-hidden shadow-lg dark:shadow-primary/10">
      <div className="bg-gradient-to-br from-primary to-primary/80 dark:from-primary/90 dark:to-primary/70 p-5 sm:p-6 text-primary-foreground">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">لوحة التحكم</h1>
            <p className="text-sm opacity-90 mt-1">{`مرحباً، ${userName || 'مستخدم'}`}</p>
          </div>
          <Button
            onClick={onRefresh}
            disabled={isFetchingShift || isFetchingSummary}
            className="mt-2 sm:mt-0 text-primary-foreground hover:bg-white/20 rounded-full"
            aria-label={'تحديث'}
          >
            {isFetchingShift || isFetchingSummary ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <CardContent className="p-4 md:p-6">
        {isLoadingShift && currentShift === undefined ? (
          <div className="flex items-center justify-center h-20">
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : openShiftError ? (
          <div className="text-sm text-destructive p-3 border border-destructive/30 bg-destructive/10 dark:bg-destructive/20 rounded-md flex items-center gap-2"><ServerCrash className="h-5 w-5 flex-shrink-0" /><span>{'فشل تحميل حالة الوردية الحالية'}:{" "}{openShiftError.message}</span></div>
        ) : currentShift ? (
          <div className="space-y-3">
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border rounded-lg shadow-sm ${
              currentShift.is_closed 
                ? "bg-red-50 dark:bg-red-800/20 border-red-300 dark:border-red-700/50"
                : "bg-green-50 dark:bg-green-800/20 border-green-300 dark:border-green-700/50"
            }`}>
              <div className="text-center sm:text-left">
                <div className={`flex items-center gap-2 justify-center sm:justify-start ${
                  currentShift.is_closed 
                    ? "text-red-700 dark:text-red-300"
                    : "text-green-700 dark:text-green-300"
                }`}>
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-semibold text-sm">{currentShift.is_closed ? 'الوردية مغلقة' : 'الوردية فعالة'} (ID: {currentShift.id})</span>
                </div>
              </div>
              {currentShift.is_closed ? (
                <Button
                  onClick={onOpenShift}
                  disabled={isOpeningShift}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md"
                >
                  {isOpeningShift ? (
                    <Loader2 className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
                  )}
                  {'فتح وردية جديدة'}
                </Button>
              ) : currentOpenShift && (
                <AlertDialog
                  open={isCloseShiftConfirmOpen}
                  onOpenChange={setIsCloseShiftConfirmOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full sm:w-auto shadow-sm hover:shadow-md"
                      onClick={handleCloseShiftTrigger}
                      disabled={isClosingShift}
                    >
                      {isClosingShift ? (
                        <Loader2 className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
                      )}
                      {'إغلاق الوردية الحالية'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد إغلاق الوردية</AlertDialogTitle>
                      <AlertDialogDescription>هل أنت متأكد من إغلاق الوردية الحالية؟</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{'إلغاء'}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDialogConfirmClose}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {'تأكيد وإغلاق'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Card className="p-3 text-xs border-dashed bg-slate-50 dark:bg-slate-800/30">
              {currentShift.created_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{'وقت فتح الوردية'}:</span>
                  <span className="font-medium">
                    {format(parseISO(currentShift.created_at), "Pp", {
                      locale: dateLocale,
                    })}{" "}
                    {'بواسطة'} {getUserName(currentShift.user_opened)}
                  </span>
                </div>
              )}
              {currentShift.is_closed && currentShift.closed_at && (
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-dashed">
                  <span className="text-muted-foreground">{'وقت إغلاق الوردية'}:</span>
                  <span className="font-medium">
                    {format(parseISO(currentShift.closed_at), "Pp", {
                      locale: dateLocale,
                    })}{" "}
                    {'بواسطة'} {getUserName(currentShift.user_closed)}
                  </span>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-800/20 border border-amber-300 dark:border-amber-700/50 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 justify-center sm:justify-start">
              <Info className="h-4 w-4" />
              <span className="font-semibold text-sm">{'لا توجد وردية مفتوحة'}</span>
            </div>
            <Button
              onClick={onOpenShift}
              disabled={isOpeningShift}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md"
            >
              {isOpeningShift ? (
                <Loader2 className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
              )}
              {'فتح وردية جديدة'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
ShiftManagementCard.displayName = "ShiftManagementCard";

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const openShiftQueryKey = ["currentOpenShift"] as const;
  const {
    data: currentOpenShift,
    isLoading: isLoadingShiftInitial, // Renamed for clarity for initial load
    isFetching: isFetchingShift,
    refetch: refetchOpenShift,
    error: openShiftError,
  } = useQuery<Shift | null, Error>({
    queryKey: openShiftQueryKey,
    queryFn: getCurrentOpenShift,
    // Removed refetchInterval - fetch only once
    refetchOnWindowFocus: true,
  });
    const {
    data: currentShift,
    isLoading: isLoadingShift,
    refetch: refetchShift,
  } = useQuery<Shift | null, Error>({
    queryKey: ["currentShift"],
    queryFn: getCurrentShift,
    refetchInterval: 1 * 60 * 1000, // Reduced to 1 minute for more responsive shift status
    refetchOnWindowFocus: true,
  });
  const summaryDate = useMemo(
    () =>
      !currentOpenShift && !isLoadingShiftInitial
        ? format(new Date(), "yyyy-MM-dd")
        : null,
    [currentOpenShift, isLoadingShiftInitial]
  );
  const dashboardSummaryQueryKey = [
    "dashboardSummary",
    currentOpenShift?.id,
    summaryDate,
  ] as const;

  const {
    // data: summary,
    isLoading: isLoadingSummaryInitial, // Renamed for clarity
    isFetching: isFetchingSummary,
    refetch: refetchSummary,
    error: summaryError,
  } = useQuery<DashboardSummary, Error>({
    queryKey: dashboardSummaryQueryKey,
    queryFn: () =>
      getDashboardSummary({
        shift_id: currentOpenShift?.id || null,
        date: summaryDate,
      }),
    enabled: !!user && !isLoadingShiftInitial, // Fetch summary only after initial shift status is known
  });

  const openShiftMutation = useMutation({
    mutationFn: () => openNewShift({ pharmacy_entry: false }),
    onSuccess: () => {
      refetchOpenShift();
      refetchShift();
      refetchSummary();
      toast.success('تم فتح الوردية بنجاح');
    },
    onError: () => {
      toast.error('فشل فتح الوردية');
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (shiftId: number) => closeShift(shiftId), // Only pass shiftId
    onSuccess: () => {
      refetchOpenShift();
      refetchShift();
      refetchSummary();
      toast.success('تم إغلاق الوردية بنجاح');
    },
    onError: () => {
      toast.error('فشل إغلاق الوردية');
    },
  });

  const handleRefreshAllData = useCallback(() => {
    toast.info('جاري التحديث');
    refetchOpenShift();
    refetchShift();
    refetchSummary();
  }, [refetchOpenShift, refetchShift, refetchSummary]);



  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 md:space-y-8">
      <ShiftManagementCard
        currentShift={currentShift}
        currentOpenShift={currentOpenShift}
        isLoadingShift={isLoadingShift || (isLoadingShiftInitial && currentShift === undefined)}
        openShiftError={openShiftError}
        isFetchingShift={isFetchingShift}
        isFetchingSummary={isFetchingSummary}
        onOpenShift={() => openShiftMutation.mutate()}
        onConfirmCloseShift={(shiftId) => closeShiftMutation.mutate(shiftId)}
        onRefresh={handleRefreshAllData}
        isOpeningShift={openShiftMutation.isPending}
        isClosingShift={closeShiftMutation.isPending}
        userName={user?.name}
      />

      {summaryError && !isLoadingSummaryInitial && (
        <Card className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
          {/* ... Error Display ... */}

        </Card>
      )}


      
    </div>
  );
};

export default HomePage;
