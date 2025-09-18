// src/pages/reports/CompanyPerformanceReportPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';

// MUI
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  TextField,
  Alert,
  Table as MUITable,
  TableBody as MUITableBody,
  TableCell as MUITableCell,
  TableHead as MUITableHead,
  TableRow as MUITableRow,
  TableFooter as MUITableFooter,
} from '@mui/material';
import { Loader2, Filter, FileText, Building, AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

import { getCompanyPerformanceReport, downloadCompanyPerformancePdf, type CompanyPerformanceFilters } from '@/services/reportService';
import type { CompanyPerformanceItem, CompanyPerformanceReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
import { getCompaniesList } from '@/services/companyService';
import type { Company } from '@/types/companies';

const CompanyPerformanceReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultDateTo = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [filters, setFilters] = useState<CompanyPerformanceFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: 'net_income_from_company_patients',
    sort_direction: 'desc',
  });
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: companiesForFilter = [] } = useQuery<Company[], Error>({
    queryKey: ['companiesListForReportFilter'],
    queryFn: () => getCompaniesList({ status: true }),
  });

  const reportQueryKey = ['companyPerformanceReport', filters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<CompanyPerformanceReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getCompanyPerformanceReport(filters),
    enabled: !!(filters.date_from && filters.date_to),
  });

  const handleApplyFilters = () => {
    const newFilters: CompanyPerformanceFilters = {
        ...filters,
        date_from: dateFrom || defaultDateFrom,
        date_to: dateTo || defaultDateTo,
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
      toast.error('يرجى تحديد نطاق التاريخ');
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
      toast.success('تم توليد ملف PDF بنجاح');
    } catch (error: any) {
      toast.error('فشل توليد ملف PDF', { description: error.response?.data?.message || error.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dataItems = reportData?.data || [];
  const reportPeriod = reportData?.report_period;

  const getSortIcon = (columnKey: CompanyPerformanceFilters['sort_by']) => {
    if (filters.sort_by !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30 inline" />;
    return filters.sort_direction === 'asc' 
        ? <TrendingUp className="h-3 w-3 text-primary inline" /> 
        : <TrendingDown className="h-3 w-3 text-primary inline" />;
  };
  
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
          <h1 className="text-2xl sm:text-3xl font-bold">أداء الشركات</h1>
        </div>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || isLoading || dataItems.length === 0} size="small" variant="contained" startIcon={!isGeneratingPdf ? <FileText className="h-4 w-4" /> : undefined}>
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin"/> : 'طباعة PDF'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
                <Typography className="text-xs">من تاريخ</Typography>
                <TextField size="small" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
                <Typography className="text-xs">إلى تاريخ</Typography>
                <TextField size="small" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
                <Typography className="text-xs">الشركة</Typography>
                <FormControl size="small">
                  <InputLabel id="cpr-company-filter">الشركة</InputLabel>
                  <MUISelect value={filters.company_id || ""} onChange={(e) => setFilters(f => ({...f, company_id: String(e.target.value) || null }))} labelId="cpr-company-filter" label="الشركة">
                    <MenuItem value="">كل الشركات</MenuItem>
                    {companiesForFilter.map(comp => <MenuItem key={comp.id} value={String(comp.id)}>{comp.name}</MenuItem>)}
                  </MUISelect>
                </FormControl>
            </div>
            <Button onClick={handleApplyFilters} className="h-9 mt-auto" disabled={isLoading || isFetching} variant="contained" size="small">
                <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>تطبيق المرشحات
            </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {error && (
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography>فشل جلب البيانات</Typography>
          <Typography variant="body2" color="text.secondary">{error.message || 'حدث خطأ'}</Typography>
        </Alert>
      )}
      
      {reportData && !isLoading && (
        <>
          <Typography className="text-center text-sm">
            {reportPeriod && (
              <>تقرير الفترة: {format(parseISO(reportPeriod.from), "PPP")} - {format(parseISO(reportPeriod.to), "PPP")} </>
            )}
          </Typography>
          <Card>
            <MUITable size="small">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" className="cursor-pointer" onClick={() => handleSort('company_name')}>
                    <div className="flex items-center justify-center gap-1">اسم الشركة {getSortIcon('company_name')}</div>
                  </MUITableCell>
                  <MUITableCell align="center" className="cursor-pointer" onClick={() => handleSort('patient_count')}>
                    <div className="flex items-center justify-center gap-1">عدد المرضى {getSortIcon('patient_count')}</div>
                  </MUITableCell>
                  <MUITableCell align="center" className="cursor-pointer" onClick={() => handleSort('total_income_generated')}>
                    <div className="flex items-center justify-center gap-1">إجمالي الدخل {getSortIcon('total_income_generated')}</div>
                  </MUITableCell>
                  <MUITableCell align="center" className="cursor-pointer" onClick={() => handleSort('total_endurance_by_company')}>
                    <div className="flex items-center justify-center gap-1">تحمل الشركة {getSortIcon('total_endurance_by_company')}</div>
                  </MUITableCell>
                  <MUITableCell align="center" className="font-semibold cursor-pointer" onClick={() => handleSort('net_income_from_company_patients')}>
                    <div className="flex items-center justify-center gap-1">صافي الدخل {getSortIcon('net_income_from_company_patients')}</div>
                  </MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow><MUITableCell colSpan={5} align="center" className="h-24">لا توجد بيانات للفترة</MUITableCell></MUITableRow>
                )}
                {dataItems.map((item: CompanyPerformanceItem) => (
                  <MUITableRow key={item.company_id}>
                    <MUITableCell align="center" className="font-medium">{item.company_name}</MUITableCell>
                    <MUITableCell align="center">{item.patient_count}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.total_income_generated)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.total_endurance_by_company)}</MUITableCell>
                    <MUITableCell align="center" className="font-semibold">{formatNumber(item.net_income_from_company_patients)}</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
              {dataItems.length > 0 && (
                <MUITableFooter>
                  <MUITableRow>
                    <MUITableCell align="center">الإجمالي الكلي</MUITableCell>
                    <MUITableCell align="center">{grandTotals.patient_count}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(grandTotals.total_income_generated)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(grandTotals.total_endurance_by_company)}</MUITableCell>
                    <MUITableCell align="center" className="text-lg">{formatNumber(grandTotals.net_income_from_company_patients)}</MUITableCell>
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

export default CompanyPerformanceReportPage;