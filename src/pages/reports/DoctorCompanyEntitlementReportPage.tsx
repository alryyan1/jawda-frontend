// src/pages/reports/DoctorCompanyEntitlementReportPage.tsx
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
import { Loader2, Filter, FileText, HandCoins, AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react'; // HandCoins for entitlement
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
    getDoctorCompanyEntitlementReport, 
    downloadDoctorCompanyEntitlementPdf, 
    type DoctorCompanyEntitlementFilters 
} from '@/services/reportService';
import type { DoctorCompanyEntitlementItem, DoctorCompanyEntitlementReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
import { getDoctorsList } from '@/services/doctorService';
import type { DoctorStripped } from '@/types/doctors';
import { Label } from '@/components/ui/label';

const DoctorCompanyEntitlementReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'doctors', 'companies']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const defaultDateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultDateTo = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [filters, setFilters] = useState<DoctorCompanyEntitlementFilters>({
    doctor_id: '', // Will be set by select
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: 'company_name', // Default sort
    sort_direction: 'asc',
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseISO(defaultDateFrom),
    to: parseISO(defaultDateTo),
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: doctorsForFilter = [], isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsListForDCEreport'],
    queryFn: () => getDoctorsList({ active: true }), // Fetch active doctors
  });

  const reportQueryKey = ['doctorCompanyEntitlementReport', filters] as const;
  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery<DoctorCompanyEntitlementReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getDoctorCompanyEntitlementReport(filters),
    enabled: !!filters.doctor_id && !!filters.date_from && !!filters.date_to, // Require doctor and dates
  });

  const handleApplyFilters = () => {
    if (!filters.doctor_id) {
        toast.error(t('reports:doctorCompanyEntitlementReport.doctorRequiredError'));
        return;
    }
    const newFilters: DoctorCompanyEntitlementFilters = {
        ...filters,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : defaultDateFrom,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : defaultDateTo,
    };
    setFilters(newFilters); // Query will refetch due to key change
  };
  
  const handleSort = (columnKey: DoctorCompanyEntitlementFilters['sort_by']) => {
    setFilters(prev => ({
        ...prev,
        sort_by: columnKey,
        sort_direction: prev.sort_by === columnKey && prev.sort_direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDownloadPdf = async () => {
    if (!filters.doctor_id || !filters.date_from || !filters.date_to) {
      toast.error(t('reports:doctorCompanyEntitlementReport.allFiltersRequiredForPdf'));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadDoctorCompanyEntitlementPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const doctorName = doctorsForFilter.find(d => String(d.id) === filters.doctor_id)?.name || 'doctor';
      a.href = url;
      a.download = `Doctor_${doctorName}_Company_Entitlements_${filters.date_from}_to_${filters.date_to}.pdf`;
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
  const grandTotal = reportData?.grand_total_entitlement || 0;

  const getSortIcon = (columnKey: DoctorCompanyEntitlementFilters['sort_by']) => {
    if (filters.sort_by !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 inline" />;
    return filters.sort_direction === 'asc' 
        ? <TrendingUp className="h-3 w-3 text-primary inline" /> 
        : <TrendingDown className="h-3 w-3 text-primary inline" />;
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <HandCoins className="h-7 w-7 text-primary" /> {/* Icon for entitlements */}
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:doctorCompanyEntitlementReport.title')}</h1>
        </div>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || isLoading || !filters.doctor_id || dataItems.length === 0} size="sm">
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
                <Label htmlFor="dcer-doc-filter" className="text-xs">{t('common:doctor')}</Label>
                <Select required value={filters.doctor_id || ""} onValueChange={(val) => setFilters(f => ({...f, doctor_id: val }))} dir={i18n.dir()}>
                    <SelectTrigger id="dcer-doc-filter" className="h-9"><SelectValue placeholder={t('reports:doctorCompanyEntitlementReport.selectDoctorPrompt')} /></SelectTrigger>
                    <SelectContent>
                        {isLoadingDoctors ? <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem> : 
                         doctorsForFilter.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label className="text-xs">{t('common:dateRange')}</Label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} align="start" />
            </div>
            <Button onClick={handleApplyFilters} className="h-9 mt-auto" disabled={isLoading || isFetching || !filters.doctor_id}>
                <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('reports:applyFiltersButton')}
            </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && filters.doctor_id && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {!filters.doctor_id && !isLoading && (
         <Card className="text-center py-10 text-muted-foreground">
            <CardContent>{t('reports:doctorCompanyEntitlementReport.selectDoctorPromptDetailed')}</CardContent>
        </Card>
      )}
      {filters.doctor_id && error && (
         <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle/> {t('common:error.fetchFailedTitle')}</CardTitle></CardHeader>
            <CardContent><p>{error.message || t('common:error.generic')}</p></CardContent>
         </Card>
      )}
      
      {reportData && !isLoading && filters.doctor_id && (
        <>
          <CardDescription className="text-center text-sm">
            {t('reports:reportForDoctorAndPeriod', { 
                doctorName: reportData.doctor_name,
                from: reportPeriod ? format(parseISO(reportPeriod.from), "PPP", { locale: dateLocale }) : '-',
                to: reportPeriod ? format(parseISO(reportPeriod.to), "PPP", { locale: dateLocale }) : '-'
            })}
          </CardDescription>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group text-center" onClick={() => handleSort('company_name')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:doctorCompanyEntitlementReport.table.companyName')} {getSortIcon('company_name')}</div>
                  </TableHead>
                  <TableHead className="text-center font-semibold cursor-pointer group" onClick={() => handleSort('total_entitlement')}>
                    <div className="flex items-center justify-center gap-1">{t('reports:doctorCompanyEntitlementReport.table.totalEntitlement')} {getSortIcon('total_entitlement')}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataItems.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="h-24 text-center">{t('reports:doctorCompanyEntitlementReport.noDataForDoctor')}</TableCell></TableRow>
                )}
                {dataItems.map((item) => (
                  <TableRow key={item.company_id}>
                    <TableCell className="font-medium text-center">{item.company_name}</TableCell>
                    <TableCell className="text-center font-semibold">{formatNumber(item.total_entitlement)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {dataItems.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold text-sm">
                    <TableCell className="text-center">{t('common:grandTotal')}</TableCell>
                    <TableCell className="text-center text-lg">{formatNumber(grandTotal)}</TableCell>
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

export default DoctorCompanyEntitlementReportPage;