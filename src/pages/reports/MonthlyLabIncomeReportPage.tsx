// src/pages/reports/MonthlyLabIncomeReportPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';
import { Loader2, FileBarChart2, Printer, AlertTriangle } from 'lucide-react';
import PdfPreviewDialog from '@/components/common/PdfPreviewDialog'; // Assuming you have this

import type { MonthlyLabIncomeFilters } from '@/services/reportService';
import { getMonthlyLabIncome, downloadMonthlyLabIncomeReportPdf } from '@/services/reportService';
import type { MonthlyLabIncomeReportResponse, DailyLabIncomeData } from '@/types/reports';
import { formatNumber } from '@/lib/utils';

// Zod schema for filter form
const getFilterSchema = (t: (key: string) => string) => z.object({
  month: z.string().min(1, t('common:validation.monthRequired')),
  year: z.string().min(4, t('common:validation.yearRequired')),
});
type FilterFormValues = z.infer<ReturnType<typeof getFilterSchema>>;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i)); // Last 5 years + next 4
const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  labelKey: `common:months.${i + 1}`
}));

const MonthlyLabIncomeReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'labTests']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const filterForm = useForm<FilterFormValues>({
    resolver: zodResolver(getFilterSchema(t)),
    defaultValues: {
      month: String(new Date().getMonth() + 1),
      year: String(currentYear),
    },
  });

  const [appliedFilters, setAppliedFilters] = useState<MonthlyLabIncomeFilters>({
    month: new Date().getMonth() + 1,
    year: currentYear,
  });

  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('report.pdf');


  const reportQueryKey = ['monthlyLabIncomeReport', appliedFilters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<MonthlyLabIncomeReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getMonthlyLabIncome(appliedFilters),
    placeholderData: keepPreviousData,
  });

  const handleFilterSubmit = (data: FilterFormValues) => {
    setAppliedFilters({
      month: parseInt(data.month),
      year: parseInt(data.year),
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData?.daily_data.length && !reportData?.summary) return;
    
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfFileName(`MonthlyLabIncome_${reportData?.report_period.from}_to_${reportData?.report_period.to}.pdf`);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await downloadMonthlyLabIncomeReportPdf(appliedFilters);
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common:error.generatePdfFailed'), { description: errorMessage });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const dailyData = reportData?.daily_data || [];
  const summary = reportData?.summary;

  return (
    <div className="space-y-6 p-1 md:p-2 lg:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:monthlyLabIncomeReport.pageTitle')}</h1>
        </div>
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || isLoading || dailyData.length === 0} size="sm">
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
          {t('common:generatePdf')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports:filtersTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...filterForm}>
            <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="flex flex-col sm:flex-row gap-3 items-end">
              <FormField control={filterForm.control} name="month" render={({ field }) => (
                <FormItem className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:min-w-[150px]">
                  <FormLabel className="text-xs">{t('common:month')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isFetching}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={filterForm.control} name="year" render={({ field }) => (
                <FormItem className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:min-w-[120px]">
                  <FormLabel className="text-xs">{t('common:year')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isFetching}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <Button type="submit" className="h-9 mt-2 sm:mt-0 w-full sm:w-auto" disabled={isFetching}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : t('reports:applyFilters')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && !isFetching && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">{t('common:updatingList')}</div>}
      
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2 pt-3"><CardTitle className="text-destructive text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>{t('common:error.fetchFailedExt', { entity: t('reports:monthlyLabIncomeReport.titleShort'), message: error.message })}</CardTitle></CardHeader>
        </Card>
      )}

      {!isLoading && !error && dailyData.length === 0 && !isFetching && (
        <Card className="text-center py-10 text-muted-foreground"><CardContent>{t('reports:noDataForPeriod')}</CardContent></Card>
      )}

      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('reports:dailyBreakdownFor', { monthYear: reportData?.report_period.month_name || '' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-2 md:px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{t('common:date')}</TableHead>
                  <TableHead className="text-right">{t('reports:labIncomeTable.totalPaidLab')}</TableHead>
                  <TableHead className="text-right">{t('reports:labIncomeTable.cashPaidLab')}</TableHead>
                  <TableHead className="text-right">{t('reports:labIncomeTable.bankPaidLab')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.map((day: DailyLabIncomeData) => (
                  <TableRow key={day.date}>
                    <TableCell className="text-center text-xs sm:text-sm font-medium">
                      {format(parseISO(day.date), 'EEEE, MMM d, yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(day.total_lab_income_paid)}</TableCell>
                    <TableCell className="text-right">{formatNumber(day.total_lab_cash_paid)}</TableCell>
                    <TableCell className="text-right">{formatNumber(day.total_lab_bank_paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {summary && (
            <CardFooter className="flex flex-col items-end gap-1 border-t pt-3 text-sm bg-muted/30">
              <div>{t('reports:labIncomeTable.monthlyTotalPaidLab')}: <span className="font-bold text-primary">{formatNumber(summary.total_lab_income_paid)}</span></div>
              <Separator className="my-1 w-48 self-end" />
              <div>{t('reports:labIncomeTable.monthlyCashPaidLab')}: <span className="font-semibold">{formatNumber(summary.total_lab_cash_paid)}</span></div>
              <div>{t('reports:labIncomeTable.monthlyBankPaidLab')}: <span className="font-semibold">{formatNumber(summary.total_lab_bank_paid)}</span></div>
            </CardFooter>
          )}
        </Card>
      )}
      <PdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={(open) => {
            setIsPdfPreviewOpen(open);
            if (!open && pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
        }}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={t('reports:monthlyLabIncomeReport.pdfTitle', { month: reportData?.report_period.month_name || '' })}
        fileName={pdfFileName}
      />
    </div>
  );
};
export default MonthlyLabIncomeReportPage;