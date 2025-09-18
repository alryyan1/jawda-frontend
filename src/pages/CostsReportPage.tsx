// src/pages/reports/CostsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

import type { CostFilters, CostCategory, PaginatedCostsResponse, Cost } from "@/types/finance";
import type { User } from "@/types/users";
import type { Shift } from "@/types/shifts";
import { getCostsReportData, getCostCategoriesList, downloadCostsReportPdf } from "@/services/costService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import { formatNumber } from "@/lib/utils";

// MUI components
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
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
  TableContainer,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Loader2, FileBarChart2, Filter, Printer, AlertTriangle } from "lucide-react";

const getCostReportFilterSchema = () =>
  z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    cost_category_id: z.string().optional(),
    user_cost_id: z.string().optional(),
    shift_id: z.string().optional(),
    payment_method: z.enum(["all", "cash", "bank", "mixed"]).optional(),
    search_description: z.string().optional(),
  });

type CostReportFilterFormValues = z.infer<ReturnType<typeof getCostReportFilterSchema>>;

type HasData<T> = { data: T[] };

const CostsReportPage: React.FC = () => {
  const defaultDateFrom = startOfMonth(new Date());
  const defaultDateTo = endOfMonth(new Date());

  const filterForm = useForm<CostReportFilterFormValues>({
    resolver: zodResolver(getCostReportFilterSchema()),
    defaultValues: {
      date_from: format(defaultDateFrom, "yyyy-MM-dd"),
      date_to: format(defaultDateTo, "yyyy-MM-dd"),
      cost_category_id: "all", user_cost_id: "all", shift_id: "all",
      payment_method: "all", search_description: "",
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<Omit<CostFilters, "page" | "per_page">>({
    date_from: format(defaultDateFrom, "yyyy-MM-dd"),
    date_to: format(defaultDateTo, "yyyy-MM-dd"),
    cost_category_id: null, user_cost_id: null, shift_id: null,
    payment_method: null, search_description: "",
    sort_by: "created_at", sort_direction: "desc",
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('costs_report.pdf');

  const { data: costCategories, isLoading: isLoadingCategories } = useQuery<CostCategory[], Error>({
    queryKey: ["costCategoriesListForReport"],
    queryFn: getCostCategoriesList,
  });

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["usersListForCostReportFilter"],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });
  const usersList = useMemo(() => (usersResponse as HasData<User> | undefined)?.data || [], [usersResponse]);

  const { data: shiftsList, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ["shiftsListForCostReportFilter"],
    queryFn: () => getShiftsList({ per_page: 200, is_closed: "" }),
  });

  const reportQueryKey = ["costsReportData", currentPage, appliedFilters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<PaginatedCostsResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getCostsReportData({ page: currentPage, per_page: 20, ...appliedFilters }),
    placeholderData: keepPreviousData,
  });

  const handleFilterFormSubmit = (data: CostReportFilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters({
      date_from: data.date_from || undefined,
      date_to: data.date_to || undefined,
      cost_category_id: data.cost_category_id === "all" ? null : data.cost_category_id,
      user_cost_id: data.user_cost_id === "all" ? null : data.user_cost_id,
      shift_id: data.shift_id === "all" ? null : data.shift_id,
      payment_method: data.payment_method === "all" ? null : data.payment_method as CostFilters['payment_method'],
      search_description: data.search_description || undefined,
      sort_by: appliedFilters.sort_by,
      sort_direction: appliedFilters.sort_direction,
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData?.data.length) {
        toast.info('لا توجد بيانات للتصدير');
        return;
    }
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await downloadCostsReportPdf({
        date_from: appliedFilters.date_from,
        date_to: appliedFilters.date_to,
        cost_category_id: appliedFilters.cost_category_id,
        user_cost_id: appliedFilters.user_cost_id,
        shift_id: appliedFilters.shift_id,
        payment_method: appliedFilters.payment_method,
        search_description: appliedFilters.search_description,
        sort_by: appliedFilters.sort_by,
        sort_direction: appliedFilters.sort_direction,
      });
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      setPdfFileName(`Costs_Report_${appliedFilters.date_from}_to_${appliedFilters.date_to}.pdf`);
    } catch (err: unknown) {
      console.error("Failed to generate PDF:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const costs = reportData?.data || [];
  const meta = reportData?.meta;
  const summary = reportData?.meta?.summary;
  const isLoadingDropdowns = isLoadingCategories || isLoadingUsers || isLoadingShifts;

  const getPaymentMethodForDisplay = (cost: Cost): string => {
    const hasCash = cost.amount > 0;
    const hasBank = cost.amount_bankak > 0;
    if (hasCash && hasBank) return 'مختلط';
    if (hasCash) return 'نقدي';
    if (hasBank) return 'بنكي';
    return "-";
  };

  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">تقرير التكاليف</h1>
        </div>
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography>حدث خطأ أثناء الجلب</Typography>
          <Typography variant="body2" color="text.secondary">{error.message}</Typography>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex items-center gap-2">
        <FileBarChart2 className="h-7 w-7 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">تقرير التكاليف</h1>
      </div>

      <Card>
        <CardHeader><Typography variant="h6">مرشحات التقرير</Typography></CardHeader>
        <CardContent>
          <form onSubmit={filterForm.handleSubmit(handleFilterFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
              <Controller control={filterForm.control} name="date_from" render={({ field }) => (
                <div>
                  <Typography className="text-xs">من تاريخ</Typography>
                  <TextField type="date" size="small" value={field.value || ''} onChange={field.onChange} disabled={isFetching || isLoadingDropdowns} />
                </div>
              )} />
              <Controller control={filterForm.control} name="date_to" render={({ field }) => (
                <div>
                  <Typography className="text-xs">إلى تاريخ</Typography>
                  <TextField type="date" size="small" value={field.value || ''} onChange={field.onChange} disabled={isFetching || isLoadingDropdowns} />
                </div>
              )} />
              <Controller control={filterForm.control} name="cost_category_id" render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="cat-label">الفئة</InputLabel>
                  <MUISelect labelId="cat-label" label="الفئة" value={field.value} onChange={field.onChange} disabled={isLoadingDropdowns || isFetching}>
                    <MenuItem value="all">كل الفئات</MenuItem>
                    {costCategories?.map((cat) => (
                      <MenuItem key={cat.id} value={String(cat.id)}>{cat.name}</MenuItem>
                    ))}
                  </MUISelect>
                </FormControl>
              )} />
              <Controller control={filterForm.control} name="user_cost_id" render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="user-label">المستخدم</InputLabel>
                  <MUISelect labelId="user-label" label="المستخدم" value={field.value} onChange={field.onChange} disabled={isLoadingDropdowns || isFetching}>
                    <MenuItem value="all">كل المستخدمين</MenuItem>
                    {usersList?.map((u: User) => (
                      <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
                    ))}
                  </MUISelect>
                </FormControl>
              )} />
              <Controller control={filterForm.control} name="shift_id" render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="shift-label">المناوبة</InputLabel>
                  <MUISelect labelId="shift-label" label="المناوبة" value={field.value} onChange={field.onChange} disabled={isLoadingDropdowns || isFetching}>
                    <MenuItem value="all">كل المناوبات</MenuItem>
                    {shiftsList?.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>{s.name || `#${s.id} (${format(parseISO(s.created_at!),"P")})`}</MenuItem>
                    ))}
                  </MUISelect>
                </FormControl>
              )} />
              <Controller control={filterForm.control} name="payment_method" render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="pm-label">طريقة الدفع</InputLabel>
                  <MUISelect labelId="pm-label" label="طريقة الدفع" value={field.value} onChange={field.onChange} disabled={isFetching}>
                    <MenuItem value="all">كل الطرق</MenuItem>
                    <MenuItem value="cash">نقدي</MenuItem>
                    <MenuItem value="bank">بنكي</MenuItem>
                    <MenuItem value="mixed">مختلط</MenuItem>
                  </MUISelect>
                </FormControl>
              )} />
              <Controller control={filterForm.control} name="search_description" render={({ field }) => (
                <div className="lg:col-span-3 xl:col-span-1">
                  <Typography className="text-xs">بحث بالوصف</Typography>
                  <TextField type="search" size="small" {...field} disabled={isFetching} />
                </div>
              )} />
              <Button type="submit" variant="contained" className="h-9 self-end w-full sm:w-auto" disabled={isFetching || isLoadingDropdowns} startIcon={!isFetching ? <Filter className="h-4 w-4" /> : undefined}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق المرشحات'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {(isLoading && !isFetching && costs.length === 0) && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center py-2"><Loader2 className="inline h-4 w-4 animate-spin"/> جاري تحديث القائمة...</div>}
      
      {!isLoading && !isFetching && costs.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground mt-6">
            <CardContent>لا توجد بيانات</CardContent>
        </Card>
      )}

      {!isLoading && costs.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <div className="min-w-[800px]">
              <MUITable size="small">
                <MUITableHead>
                  <MUITableRow>
                    <MUITableCell align="center" className="w-[150px]">التاريخ</MUITableCell>
                    <MUITableCell className="min-w-[200px]">الوصف</MUITableCell>
                    <MUITableCell align="center" className="hidden md:table-cell min-w-[120px]">الفئة</MUITableCell>
                    <MUITableCell align="center" className="hidden sm:table-cell min-w-[120px]">المستخدم</MUITableCell>
                    <MUITableCell align="center" className="w-[100px]">طريقة الدفع</MUITableCell>
                    <MUITableCell align="center" className="w-[90px]">نقدًا</MUITableCell>
                    <MUITableCell align="center" className="w-[90px]">بنكي</MUITableCell>
                    <MUITableCell align="right" className="w-[110px]">الإجمالي</MUITableCell>
                  </MUITableRow>
                </MUITableHead>
                <MUITableBody>
                  {costs.map((cost: Cost) => {
                    const totalCostForRow = cost.amount + cost.amount_bankak;
                    const paymentMethodDisplay = getPaymentMethodForDisplay(cost);
                    return (
                      <MUITableRow key={cost.id}>
                        <MUITableCell align="center" className="text-xs">
                          {cost.created_at ? format(parseISO(cost.created_at), "Pp") : "-"}
                        </MUITableCell>
                        <MUITableCell className="font-medium">{cost.description}</MUITableCell>
                        <MUITableCell align="center" className="hidden md:table-cell">{cost.cost_category_name || "-"}</MUITableCell>
                        <MUITableCell align="center" className="hidden sm:table-cell">{cost.user_cost_name || "-"}</MUITableCell>
                        <MUITableCell align="center">
                          <Chip label={paymentMethodDisplay} size="small" variant={paymentMethodDisplay === 'بنكي' ? 'outlined' : 'filled'} color={paymentMethodDisplay === 'مختلط' ? 'info' : (paymentMethodDisplay === 'نقدي' ? 'default' : 'secondary')} />
                        </MUITableCell>
                        <MUITableCell align="center">{formatNumber(cost.amount)}</MUITableCell>
                        <MUITableCell align="center">{formatNumber(cost.amount_bankak)}</MUITableCell>
                        <MUITableCell align="right" className="font-semibold">{formatNumber(totalCostForRow)}</MUITableCell>
                      </MUITableRow>
                    );
                  })}
                </MUITableBody>
                {summary && (
                  <MUITableFooter>
                    <MUITableRow>
                      <MUITableCell align="center">الإجمالي</MUITableCell>
                      <MUITableCell />
                      <MUITableCell className="hidden md:table-cell" />
                      <MUITableCell className="hidden sm:table-cell" />
                      <MUITableCell />
                      <MUITableCell align="center">{formatNumber(summary.total_cash_paid)}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(summary.total_bank_paid)}</MUITableCell>
                      <MUITableCell align="right" className="font-bold">{formatNumber(summary.grand_total_paid)}</MUITableCell>
                    </MUITableRow>
                  </MUITableFooter>
                )}
              </MUITable>
            </div>
          </TableContainer>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-6 flex items-center justify-center px-2 gap-2">
          <Button variant="outlined" size="small" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>السابق</Button>
          <span className="text-sm text-muted-foreground">الصفحة {meta.current_page} من {meta.last_page}</span>
          <Button variant="outlined" size="small" onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>التالي</Button>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || isLoading || costs.length === 0} size="small" variant="contained" startIcon={!isGeneratingPdf ? <Printer className="h-4 w-4" /> : undefined}>
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : 'توليد ومعاينة PDF'}
        </Button>
      </div>

      <Dialog open={isPdfPreviewOpen} onClose={() => setIsPdfPreviewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>تقرير التكاليف</DialogTitle>
        <DialogContent dividers>
          {(!pdfUrl || isGeneratingPdf) ? (
            <Box className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </Box>
          ) : (
            <Box className="h-[75vh]">
              <iframe src={pdfUrl || ''} title="costs-report" style={{ width: '100%', height: '100%', border: 'none' }} />
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

export default CostsReportPage;