// src/pages/attendance/MonthlyAttendanceSummaryPage.tsx (Refactored to MUI and Arabic)
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, getDaysInMonth, startOfMonth } from 'date-fns';

import { Loader2, AlertTriangle, CalendarDays, Filter, Printer } from 'lucide-react';

import type { ShiftDefinition, UserMonthlyAttendanceSummary, MonthlyAttendanceReportData, DailySheetResponse } from '@/types/attendance';
import { getMonthlyAttendanceSummary, fetchDailySheetForMonth, getShiftDefinitions } from '@/services/attendanceService';
import apiClient from '@/services/api';
import { toast } from 'sonner';

// MUI imports
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
  TableContainer,
  Paper,
  Alert,
} from '@mui/material';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// Helper to process daily sheet data if summary API not ready
const processDailyDataToSummary = (
    dailySheet: DailySheetResponse | undefined,
    selectedShiftId?: number | null
): MonthlyAttendanceReportData | null => {
    if (!dailySheet) return null;

    const summaryMap = new Map<number, UserMonthlyAttendanceSummary>();
    const totalWorkingDaysInMonth = dailySheet.days_data.filter(d => !d.is_holiday).length;

    dailySheet.days_data.forEach(day => {
        if (day.is_holiday) return;
        day.shifts.forEach(shift => {
            if (selectedShiftId && shift.shift_definition_id !== selectedShiftId) return;
            const allUserIdsInShift = new Set<number>();
            shift.attended_users.forEach(u => allUserIdsInShift.add(u.user_id));
            allUserIdsInShift.forEach(userId => {
                if (!summaryMap.has(userId)) {
                    const userRecord = shift.attended_users.find(u => u.user_id === userId);
                    summaryMap.set(userId, {
                        user_id: userId,
                        user_name: userRecord?.user_name || `User ${userId}`,
                        is_supervisor: false,
                        total_scheduled_days: 0,
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
                userSummary.total_scheduled_days += 1;
                const attendanceEntry = shift.attended_users.find(u => u.user_id === userId);
                if (attendanceEntry) {
                    switch (attendanceEntry.status) {
                        case 'present': userSummary.present_days += 1; break;
                        case 'absent': userSummary.absent_days += 1; break;
                        case 'late_present': userSummary.late_present_days += 1; userSummary.present_days +=1; break;
                        case 'early_leave': userSummary.early_leave_days += 1; userSummary.present_days +=1; break;
                        case 'on_leave': userSummary.on_leave_days += 1; break;
                        case 'sick_leave': userSummary.sick_leave_days += 1; break;
                    }
                }
            });
        });
    });

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
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(0);

  const { data: shiftDefinitions, isLoading: isLoadingShifts } = useQuery<ShiftDefinition[], Error>({
    queryKey: ['activeShiftDefinitionsList'],
    queryFn: () => getShiftDefinitions({ active_only: true }),
  });

  const { data: reportData, isLoading: isLoadingReport, error, isFetching } = useQuery<MonthlyAttendanceReportData, Error>({
    queryKey: ['monthlyAttendanceSummary', selectedYear, selectedMonth, selectedShiftId],
    queryFn: () => getMonthlyAttendanceSummary(selectedYear, selectedMonth, selectedShiftId),
    enabled: !!selectedYear && !!selectedMonth,
  });

  const handleGeneratePdf = async () => {
    if (!reportData) return;
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
        toast.success('تم توليد ملف PDF بنجاح');
    } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string }}, message?: string };
        toast.error('فشل توليد ملف PDF', { description: e.response?.data?.message || e.message });
    }
  };

  const summaryList = reportData?.data || [];
  const reportMeta = reportData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">ملخص الحضور الشهري</h1>
        </div>
        <Button onClick={handleGeneratePdf} variant="outlined" size="small" disabled={!reportData || summaryList.length === 0 || isFetching} startIcon={!isFetching ? <Printer className="h-4 w-4" /> : undefined}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تصدير PDF'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Typography variant="h6" className="flex items-center gap-1.5">
            <Filter className="h-4 w-4"/> المرشحات
          </Typography>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
            <div>
              <Typography className="text-xs">السنة</Typography>
              <FormControl size="small" className="w-full">
                <InputLabel id="year-filter">السنة</InputLabel>
                <MUISelect labelId="year-filter" label="السنة" value={String(selectedYear)} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {years.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
                </MUISelect>
              </FormControl>
            </div>
            <div>
              <Typography className="text-xs">الشهر</Typography>
              <FormControl size="small" className="w-full">
                <InputLabel id="month-filter">الشهر</InputLabel>
                <MUISelect labelId="month-filter" label="الشهر" value={String(selectedMonth)} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                  {months.map(m => (
                    <MenuItem key={m} value={String(m)}>{AR_MONTHS[m-1]}</MenuItem>
                  ))}
                </MUISelect>
              </FormControl>
            </div>
            <div>
              <Typography className="text-xs">المناوبة</Typography>
              <FormControl size="small" className="w-full" disabled={isLoadingShifts}>
                <InputLabel id="shift-filter">المناوبة</InputLabel>
                <MUISelect labelId="shift-filter" label="المناوبة" value={String(selectedShiftId)} onChange={(e) => setSelectedShiftId(Number(e.target.value))}>
                  <MenuItem value="0">كل المناوبات</MenuItem>
                  {shiftDefinitions?.map(sd => <MenuItem key={sd.id} value={String(sd.id)}>{sd.shift_label} ({sd.name})</MenuItem>)}
                </MUISelect>
              </FormControl>
            </div>
          </div>
        </CardContent>
      </Card>

      {(isLoadingReport || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {isFetching && reportData && (
        <div className="text-sm text-muted-foreground mb-1 text-center animate-pulse">جارِ تحديث القائمة...</div>
      )}

      {error && (
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography>فشل جلب البيانات</Typography>
          <Typography variant="body2" color="text.secondary">{error.message}</Typography>
        </Alert>
      )}

      {!isLoadingReport && !isFetching && reportData && summaryList.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground"><CardContent>لا توجد بيانات مطابقة للمرشحات</CardContent></Card>
      )}

      {!isLoadingReport && reportData && summaryList.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <Typography variant="subtitle1">
              {reportMeta?.month_name}
              {reportMeta?.shift_name && ` - ${reportMeta.shift_name}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              أيام العمل في الشهر: {reportMeta?.total_working_days_in_month}
            </Typography>
          </CardHeader>
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 350px)' }}>
            <MUITable size="small" className="text-xs">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" className="w-[50px]">#</MUITableCell>
                  <MUITableCell>اسم الموظف</MUITableCell>
                  <MUITableCell align="center">أيام الحضور</MUITableCell>
                  <MUITableCell align="center">أيام الغياب</MUITableCell>
                  <MUITableCell align="center">تأخر</MUITableCell>
                  <MUITableCell align="center">إجازة</MUITableCell>
                  <MUITableCell align="center">مرضية</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {summaryList.map((summary, index) => (
                  <MUITableRow key={summary.user_id}>
                    <MUITableCell align="center">{index + 1}</MUITableCell>
                    <MUITableCell>{summary.user_name}</MUITableCell>
                    <MUITableCell align="center" className="font-semibold text-green-600">{summary.present_days}</MUITableCell>
                    <MUITableCell align="center" className="text-red-600">{summary.absent_days}</MUITableCell>
                    <MUITableCell align="center" className="text-orange-500">{summary.late_present_days}</MUITableCell>
                    <MUITableCell align="center" className="text-blue-500">{summary.on_leave_days}</MUITableCell>
                    <MUITableCell align="center" className="text-purple-500">{summary.sick_leave_days}</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
            </MUITable>
          </TableContainer>
        </Card>
      )}
    </div>
  );
};

export default MonthlyAttendanceSummaryPage;