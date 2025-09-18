// src/pages/reports/MonthlyLabIncomeReportPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import type { MonthlyLabIncomeFilters } from '@/services/reportService';
import { getMonthlyLabIncome, downloadMonthlyLabIncomeReportPdf } from '@/services/reportService';
import type { MonthlyLabIncomeReportResponse, DailyLabIncomeData } from '@/types/reports';
import { formatNumber } from '@/lib/utils';

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
  TableFooter as MUITableFooter,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Alert,
} from '@mui/material';
import { Loader2, FileBarChart2, Printer, AlertTriangle } from 'lucide-react';

// Zod schema for filter form
const getFilterSchema = () => z.object({
  month: z.string().min(1, 'الشهر مطلوب'),
  year: z.string().min(4, 'السنة مطلوبة'),
});
type FilterFormValues = z.infer<ReturnType<typeof getFilterSchema>>;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));
const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i]
}));

const MonthlyLabIncomeReportPage: React.FC = () => {
  const filterForm = useForm<FilterFormValues>({
    resolver: zodResolver(getFilterSchema()),
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
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
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
          <h1 className="text-2xl sm:text-3xl font-bold">دخل المختبر الشهري</h1>
        </div>
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || isLoading || dailyData.length === 0} size="small" variant="contained">
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          <span className="ltr:ml-2 rtl:mr-2">توليد PDF</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
        </CardHeader>
        <CardContent>
          <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="flex flex-col sm:flex-row gap-3 items-end">
            <Controller control={filterForm.control} name="month" render={({ field }) => (
              <FormControl size="small" className="w-full sm:w-[180px]">
                <InputLabel id="month-label">الشهر</InputLabel>
                <MUISelect labelId="month-label" label="الشهر" value={field.value} onChange={field.onChange} disabled={isFetching}>
                  {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </MUISelect>
              </FormControl>
            )} />
            <Controller control={filterForm.control} name="year" render={({ field }) => (
              <FormControl size="small" className="w-full sm:w-[150px]">
                <InputLabel id="year-label">السنة</InputLabel>
                <MUISelect labelId="year-label" label="السنة" value={field.value} onChange={field.onChange} disabled={isFetching}>
                  {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </MUISelect>
              </FormControl>
            )} />
            <Button type="submit" variant="contained" className="h-9 mt-2 sm:mt-0 w-full sm:w-auto" disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق المرشحات'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && !isFetching && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">جاري تحديث القائمة</div>}
      
      {error && (
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography>فشل جلب البيانات: دخل المختبر الشهري</Typography>
          <Typography variant="body2" color="text.secondary">{error.message}</Typography>
        </Alert>
      )}

      {!isLoading && !error && dailyData.length === 0 && !isFetching && (
        <Card className="text-center py-10 text-muted-foreground"><CardContent>لا توجد بيانات لهذه الفترة</CardContent></Card>
      )}

      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <Typography variant="h6">
              تفصيل يومي لشهر {reportData?.report_period.month_name || ''}
            </Typography>
          </CardHeader>
          <CardContent className="px-0 sm:px-2 md:px-4">
            <MUITable size="small">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center">التاريخ</MUITableCell>
                  <MUITableCell align="right">إجمالي المدفوع للمختبر</MUITableCell>
                  <MUITableCell align="right">نقداً</MUITableCell>
                  <MUITableCell align="right">شبكة/بنك</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dailyData.map((day: DailyLabIncomeData) => (
                  <MUITableRow key={day.date}>
                    <MUITableCell align="center">
                      {format(parseISO(day.date), 'EEEE, MMM d, yyyy')}
                    </MUITableCell>
                    <MUITableCell align="right" className="font-semibold">{formatNumber(day.total_lab_income_paid)}</MUITableCell>
                    <MUITableCell align="right">{formatNumber(day.total_lab_cash_paid)}</MUITableCell>
                    <MUITableCell align="right">{formatNumber(day.total_lab_bank_paid)}</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
              {summary && (
                <MUITableFooter>
                  <MUITableRow>
                    <MUITableCell align="center">إجمالي المدفوع للشهر</MUITableCell>
                    <MUITableCell align="right" className="font-bold text-primary">{formatNumber(summary.total_lab_income_paid)}</MUITableCell>
                    <MUITableCell align="right">{formatNumber(summary.total_lab_cash_paid)}</MUITableCell>
                    <MUITableCell align="right">{formatNumber(summary.total_lab_bank_paid)}</MUITableCell>
                  </MUITableRow>
                </MUITableFooter>
              )}
            </MUITable>
          </CardContent>
        </Card>
      )}

      <Dialog open={isPdfPreviewOpen} onClose={() => setIsPdfPreviewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>دخل المختبر الشهري - {reportData?.report_period.month_name || ''}</DialogTitle>
        <DialogContent dividers>
          {(!pdfUrl || isGeneratingPdf) ? (
            <Box className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </Box>
          ) : (
            <Box className="h-[75vh]">
              <iframe src={pdfUrl || ''} title="monthly-lab-income" style={{ width: '100%', height: '100%', border: 'none' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            if (!pdfUrl) return;
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = pdfFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }} variant="outlined">تنزيل</Button>
          <Button onClick={() => setIsPdfPreviewOpen(false)} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
export default MonthlyLabIncomeReportPage;