// src/pages/HomePage.tsx (Dashboard)
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
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
import {
  Loader2,
  Users,
  Stethoscope,
  TrendingUp,
  CalendarCheck2,
  BriefcaseMedical,
  LogIn,
  LogOut,
} from "lucide-react";
import type { Shift } from "@/types/shifts";
import type { DashboardSummary } from "@/types/dashboard";
import { getCurrentOpenShift, openNewShift } from "@/services/shiftService";
import { getDashboardSummary } from "@/services/dashboardService";
import CloseShiftDialog from "@/components/dashboard/CloseShiftDialog"; // Import the dialog
import { format } from "date-fns"; // For formatting dates/times
import { arSA, enUS } from "date-fns/locale"; // For localized date formatting
import { toast } from "sonner";

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  unit?: string;
  action?: React.ReactNode;
}> = ({ title, value, icon: Icon, unit, action }) => (
  <Card className="shadow-lg hover:shadow-xl transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {value}
        {unit && (
          <span className="text-xs text-muted-foreground ltr:ml-1 rtl:mr-1">
            {unit}
          </span>
        )}
      </div>
      {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
    </CardContent>
    {action && <CardFooter>{action}</CardFooter>}
  </Card>
);

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const queryClient = useQueryClient();
  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false);

  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const {
    data: currentOpenShift,
    isLoading: isLoadingShift,
    refetch: refetchOpenShift,
  } = useQuery<Shift | null, Error>({
    queryKey: ["currentOpenShift"],
    queryFn: getCurrentOpenShift,
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery<
    DashboardSummary,
    Error
  >({
    queryKey: ["dashboardSummary", currentOpenShift?.id], // Re-fetch summary when shift changes
    queryFn: () => getDashboardSummary(currentOpenShift?.id),
    enabled: !!user, // Only fetch if user is logged in
  });

  const openShiftMutation = useMutation({
    mutationFn: () => openNewShift({ pharmacy_entry: false }), // Example: default pharmacy_entry
    onSuccess: (newShift) => {
      toast.success(t("dashboard:shiftOpenedSuccess"));
      queryClient.setQueryData(["currentOpenShift"], newShift); // Manually update cache
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] }); // Invalidate summary
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("dashboard:shiftOpenedError")
      );
    },
  });

  const handleOpenShift = () => {
    if (currentOpenShift) {
      toast.info(
        t(
          "dashboard:shiftAlreadyOpenError",
          "There is already an open shift. Please close it first."
        )
      );
      return;
    }
    openShiftMutation.mutate();
  };

  const handleCloseShiftDialog = () => {
    setIsCloseShiftDialogOpen(true);
  };

  const isLoadingAnything =
    isLoadingShift || isLoadingSummary || openShiftMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("dashboard:title")}
          </h1>
          <p className="text-muted-foreground">
            {t("dashboard:welcomeMessage", {
              name: user?.name || t("common:user"),
            })}
          </p>
        </div>
        <div>
          {isLoadingShift ? (
            <Button disabled className="w-full sm:w-auto">
              <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />{" "}
              {t("common:loading")}
            </Button>
          ) : currentOpenShift ? (
            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground w-full sm:w-auto">
              <span>{t("dashboard:shiftId", { id: currentOpenShift.id })}</span>
              {currentOpenShift.created_at && (
                <span>
                  {t("dashboard:shiftOpenedAt", {
                    time: format(
                      new Date(currentOpenShift.created_at),
                      "PPpp",
                      { locale: dateLocale }
                    ),
                  })}
                </span>
              )}
              <Button
                onClick={handleCloseShiftDialog}
                variant="destructive"
                size="sm"
                className="mt-1 w-full"
              >
                <LogOut className="ltr:mr-2 rtl:ml-2 h-4 w-4" />{" "}
                {t("dashboard:closeCurrentShiftButton")}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleOpenShift}
              disabled={openShiftMutation.isPending}
              size="sm"
              className="w-full sm:w-auto"
            >
              {openShiftMutation.isPending ? (
                <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              )}
              {t("dashboard:openNewShiftButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      {isLoadingAnything && !summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium bg-muted h-4 w-3/4 rounded"></CardTitle>
                <div className="h-5 w-5 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-muted h-8 w-1/2 rounded mb-1"></div>
                <div className="text-xs text-muted-foreground bg-muted h-3 w-1/3 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoadingAnything && summary && currentOpenShift && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("dashboard:patientsToday")}
            value={summary.patientsToday}
            icon={Users}
          />
          <StatCard
            title={t("dashboard:doctorsOnShift")}
            value={summary.doctorsOnShift}
            icon={Stethoscope}
          />
          <StatCard
            title={t("dashboard:revenueToday")}
            value={summary.revenueToday.toLocaleString(i18n.language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            unit={t("dashboard:currencySymbol")}
            icon={TrendingUp}
          />
          <StatCard
            title={t("dashboard:appointmentsToday")}
            value={summary.appointmentsToday}
            icon={CalendarCheck2}
          />
        </div>
      )}

      {!currentOpenShift && !isLoadingShift && (
        <Card className="mt-6 text-center py-10 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
          <CardHeader>
            <BriefcaseMedical className="mx-auto h-12 w-12 text-amber-600 dark:text-amber-500 mb-2" />
            <CardTitle className="text-amber-700 dark:text-amber-400">
              {t("dashboard:noShiftOpen")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                "dashboard:noShiftOpenDescription",
                "Please open a new shift to start clinic operations and view today's statistics."
              )}
            </p>
            <Button
              onClick={handleOpenShift}
              disabled={openShiftMutation.isPending}
              size="lg"
            >
              {openShiftMutation.isPending ? (
                <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              )}
              {t("dashboard:openNewShiftButton")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* More dashboard content, charts, quick links can go here */}
      {/* <pre className="text-xs bg-slate-800 text-slate-200 p-2 rounded overflow-auto">
        Shift: {JSON.stringify(currentOpenShift, null, 2)} <br/>
        Summary: {JSON.stringify(summary, null, 2)}
      </pre> */}

      {currentOpenShift && (
        <CloseShiftDialog
          openShift={currentOpenShift}
          isOpen={isCloseShiftDialogOpen}
          onOpenChange={setIsCloseShiftDialogOpen}
          onShiftClosed={() => {
            // refetchOpenShift(); // Already invalidated by mutation
            setIsCloseShiftDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default HomePage;
