// src/pages/reports/DoctorShiftsReportPage.tsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Filter, FileBarChart2, BarChart3, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Form, FormItem, FormLabel } from '@/components/ui/form';

import type { DoctorStripped } from '@/types/doctors';
import { downloadDoctorShiftsReportPdf, getDoctorShiftsReport, type DoctorShiftReportFilters } from '@/services/reportService';
import { getDoctorsList } from '@/services/doctorService';
import DoctorShiftFinancialSummaryDialog from '@/components/reports/DoctorShiftFinancialSummaryDialog';
import type { DoctorShiftReportItem } from '@/types/reports';
import { toast } from 'sonner';

interface FilterFormValues {
  date_from: string;
  date_to: string;
  doctor_id: string;
  status: string;
  shift_id: string;
}

// Simple DatePicker if shadcn one is not set up
const SimpleDatePicker: React.FC<{ value?: string; onChange: (dateStr: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
    <Input type="date" value={value} onChange={e => onChange(e.target.value)} className="h-9" disabled={disabled}/>
);

const DoctorShiftsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common']);
  
  const [selectedShiftForSummary, setSelectedShiftForSummary] = useState<DoctorShiftReportItem | null>(null);
  const initialDateTo = format(new Date(), 'yyyy-MM-dd');
  const initialDateFrom = format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd');

  const form = useForm<FilterFormValues>({
    defaultValues: {
      date_from: initialDateFrom,
      date_to: initialDateTo,
      doctor_id: 'all',
      status: 'all',
      shift_id: 'all',
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<DoctorShiftReportFilters>({
    date_from: initialDateFrom,
    date_to: initialDateTo,
    doctor_id: form.watch('doctor_id'),
    status: 'all',
    shift_id: 'all',
    // page: 1,
    // per_page: 10,
  });

  const { data: doctorsList, isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsSimpleListForReport'],
    queryFn: () => getDoctorsList({ active: true }),
  });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
     setIsDownloadingPdf(true);
     try {
         // Transform filters the same way as in the report query
         const transformedFilters = {
             ...appliedFilters,
             doctor_id: appliedFilters.doctor_id === 'all' ? null : appliedFilters.doctor_id,
             status: appliedFilters.status === 'all' ? null : appliedFilters.status,
             shift_id: appliedFilters.shift_id === 'all' ? null : appliedFilters.shift_id,
         };
         
         const blob = await downloadDoctorShiftsReportPdf(transformedFilters);
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `doctor_shifts_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
         document.body.appendChild(a);
         a.click();
         a.remove();
         window.URL.revokeObjectURL(url);
         toast.success(t('common:downloadComplete'));
     } catch (error) {
         console.error("PDF Download error:", error);
         toast.error(t('common:error.downloadFailed'), { 
             description: error instanceof Error ? error.message : t('common:error.unknown') 
         });
     } finally {
         setIsDownloadingPdf(false);
     }
  };

  const { data: reportData, isLoading, error, isFetching } = useQuery({
    queryKey: ['doctorShiftsReport', currentPage, appliedFilters],
    queryFn: () => getDoctorShiftsReport({ 
      page: currentPage, 
      ...appliedFilters,
      doctor_id: appliedFilters.doctor_id === 'all' ? null : appliedFilters.doctor_id,
      status: appliedFilters.status === 'all' ? null : appliedFilters.status,
      shift_id: appliedFilters.shift_id === 'all' ? null : appliedFilters.shift_id,
    }),
    placeholderData: keepPreviousData,
  });

  const onSubmit = (values: FilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters(values);
  };

  if (error) return <p className="text-destructive p-4">{t('common:error.fetchFailedExt', { entity: t('reports:doctorShiftsReport.title'), message: error.message })}</p>;

  const doctorShifts = reportData?.data || [];
  const meta = reportData?.meta;

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div className="flex items-center gap-2">
         <FileBarChart2 className="h-7 w-7 text-primary"/>
         <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:doctorShiftsReport.title')}</h1>
         <Button onClick={handleDownloadPdf} variant="outline" size="sm" disabled={isDownloadingPdf || isLoading || !doctorShifts || doctorShifts.length === 0}>
             {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
             {t('common:downloadPdf')}
         </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports:doctorShiftsReport.filters')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end" dir={i18n.dir()}>
              <FormItem>
                <FormLabel className="text-xs">{t('reports:doctorShiftsReport.dateRange')} ({t('common:from')})</FormLabel>
                <SimpleDatePicker 
                  value={form.watch('date_from')} 
                  onChange={(val) => form.setValue('date_from', val)} 
                  disabled={isFetching} 
                />
              </FormItem>
              <FormItem>
                <FormLabel className="text-xs">{t('common:to')}</FormLabel>
                <SimpleDatePicker 
                  value={form.watch('date_to')} 
                  onChange={(val) => form.setValue('date_to', val)} 
                  disabled={isFetching}
                />
              </FormItem>
              <FormItem>
                <FormLabel className="text-xs">{t('reports:doctorShiftsReport.doctor')}</FormLabel>
                <Select 
                  value={form.watch('doctor_id')} 
                  onValueChange={(val) => form.setValue('doctor_id', val)} 
                  dir={i18n.dir()} 
                  disabled={isLoadingDoctors || isFetching}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('reports:doctorShiftsReport.allDoctors')}</SelectItem>
                    {doctorsList?.map(doc => (
                      <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              <FormItem>
                <FormLabel className="text-xs">{t('reports:doctorShiftsReport.status')}</FormLabel>
                <Select 
                  value={form.watch('status')} 
                  onValueChange={(val) => form.setValue('status', val)} 
                  dir={i18n.dir()} 
                  disabled={isFetching}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('reports:doctorShiftsReport.allStatuses')}</SelectItem>
                    <SelectItem value="1">{t('reports:doctorShiftsReport.open')}</SelectItem>
                    <SelectItem value="0">{t('reports:doctorShiftsReport.closed')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
              <Button type="submit" className="h-9 self-end" disabled={isFetching || isLoading}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
                {t('reports:doctorShiftsReport.applyFilters')}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      {(isLoading && !isFetching) && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {!isLoading && !isFetching && doctorShifts.length === 0 && (
         <Card className="text-center py-10 text-muted-foreground"><CardContent>{t('reports:doctorShiftsReport.noData')}</CardContent></Card>
      )}

      {!isLoading && doctorShifts.length > 0 && (
        <Card>
          <Table dir={i18n.dir()}>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">{t('reports:doctorShiftsReport.table.doctorName')}</TableHead>
                <TableHead className="hidden sm:table-cell text-center">{t('reports:doctorShiftsReport.table.generalShift')}</TableHead>
                <TableHead className="text-center">{t('reports:doctorShiftsReport.table.startTime')}</TableHead>
                <TableHead className="hidden md:table-cell text-center">{t('reports:doctorShiftsReport.table.endTime')}</TableHead>
                <TableHead className="hidden sm:table-cell text-center">{t('reports:doctorShiftsReport.table.duration')}</TableHead>
                <TableHead className="text-center">{t('reports:doctorShiftsReport.table.status')}</TableHead>
                <TableHead className="hidden lg:table-cell text-center">{t('reports:doctorShiftsReport.table.openedBy')}</TableHead>
                <TableHead className="text-right">{t('reports:doctorShiftsReport.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctorShifts.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell className="font-medium text-center">{ds.doctor_name || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center">{ds.general_shift_name || `Shift #${ds.shift_id}`}</TableCell>
                  <TableCell className="text-center">{ds.formatted_start_time}</TableCell>
                  <TableCell className="hidden md:table-cell text-center">{ds.formatted_end_time}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center">{ds.duration || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={ds.status ? 'default' : 'outline'}>{ds.status_text}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center">{ds.user_name || '-'}</TableCell>
                  <TableCell className="text-right">
    <Button 
        variant="outline" 
        size="sm" 
        className="h-7 px-2"
        onClick={() => setSelectedShiftForSummary(ds)}
    >
        <BarChart3 className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
        {t('common:summaryShort', "Summary")}
    </Button>
    {/* Or put it inside the existing DropdownMenu */}
</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t shrink-0">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.previous")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("common:pagination.pageInfo", {
              current: meta.current_page,
              total: meta.last_page,
            })}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage === meta.last_page || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.next")}
          </Button>
        </div>
      )}
      {selectedShiftForSummary && (
    <DoctorShiftFinancialSummaryDialog
        isOpen={!!selectedShiftForSummary}
        onOpenChange={(open) => { if (!open) setSelectedShiftForSummary(null); }}
        doctorShift={selectedShiftForSummary}
    />
)}
    </div>
  );
};

export default DoctorShiftsReportPage;