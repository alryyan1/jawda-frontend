// src/pages/reports/CostsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

import type { CostFilters, CostCategory, PaginatedCostsResponse, Cost } from "@/types/finance";
import type { DoctorShiftReportItem } from "@/types/reports";
import type { User } from "@/types/users";
import type { Shift } from "@/types/shifts";
import { getCostsReportData, getCostCategoriesList, downloadCostsReportPdf, downloadCostsReportExcel, updateCostDoctorShift } from "@/services/costService";
import { getDoctorShiftsReport } from "@/services/reportService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import { formatNumber } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/common";

// MUI components
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Autocomplete,
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
  Popover,
  Stack,
  IconButton,
  Badge,
} from "@mui/material";
import { Loader2, Filter, Printer, AlertTriangle, FileSpreadsheet } from "lucide-react";

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

interface AutocompleteOption {
  id: string;
  name: string;
}

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
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
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

  const handleDownloadExcel = async () => {
    if (!reportData?.data.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    setIsGeneratingExcel(true);

    try {
      const blob = await downloadCostsReportExcel({
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
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `Costs_Report_${appliedFilters.date_from}_to_${appliedFilters.date_to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success('تم تصدير ملف Excel بنجاح');
    } catch (err: unknown) {
      console.error("Failed to generate Excel:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل توليد ملف Excel', { description: errorMessage });
    } finally {
      setIsGeneratingExcel(false);
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

  // Filter popover
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const activeFilterCount = [
    appliedFilters.cost_category_id, appliedFilters.user_cost_id,
    appliedFilters.shift_id, appliedFilters.payment_method,
    appliedFilters.search_description,
  ].filter(Boolean).length;

  // Doctor shifts for inline autocomplete (unassigned costs)
  const { data: doctorShiftsData } = useQuery<PaginatedResponse<DoctorShiftReportItem>, Error>({
    queryKey: ["doctorShiftsForCostAssign", appliedFilters.date_from, appliedFilters.date_to],
    queryFn: () => getDoctorShiftsReport({
      date_from: appliedFilters.date_from,
      date_to: appliedFilters.date_to,
      per_page: 100,
      include_financials: false,
    }),
    refetchOnWindowFocus: false,
  });
  const doctorShiftOptions = useMemo(() =>
    (doctorShiftsData?.data ?? []).map(ds => ({
      id: ds.id,
      label: `#${ds.id} — ${ds.doctor_name} (${ds.formatted_start_time})`,
    })), [doctorShiftsData]);

  const queryClient = useQueryClient();
  const assignMutation = useMutation({
    mutationFn: ({ costId, doctorShiftId }: { costId: number; doctorShiftId: number | null }) =>
      updateCostDoctorShift(costId, doctorShiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costsReportData"] });
      toast.success("تم تعيين وردية الطبيب");
    },
    onError: () => toast.error("فشل التعيين"),
  });

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
      <Alert severity="error" icon={<AlertTriangle />} sx={{ m: 2 }}>
        <Typography>حدث خطأ أثناء الجلب: {error.message}</Typography>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-2">
        {/* Filter button */}
        <IconButton
          size="small"
          onClick={(e) => setFilterAnchor(e.currentTarget)}
          sx={{ border: '1px solid', borderColor: activeFilterCount ? 'primary.main' : 'divider', borderRadius: 1, px: 1.5, py: 0.75 }}
        >
          <Badge badgeContent={activeFilterCount} color="primary">
            <Filter size={16} />
          </Badge>
        </IconButton>

        {/* Date range always visible */}
        <form onSubmit={filterForm.handleSubmit(handleFilterFormSubmit)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Controller control={filterForm.control} name="date_from" render={({ field }) => (
            <TextField label="من" type="date" size="small" value={field.value || ''} onChange={field.onChange}
              disabled={isFetching} InputLabelProps={{ shrink: true }} sx={{ width: 135 }} />
          )} />
          <Controller control={filterForm.control} name="date_to" render={({ field }) => (
            <TextField label="إلى" type="date" size="small" value={field.value || ''} onChange={field.onChange}
              disabled={isFetching} InputLabelProps={{ shrink: true }} sx={{ width: 135 }} />
          )} />
          <Button type="submit" size="small" variant="contained" disabled={isFetching || isLoadingDropdowns}
            startIcon={isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Filter size={13} />}>
            {isFetching ? '' : 'تطبيق'}
          </Button>
        </form>

        <Box sx={{ flex: 1 }} />
        <Button onClick={handleDownloadExcel} disabled={isGeneratingExcel || isLoading || costs.length === 0}
          size="small" variant="outlined" startIcon={isGeneratingExcel ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet size={13} />}>
          Excel
        </Button>
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || isLoading || costs.length === 0}
          size="small" variant="contained" color="secondary" startIcon={isGeneratingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer size={13} />}>
          PDF
        </Button>
      </div>

      {/* ── Filter popover (vertical stack) ── */}
      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <form onSubmit={filterForm.handleSubmit((data) => { handleFilterFormSubmit(data); setFilterAnchor(null); })}>
          <Stack spacing={1.5} sx={{ p: 2, width: 260 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">فلترة إضافية</Typography>
            <Controller control={filterForm.control} name="cost_category_id" render={({ field }) => (
              <Autocomplete<AutocompleteOption>
                options={[{ id: "all", name: "كل الفئات" }, ...(costCategories?.map(c => ({ id: String(c.id), name: c.name })) || [])]}
                getOptionLabel={o => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={costCategories?.find(c => String(c.id) === field.value) ? { id: field.value!, name: costCategories.find(c => String(c.id) === field.value)!.name } : { id: "all", name: "كل الفئات" }}
                onChange={(_, v) => field.onChange(v?.id || "all")}
                disabled={isLoadingDropdowns}
                size="small"
                renderInput={params => <TextField {...params} label="الفئة" />}
              />
            )} />
            <Controller control={filterForm.control} name="user_cost_id" render={({ field }) => (
              <Autocomplete<AutocompleteOption>
                options={[{ id: "all", name: "كل المستخدمين" }, ...(usersList.map(u => ({ id: String(u.id), name: u.name })))]}
                getOptionLabel={o => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={usersList.find(u => String(u.id) === field.value) ? { id: field.value!, name: usersList.find(u => String(u.id) === field.value)!.name } : { id: "all", name: "كل المستخدمين" }}
                onChange={(_, v) => field.onChange(v?.id || "all")}
                disabled={isLoadingDropdowns}
                size="small"
                renderInput={params => <TextField {...params} label="المستخدم" />}
              />
            )} />
            <Controller control={filterForm.control} name="shift_id" render={({ field }) => (
              <Autocomplete<AutocompleteOption>
                options={[{ id: "all", name: "كل المناوبات" }, ...(shiftsList?.map(s => ({ id: String(s.id), name: s.name || `#${s.id} (${format(parseISO(s.created_at!), "P")})` })) || [])]}
                getOptionLabel={o => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={shiftsList?.find(s => String(s.id) === field.value) ? { id: field.value!, name: shiftsList.find(s => String(s.id) === field.value)!.name || `#${field.value}` } : { id: "all", name: "كل المناوبات" }}
                onChange={(_, v) => field.onChange(v?.id || "all")}
                disabled={isLoadingDropdowns}
                size="small"
                renderInput={params => <TextField {...params} label="المناوبة" />}
              />
            )} />
            <Controller control={filterForm.control} name="payment_method" render={({ field }) => (
              <Autocomplete<AutocompleteOption>
                options={[{ id: "all", name: "كل الطرق" }, { id: "cash", name: "نقدي" }, { id: "bank", name: "بنكي" }, { id: "mixed", name: "مختلط" }]}
                getOptionLabel={o => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={[{ id: "all", name: "كل الطرق" }, { id: "cash", name: "نقدي" }, { id: "bank", name: "بنكي" }, { id: "mixed", name: "مختلط" }].find(o => o.id === (field.value || "all")) ?? { id: "all", name: "كل الطرق" }}
                onChange={(_, v) => field.onChange(v?.id || "all")}
                size="small"
                renderInput={params => <TextField {...params} label="طريقة الدفع" />}
              />
            )} />
            <Controller control={filterForm.control} name="search_description" render={({ field }) => (
              <TextField label="بحث بالوصف" type="search" size="small" {...field} />
            )} />
            <Button type="submit" variant="contained" size="small" fullWidth>تطبيق</Button>
          </Stack>
        </form>
      </Popover>

      {/* ── Status ── */}
      {isFetching && <div className="text-xs text-muted-foreground py-1"><Loader2 className="inline h-3 w-3 animate-spin" /> جاري التحديث...</div>}
      {isLoading && costs.length === 0 && <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      {!isLoading && !isFetching && costs.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">لا توجد بيانات</div>}

      {/* ── Table ── */}
      {costs.length > 0 && (
        <Card className="overflow-hidden">
          <TableContainer component={Paper} sx={{ maxHeight: 560 }}>
            <MUITable size="small" stickyHeader>
              <MUITableHead>
                <MUITableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, py: 0.5, px: 1, whiteSpace: 'nowrap', bgcolor: '#1565C0', color: '#fff' } }}>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>التاريخ</MUITableCell>
                  <MUITableCell sx={{ color: '#fff !important' }}>الوصف</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>ملاحظة</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>المستخدم</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important', minWidth: 200 }}>وردية الطبيب</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>الدفع</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>نقدًا</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>بنكي</MUITableCell>
                  <MUITableCell align="center" sx={{ color: '#fff !important' }}>الإجمالي</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {costs.map((cost: Cost) => {
                  const unassigned = !cost.doctor_shift_id;
                  const total = cost.amount + cost.amount_bankak;
                  const pm = getPaymentMethodForDisplay(cost);
                  return (
                    <MUITableRow key={cost.id} sx={{
                      bgcolor: unassigned ? '#FFF8E1' : 'inherit',
                      '&:hover': { bgcolor: unassigned ? '#FFF3CD' : '#f5f5f5' },
                      '& td': { fontSize: 11, py: 0.4, px: 1 },
                    }}>
                      <MUITableCell align="center" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {cost.created_at ? format(parseISO(cost.created_at), "MM-dd HH:mm") : "-"}
                      </MUITableCell>
                      <MUITableCell sx={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cost.description}</MUITableCell>
                      <MUITableCell align="center" sx={{ color: 'text.secondary', fontStyle: cost.comment ? 'normal' : 'italic', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cost.comment || "—"}
                      </MUITableCell>
                      <MUITableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{cost.user_cost_name || "-"}</MUITableCell>
                      <MUITableCell align="center">
                        {unassigned ? (
                          <Autocomplete
                            options={doctorShiftOptions}
                            getOptionLabel={o => o.label}
                            size="small"
                            sx={{ minWidth: 200 }}
                            loading={assignMutation.isPending}
                            onChange={(_, v) => {
                              if (v) assignMutation.mutate({ costId: cost.id, doctorShiftId: v.id });
                            }}
                            renderInput={params => (
                              <TextField {...params} placeholder="اختر وردية طبيب" size="small"
                                sx={{ '& .MuiInputBase-root': { fontSize: 11, py: 0 } }} />
                            )}
                          />
                        ) : (
                          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                            #{cost.doctor_shift_id} — {cost.doctor_shift_doctor_name || ""}
                          </Typography>
                        )}
                      </MUITableCell>
                      <MUITableCell align="center">
                        <Chip label={pm} size="small" variant={pm === 'بنكي' ? 'outlined' : 'filled'}
                          color={pm === 'مختلط' ? 'info' : pm === 'نقدي' ? 'default' : 'secondary'}
                          sx={{ fontSize: 10, height: 18 }} />
                      </MUITableCell>
                      <MUITableCell align="center">{formatNumber(cost.amount)}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(cost.amount_bankak)}</MUITableCell>
                      <MUITableCell align="center" sx={{ fontWeight: 600 }}>{formatNumber(total)}</MUITableCell>
                    </MUITableRow>
                  );
                })}
              </MUITableBody>
              {summary && (
                <MUITableFooter>
                  <MUITableRow sx={{ '& td': { fontWeight: 700, fontSize: 12, bgcolor: '#E3F2FD' } }}>
                    <MUITableCell align="center" colSpan={6}>الإجمالي</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.total_cash_paid)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.total_bank_paid)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(summary.grand_total_paid)}</MUITableCell>
                  </MUITableRow>
                </MUITableFooter>
              )}
            </MUITable>
          </TableContainer>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button variant="outlined" size="small" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>السابق</Button>
          <span className="text-sm text-muted-foreground">الصفحة {meta.current_page} من {meta.last_page}</span>
          <Button variant="outlined" size="small" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>التالي</Button>
        </div>
      )}

     

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