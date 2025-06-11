// src/pages/reports/CompanyPerformanceReportPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Loader2, Filter, FileText, Building, AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { getCompanyPerformanceReport, downloadCompanyPerformancePdf, type CompanyPerformanceFilters } from '@/services/reportService';
import type { CompanyPerformanceItem, CompanyPerformanceReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
import { getCompaniesList } from '@/services/companyService';
import type { Company } from '@/types/companies';
import { Label } from '@/components/ui/label';

const CompanyPerformanceReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'companies']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const defaultDateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultDateTo = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [filters, setFilters] = useState<CompanyPerformanceFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: 'net_income_from_company_patients',
    sort_direction: 'desc',
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseISO(defaultDateFrom),
    to: parseISO(defaultDateTo),
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: companiesForFilter = [] } = useQuery<Company[], Error>({
    queryKey: ['companiesListForReportFilter'],
    queryFn: () => getCompaniesList({ status: true }),
  });

  const reportQueryKey = ['companyPerformanceReport', filters] as const;
  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery<CompanyPerformanceReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getCompanyPerformanceReport(filters),
    enabled: !!(filters.date_from && filters.date_to),
  });

  const handleApplyFilters = () => {
    const newFilters: CompanyPerformanceFilters = {
        ...filters,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : defaultDateFrom,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : defaultDateTo,
    };
    setFilters(newFilters);
  };
  
  const handleSort = (columnKey: CompanyPerformanceFilters['sort_by']) => {
    setFilters(prev => ({
        ...prev,
        sort_by: columnKey,
        sort_direction: prev.sort_by === columnKey && prev.sort_direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDownloadPdf = async () => {
    if (!filters.date_from || !filters.date_to) {
      toast.error(t('common:validation.dateRangeRequired'));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadCompanyPerformancePdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Company_Performance_${filters.date_from}_to_${filters.date_to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('reports:pdfGeneratedSuccess'));
    } catch (error: any) {
      toast.error(t('reports:pdfGeneratedError'), { description: error.response?.data?.message || error.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dataItems = reportData?.data || [];
  const reportPeriod = reportData?.report_period;

  const getSortIcon = (columnKey: CompanyPerformanceFilters['sort_by']) => {
    if (filters.sort_by !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 inline" />;
    return filters.sort_direction === 'asc' 
        ? <TrendingUp className="h-3 w-3 text-primary inline" /> 
        : <TrendingDown className="h-3 w-3 text-primary inline" />;
  };
  
  // Calculate Grand Totals for display in footer
  const grandTotals = useMemo(() => {
    return dataItems.reduce((acc, item) => {
        acc.patient_count += item.patient_count;
        acc.total_income_generated += item.total_income_generated;
        acc.total_endurance_by_company += item.total_endurance_by_company;
        acc.net_income_from_company_patients += item.net_income_from_company_patients;
        return acc;
    }, { patient_count: 0, total_income_generated: 0, total_endurance_by_company: 0, net_income_from_company_patients: 0 });
  }, [dataItems]);

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Building className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:companyPerformanceReport.title')}</h1>
        </div>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || isLoading || dataItems.length === 0} size="sm">
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
          {t('common:printPdf')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports:filtersTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
                <Label className="text-xs">{t('common:dateRange')}</Label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} align="start" />
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="cpr-company-filter" className="text-xs">{t('companies:companyEntityName')}</Label>
                <Select value={filters.company_id || ""} onValueChange={(val) => setFilters(f => ({...f, company_id: val === "" ? null : val }))} dir={i18n.dir()}>
                    <SelectTrigger id="cpr-company-filter" className="h-9"><SelectValue placeholder={t('reports:companyPerformanceReport.allCompanies')} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">{t('reports:companyPerformanceReport.allCompanies')}</SelectItem>
                        {companiesForFilter.map(comp => <SelectItem key={comp.id} value={String(comp.id)}>{comp.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleApplyFilters} className="h-9 mt-auto" disabled={isLoading || isFetching}>
                <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('reports:applyFiltersButton')}
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
            {reportPeriod && t('reports:reportForPeriod', { 
                from: format(parseISO(reportPeriod.from), "PPP", { locale: dateLocale }),
                to: format(parseISO(reportPeriod.to), "PPP", { locale: dateLocale })
            })}
          </CardDescription>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group text-center" onClick={() => handleSort('company_name')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:companyPerformanceReport.table.companyName')} {getSortIcon('company_name')}</div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer group" onClick={() => handleSort('patient_count')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:companyPerformanceReport.table.patientCount')} {getSortIcon('patient_count')}</div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer group" onClick={() => handleSort('total_income_generated')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:companyPerformanceReport.table.totalIncomeGenerated')} {getSortIcon('total_income_generated')}</div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer group" onClick={() => handleSort('total_endurance_by_company')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:companyPerformanceReport.table.totalEndurance')} {getSortIcon('total_endurance_by_company')}</div>
                  </TableHead>
                  <TableHead className="text-center font-semibold cursor-pointer group" onClick={() => handleSort('net_income_from_company_patients')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:companyPerformanceReport.table.netIncome')} {getSortIcon('net_income_from_company_patients')}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataItems.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">{t('common:noDataAvailableForPeriod')}</TableCell></TableRow>
                )}
                {dataItems.map((item) => (
                  <TableRow key={item.company_id}>
                    <TableCell className="font-medium text-center">{item.company_name}</TableCell>
                    <TableCell className="text-center">{item.patient_count}</TableCell>
                    <TableCell className="text-center">{formatNumber(item.total_income_generated)}</TableCell>
                    <TableCell className="text-center">{formatNumber(item.total_endurance_by_company)}</TableCell>
                    <TableCell className="text-center font-semibold">{formatNumber(item.net_income_from_company_patients)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {dataItems.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold text-sm">
                    <TableCell className="text-center">{t('common:grandTotal')}</TableCell>
                    <TableCell className="text-center">{grandTotals.patient_count}</TableCell>
                    <TableCell className="text-center">{formatNumber(grandTotals.total_income_generated)}</TableCell>
                    <TableCell className="text-center">{formatNumber(grandTotals.total_endurance_by_company)}</TableCell>
                    <TableCell className="text-center text-lg">{formatNumber(grandTotals.net_income_from_company_patients)}</TableCell>
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

export default CompanyPerformanceReportPage;