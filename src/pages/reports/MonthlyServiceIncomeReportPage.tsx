// src/pages/reports/MonthlyServiceIncomeReportPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, getYear, getMonth, subMonths } from 'date-fns';
import { arSA } from 'date-fns/locale';

import { Loader2, Filter, BarChartBig, AlertTriangle, FileText, FileSpreadsheet } from 'lucide-react';
import { getMonthlyServiceDepositsIncome, type MonthlyServiceIncomeFilters } from '@/services/reportService';
import { getAllServiceGroupsList } from '@/services/serviceGroupService';
import { formatNumber } from '@/lib/utils';
import apiClient from '@/services/api';
import { toast } from 'sonner';

// MUI imports
import {
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  Alert,
  Table as MUITable,
  TableHead as MUITableHead,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
  TableBody as MUITableBody,
  TableFooter as MUITableFooter,
} from '@mui/material';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const MonthlyServiceIncomeReportPage: React.FC = () => {
  const [filters, setFilters] = useState<MonthlyServiceIncomeFilters>(() => {
    const prevMonthDate = subMonths(new Date(), 1);
    return {
      year: getYear(prevMonthDate),
      month: getMonth(prevMonthDate) + 1,
      service_group_id: null,
    };
  });

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['serviceGroupsListForReportFilter'],
    queryFn: () => getAllServiceGroupsList(),
  });

  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['monthlyServiceDepositsIncomeReport', filters],
    queryFn: () => getMonthlyServiceDepositsIncome(filters),
    enabled: !!(filters.year && filters.month),
  });

  const handleFilterChange = (type: 'year' | 'month', value: string) => {
    setFilters(prev => ({ ...prev, [type]: parseInt(value) }));
  };

  const handleServiceGroupChange = (value: string) => {
    setFilters(prev => ({ ...prev, service_group_id: value ? parseInt(value) : null }));
  };

  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | false>(false);

  const handleApplyFilters = () => {
    refetch();
  };

  const dailyData = reportData?.daily_data || [];
  const summary = reportData?.summary;

  const handleExport = async (formatType: 'pdf' | 'excel') => {
    if (!filters.year || !filters.month) {
      toast.error('الرجاء اختيار الشهر والسنة');
      return;
    }
    setIsExporting(formatType);
    try {
      const endpoint = `/reports/monthly-service-deposits-income/${formatType}`;
      const response = await apiClient.get(endpoint, {
        params: filters,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = formatType === 'pdf' ? 'pdf' : 'xlsx';
      const monthStr = String(filters.month).padStart(2, '0');
      link.setAttribute('download', `monthly_service_income_${filters.year}_${monthStr}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('تم التصدير بنجاح');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }, message?: string };
      toast.error('فشل التصدير', {
        description: e.response?.data?.message || e.message || 'خطأ غير معروف',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <BarChartBig className="h-5 w-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">دخل الخدمات الشهري</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleExport('excel')}
            disabled={isExporting === 'excel' || isLoading || dailyData.length === 0}
            size="small"
            variant="outlined"
            startIcon={isExporting !== 'excel' ? <FileSpreadsheet className="h-4 w-4" /> : undefined}
          >
            {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تصدير Excel'}
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            disabled={isExporting === 'pdf' || isLoading || dailyData.length === 0}
            size="small"
            variant="contained"
            startIcon={isExporting !== 'pdf' ? <FileText className="h-4 w-4" /> : undefined}
          >
            {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'طباعة PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end !py-2">
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">السنة</Typography>
            <FormControl size="small">
              <InputLabel id="year-select-label">السنة</InputLabel>
              <MUISelect
                labelId="year-select-label"
                label="السنة"
                value={String(filters.year)}
                onChange={(e) => handleFilterChange('year', String(e.target.value))}
              >
                {years.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">الشهر</Typography>
            <FormControl size="small">
              <InputLabel id="month-select-label">الشهر</InputLabel>
              <MUISelect
                labelId="month-select-label"
                label="الشهر"
                value={String(filters.month)}
                onChange={(e) => handleFilterChange('month', String(e.target.value))}
              >
                {months.map(m => (
                  <MenuItem key={m} value={String(m)}>{AR_MONTHS[m - 1]}</MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">مجموعة الخدمة</Typography>
            <FormControl size="small">
              <InputLabel id="service-group-select-label">مجموعة الخدمة</InputLabel>
              <MUISelect
                labelId="service-group-select-label"
                label="مجموعة الخدمة"
                value={filters.service_group_id ? String(filters.service_group_id) : ''}
                onChange={(e) => handleServiceGroupChange(String(e.target.value))}
              >
                <MenuItem value="">كل المجموعات</MenuItem>
                {serviceGroups.map(group => (
                  <MenuItem key={group.id} value={String(group.id)}>{group.name}</MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <Button
            onClick={handleApplyFilters}
            disabled={isLoading || isFetching}
            variant="contained"
            size="small"
          >
            <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            تطبيق المرشحات
          </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <Alert severity="error" icon={<AlertTriangle />} sx={{ py: 0.5 }}>
          <Typography variant="body2">فشل جلب البيانات</Typography>
          <Typography variant="caption" color="text.secondary">
            {(error as Error).message || 'حدث خطأ غير متوقع'}
          </Typography>
        </Alert>
      )}

      {reportData && !isLoading && (
        <>
          <Typography className="text-center text-xs text-muted-foreground">
            تقرير الفترة: {reportData.report_period.from} - {reportData.report_period.to}
          </Typography>
          <Card>
            <MUITable
              size="small"
              sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.8125rem' } }}
            >
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center">التاريخ</MUITableCell>
                  <MUITableCell align="center">إجمالي الإيداعات</MUITableCell>
                  <MUITableCell align="center">الإيداعات نقدًا</MUITableCell>
                  <MUITableCell align="center">الإيداعات بنكي</MUITableCell>
                  <MUITableCell align="center">إجمالي المصروفات</MUITableCell>
                  <MUITableCell align="center">صافي النقد</MUITableCell>
                  <MUITableCell align="center">صافي البنك</MUITableCell>
                  <MUITableCell align="center" className="font-semibold">صافي الدخل اليومي</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dailyData.length === 0 && (
                  <MUITableRow>
                    <MUITableCell colSpan={8} align="center" className="h-16">لا توجد بيانات للفترة</MUITableCell>
                  </MUITableRow>
                )}
                {dailyData.map((day) => (
                  <MUITableRow key={day.date}>
                    <MUITableCell align="center">
                      {format(parseISO(day.date), 'yyyy-MM-dd')} ({format(parseISO(day.date), 'EEEE', { locale: arSA })})
                    </MUITableCell>
                    <MUITableCell align="center">{formatNumber(day.total_income)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(day.total_cash_income)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(day.total_bank_income)}</MUITableCell>
                    <MUITableCell align="center" className="text-red-600 dark:text-red-400">{formatNumber(day.total_cost)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(day.net_cash)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(day.net_bank)}</MUITableCell>
                    <MUITableCell align="center" className="font-semibold">{formatNumber(day.net_income_for_day)}</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
              {summary && dailyData.length > 0 && (
                <MUITableFooter>
                  <MUITableRow>
                    <MUITableCell align="center">الإجمالي</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.total_deposits)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.total_cash_deposits)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.total_bank_deposits)}</MUITableCell>
                    <MUITableCell align="center" className="text-red-600 dark:text-red-400">{formatNumber(summary.total_costs_for_days_with_deposits)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.net_cash_flow)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.net_bank_flow)}</MUITableCell>
                    <MUITableCell align="center" className="font-bold">{formatNumber(summary.net_total_income)}</MUITableCell>
                  </MUITableRow>
                </MUITableFooter>
              )}
            </MUITable>
          </Card>
        </>
      )}
    </div>
  );
};

export default MonthlyServiceIncomeReportPage;
