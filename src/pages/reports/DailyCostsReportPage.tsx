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
  Box,
  Alert,
  Paper,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Loader2, FileBarChart2, Calendar, Download, FileSpreadsheet } from 'lucide-react';
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
  label: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][i]
}));

// API functions
const getDailyCosts = async (month: number, year: number): Promise<DailyCostsResponse> => {
  const response = await apiClient.get<DailyCostsResponse>('/reports/costs-by-day', {
    params: { month, year }
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

  const formatDateArabic = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE d MMMM', { locale: arSA });
    } catch {
      return dateString;
    }
  };

  const getDayNumber = (dateString: string) => {
    try {
      return new Date(dateString).getDate();
    } catch {
      return '-';
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportData?.data.length) {
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
    if (!reportData?.data.length) {
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
    <Box className="container mx-auto py-4 space-y-6" dir="rtl">
      {/* Header */}
      <Box className="flex items-center justify-between gap-3 mb-6">
        <Box className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <Typography variant="h4" component="h1" className="font-bold">
            تقرير المصروفات اليومية
          </Typography>
        </Box>
        <Box className="flex gap-2">
          <Button
            variant="outlined"
            size="small"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isLoading || !reportData?.data.length}
            startIcon={isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel || isLoading || !reportData?.data.length}
            startIcon={isGeneratingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card elevation={2}>
        <CardHeader 
          title={<Typography variant="h6">فلترة التقرير</Typography>}
          avatar={<FileBarChart2 className="h-5 w-5" />}
        />
        <CardContent>
          <Box className="flex flex-wrap gap-4 items-end">
            {/* Month Select */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="month-label">الشهر</InputLabel>
              <MUISelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                labelId="month-label"
                label="الشهر"
              >
                {months.map(m => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </MUISelect>
            </FormControl>

            {/* Year Select */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="year-label">السنة</InputLabel>
              <MUISelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                labelId="year-label"
                label="السنة"
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </MUISelect>
            </FormControl>

            {/* Loading indicator */}
            {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" className="mb-4">
          فشل تحميل التقرير: {error.message}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </Box>
      )}

      {/* Report Table */}
      {!isLoading && reportData && (
        <Card elevation={2}>
          <CardHeader 
            title={
              <Typography variant="h6">
                مصروفات شهر {months.find(m => m.value === String(appliedFilters.month))?.label} {appliedFilters.year}
              </Typography>
            }
          />
          <CardContent>
            {reportData.data.length === 0 ? (
              <Alert severity="info">لا توجد مصروفات مسجلة في هذا الشهر</Alert>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <MUITable size="small">
                  <MUITableHead>
                    <MUITableRow sx={{ backgroundColor: 'primary.main' }}>
                      <MUITableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>اليوم</MUITableCell>
                      <MUITableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>التاريخ</MUITableCell>
                      <MUITableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>إجمالي المصروفات</MUITableCell>
                      <MUITableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>كاش</MUITableCell>
                      <MUITableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>بنك</MUITableCell>
                      <MUITableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>عدد العمليات</MUITableCell>
                    </MUITableRow>
                  </MUITableHead>
                  <MUITableBody>
                    {reportData.data.map((day, index) => (
                      <MUITableRow 
                        key={day.date}
                        sx={{ 
                          backgroundColor: index % 2 === 0 ? 'grey.50' : 'white',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                      >
                        <MUITableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {getDayNumber(day.date)}
                        </MUITableCell>
                        <MUITableCell sx={{ textAlign: 'center' }}>
                          {formatDateArabic(day.date)}
                        </MUITableCell>
                        <MUITableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: 'error.main' }}>
                          {formatNumber(day.total_cost)}
                        </MUITableCell>
                        <MUITableCell sx={{ textAlign: 'center', color: 'success.main' }}>
                          {formatNumber(day.total_cash)}
                        </MUITableCell>
                        <MUITableCell sx={{ textAlign: 'center', color: 'info.main' }}>
                          {formatNumber(day.total_bank)}
                        </MUITableCell>
                        <MUITableCell sx={{ textAlign: 'center' }}>
                          {day.transactions_count}
                        </MUITableCell>
                      </MUITableRow>
                    ))}
                  </MUITableBody>
                  <MUITableFooter>
                    <MUITableRow sx={{ backgroundColor: 'grey.200' }}>
                      <MUITableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                        الإجمالي
                      </MUITableCell>
                      <MUITableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1rem', color: 'error.main' }}>
                        {formatNumber(reportData.summary.total_cost)}
                      </MUITableCell>
                      <MUITableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1rem', color: 'success.main' }}>
                        {formatNumber(reportData.summary.total_cash)}
                      </MUITableCell>
                      <MUITableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1rem', color: 'info.main' }}>
                        {formatNumber(reportData.summary.total_bank)}
                      </MUITableCell>
                      <MUITableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                        {reportData.summary.transactions_count}
                      </MUITableCell>
                    </MUITableRow>
                  </MUITableFooter>
                </MUITable>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF Preview Dialog */}
      <Dialog
        open={isPdfPreviewOpen}
        onClose={handleClosePdfDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>معاينة تقرير المصروفات اليومية</DialogTitle>
        <DialogContent dividers>
          {pdfPreviewUrl ? (
            <Box className="h-[70vh]">
              <iframe
                title="pdf-preview"
                src={pdfPreviewUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Box>
          ) : (
            <Box className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadFromDialog} variant="outlined">تنزيل</Button>
          <Button onClick={handleClosePdfDialog} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyCostsReportPage;

