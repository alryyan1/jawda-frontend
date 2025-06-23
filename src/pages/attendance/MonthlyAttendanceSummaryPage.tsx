// src/pages/attendance/MonthlyAttendanceSummaryPage.tsx (New file)
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, getDaysInMonth, startOfMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, CalendarDays, Filter, Printer, FileText } from 'lucide-react';

import type { ShiftDefinition, UserMonthlyAttendanceSummary, MonthlyAttendanceReportData, DailySheetResponse } from '@/types/attendance';
import { getMonthlyAttendanceSummary, fetchDailySheetForMonth, getShiftDefinitions } from '@/services/attendanceService';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { Label } from '@radix-ui/react-label';
import { arSA, enUS } from 'date-fns/locale';
// import { generateMonthlyAttendancePdf } from '@/services/reportService'; // We'll add this to ReportController

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); // Last 5 years, current, next 4
const months = Array.from({ length: 12 }, (_, i) => i + 1);

// Helper to process daily sheet data if summary API not ready
const processDailyDataToSummary = (
    dailySheet: DailySheetResponse | undefined,
    selectedShiftId?: number | null
): MonthlyAttendanceReportData | null => {
    if (!dailySheet) return null;

    const summaryMap = new Map<number, UserMonthlyAttendanceSummary>();
    const totalWorkingDaysInMonth = dailySheet.days_data.filter(d => !d.is_holiday /* && !isWeekend(d.date) */).length;


    dailySheet.days_data.forEach(day => {
        if (day.is_holiday) return; // Skip holidays for attendance counts for now

        day.shifts.forEach(shift => {
            if (selectedShiftId && shift.shift_definition_id !== selectedShiftId) return; // Filter by selected shift

            // Aggregate attendance from expected users or all users present in attended_users
            // This is a simplified aggregation. A real system might need complex logic for "scheduled" vs "actual"
            // For now, we count based on what's in attended_users for simplicity.
            // A more robust approach would be to iterate over all company users.
            
            // Create a set of all users who had any activity or were expected
            const allUserIdsInShift = new Set<number>();
            shift.attended_users.forEach(u => allUserIdsInShift.add(u.user_id));
            // shift.expected_users?.forEach(u => allUserIdsInShift.add(u.id)); // If you have expected users list

            allUserIdsInShift.forEach(userId => {
                if (!summaryMap.has(userId)) {
                    const userRecord = shift.attended_users.find(u => u.user_id === userId); // Or from a global user list
                    summaryMap.set(userId, {
                        user_id: userId,
                        user_name: userRecord?.user_name || `User ${userId}`,
                        is_supervisor: false, // Would need user list with this flag
                        total_scheduled_days: 0, // Needs logic
                        present_days: 0,
                        absent_days: 0,
                        late_present_days: 0,
                        early_leave_days: 0,
                        on_leave_days: 0,
                        sick_leave_days: 0,
                        holidays_on_workdays: 0,
                    });
                }
                const userSummary = summaryMap.get(userId)!;
                // This logic assumes a user is scheduled for this day/shift if they have an entry
                userSummary.total_scheduled_days += 1; // Simplification

                const attendanceEntry = shift.attended_users.find(u => u.user_id === userId);
                if (attendanceEntry) {
                    switch (attendanceEntry.status) {
                        case 'present': userSummary.present_days += 1; break;
                        case 'absent': userSummary.absent_days += 1; break;
                        case 'late_present': userSummary.late_present_days += 1; userSummary.present_days +=1; break; // Counts as present too
                        case 'early_leave': userSummary.early_leave_days += 1; userSummary.present_days +=1; break; // Counts as present too
                        case 'on_leave': userSummary.on_leave_days += 1; break;
                        case 'sick_leave': userSummary.sick_leave_days += 1; break;
                        // 'holiday', 'off_day' statuses are handled by skipping the day or user not being scheduled
                    }
                } else {
                    // If user was expected but no attendance record, mark absent (needs expected_users list)
                    // userSummary.absent_days += 1;
                }
            });
        });
    });
    
    // Calculate holidays on workdays (simplified: if a user was scheduled on a holiday)
    // This needs more robust logic based on individual user schedules vs holidays.
    // For now, if a day is a holiday, it doesn't count towards absence for anyone.

    return {
        data: Array.from(summaryMap.values()),
        meta: {
            year: dailySheet.meta.year,
            month: dailySheet.meta.month,
            month_name: dailySheet.meta.month_name,
            shift_definition_id: selectedShiftId,
            shift_name: selectedShiftId ? dailySheet.days_data[0]?.shifts.find(s => s.shift_definition_id === selectedShiftId)?.shift_name : undefined,
            total_working_days_in_month: totalWorkingDaysInMonth,
        }
    };
};


const MonthlyAttendanceSummaryPage: React.FC = () => {
  const { t, i18n } = useTranslation(['attendance', 'common']);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(0); // 0 for "All Shifts"

  const { data: shiftDefinitions, isLoading: isLoadingShifts } = useQuery<ShiftDefinition[], Error>({
    queryKey: ['activeShiftDefinitionsList'],
    queryFn: () => getShiftDefinitions({ active_only: true }), // Fetch only active shifts for filtering
  });

  // Choose one query based on backend capability:
  // OPTION 1: Using a dedicated summary endpoint (Preferred)
  const { data: reportData, isLoading: isLoadingReport, error, isFetching } = useQuery<MonthlyAttendanceReportData, Error>({
    queryKey: ['monthlyAttendanceSummary', selectedYear, selectedMonth, selectedShiftId],
    queryFn: () => getMonthlyAttendanceSummary(selectedYear, selectedMonth, selectedShiftId),
    enabled: !!selectedYear && !!selectedMonth,
  });
  
  // OPTION 2: Processing daily sheet data on frontend (Fallback)
  // const { data: dailySheetData, isLoading: isLoadingDaily, error, isFetching } = useQuery<DailySheetResponse, Error>({
  //   queryKey: ['dailySheetForMonthSummary', selectedYear, selectedMonth],
  //   queryFn: () => fetchDailySheetForMonth(selectedYear, selectedMonth),
  //   enabled: !!selectedYear && !!selectedMonth,
  // });
  // const reportData = useMemo(() => processDailyDataToSummary(dailySheetData, selectedShiftId), [dailySheetData, selectedShiftId]);
  // const isLoadingReport = isLoadingDaily;


  const handleGeneratePdf = async () => {
    if (!reportData) return;
    // API call to backend: /api/attendance/reports/monthly-summary/pdf
    // Pass selectedYear, selectedMonth, selectedShiftId
    try {
        const response = await apiClient.get('/attendance/reports/monthly-summary/pdf', {
            params: {
                year: selectedYear,
                month: selectedMonth,
                shift_definition_id: selectedShiftId === 0 ? null : selectedShiftId,
            },
            responseType: 'blob',
        });
        const file = new Blob([response.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
        toast.success(t('common:pdfGeneratedSuccess'));
    } catch (err: any) {
        toast.error(t('common:error.generatePdfFailed'), { description: err.response?.data?.message || err.message });
    }
  };


  const summaryList = reportData?.data || [];
  const reportMeta = reportData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">{t('attendance:reportTitle')}</h1>
        </div>
        <Button onClick={handleGeneratePdf} variant="outline" size="sm" disabled={!reportData || summaryList.length === 0 || isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
          {t('common:exportToPdf')}
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-md flex items-center gap-1.5">
            <Filter className="h-4 w-4"/> {t('common:filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label htmlFor="year-filter" className="text-xs">{t('common:year')}</Label>
              <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))} dir={i18n.dir()}>
                <SelectTrigger id="year-filter" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="month-filter" className="text-xs">{t('common:month')}</Label>
              <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))} dir={i18n.dir()}>
                <SelectTrigger id="month-filter" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {format(new Date(currentYear, m - 1), 'MMMM', { locale: i18n.language === 'ar' ? arSA : enUS })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shift-filter" className="text-xs">{t('attendance:filters.shift')}</Label>
              <Select value={String(selectedShiftId)} onValueChange={(val) => setSelectedShiftId(Number(val))} dir={i18n.dir()} disabled={isLoadingShifts}>
                <SelectTrigger id="shift-filter" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('attendance:filters.allShifts')}</SelectItem>
                  {shiftDefinitions?.map(sd => <SelectItem key={sd.id} value={String(sd.id)}>{sd.shift_label} ({sd.name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table and Summary */}
      {(isLoadingReport || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {isFetching && reportData && (
        <div className="text-sm text-muted-foreground mb-1 text-center animate-pulse">{t('common:updatingList')}</div>
      )}

      {error && (
        <Card className="border-destructive bg-destructive/5 text-destructive p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 mb-1"/>
          {t('common:error.fetchFailedExt', { entity: t('attendance:reports.monthlySummary.titleShort'), message: error.message })}
        </Card>
      )}

      {!isLoadingReport && !isFetching && reportData && summaryList.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground"><CardContent>{t('common:noDataAvailableForFilters')}</CardContent></Card>
      )}

      {!isLoadingReport && reportData && summaryList.length > 0 && (
        <Card>
            <CardHeader className="py-3">
                <CardTitle className="text-md">
                    {reportMeta?.month_name} 
                    {reportMeta?.shift_name && ` - ${reportMeta.shift_name}`}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                    {t('attendance:reports.monthlySummary.totalWorkingDays')}: {reportMeta?.total_working_days_in_month}
                </p>
            </CardHeader>
          <ScrollArea className="h-auto max-h-[calc(100vh-350px)]"> {/* Adjust max height */}
            <Table dir={i18n.dir()} className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-[50px]">#</TableHead>
                  <TableHead className="min-w-[150px]">{t('attendance:employeeName')}</TableHead>
                  {/* <TableHead className="text-center">{t('attendance:scheduledDays')}</TableHead> */}
                  <TableHead className="text-center">{t('attendance:presentDays')}</TableHead>
                  <TableHead className="text-center">{t('attendance:absentDays')}</TableHead>
                  <TableHead className="text-center">{t('attendance:lateDays')}</TableHead>
                  <TableHead className="text-center">{t('attendance:leaveDays')}</TableHead>
                  <TableHead className="text-center">{t('attendance:sickDays')}</TableHead>
                  {/* <TableHead className="text-center">{t('attendance:holidaysOnWorkdays')}</TableHead> */}
                  {/* Add more columns as needed based on UserMonthlyAttendanceSummary type */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryList.map((summary, index) => (
                  <TableRow key={summary.user_id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>{summary.user_name}</TableCell>
                    {/* <TableCell className="text-center">{summary.total_scheduled_days}</TableCell> */}
                    <TableCell className="text-center font-semibold text-green-600">{summary.present_days}</TableCell>
                    <TableCell className="text-center text-red-600">{summary.absent_days}</TableCell>
                    <TableCell className="text-center text-orange-500">{summary.late_present_days}</TableCell>
                    <TableCell className="text-center text-blue-500">{summary.on_leave_days}</TableCell>
                    <TableCell className="text-center text-purple-500">{summary.sick_leave_days}</TableCell>
                    {/* <TableCell className="text-center">{summary.holidays_on_workdays}</TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
      {/* Pagination might be needed if the user list itself is very long, but typically not for a summary page */}
    </div>
  );
};

export default MonthlyAttendanceSummaryPage;