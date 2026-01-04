import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, Box } from "@mui/material";
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
} from "lucide-react";
import { getActiveAdmissions } from "@/services/admissionService";
import { getWardsList } from "@/services/wardService";
import { getRooms } from "@/services/roomService";
import { getBeds } from "@/services/bedService";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import RoomsVisualPage from "./RoomsVisualPage";

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
    default: "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
    primary: "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
    success: "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
    warning: "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
    info: "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
  };

  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    success: "text-primary",
    warning: "text-primary",
    info: "text-primary",
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg cursor-pointer group",
        variantStyles[variant]
      )}
    >
      <Link to={link} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold mb-1">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
            <div
              className={cn(
                "p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform"
              )}
            >
              <Icon className={cn("h-6 w-6", iconColors[variant])} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : count !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{count}</span>
                <span className="text-sm text-muted-foreground">عنصر</span>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="group-hover:text-primary transition-colors"
              asChild
            >
              <span className="flex items-center gap-1">
                {actionText}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default function AdmissionsDashboardPage() {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { data: activeAdmissions, isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeAdmissions'],
    queryFn: () => getActiveAdmissions(),
  });

  const { data: wards, isLoading: isLoadingWards } = useQuery({
    queryKey: ['wardsList'],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data: roomsData, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['roomsCount'],
    queryFn: () => getRooms(1, { per_page: 1 }).then(res => ({ total: res.meta.total })),
  });

  const { data: bedsData, isLoading: isLoadingBeds } = useQuery({
    queryKey: ['bedsCount'],
    queryFn: () => getBeds(1, { per_page: 1 }).then(res => ({ total: res.meta.total })),
  });

  return (
    <div style={{height:window.innerHeight - 100}} className="container mx-auto px-4 py-6 space-y-6 overflow-y-auto  ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsDialogOpen(true)}
            className="h-10 w-10"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">نظام إدارة التنويم</h1>
            <p className="text-muted-foreground mt-1">
              لوحة التحكم الرئيسية لإدارة الأقسام والغرف والأسرّة 
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/admissions/new">
            <Plus className="h-5 w-5 ml-2" />
            إضافة تنويم جديد
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/admissions/list" className="block">
          <Card className="border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">قائمة التنويم</p>
                  {isLoadingActive ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-primary mt-1">
                      {activeAdmissions?.length || 0}
                    </p>
                  )}
                </div>
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الأقسام</p>
                {isLoadingWards ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-primary mt-1">
                    {wards?.length || 0}
                  </p>
                )}
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الغرف</p>
                {isLoadingRooms ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-primary mt-1">
                    {roomsData?.total || 0}
                  </p>
                )}
              </div>
              <DoorOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الأسرّة</p>
                {isLoadingBeds ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-primary mt-1">
                    {bedsData?.total || 0}
                  </p>
                )}
              </div>
              <BedDouble className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
   
      </div>

      {/* Rooms Visual Page */}
      <Box >
        <RoomsVisualPage />
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">الإعدادات والإدارة</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

