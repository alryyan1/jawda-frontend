import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Users,
  Plus,
  Settings,
  Activity,
  FileText,
  ArrowRight,
  ClipboardList,
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
    default: "border-border hover:border-primary/50",
    primary: "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
    success: "border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:bg-green-500/10",
    warning: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10",
    info: "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10",
  };

  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
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
                "p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform",
                variant === "success" && "from-green-500/20 to-green-500/5",
                variant === "warning" && "from-amber-500/20 to-amber-500/5",
                variant === "info" && "from-blue-500/20 to-blue-500/5"
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
    <div className="container mx-auto px-4 py-6 space-y-6 overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نظام إدارة الإقامات</h1>
          <p className="text-muted-foreground mt-1">
            لوحة التحكم الرئيسية لإدارة الأقسام والغرف والأسرّة والإقامات
          </p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/admissions/new">
            <Plus className="h-5 w-5 ml-2" />
            إضافة إقامة جديدة
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الإقامات النشطة</p>
                {isLoadingActive ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {activeAdmissions?.length || 0}
                  </p>
                )}
              </div>
              <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الأقسام</p>
                {isLoadingWards ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {wards?.length || 0}
                  </p>
                )}
              </div>
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الغرف</p>
                {isLoadingRooms ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {roomsData?.total || 0}
                  </p>
                )}
              </div>
              <DoorOpen className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الأسرّة</p>
                {isLoadingBeds ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {bedsData?.total || 0}
                  </p>
                )}
              </div>
              <BedDouble className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Admissions Management */}
        <DashboardCard
          title="قائمة الإقامات"
          description="عرض وإدارة جميع الإقامات"
          icon={ClipboardList}
          link="/admissions/list"
          count={activeAdmissions?.length}
          isLoading={isLoadingActive}
          variant="primary"
          actionText="عرض القائمة"
        />

        <DashboardCard
          title="إضافة إقامة جديدة"
          description="إدخال مريض جديد إلى المستشفى"
          icon={Plus}
          link="/admissions/new"
          variant="success"
          actionText="إضافة الآن"
        />

        {/* Settings Section */}
        <div className="col-span-full">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">الإعدادات والإدارة</h2>
          </div>
        </div>

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

      {/* Quick Links */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">روابط سريعة</CardTitle>
          <CardDescription>الوصول السريع إلى الصفحات المهمة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/admissions/list">
                <ClipboardList className="h-4 w-4 ml-2" />
                جميع الإقامات
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admissions/new">
                <Plus className="h-4 w-4 ml-2" />
                إضافة إقامة
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings/wards">
                <Building2 className="h-4 w-4 ml-2" />
                الأقسام
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings/rooms">
                <DoorOpen className="h-4 w-4 ml-2" />
                الغرف
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings/beds">
                <BedDouble className="h-4 w-4 ml-2" />
                الأسرّة
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            دليل الاستخدام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>خطوات البدء:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 rtl:list-inside">
              <li>ابدأ بإضافة الأقسام من صفحة إدارة الأقسام</li>
              <li>ثم أضف الغرف لكل قسم</li>
              <li>بعد ذلك أضف الأسرّة لكل غرفة</li>
              <li>الآن يمكنك إضافة إقامات جديدة للمرضى</li>
            </ol>
            <p className="mt-4">
              <strong>ملاحظة:</strong> يجب إكمال إعداد الأقسام والغرف والأسرّة قبل إضافة الإقامات.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

