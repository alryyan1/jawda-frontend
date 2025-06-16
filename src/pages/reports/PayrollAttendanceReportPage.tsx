// src/pages/reports/PayrollAttendanceReportPage.tsx
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format, addMonths, startOfMonth } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

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
import { Loader2, ChevronLeft, ChevronRight, FileText, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import apiClient from "@/services/api";

// Use the same MonthlyAttendanceSummaryItem or a more specific PayrollReportItem if needed
interface PayrollReportItem {
  user_id: number;
  employee_id?: string | number;
  user_name: string;
  payable_days: number;
  absent_days: number;
  unpaid_leave_days: number;
  paid_leave_days?: number;
  sick_leave_days: number;
  late_count: number;
  early_leave_count: number;
  total_worked_hours?: number;
  standard_hours_expected?: number;
  overtime_hours?: number;
}

interface PayrollReportResponse {
  data: PayrollReportItem[];
  meta: {
    month: number;
    year: number;
    month_name: string;
    period_start_date: string;
    period_end_date: string;
  };
}

const PayrollAttendanceReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["attendance", "common", "reports"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const [currentMonthDate, setCurrentMonthDate] = useState(() =>
    startOfMonth(new Date())
  );
  // Filters for specific users or departments can be added here

  const queryParams = useMemo(
    () => ({
      month: currentMonthDate.getMonth() + 1,
      year: currentMonthDate.getFullYear(),
      // user_ids: [...] // If allowing selection of multiple users
    }),
    [currentMonthDate]
  );

  const {
    data: reportResponse,
    isLoading,
    error,
    isFetching,
  } = useQuery<PayrollReportResponse, Error>({
    queryKey: ["payrollAttendanceReport", queryParams],
    queryFn: async () =>
      (
        await apiClient.get("/attendance/reports/payroll", {
          params: queryParams,
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const changeMonth = (amount: number) => {
    setCurrentMonthDate((prev) => startOfMonth(addMonths(prev, amount)));
  };

  const reportData = reportResponse?.data || [];
  const reportMeta = reportResponse?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {t("reports:attendance.payrollReportTitle")}
              </CardTitle>
              <CardDescription>
                {reportMeta
                  ? t("reports:attendance.forMonth", {
                      monthName: reportMeta.month_name,
                    })
                  : t("common:loading")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
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
                variant="outline"
                size="icon"
                onClick={() => changeMonth(1)}
                disabled={isFetching}
                className="h-9 w-9"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {isFetching && !isLoading && (
            <div className="text-xs text-center text-muted-foreground py-1">
              <Loader2 className="inline h-3 w-3 animate-spin" />{" "}
              {t("common:loadingData")}
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("common:error.fetchFailed")}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && reportData.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              {t("common:noDataAvailableForFilters")}
            </p>
          )}
          {!isLoading && !error && reportData.length > 0 && (
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.employeeId")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.employeeName")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.payableDays")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.absentDays")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.unpaidLeave")}
                  </TableHead>
                  {/* <TableHead className="text-center">{t('reports:attendance.table.paidLeave')}</TableHead> */}
                  <TableHead className="text-center">
                    {t("reports:attendance.table.sickLeave")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.lateCount")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.workedHours")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.standardHours")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:attendance.table.overtimeHours")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item: PayrollReportItem) => (
                  <TableRow key={item.user_id}>
                    <TableCell className="text-center">
                      {item.employee_id}
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      {item.user_name}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-600">
                      {item.payable_days}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.absent_days}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.unpaid_leave_days}
                    </TableCell>
                    {/* <TableCell className="text-center">{item.paid_leave_days}</TableCell> */}
                    <TableCell className="text-center">
                      {item.sick_leave_days}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.late_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.total_worked_hours ? item.total_worked_hours.toFixed(1) : '0.0'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.standard_hours_expected ? item.standard_hours_expected.toFixed(1) : '0.0'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.overtime_hours ? item.overtime_hours.toFixed(1) : '0.0'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default PayrollAttendanceReportPage;
