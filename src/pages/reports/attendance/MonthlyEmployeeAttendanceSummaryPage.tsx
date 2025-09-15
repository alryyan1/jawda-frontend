// src/pages/reports/attendance/MonthlyEmployeeAttendanceSummaryPage.tsx
import React, { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format, addMonths, startOfMonth } from "date-fns";
import { arSA } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // For department/user filters
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiClient from "@/services/api";

// Type definitions (should be in src/types/attendance.ts or a report-specific type file)
interface MonthlyAttendanceSummaryItem {
  user_id: number;
  employee_id?: string | number;
  user_name: string;
  payable_days: number;
  absent_days: number;
  unpaid_leave_days: number;
  paid_leave_days?: number; // Assuming backend might provide this
  sick_leave_days: number;
  late_count: number;
  early_leave_count: number;
  total_worked_hours?: number;
  standard_hours_expected?: number; // New from backend
  overtime_hours?: number;
  working_days_in_month?: number; // Context from backend
}

interface MonthlySummaryResponse {
  data: MonthlyAttendanceSummaryItem[];
  meta: {
    month: number;
    year: number;
    month_name: string;
    total_working_days: number;
  };
}

const MonthlyEmployeeAttendanceSummaryPage: React.FC = () => {
  const dateLocale = arSA;

  const [currentMonthDate, setCurrentMonthDate] = useState(() =>
    startOfMonth(new Date())
  );
  // const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  // const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const queryParams = useMemo(
    () => ({
      month: currentMonthDate.getMonth() + 1,
      year: currentMonthDate.getFullYear(),
      // department_id: selectedDepartmentId === 'all' ? undefined : selectedDepartmentId,
      // user_id: selectedUserId === 'all' ? undefined : selectedUserId,
    }),
    [currentMonthDate /*, selectedDepartmentId, selectedUserId */]
  );

  const {
    data: reportResponse,
    isLoading,
    error,
    isFetching,
  } = useQuery<MonthlySummaryResponse, Error>({
    queryKey: ["monthlyEmployeeAttendanceSummary", queryParams],
    queryFn: async () =>
      (
        await apiClient.get("/attendance/reports/monthly-employee-summary", {
          params: queryParams,
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const changeMonth = (amount: number) => {
    setCurrentMonthDate((prev) => startOfMonth(addMonths(prev, amount)));
  };

  // const { data: departments } = useQuery(['departmentsList'], async () => ...); // Fetch departments for filter
  // const { data: users } = useQuery(['usersStrippedList'], async () => ...); // Fetch users for filter

  const reportData = reportResponse?.data || [];
  const reportMeta = reportResponse?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4 h-full flex flex-col">
      <Card className="flex-shrink-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                {"ملخص الحضور الشهري للموظفين"}
              </CardTitle>
              <CardDescription>
                {reportMeta
                  ? `لشهر ${reportMeta.month_name}`
                  : "جارٍ التحميل"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => changeMonth(-1)}
                disabled={isFetching}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-sm font-semibold text-center min-w-[120px]">
                {format(currentMonthDate, "MMMM yyyy", { locale: dateLocale })}
              </div>
              <Button
                onClick={() => changeMonth(1)}
                disabled={isFetching}
                className="h-9 w-9"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Future Filters:
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
             Department Select / User Select 
          </div>
          */}
        </CardHeader>
      </Card>

      <div className="flex-grow overflow-hidden">
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {isFetching && !isLoading && (
          <div className="text-xs text-center text-muted-foreground py-2">
            <Loader2 className="inline h-4 w-4 animate-spin" />{" "}
            {"جاري تحميل البيانات"}
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>{"فشل جلب البيانات"}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && reportData.length === 0 && (
          <Card className="h-full flex items-center justify-center text-muted-foreground">
            <CardContent className="text-center py-10">
              {"لا توجد بيانات مطابقة للمرشحات"}
            </CardContent>
          </Card>
        )}
        {!isLoading && !error && reportData.length > 0 && (
          <Card className="h-full flex flex-col">
            <CardHeader className="py-3 flex-shrink-0">
              <p className="text-xs text-muted-foreground">
                {"عدد أيام العمل في الشهر"}:{" "}
                {reportMeta?.total_working_days || "-"}
              </p>
            </CardHeader>
            <ScrollArea className="flex-grow">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center sticky top-0 bg-card z-10">
                      {"اسم الموظف"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10">
                      {"أيام مستحقة"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10">
                      {"أيام الغياب"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10 hidden md:table-cell">
                      {"إجازة غير مدفوعة"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10 hidden md:table-cell">
                      {"إجازة مرضية"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10 hidden lg:table-cell">
                      {"عدد مرات التأخير"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10 hidden lg:table-cell">
                      {"ساعات العمل"}
                    </TableHead>
                    <TableHead className="text-center sticky top-0 bg-card z-10 hidden lg:table-cell">
                      {"الساعات القياسية"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item) => (
                    <TableRow key={item.user_id}>
                      <TableCell className="font-medium text-center">
                        {item.user_name}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-green-600">
                        {item.payable_days}
                      </TableCell>
                      <TableCell className="text-center text-red-600">
                        {item.absent_days}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {item.unpaid_leave_days}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {item.sick_leave_days}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {item.late_count}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {item.total_worked_hours ? item.total_worked_hours.toFixed(1) : '0.0'}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {item.standard_hours_expected ? item.standard_hours_expected.toFixed(1) : '0.0'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>
      {/* Add Pagination if your backend paginates users for this report */}
    </div>
  );
};
export default MonthlyEmployeeAttendanceSummaryPage;
