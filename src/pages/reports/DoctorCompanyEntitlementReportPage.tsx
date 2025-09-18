// src/pages/reports/DoctorCompanyEntitlementReportPage.tsx
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
import { Loader2, Filter, FileText, HandCoins, AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

import { 
    getDoctorCompanyEntitlementReport, 
    downloadDoctorCompanyEntitlementPdf, 
    type DoctorCompanyEntitlementFilters 
} from '@/services/reportService';
import type { DoctorCompanyEntitlementItem, DoctorCompanyEntitlementReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
import { getDoctorsList } from '@/services/doctorService';
import type { DoctorStripped } from '@/types/doctors';

const DoctorCompanyEntitlementReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultDateTo = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [filters, setFilters] = useState<DoctorCompanyEntitlementFilters>({
    doctor_id: '',
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: 'company_name',
    sort_direction: 'asc',
  });
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: doctorsForFilter = [], isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsListForDCEreport'],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const reportQueryKey = ['doctorCompanyEntitlementReport', filters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<DoctorCompanyEntitlementReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getDoctorCompanyEntitlementReport(filters),
    enabled: !!filters.doctor_id && !!filters.date_from && !!filters.date_to,
  });

  const handleApplyFilters = () => {
    if (!filters.doctor_id) {
        toast.error('الطبيب مطلوب');
        return;
    }
    const newFilters: DoctorCompanyEntitlementFilters = {
        ...filters,
        date_from: dateFrom || defaultDateFrom,
        date_to: dateTo || defaultDateTo,
    };
    setFilters(newFilters);
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
      toast.error('الرجاء تحديد الطبيب ونطاق التاريخ');
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
      toast.success('تم توليد ملف PDF بنجاح');
    } catch (error: any) {
      toast.error('فشل توليد ملف PDF', { description: error.response?.data?.message || error.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dataItems = reportData?.data || [];
  const reportPeriod = reportData?.report_period;
  const grandTotal = reportData?.grand_total_entitlement || 0;

  const getSortIcon = (columnKey: DoctorCompanyEntitlementFilters['sort_by']) => {
    if (filters.sort_by !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30 inline" />;
    return filters.sort_direction === 'asc' 
        ? <TrendingUp className="h-3 w-3 text-primary inline" /> 
        : <TrendingDown className="h-3 w-3 text-primary inline" />;
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <HandCoins className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">استحقاقات الأطباء للشركات</h1>
        </div>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || isLoading || !filters.doctor_id || dataItems.length === 0} size="small" variant="contained" startIcon={!isGeneratingPdf ? <FileText className="h-4 w-4" /> : undefined}>
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin"/> : 'طباعة PDF'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
                <Typography className="text-xs">الطبيب</Typography>
                <FormControl size="small">
                  <InputLabel id="dcer-doc-filter">الطبيب</InputLabel>
                  <MUISelect required value={filters.doctor_id || ''} onChange={(e) => setFilters(f => ({...f, doctor_id: String(e.target.value) }))} labelId="dcer-doc-filter" label="الطبيب">
                    {isLoadingDoctors ? <MenuItem value="loading" disabled>جارِ التحميل...</MenuItem> : 
                     doctorsForFilter.map(doc => <MenuItem key={doc.id} value={String(doc.id)}>{doc.name}</MenuItem>)}
                  </MUISelect>
                </FormControl>
            </div>
            <div className="flex flex-col gap-1.5">
                <Typography className="text-xs">من تاريخ</Typography>
                <TextField size="small" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
                <Typography className="text-xs">إلى تاريخ</Typography>
                <TextField size="small" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={handleApplyFilters} className="h-9 mt-auto" disabled={isLoading || isFetching || !filters.doctor_id} variant="contained" size="small">
                <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>تطبيق المرشحات
            </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && filters.doctor_id && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {!filters.doctor_id && !isLoading && (
         <Card className="text-center py-10 text-muted-foreground">
            <CardContent>يرجى اختيار الطبيب أولاً</CardContent>
        </Card>
      )}
      {filters.doctor_id && error && (
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography>فشل جلب البيانات</Typography>
          <Typography variant="body2" color="text.secondary">{error.message || 'حدث خطأ'}</Typography>
        </Alert>
      )}
      
      {reportData && !isLoading && filters.doctor_id && (
        <>
          <Typography className="text-center text-sm">
            تقرير للطبيب: {reportData.doctor_name} | الفترة: {reportPeriod ? format(parseISO(reportPeriod.from), 'PPP') : '-'} - {reportPeriod ? format(parseISO(reportPeriod.to), 'PPP') : '-'}
          </Typography>
          <Card>
            <MUITable size="small">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" className="cursor-pointer" onClick={() => handleSort('company_name')}>
                    <div className="flex items-center justify-center gap-1">اسم الشركة {getSortIcon('company_name')}</div>
                  </MUITableCell>
                  <MUITableCell align="center" className="font-semibold cursor-pointer" onClick={() => handleSort('total_entitlement')}>
                    <div className="flex items-center justify-center gap-1">إجمالي الاستحقاق {getSortIcon('total_entitlement')}</div>
                  </MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow><MUITableCell colSpan={2} align="center" className="h-24">لا توجد بيانات للطبيب المحدد</MUITableCell></MUITableRow>
                )}
                {dataItems.map((item: DoctorCompanyEntitlementItem) => (
                  <MUITableRow key={item.company_id}>
                    <MUITableCell align="center" className="font-medium">{item.company_name}</MUITableCell>
                    <MUITableCell align="center" className="font-semibold">{formatNumber(item.total_entitlement)}</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
              {dataItems.length > 0 && (
                <MUITableFooter>
                  <MUITableRow>
                    <MUITableCell align="center">الإجمالي الكلي</MUITableCell>
                    <MUITableCell align="center" className="text-lg">{formatNumber(grandTotal)}</MUITableCell>
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

export default DoctorCompanyEntitlementReportPage;