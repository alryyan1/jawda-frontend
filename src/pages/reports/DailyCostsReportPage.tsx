// src/pages/reports/DailyCostsReportPage.tsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { toast } from 'sonner';

import { formatNumber } from '@/lib/utils';

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
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
  TableFooter as MUITableFooter,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Loader2, Calendar, AlertTriangle, FileText, FileSpreadsheet, Download } from 'lucide-react';
import apiClient from '@/services/api';

// Types
interface DailyCostData {
  date: string;
  total_cash: number;
  total_bank: number;
  total_cost: number;
  transactions_count: number;
}

interface DailyCostsResponse {
  data: DailyCostData[];
  summary: {
    total_cash: number;
    total_bank: number;
    total_cost: number;
    transactions_count: number;
  };
  report_period: {
    month: number;
    year: number;
    from: string;
    to: string;
  };
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));
const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][i],
}));

// API functions
const getDailyCosts = async (month: number, year: number): Promise<DailyCostsResponse> => {
  const response = await apiClient.get<DailyCostsResponse>('/reports/costs-by-day', {
    params: { month, year },
  });
  return response.data;
};

const downloadDailyCostsPdf = async (month: number, year: number): Promise<Blob> => {
  const response = await apiClient.get('/reports/costs-by-day/pdf', {
    params: { month, year },
    responseType: 'blob',
  });
  return response.data;
};

const downloadDailyCostsExcel = async (month: number, year: number): Promise<Blob> => {
  const response = await apiClient.get('/reports/costs-by-day/excel', {
    params: { month, year },
    responseType: 'blob',
  });
  return response.data;
};

const DailyCostsReportPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  const appliedFilters = {
    month: parseInt(selectedMonth),
    year: parseInt(selectedYear),
  };

  const reportQueryKey = ['dailyCostsReport', appliedFilters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<DailyCostsResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getDailyCosts(appliedFilters.month, appliedFilters.year),
    placeholderData: keepPreviousData,
  });

  const dailyData = reportData?.data || [];
  const summary = reportData?.summary;

  const formatDateArabic = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd (EEEE)', { locale: arSA });
    } catch {
      return dateString;
    }
  };

  const handleDownloadPdf = async () => {
    if (!dailyData.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadDailyCostsPdf(appliedFilters.month, appliedFilters.year);
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl(objectUrl);
      setIsPdfPreviewOpen(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!dailyData.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    setIsGeneratingExcel(true);
    try {
      const blob = await downloadDailyCostsExcel(appliedFilters.month, appliedFilters.year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Costs_${appliedFilters.year}_${appliedFilters.month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تنزيل ملف Excel بنجاح');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل تنزيل ملف Excel', { description: errorMessage });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleClosePdfDialog = () => {
    setIsPdfPreviewOpen(false);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleDownloadFromDialog = () => {
    if (!pdfPreviewUrl) return;
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `Daily_Costs_${appliedFilters.year}_${appliedFilters.month}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">تقرير المصروفات اليومية</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel || isLoading || dailyData.length === 0}
            size="small"
            variant="outlined"
            startIcon={!isGeneratingExcel ? <FileSpreadsheet className="h-4 w-4" /> : undefined}
          >
            {isGeneratingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تصدير Excel'}
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isLoading || dailyData.length === 0}
            size="small"
            variant="contained"
            startIcon={!isGeneratingPdf ? <FileText className="h-4 w-4" /> : undefined}
          >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : 'طباعة PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end !py-2">
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">الشهر</Typography>
            <FormControl size="small">
              <InputLabel id="month-select-label">الشهر</InputLabel>
              <MUISelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(String(e.target.value))}
                labelId="month-select-label"
                label="الشهر"
              >
                {months.map(m => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">السنة</Typography>
            <FormControl size="small">
              <InputLabel id="year-select-label">السنة</InputLabel>
              <MUISelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(String(e.target.value))}
                labelId="year-select-label"
                label="السنة"
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          {isFetching && (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <Alert severity="error" icon={<AlertTriangle />} sx={{ py: 0.5 }}>
          <Typography variant="body2">فشل تحميل التقرير</Typography>
          <Typography variant="caption" color="text.secondary">{error.message}</Typography>
        </Alert>
      )}

      {!isLoading && reportData && (
        <>
          <Typography className="text-center text-xs text-muted-foreground">
            مصروفات شهر {months.find(m => m.value === String(appliedFilters.month))?.label} {appliedFilters.year}
          </Typography>
          <Card>
            {dailyData.length === 0 ? (
              <Alert severity="info" sx={{ m: 1 }}>لا توجد مصروفات مسجلة في هذا الشهر</Alert>
            ) : (
              <MUITable
                size="small"
                sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.8125rem' } }}
              >
                <MUITableHead>
                  <MUITableRow>
                    <MUITableCell align="center">التاريخ</MUITableCell>
                    <MUITableCell align="center">إجمالي المصروفات</MUITableCell>
                    <MUITableCell align="center">كاش</MUITableCell>
                    <MUITableCell align="center">بنك</MUITableCell>
                    <MUITableCell align="center">عدد العمليات</MUITableCell>
                  </MUITableRow>
                </MUITableHead>
                <MUITableBody>
                  {dailyData.map((day) => (
                    <MUITableRow key={day.date}>
                      <MUITableCell align="center">{formatDateArabic(day.date)}</MUITableCell>
                      <MUITableCell align="center" className="font-semibold text-red-600 dark:text-red-400">
                        {formatNumber(day.total_cost)}
                      </MUITableCell>
                      <MUITableCell align="center">{formatNumber(day.total_cash)}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(day.total_bank)}</MUITableCell>
                      <MUITableCell align="center">{day.transactions_count}</MUITableCell>
                    </MUITableRow>
                  ))}
                </MUITableBody>
                {summary && (
                  <MUITableFooter>
                    <MUITableRow>
                      <MUITableCell align="center">الإجمالي</MUITableCell>
                      <MUITableCell align="center" className="font-bold text-red-600 dark:text-red-400">
                        {formatNumber(summary.total_cost)}
                      </MUITableCell>
                      <MUITableCell align="center">{formatNumber(summary.total_cash)}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(summary.total_bank)}</MUITableCell>
                      <MUITableCell align="center">{summary.transactions_count}</MUITableCell>
                    </MUITableRow>
                  </MUITableFooter>
                )}
              </MUITable>
            )}
          </Card>
        </>
      )}

      {/* PDF Preview Dialog */}
      <Dialog open={isPdfPreviewOpen} onClose={handleClosePdfDialog} fullWidth maxWidth="lg">
        <DialogTitle>معاينة تقرير المصروفات اليومية</DialogTitle>
        <DialogContent dividers>
          {pdfPreviewUrl ? (
            <div className="h-[70vh]">
              <iframe
                title="pdf-preview"
                src={pdfPreviewUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadFromDialog} variant="outlined" size="small" startIcon={<Download className="h-4 w-4" />}>
            تنزيل
          </Button>
          <Button onClick={handleClosePdfDialog} variant="contained" size="small">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DailyCostsReportPage;
