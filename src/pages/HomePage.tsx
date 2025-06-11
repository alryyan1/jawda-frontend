// src/pages/HomePage.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Stethoscope,
  TrendingUp,
  CalendarCheck2,
  LogIn,
  LogOut,
  RefreshCw,
  Info,
  Clock,
  Settings,
  ShieldCheck, // For roles in quick actions if needed
  LayoutDashboard, // For quick actions
  TrendingDown, // For costs stat card
  ServerCrash, // For error display
} from "lucide-react";
import type { Shift } from "@/types/shifts"; // Only Shift is used
import type { DashboardSummary } from "@/types/dashboard";
import type { UserStripped } from "@/types/auth"; // For user names in shift card
import {
  getCurrentOpenShift,
  openNewShift,
  closeShift, // Using generic closeShift, assuming backend handles direct close
} from "@/services/shiftService";
import { getDashboardSummary } from "@/services/dashboardService";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
// import { Separator } from "@/components/ui/separator"; // Not used in this final layout
import { Skeleton } from "@/components/ui/skeleton";

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

const StatCard: React.FC<StatCardProps> = ({
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
  const { t } = useTranslation("common");
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
            variant="link"
            size="xs"
            asChild
            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
          >
            <Link to={actionLink}>{t(actionTextKey || "viewDetails")}</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
StatCard.displayName = "StatCard";

export { StatCard };

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
  const { t } = useTranslation(["navigation", "common", "dashboard"]); // Ensure 'dashboard' is used for descriptionKey
  return (
    <Button
      variant="outline"
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
            <p className="font-semibold text-sm">
              {t(labelKey, { ns: "navigation" })}
            </p>
            {descriptionKey && (
              <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                {t(descriptionKey, { ns: "dashboard" })}
              </p>
            )}
          </div>
        </div>
      </Link>
    </Button>
  );
};
QuickActionButton.displayName = "QuickActionButton";

// --- Shift Management Component ---
interface ShiftManagementCardProps {
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
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;
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

  const getUserName = (user?: UserStripped | null) =>
    user?.name || t("common:unknownUser");

  return (
    <Card className="overflow-hidden shadow-lg dark:shadow-primary/10">
      <div className="bg-gradient-to-br from-primary to-primary/80 dark:from-primary/90 dark:to-primary/70 p-5 sm:p-6 text-primary-foreground">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm opacity-90 mt-1">
              {t("welcomeMessage", { name: userName || t("common:user") })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isFetchingShift || isFetchingSummary}
            className="mt-2 sm:mt-0 text-primary-foreground hover:bg-white/20 rounded-full"
            aria-label={t("common:refresh")}
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
        {isLoadingShift && currentOpenShift === undefined ? (
          <div className="flex items-center justify-center h-20">
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : openShiftError ? (
          <div className="text-sm text-destructive p-3 border border-destructive/30 bg-destructive/10 dark:bg-destructive/20 rounded-md flex items-center gap-2">
            <ServerCrash className="h-5 w-5 flex-shrink-0" />
            <span>
              {t("common:error.loadFailed", { entity: t("currentShift") })}:{" "}
              {openShiftError.message}
            </span>
          </div>
        ) : currentOpenShift ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-green-50 dark:bg-green-800/20 border border-green-300 dark:border-green-700/50 rounded-lg shadow-sm">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 justify-center sm:justify-start">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-semibold text-sm">
                    {t("currentShiftActive")} (ID: {currentOpenShift.id})
                  </span>
                </div>
              </div>
              <AlertDialog
                open={isCloseShiftConfirmOpen}
                onOpenChange={setIsCloseShiftConfirmOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto shadow-sm hover:shadow-md"
                    onClick={handleCloseShiftTrigger}
                    disabled={isClosingShift}
                  >
                    {isClosingShift ? (
                      <Loader2 className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
                    )}
                    {t("closeCurrentShiftButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("closeShiftDialog.confirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("closeShiftDialog.confirmDirectCloseDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDialogConfirmClose}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {t("common:confirmAndClose")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Card className="p-3 text-xs border-dashed bg-slate-50 dark:bg-slate-800/30">
              {currentOpenShift.created_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {t("shiftOpenedAtFull")}:
                  </span>
                  <span className="font-medium">
                    {format(parseISO(currentOpenShift.created_at), "Pp", {
                      locale: dateLocale,
                    })}{" "}
                    {t("common:by")} {getUserName(currentOpenShift.user_opened)}
                  </span>
                </div>
              )}
              {currentOpenShift.is_closed && currentOpenShift.closed_at && (
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-dashed">
                  <span className="text-muted-foreground">
                    {t("shiftClosedAtFull")}:
                  </span>
                  <span className="font-medium">
                    {format(parseISO(currentOpenShift.closed_at), "Pp", {
                      locale: dateLocale,
                    })}{" "}
                    {t("common:by")} {getUserName(currentOpenShift.user_closed)}
                  </span>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-800/20 border border-amber-300 dark:border-amber-700/50 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 justify-center sm:justify-start">
              <Info className="h-4 w-4" />
              <span className="font-semibold text-sm">{t("noShiftOpen")}</span>
            </div>
            <Button
              onClick={onOpenShift}
              disabled={isOpeningShift}
              size="sm"
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md"
            >
              {isOpeningShift ? (
                <Loader2 className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
              )}
              {t("openNewShiftButton")}
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
  const { t } = useTranslation(["dashboard", "common", "navigation", "stats"]); // Added 'stats' namespace

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
    data: summary,
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
      refetchSummary();
      toast.success(t("common:shiftOpenedSuccessfully"));
    },
    onError: () => {
      toast.error(t("common:shiftOpenFailed"));
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (shiftId: number) => closeShift(shiftId), // Only pass shiftId
    onSuccess: () => {
      refetchOpenShift();
      refetchSummary();
      toast.success(t("common:shiftClosedSuccessfully"));
    },
    onError: () => {
      toast.error(t("common:shiftCloseFailed"));
    },
  });

  const handleRefreshAllData = useCallback(() => {
    toast.info(t("common:refreshingData"));
    refetchOpenShift();
    refetchSummary();
  }, [refetchOpenShift, refetchSummary, t]);

  const isLoadingOverall =
    isLoadingShiftInitial || (isLoadingSummaryInitial && !summary);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 md:space-y-8">
      <ShiftManagementCard
        currentOpenShift={currentOpenShift}
        isLoadingShift={isLoadingShiftInitial && currentOpenShift === undefined}
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

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoadingOverall ? (
          Array.from({ length: 5 }).map((_, index) => (
            <StatCard
              key={`skel-${index}`}
              title={t("common:loading")}
              value=""
              icon={Loader2}
              isLoading={true}
            />
          ))
        ) : (
          <>
            <StatCard
              title={t("patientsToday")}
              value={
                summary?.patientsToday ??
                (currentOpenShift || summaryDate ? 0 : "-")
              }
              icon={Users}
              variant="info"
              description={t("stats:patientsTodayDesc")}
              actionLink="/clinic"
            />
            <StatCard
              title={t("doctorsOnShift")}
              value={summary?.doctorsOnShift ?? (currentOpenShift ? 0 : "-")}
              icon={Stethoscope}
              description={t("stats:doctorsOnShiftDesc")}
            />
            <StatCard
              title={t("revenueToday")}
              value={
                summary
                  ? formatNumber(summary.revenueToday)
                  : currentOpenShift || summaryDate
                  ? "0.00"
                  : "-"
              }
              unit={t("common:currencySymbolShort")}
              icon={TrendingUp}
              variant="success"
              description={t("stats:revenueTodayDesc")}
            />
            <StatCard
              title={t("appointmentsToday")}
              value={
                summary?.appointmentsToday ??
                (currentOpenShift || summaryDate ? 0 : "-")
              }
              icon={CalendarCheck2}
              description={t("stats:appointmentsTodayDesc")}
              actionLink="/schedules-appointments"
            />
            <StatCard
              title={t("kpi.totalCostsToday")}
              value={
                // DashboardSummary does not have totalCostsToday, so fallback to 0 or "-"
                currentOpenShift || summaryDate ? "0.00" : "-"
              }
              unit={t("common:currencySymbolShort")}
              icon={TrendingDown}
              variant="warning"
              description={t("kpi.totalCostsTodayDesc")}
            />
          </>
        )}
      </div>

      {!currentOpenShift && !isLoadingShiftInitial && !openShiftError && (
        <Card className="text-center py-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30 shadow-sm">
          {/* ... No Shift Open Note ... */}
          <p>{t("noShiftOpen")}</p>
        </Card>
      )}
    </div>
  );
};

export default HomePage;
