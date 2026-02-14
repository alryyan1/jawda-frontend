import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@mui/material";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  BedDouble,
  DoorOpen,
  Plus,
  Settings,
  ArrowRight,
  ClipboardList,
  Stethoscope,
  LayoutGrid,
} from "lucide-react";
import { getActiveAdmissions } from "@/services/admissionService";
import { getWardsList } from "@/services/wardService";
import { getRooms } from "@/services/roomService";
import { getBeds } from "@/services/bedService";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  count?: number;
  isLoading?: boolean;
  variant?: "default" | "primary" | "success" | "warning" | "info";
  actionText?: string;
}

const statCardStyles: Record<string, { bg: string; border: string; icon: string; hover: string }> = {
  admissions: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    hover: "hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700",
  },
  wards: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700",
  },
  rooms: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    hover: "hover:border-amber-300 hover:shadow-md dark:hover:border-amber-700",
  },
  beds: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    icon: "text-violet-600 dark:text-violet-400",
    hover: "hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700",
  },
};

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon: Icon,
  link,
  count,
  isLoading,
  variant = "default",
  actionText = "عرض",
}) => {
  const variantStyles = {
    default:
      "border border-border bg-card hover:border-primary/40 hover:shadow-lg",
    primary:
      "border border-primary/20 bg-primary/5 hover:border-primary/40 hover:shadow-lg",
    success:
      "border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-300 hover:shadow-lg dark:border-emerald-800 dark:hover:border-emerald-700",
    warning:
      "border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-300 hover:shadow-lg dark:border-amber-800 dark:hover:border-amber-700",
    info:
      "border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-300 hover:shadow-lg dark:border-blue-800 dark:hover:border-blue-700",
  };

  const iconBg = {
    default: "bg-primary/10 text-primary",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    info: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  };

  return (
    <Card
      className={cn(
        "rounded-2xl transition-all duration-300 cursor-pointer group overflow-hidden",
        variantStyles[variant],
      )}
    >
      <Link to={link} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold mb-0.5">
                {title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            </div>
            <div
              className={cn(
                "flex-shrink-0 p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-105",
                iconBg[variant],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-2">
            {isLoading ? (
              <Skeleton className="h-9 w-16 rounded-lg" />
            ) : count !== undefined ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums">{count}</span>
                <span className="text-xs text-muted-foreground">عنصر</span>
              </div>
            ) : null}
            <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {actionText}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default function AdmissionsDashboardPage() {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { data: activeAdmissions, isLoading: isLoadingActive } = useQuery({
    queryKey: ["activeAdmissions"],
    queryFn: () => getActiveAdmissions(),
  });

  const { data: wards, isLoading: isLoadingWards } = useQuery({
    queryKey: ["wardsList"],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data: roomsData, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["roomsCount"],
    queryFn: () =>
      getRooms(1, { per_page: 1 }).then((res) => ({ total: res.meta.total })),
  });

  const { data: bedsData, isLoading: isLoadingBeds } = useQuery({
    queryKey: ["bedsCount"],
    queryFn: () =>
      getBeds(1, { per_page: 1 }).then((res) => ({ total: res.meta.total })),
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-border/60">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsDialogOpen(true)}
              className="h-11 w-11 rounded-xl border-border/80 hover:bg-muted/80 shrink-0"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                نظام إدارة التنويم
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                لوحة التحكم الرئيسية لإدارة الأقسام والغرف والأسرّة
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="rounded-xl shadow-sm font-medium shrink-0">
            <Link to="/admissions/new">
              <Plus className="h-5 w-5 ml-2" />
              إضافة تنويم جديد
            </Link>
          </Button>
        </header>

        {/* Quick Stats */}
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            نظرة سريعة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admissions/list" className="block group">
              <Card
                className={cn(
                  "rounded-2xl border shadow-sm transition-all duration-300 h-full",
                  statCardStyles.admissions.bg,
                  statCardStyles.admissions.border,
                  statCardStyles.admissions.hover,
                )}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        قائمة التنويم
                      </p>
                      {isLoadingActive ? (
                        <Skeleton className="h-9 w-14 mt-2 rounded-lg" />
                      ) : (
                        <p
                          className={cn(
                            "text-2xl font-bold mt-1 tabular-nums",
                            statCardStyles.admissions.icon,
                          )}
                        >
                          {activeAdmissions?.length ?? 0}
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "p-3 rounded-xl",
                        statCardStyles.admissions.bg,
                        statCardStyles.admissions.icon,
                      )}
                    >
                      <ClipboardList className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card
              className={cn(
                "rounded-2xl border shadow-sm h-full",
                statCardStyles.wards.bg,
                statCardStyles.wards.border,
              )}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      الأقسام
                    </p>
                    {isLoadingWards ? (
                      <Skeleton className="h-9 w-14 mt-2 rounded-lg" />
                    ) : (
                      <p
                        className={cn(
                          "text-2xl font-bold mt-1 tabular-nums",
                          statCardStyles.wards.icon,
                        )}
                      >
                        {wards?.length ?? 0}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      statCardStyles.wards.bg,
                      statCardStyles.wards.icon,
                    )}
                  >
                    <Building2 className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "rounded-2xl border shadow-sm h-full",
                statCardStyles.rooms.bg,
                statCardStyles.rooms.border,
              )}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      الغرف
                    </p>
                    {isLoadingRooms ? (
                      <Skeleton className="h-9 w-14 mt-2 rounded-lg" />
                    ) : (
                      <p
                        className={cn(
                          "text-2xl font-bold mt-1 tabular-nums",
                          statCardStyles.rooms.icon,
                        )}
                      >
                        {roomsData?.total ?? 0}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      statCardStyles.rooms.bg,
                      statCardStyles.rooms.icon,
                    )}
                  >
                    <DoorOpen className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "rounded-2xl border shadow-sm h-full",
                statCardStyles.beds.bg,
                statCardStyles.beds.border,
              )}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      الأسرّة
                    </p>
                    {isLoadingBeds ? (
                      <Skeleton className="h-9 w-14 mt-2 rounded-lg" />
                    ) : (
                      <p
                        className={cn(
                          "text-2xl font-bold mt-1 tabular-nums",
                          statCardStyles.beds.icon,
                        )}
                      >
                        {bedsData?.total ?? 0}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      statCardStyles.beds.bg,
                      statCardStyles.beds.icon,
                    )}
                  >
                    <BedDouble className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main Actions */}
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            إجراءات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/admissions/visual" className="block group">
              <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 h-full overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                      <LayoutGrid className="h-10 w-10" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">
                        خريطة الغرف والأسرّة
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        عرض الغرف والأسرّة ونقل التنويم
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        عرض الخريطة
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Settings Dialog */}
        <Dialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogContent sx={{ py: 3 }}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border/60">
                <div className="p-2 rounded-lg bg-muted">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">الإعدادات والإدارة</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <DashboardCard
                  title="إدارة الأقسام"
                  description="إضافة وتعديل الأقسام"
                  icon={Building2}
                  link="/settings/wards"
                  count={wards?.length}
                  isLoading={isLoadingWards}
                  variant="info"
                  actionText="إدارة الأقسام"
                />
                <DashboardCard
                  title="إدارة الغرف"
                  description="إضافة وتعديل الغرف"
                  icon={DoorOpen}
                  link="/settings/rooms"
                  count={roomsData?.total}
                  isLoading={isLoadingRooms}
                  variant="warning"
                  actionText="إدارة الغرف"
                />
                <DashboardCard
                  title="إدارة الأسرّة"
                  description="إضافة وتعديل الأسرّة"
                  icon={BedDouble}
                  link="/settings/beds"
                  count={bedsData?.total}
                  isLoading={isLoadingBeds}
                  variant="default"
                  actionText="إدارة الأسرّة"
                />
                <DashboardCard
                  title="إعدادات العمليات"
                  description="إضافة وتعديل أنواع العمليات وأسعارها"
                  icon={Stethoscope}
                  link="/settings/operations"
                  variant="success"
                  actionText="إدارة العمليات"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}