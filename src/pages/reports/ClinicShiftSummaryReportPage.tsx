// src/pages/reports/ClinicShiftSummaryReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select as MUISelect,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Loader2, Printer, XCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import dayjs from "dayjs";

import type { Shift } from "@/types/shifts";
import { getShiftsList } from "@/services/shiftService";
import {
  getUsersWithShiftTransactions,
  getUserShiftPatientTransactions,
  type PatientTransaction,
} from "@/services/userService";
import {
  downloadClinicShiftSummaryPdf,
  downloadShiftProfitLossPdf,
  downloadShiftRevenuePdf,
  downloadShiftExpensesPdf,
  downloadShiftInsuranceStatsPdf,
  downloadShiftLabStatsPdf,
  downloadShiftDiscountsPdf,
  downloadShiftDoctorLabPdf,
  type ClinicReportPdfFilters,
} from "@/services/reportService";
import type { User } from "@/types/users";

interface UserWithTransactions extends User {
  total_paid?: number;
  total_bank?: number;
  total_cash?: number;
  total_cost?: number;
  total_cost_bank?: number;
  net_bank?: number;
  net_cash?: number;
}

const formatMoney = (value?: number): string =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const reportFilterSchema = z.object({
  shift: z.string().min(1, "هذا الحقل مطلوب"),
  user: z.string().nullable(),
});

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const MONEY_COLUMNS = [
  { key: "total_paid", label: "إجمالي المتحصلات" },
  { key: "total_bank", label: "بنكك" },
  { key: "total_cash", label: "نقدي" },
  { key: "net_bank", label: "صاف بنكك" },
  { key: "net_cash", label: "صافي النقديه" },
] as const;

type MoneyColumnKey = (typeof MONEY_COLUMNS)[number]["key"];

const ClinicShiftSummaryReportPage: React.FC = () => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [loadingReportTitle, setLoadingReportTitle] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithTransactions | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<MoneyColumnKey | null>(null);
  const [patientTransactions, setPatientTransactions] = useState<PatientTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<PatientTransaction | null>(null);

  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      shift: "",
      user: "all",
    },
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ["shiftsListForReportFilter"],
    queryFn: () => getShiftsList({ per_page: 0, is_closed: "" }),
  });

  const selectedShiftId = form.watch("shift");

  const { data: users, isLoading: isLoadingUsers } = useQuery<UserWithTransactions[], Error>({
    queryKey: ["usersWithShiftTransactions", selectedShiftId],
    queryFn: () => getUsersWithShiftTransactions(parseInt(selectedShiftId)),
    enabled: !!selectedShiftId,
  });

  const shiftOptions = useMemo(() => {
    return (
      shifts?.map((s) => ({
        label: `مناوبة #${s.id} ${dayjs(s.created_at).format("DD/MM/YYYY")}`,
        id: s.id,
      })) || []
    );
  }, [shifts]);

  useEffect(() => {
    return () => {
      if (pdfPreview) window.URL.revokeObjectURL(pdfPreview.url);
    };
  }, [pdfPreview]);

  useEffect(() => {
    if (selectedShiftId) {
      form.setValue("user", "all");
    }
  }, [selectedShiftId, form]);

  const showPdfPreview = (blob: Blob, title: string) => {
    setPdfPreview((previous) => {
      if (previous) window.URL.revokeObjectURL(previous.url);
      return { url: window.URL.createObjectURL(blob), title };
    });
  };

  const handleGeneratePdf = async (data: ReportFilterValues) => {
    setIsGeneratingPdf(true);
    try {
      const filters: ClinicReportPdfFilters = {
        shift: parseInt(data.shift),
        user: data.user && data.user !== "all" ? parseInt(data.user) : null,
      };
      const blob = await downloadClinicShiftSummaryPdf(filters);
      showPdfPreview(blob, "ملخص مناوبة العيادة");
    } catch (error) {
      const apiError = error as ApiError;
      toast.error("فشل توليد ملف PDF", {
        description: apiError.response?.data?.message || apiError.message || "حدث خطأ غير معروف",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenReport = async (fetcher: (shiftId: number) => Promise<Blob>, title: string) => {
    if (!selectedShiftId) return;
    setLoadingReportTitle(title);
    try {
      const blob = await fetcher(parseInt(selectedShiftId));
      showPdfPreview(blob, title);
    } catch {
      toast.error(`فشل تحميل ${title}`);
    } finally {
      setLoadingReportTitle(null);
    }
  };

  const handleCellClick = async (user: UserWithTransactions, column: MoneyColumnKey) => {
    if (!selectedShiftId) return;

    setSelectedUser(user);
    setSelectedColumn(column);
    setDialogOpen(true);
    setIsLoadingTransactions(true);

    try {
      const transactions = await getUserShiftPatientTransactions(parseInt(selectedShiftId), user.id);
      setPatientTransactions(transactions);
    } catch {
      toast.error("فشل تحميل تفاصيل المعاملات");
      setPatientTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const getColumnLabel = (column: MoneyColumnKey): string =>
    MONEY_COLUMNS.find((c) => c.key === column)?.label || column;

  const getFilteredTransactions = () => {
    if (!selectedColumn || !patientTransactions.length) return patientTransactions;

    return patientTransactions
      .map((visit) => {
        const filtered = { ...visit };

        if (selectedColumn === "total_bank" || selectedColumn === "net_bank") {
          filtered.lab_transactions = visit.lab_transactions.filter((t) => t.is_bank);
          filtered.service_transactions = visit.service_transactions.filter((t) => t.is_bank);
          filtered.total_lab_paid = filtered.total_lab_bank;
          filtered.total_service_paid = filtered.total_service_bank;
        } else if (selectedColumn === "total_cash" || selectedColumn === "net_cash") {
          filtered.lab_transactions = visit.lab_transactions.filter((t) => !t.is_bank);
          filtered.service_transactions = visit.service_transactions.filter((t) => !t.is_bank);
          filtered.total_lab_paid = filtered.total_lab_cash;
          filtered.total_service_paid = filtered.total_service_cash;
        }

        return filtered;
      })
      .filter((visit) => visit.lab_transactions.length > 0 || visit.service_transactions.length > 0);
  };

  const getTotalAmount = (visit: PatientTransaction) => visit.total_lab_paid + visit.total_service_paid;

  const columnTotals = useMemo(() => {
    const totals: Record<MoneyColumnKey, number> = {
      total_paid: 0,
      total_bank: 0,
      total_cash: 0,
      net_bank: 0,
      net_cash: 0,
    };
    (users || []).forEach((user) => {
      MONEY_COLUMNS.forEach(({ key }) => {
        totals[key] += Number(user[key] || 0);
      });
    });
    return totals;
  }, [users]);

  const reportButtons = [
    { label: "الأرباح والخسائر", fetcher: downloadShiftProfitLossPdf, color: "primary" },
    { label: "الإيرادات", fetcher: downloadShiftRevenuePdf, color: "success" },
    { label: "المصروفات", fetcher: downloadShiftExpensesPdf, color: "error" },
    { label: "إحصائيات التأمين", fetcher: downloadShiftInsuranceStatsPdf, color: "secondary" },
    { label: "إحصائيات التحاليل", fetcher: downloadShiftLabStatsPdf, color: "info" },
    { label: "التخفيضات", fetcher: downloadShiftDiscountsPdf, color: "warning" },
    { label: "أداء الأطباء - مختبر", fetcher: downloadShiftDoctorLabPdf, color: "primary" },
  ] as const;

  return (
    <div style={{ direction: "rtl" }} className="mx-auto max-w-6xl space-y-4 py-2">
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            التقرير العام للمناوبة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            اختر المناوبة والمستخدم (اختياري) لعرض المتحصلات وطباعة التقارير.
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <form onSubmit={form.handleSubmit(handleGeneratePdf)}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
            <Controller
              name="shift"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  options={shiftOptions}
                  loading={isLoadingShifts}
                  getOptionLabel={(option) => option.label || ""}
                  value={shiftOptions.find((opt) => String(opt.id) === field.value) || null}
                  onChange={(_, newValue) => {
                    field.onChange(newValue ? String(newValue.id) : "");
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  disabled={isGeneratingPdf}
                  size="small"
                  sx={{ minWidth: 260, flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اختر المناوبة"
                      error={!!form.formState.errors.shift}
                      helperText={form.formState.errors.shift?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingShifts ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />

            <Controller
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="user-select-label">المستخدم</InputLabel>
                  <MUISelect
                    labelId="user-select-label"
                    label="المستخدم"
                    onChange={field.onChange}
                    value={field.value || "all"}
                    disabled={isGeneratingPdf || (!!selectedShiftId && isLoadingUsers)}
                  >
                    <MenuItem value="all">كل المستخدمين</MenuItem>
                    {!selectedShiftId ? (
                      <MenuItem value="select_shift_first" disabled>
                        اختر المناوبة أولاً
                      </MenuItem>
                    ) : isLoadingUsers ? (
                      <MenuItem value="loading_users" disabled>
                        جارِ التحميل...
                      </MenuItem>
                    ) : users && users.length > 0 ? (
                      users.map((u) => (
                        <MenuItem key={u.id} value={String(u.id)}>
                          {u.name || u.username} ({u.username})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="no_users" disabled>
                        لا يوجد مستخدمين لهذه المناوبة
                      </MenuItem>
                    )}
                  </MUISelect>
                </FormControl>
              )}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isLoadingShifts || isGeneratingPdf}
              startIcon={
                isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />
              }
            >
              طباعة التقرير
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          تقارير الوردية — اختر مناوبة أولاً لتفعيل الأزرار
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {reportButtons.map(({ label, fetcher, color }) => (
            <Button
              key={label}
              variant="outlined"
              size="small"
              color={color}
              disabled={!selectedShiftId || loadingReportTitle !== null}
              startIcon={
                loadingReportTitle === label ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Printer className="h-3 w-3" />
                )
              }
              onClick={() => handleOpenReport(fetcher, label)}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Card>

      {/* Users money summary - one row per user */}
      {selectedShiftId && (
        <Card sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant="h6">المتحصلات حسب المستخدم</Typography>
            <Typography variant="body2" color="text.secondary">
              اضغط على أي مبلغ لعرض تفاصيل المعاملات.
            </Typography>
          </Box>
          {isLoadingUsers ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4} gap={1}>
              <CircularProgress size={22} />
              <Typography variant="body2">جارِ التحميل...</Typography>
            </Box>
          ) : users && users.length > 0 ? (
            <TableContainer component={Paper} elevation={0} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>المستخدم</TableCell>
                    {MONEY_COLUMNS.map(({ key, label }) => (
                      <TableCell key={key} align="center" sx={{ fontWeight: 700 }}>
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {user.name || user.username}
                      </TableCell>
                      {MONEY_COLUMNS.map(({ key }) => (
                        <TableCell
                          key={key}
                          align="center"
                          sx={{
                            cursor: "pointer",
                            fontWeight: 600,
                            "&:hover": { backgroundColor: "action.hover", textDecoration: "underline" },
                          }}
                          onClick={() => handleCellClick(user, key)}
                        >
                          {formatMoney(Number(user[key] || 0))}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: "#3498db" }}>
                    <TableCell align="center" sx={{ fontWeight: 700, color: "white !important" }}>
                      الإجمالي
                    </TableCell>
                    {MONEY_COLUMNS.map(({ key }) => (
                      <TableCell key={key} align="center" sx={{ fontWeight: 700, color: "white !important" }}>
                        {formatMoney(columnTotals[key])}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                لا يوجد مستخدمين لديهم معاملات في هذه المناوبة
              </Typography>
            </Box>
          )}
        </Card>
      )}

      {/* Unified PDF preview */}
      {isGeneratingPdf && !pdfPreview && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">جارِ توليد التقرير...</p>
        </div>
      )}

      {pdfPreview && (
        <Card sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {pdfPreview.title}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                window.URL.revokeObjectURL(pdfPreview.url);
                setPdfPreview(null);
              }}
            >
              <XCircle className="h-5 w-5" />
            </IconButton>
          </Box>
          <iframe src={pdfPreview.url} className="w-full h-[75vh] border-0" title={pdfPreview.title} />
        </Card>
      )}

      {/* Patient Transactions Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth dir="rtl">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              تفاصيل المعاملات - {selectedUser?.name || selectedUser?.username}
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <XCircle className="h-5 w-5" />
            </IconButton>
          </Box>
          {selectedColumn && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {getColumnLabel(selectedColumn)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {isLoadingTransactions ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4} gap={1}>
              <CircularProgress size={22} />
              <Typography variant="body2">جارِ التحميل...</Typography>
            </Box>
          ) : getFilteredTransactions().length === 0 ? (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                لا توجد معاملات
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.5, px: 1 } }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "action.hover" }}>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>رقم الزيارة</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>اسم المريض</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>اسم الطبيب</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>إجمالي المبلغ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredTransactions().map((visit) => (
                    <TableRow key={visit.doctor_visit_id} hover>
                      <TableCell align="center">{visit.doctor_visit_id}</TableCell>
                      <TableCell align="right">{visit.patient_name}</TableCell>
                      <TableCell align="right">{visit.doctor_name}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          cursor: "pointer",
                          color: "primary.main",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={() => {
                          setSelectedVisit(visit);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        {formatMoney(getTotalAmount(visit))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Visit Details Dialog - lab and service transactions */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth dir="rtl">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">تفاصيل الزيارة #{selectedVisit?.doctor_visit_id}</Typography>
            <IconButton size="small" onClick={() => setDetailsDialogOpen(false)}>
              <XCircle className="h-5 w-5" />
            </IconButton>
          </Box>
          {selectedVisit && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              المريض: {selectedVisit.patient_name} | الطبيب: {selectedVisit.doctor_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedVisit && (
            <Box>
              {selectedVisit.lab_transactions.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                    معاملات المختبر
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>اسم الفحص</TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>المبلغ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>النوع</TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedVisit.lab_transactions.map((transaction, idx) => (
                          <TableRow key={idx}>
                            <TableCell align="right">{transaction.test_name}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: "bold" }}>
                              {formatMoney(Number(transaction.amount))}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={transaction.is_bank ? "بنكك" : "نقدي"}
                                color={transaction.is_bank ? "primary" : "success"}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {dayjs(transaction.date).format("DD/MM/YYYY HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>إجمالي المختبر:</strong> {formatMoney(selectedVisit.total_lab_paid)}
                  </Typography>
                </Box>
              )}

              {selectedVisit.service_transactions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                    معاملات الخدمات
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>اسم الخدمة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>المبلغ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>النوع</TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedVisit.service_transactions.map((transaction, idx) => (
                          <TableRow key={idx}>
                            <TableCell align="right">{transaction.service_name}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: "bold" }}>
                              {formatMoney(Number(transaction.amount))}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={transaction.is_bank ? "بنكك" : "نقدي"}
                                color={transaction.is_bank ? "primary" : "success"}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {dayjs(transaction.date).format("DD/MM/YYYY HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>إجمالي الخدمات:</strong> {formatMoney(selectedVisit.total_service_paid)}
                  </Typography>
                </Box>
              )}

              {selectedVisit.lab_transactions.length === 0 && selectedVisit.service_transactions.length === 0 && (
                <Box py={4} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    لا توجد معاملات
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ClinicShiftSummaryReportPage;
