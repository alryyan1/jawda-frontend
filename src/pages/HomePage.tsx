import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext"; // To get current user
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"; // If needed for layout
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Users,
  Stethoscope,
  TrendingUp,
  CalendarCheck2,
  BriefcaseMedical,
  LogIn,
  LogOut,
  RefreshCw,
  AlertCircle,
  Info,
  Clock,
} from "lucide-react";
import type { Shift } from "@/types/shifts";
import type { DashboardSummary } from "@/types/dashboard";
import { getCurrentOpenShift, openNewShift } from "@/services/shiftService"; // closeShift is handled by dialog
import { getDashboardSummary } from "@/services/dashboardService";
import CloseShiftDialog from "@/components/dashboard/CloseShiftDialog";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Reusable Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  unit?: string;
  actionLink?: string;
  isLoading?: boolean;
  actionTextKey?: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  unit,
  actionLink,
  isLoading,
  actionTextKey,
  variant = "default",
  className,
}) => {
  const { t } = useTranslation("common");
  const variantClasses = {
    default: "text-primary",
    success: "text-green-500",
    warning: "text-amber-500",
    destructive: "text-red-500",
    info: "text-blue-500",
  };

  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow-lg transition-shadow dark:bg-slate-800/60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 sm:pt-4 px-4 sm:px-5">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-4 w-4 sm:h-5 sm:w-5",
            variantClasses[variant] || variantClasses.default
          )}
        />
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-3 sm:pb-4">
        {isLoading ? (
          <div className="h-10 flex items-center">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary/80" />
          </div>
        ) : (
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {value}
            {unit && (
              <span className="text-[10px] sm:text-xs text-muted-foreground ltr:ml-1 rtl:mr-1">
                {unit}
              </span>
            )}
          </div>
        )}
      </CardContent>
      {actionLink && !isLoading && (
        <CardFooter className="pt-0 pb-3 px-4 sm:px-5 border-t mt-2 sm:mt-3">
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

const HomePage: React.FC = () => {
  const { user } = useAuth(); // Get current user (for welcome message)
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const queryClient = useQueryClient();
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false);

  // --- React Query: Fetch Current Open Shift ---
  const openShiftQueryKey = ["currentOpenShiftForDashboard"] as const;
  const {
    data: currentOpenShift,
    isLoading: isLoadingShiftInitial, // True on first fetch if no cached data
    isFetching: isFetchingShift, // True on first fetch and subsequent refetches
    refetch: refetchOpenShift,
    isError: isOpenShiftError,
    error: openShiftErrorObj,
  } = useQuery<Shift | null, Error>({
    queryKey: openShiftQueryKey,
    queryFn: getCurrentOpenShift,
    refetchInterval: 2 * 60 * 1000, // Poll every 2 minutes for shift status
    refetchOnWindowFocus: true,
  });

  // --- React Query: Fetch Dashboard Summary ---
  // Summary depends on whether a shift is open or we're looking at "today's" general stats
  const summaryDate = useMemo(
    () => (currentOpenShift ? null : format(new Date(), "yyyy-MM-dd")),
    [currentOpenShift]
  );
  const dashboardSummaryQueryKey = [
    "dashboardSummary",
    currentOpenShift?.id,
    summaryDate,
  ] as const;

  const {
    data: summary,
    isLoading: isLoadingSummaryInitial,
    isFetching: isFetchingSummary,
    refetch: refetchSummary,
    isError: isSummaryError,
    error: summaryErrorObj,
  } = useQuery<DashboardSummary, Error>({
    queryKey: dashboardSummaryQueryKey,
    queryFn: () =>
      getDashboardSummary({
        shift_id: currentOpenShift?.id || null,
        date: summaryDate,
      }),
    enabled: !!user, // Only fetch if user is logged in
    // staleTime: 60 * 1000, // Summary data might be okay to be stale for a minute
  });

  // --- React Query: Mutations for Shift Management ---
  const openShiftMutation = useMutation({
    mutationFn: () => openNewShift({ pharmacy_entry: false }), // Pass any default params for new shift
    onSuccess: (newShift) => {
      toast.success(t("dashboard:shiftOpenedSuccess"));
      queryClient.setQueryData(openShiftQueryKey, newShift);
      // Invalidate summary to refetch with the new shift_id
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message || t("dashboard:shiftOpenedError")
      );
    },
  });

  // Note: CloseShiftDialog handles its own mutation to call `apiCloseShift`

  // --- Event Handlers ---
  const handleOpenShift = () => {
    if (currentOpenShift) {
      toast.info(t("dashboard:shiftAlreadyOpenError"));
      return;
    }
    openShiftMutation.mutate();
  };

  const handleTriggerCloseShiftDialog = () => {
    if (currentOpenShift) {
      setIsCloseShiftDialogOpen(true);
    } else {
      toast.error(t("dashboard:noShiftToCloseError"));
    }
  };

  const handleShiftActuallyClosed = () => {
    // This callback is triggered by CloseShiftDialog upon its successful mutation
    refetchOpenShift(); // Refetch current open shift status (should be null now)
    refetchSummary(); // Refetch summary (will now be for "today" if no shift open)
    setIsCloseShiftDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header: Welcome & Shift Management */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b dark:border-slate-700">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("welcomeMessage", { name: user?.name || t("common:user") })}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-1 text-xs text-muted-foreground w-full sm:w-auto min-w-[220px]">
          {isLoadingShiftInitial && currentOpenShift === undefined ? ( // Initial loading state for shift
            <div className="flex items-center justify-center w-full h-16 bg-slate-100 dark:bg-slate-800 rounded-md">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : isOpenShiftError ? (
            <div className="text-xs text-destructive p-2 border border-destructive/50 bg-destructive/10 rounded-md w-full text-center">
              {t("common:error.loadFailed", { entity: t("currentShift") })}
              <Button
                variant="link"
                size="xs"
                onClick={() => refetchOpenShift()}
                className="p-0 h-auto ltr:ml-1 rtl:mr-1"
              >
                {t("common:retry")}{" "}
                <RefreshCw className="h-3 w-3 ltr:ml-1 rtl:mr-1" />
              </Button>
            </div>
          ) : currentOpenShift ? (
            <Card className="w-full p-2.5 shadow-none border-dashed bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm text-green-700 dark:text-green-300">
                  {t("currentShiftActive")}
                </span>
                <Badge variant="success" className="text-xs">
                  {t("shiftId", { id: currentOpenShift.id })}
                </Badge>
              </div>
              {currentOpenShift.created_at && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {t("shiftOpenedAt", {
                      time: format(parseISO(currentOpenShift.created_at), "p", {
                        locale: dateLocale,
                      }),
                    })}
                  </span>
                </div>
              )}
              <Button
                onClick={handleTriggerCloseShiftDialog}
                variant="destructive"
                size="sm"
                className="mt-2 w-full h-8 text-xs"
              >
                <LogOut className="ltr:mr-1.5 rtl:ml-1.5 h-3.5 w-3.5" />{" "}
                {t("closeCurrentShiftButton")}
              </Button>
            </Card>
          ) : (
            <Card className="w-full p-2.5 shadow-none border-dashed bg-amber-50 dark:bg-amber-900/20 border-amber-500 dark:border-amber-700">
              <div className="text-center mb-1.5">
                <Info className="inline-block h-4 w-4 text-amber-600 dark:text-amber-400 ltr:mr-1 rtl:ml-1" />
                <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                  {t("noShiftOpen")}
                </span>
              </div>
              <Button
                onClick={handleOpenShift}
                disabled={openShiftMutation.isPending}
                size="sm"
                className="w-full h-8 text-xs"
              >
                {openShiftMutation.isPending ? (
                  <Loader2 className="ltr:mr-1.5 rtl:ml-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogIn className="ltr:mr-1.5 rtl:ml-1.5 h-3.5 w-3.5" />
                )}
                {t("openNewShiftButton")}
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("patientsToday")}
          value={summary?.patientsToday ?? (isFetchingSummary ? "" : "-")}
          icon={Users}
          isLoading={isLoadingSummaryInitial || isFetchingSummary}
          actionLink="/clinic" // Or a dedicated patient list for the day/shift
          actionTextKey="common:viewDetails" // Or common:manage
        />
        <StatCard
          title={t("doctorsOnShift")}
          value={summary?.doctorsOnShift ?? (isFetchingSummary ? "" : "-")}
          icon={Stethoscope}
          isLoading={isLoadingSummaryInitial || isFetchingSummary}
          // actionLink="/schedules-appointments" // Or /reports/doctor-shifts
        />
        <StatCard
          title={t("revenueToday")}
          value={
            summary?.revenueToday?.toLocaleString(
              i18n.language === "ar" ? "ar-EG" : "en-US",
              { minimumFractionDigits: 1, maximumFractionDigits: 1 }
            ) ?? (isFetchingSummary ? "" : "-")
          }
          unit={t("currencySymbol")}
          icon={TrendingUp}
          isLoading={isLoadingSummaryInitial || isFetchingSummary}
          variant="success"
          // actionLink="/reports/financial-summary"
        />
        <StatCard
          title={t("appointmentsToday")}
          value={summary?.appointmentsToday ?? (isFetchingSummary ? "" : "-")}
          icon={CalendarCheck2}
          isLoading={isLoadingSummaryInitial || isFetchingSummary}
          actionLink="/schedules-appointments"
          actionTextKey="common:manage"
        />
      </div>

      {/* Message if no shift is open and stats are for "today" */}
      {!currentOpenShift && !isLoadingShiftInitial && !isOpenShiftError && (
        <Card className="mt-6 text-center py-6 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
          <CardHeader className="pt-0 pb-2">
            <Info className="mx-auto h-8 w-8 text-blue-600 dark:text-blue-400 mb-1" />
            <CardTitle className="text-blue-700 dark:text-blue-300 text-base">
              {t("noShiftOpenStatsNoteTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t("noShiftOpenStatsNote")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Placeholder for other dashboard elements like charts or recent activity */}
      {/* 
      <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Recent Patient Registrations</CardTitle></CardHeader><CardContent><p>Chart/List TODO</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Upcoming Appointments</CardTitle></CardHeader><CardContent><p>List TODO</p></CardContent></Card>
      </div>
      */}

      {/* Close Shift Dialog */}
      {currentOpenShift && (
        <CloseShiftDialog
          openShift={currentOpenShift}
          isOpen={isCloseShiftDialogOpen}
          onOpenChange={setIsCloseShiftDialogOpen}
          onShiftClosed={handleShiftActuallyClosed}
        />
      )}
    </div>
  );
};

export default HomePage;
