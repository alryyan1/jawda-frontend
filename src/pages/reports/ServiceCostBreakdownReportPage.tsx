// src/pages/reports/ServiceCostBreakdownReportPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Loader2, Filter, FileText, ReceiptText, AlertTriangle } from 'lucide-react'; // ReceiptText for costs
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // For optional filters
import { Label } from '@/components/ui/label';
    

import { getServiceCostBreakdownReport, downloadServiceCostBreakdownPdf, type ServiceCostBreakdownFilters } from '@/services/reportService';
import type { ServiceCostBreakdownReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
// For optional filters dropdowns
import { getSubServiceCostsList } from '@/services/subServiceCostService';
import type { SubServiceCost } from '@/types/services';
import { toast } from 'sonner';
// import { getServices } from '@/services/serviceService'; // If filtering by service
// import { getDoctorsList } from '@/services/doctorService'; // If filtering by doctor

const ServiceCostBreakdownReportPage: React.FC = () => {
  const dateLocale = arSA;

  const [filters, setFilters] = useState<ServiceCostBreakdownFilters>({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), // Default current month
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    sub_service_cost_id: null,
    // service_id: null,
    // doctor_id: null,
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch data for filters
  const { data: subServiceCostTypes = [] } = useQuery<SubServiceCost[], Error>({
    queryKey: ['subServiceCostsListForReportFilter'],
    queryFn: getSubServiceCostsList,
  });

  const reportQueryKey = ['serviceCostBreakdownReport', filters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<ServiceCostBreakdownReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getServiceCostBreakdownReport(filters),
    enabled: !!(filters.date_from && filters.date_to),
  });

  const handleApplyFilters = () => {
    const newFilters: ServiceCostBreakdownFilters = {
        ...filters,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    };
    setFilters(newFilters);
    // refetch(); // query will refetch due to filters in queryKey changing
  };
  
  const handleDownloadPdf = async () => {
    if (!filters.date_from || !filters.date_to) {
      toast.error('يجب تحديد نطاق التاريخ');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadServiceCostBreakdownPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Service_Cost_Breakdown_${filters.date_from}_to_${filters.date_to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('تم توليد ملف PDF بنجاح');
    } catch (error: unknown) {
      type HttpError = { response?: { data?: { message?: string } } };
      const err = error as HttpError | Error;
      const message = (typeof err === 'object' && err && 'response' in err && (err as HttpError).response?.data?.message)
        || (err instanceof Error ? err.message : '')
        || 'حدث خطأ غير متوقع';
      toast.error('فشل توليد ملف PDF', { description: message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dataItems = reportData?.data || [];
  const grandTotal = reportData?.grand_total_cost || 0;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <ReceiptText className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">تفصيل تكلفة الخدمات</h1>
        </div>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || isLoading || dataItems.length === 0} size="sm">
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
          طباعة PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">مرشحات التقرير</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
                <Label className="text-xs">نطاق التاريخ</Label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} align="start" />
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="scbr-subtype-filter" className="text-xs">تصفية حسب نوع التكلفة</Label>
                <Select 
                    value={filters.sub_service_cost_id || ""} 
                    onValueChange={(val) => setFilters(f => ({...f, sub_service_cost_id: val === "" ? null : val }))}
                    dir={'rtl'}
                >
                    <SelectTrigger id="scbr-subtype-filter" className="h-9"><SelectValue placeholder={'الكل'} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">الكل</SelectItem>
                        {subServiceCostTypes.map(type => <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {/* Add more filters for service_id, doctor_id if desired */}
            <Button onClick={handleApplyFilters} className="h-9 mt-auto" disabled={isLoading || isFetching}>
                <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>تطبيق المرشحات
            </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {error && (
         <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle/> فشل جلب البيانات</CardTitle></CardHeader>
            <CardContent><p>{error.message || 'حدث خطأ غير متوقع'}</p></CardContent>
         </Card>
      )}
      
      {reportData && !isLoading && (
        <>
          <CardDescription className="text-center text-sm">
            تقرير الفترة: {format(parseISO(reportData.report_period.from), "PPP", { locale: dateLocale })} - {format(parseISO(reportData.report_period.to), "PPP", { locale: dateLocale })}
          </CardDescription>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">نوع التكلفة</TableHead>
                  <TableHead className="text-center">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataItems.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="h-24 text-center">لا توجد بيانات لهذه الفترة</TableCell></TableRow>
                )}
                {dataItems.map((item) => (
                  <TableRow key={item.sub_service_cost_id}>
                    <TableCell className="text-center font-medium">{item.sub_service_cost_name}</TableCell>
                    <TableCell className="text-center">{formatNumber(item.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {dataItems.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold text-sm">
                    <TableCell className="text-center">الإجمالي الكلي</TableCell>
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

export default ServiceCostBreakdownReportPage;