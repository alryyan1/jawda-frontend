// src/pages/reports/MonthlyServiceIncomeReportPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO, getYear, getMonth, subMonths } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Filter, BarChartBig, AlertTriangle, FileText, Download } from 'lucide-react'; // BarChartBig or similar
import { getMonthlyServiceDepositsIncome, type MonthlyServiceIncomeFilters } from '@/services/reportService';
import { formatNumber } from '@/lib/utils';
import apiClient from '@/services/api';
import { toast } from 'sonner';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // Last 10 years
const months = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12

type MonthKey = `m${number}`;

const MonthlyServiceIncomeReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'months']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const [filters, setFilters] = useState<MonthlyServiceIncomeFilters>(() => {
    const prevMonthDate = subMonths(new Date(), 1);
    return {
      year: getYear(prevMonthDate),
      month: getMonth(prevMonthDate) + 1, // getMonth is 0-indexed
    };
  });
  
  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['monthlyServiceDepositsIncomeReport', filters],
    queryFn: () => getMonthlyServiceDepositsIncome(filters),
    enabled: !!(filters.year && filters.month),
  });

  const handleFilterChange = (type: 'year' | 'month', value: string) => {
    setFilters(prev => ({ ...prev, [type]: parseInt(value) }));
  };
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | false>(false);
  
  const handleApplyFilters = () => {
    refetch();
  };
  
  const dailyData = reportData?.daily_data || [];
  const summary = reportData?.summary;
    
  const handleExport = async (formatType: 'pdf' | 'excel') => {
    if (!filters.year || !filters.month) {
        toast.error(t('common:validation.monthYearRequired'));
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
        toast.success(t('common:exportSuccess'));
    } catch (err: any) {
        toast.error(t('common:error.exportFailed'), { 
            description: err.response?.data?.message || err.message 
        });
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChartBig className="h-7 w-7 text-primary"/>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:monthlyServiceIncomeReport.title')}</h1>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
    
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting === 'pdf' || isLoading}>
                {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4"/>} 
                <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('common:exportPdf')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={isExporting === 'excel' || isLoading}>
                {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>} 
                <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('common:exportExcel')}</span>
            </Button>
        </div>
        </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports:filtersTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="grid grid-cols-2 gap-3 flex-grow">
            <div className="space-y-1.5">
              <label htmlFor="year-select" className="text-xs font-medium">{t('common:year')}</label>
              <Select 
                value={String(filters.year)} 
                onValueChange={(val) => handleFilterChange('year', val)}
                dir={i18n.dir()}
              >
                <SelectTrigger id="year-select" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="month-select" className="text-xs font-medium">{t('common:month')}</label>
              <Select 
                value={String(filters.month)} 
                onValueChange={(val) => handleFilterChange('month', val)}
                dir={i18n.dir()}
              >
                <SelectTrigger id="month-select" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {t(`months:m${m}` as MonthKey, format(new Date(2000, m - 1, 1), 'LLLL', {locale: dateLocale}))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleApplyFilters} className="h-9 mt-auto sm:mt-0" disabled={isLoading || isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
            {t('reports:applyFiltersButton')}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {error && (
         <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle/> {t('common:error.fetchFailedTitle')}</CardTitle></CardHeader>
            <CardContent><p>{error.message || t('common:error.generic')}</p></CardContent>
         </Card>
      )}
      
      {reportData && !isLoading && (
        <>
          <CardDescription className="text-center text-sm">
            {t('reports:reportForPeriod',{from: reportData.report_period.from, to: reportData.report_period.to})}
          </CardDescription>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{t('common:date')}</TableHead>
                  <TableHead className="text-center">{t('reports:monthlyServiceIncomeReport.totalDeposits')}</TableHead>
                  <TableHead className="text-center">{t('reports:monthlyServiceIncomeReport.cashDeposits')}</TableHead>
                  <TableHead className="text-center">{t('reports:monthlyServiceIncomeReport.bankDeposits')}</TableHead>
                  <TableHead className="text-center">{t('reports:monthlyServiceIncomeReport.doctorEntitlements')}</TableHead>
                  <TableHead className="text-center">{t('reports:monthlyServiceIncomeReport.netCashFlow')}</TableHead>
                  <TableHead className="text-center">{t('reports:monthlyServiceIncomeReport.netBankFlow')}</TableHead>
                  <TableHead className="text-center font-semibold">{t('reports:monthlyServiceIncomeReport.netDailyIncome')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">{t('common:noDataAvailableForPeriod')}</TableCell></TableRow>
                )}
                {dailyData.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="text-center">{format(parseISO(day.date), 'P', { locale: dateLocale })} ({format(parseISO(day.date), 'EEEE', { locale: dateLocale })})</TableCell>
                    <TableCell className="text-center">{formatNumber(day.total_income)}</TableCell>
                    <TableCell className="text-center">{formatNumber(day.total_cash_income)}</TableCell>
                    <TableCell className="text-center">{formatNumber(day.total_bank_income)}</TableCell>
                    <TableCell className="text-center text-red-600 dark:text-red-400">{formatNumber(day.total_cost)}</TableCell>
                    <TableCell className="text-center">{formatNumber(day.net_cash)}</TableCell>
                    <TableCell className="text-center">{formatNumber(day.net_bank)}</TableCell>
                    <TableCell className="text-center font-semibold">{formatNumber(day.net_income_for_day)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {summary && dailyData.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold text-sm">
                    <TableCell className="text-center">{t('common:total')}</TableCell>
                    <TableCell className="text-center">{formatNumber(summary.total_deposits)}</TableCell>
                    <TableCell className="text-center">{formatNumber(summary.total_cash_deposits)}</TableCell>
                    <TableCell className="text-center">{formatNumber(summary.total_bank_deposits)}</TableCell>
                    <TableCell className="text-center text-red-600 dark:text-red-400">{formatNumber(summary.total_costs_for_days_with_deposits)}</TableCell>
                    <TableCell className="text-center">{formatNumber(summary.net_cash_flow)}</TableCell>
                    <TableCell className="text-center">{formatNumber(summary.net_bank_flow)}</TableCell>
                    <TableCell className="text-center text-lg">{formatNumber(summary.net_total_income)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export default MonthlyServiceIncomeReportPage;