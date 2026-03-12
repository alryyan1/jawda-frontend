// src/pages/reports/MonthlyShiftsReportPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

import { formatNumber } from "@/lib/utils";
import {
  getMonthlyShiftsSummary,
  type MonthlyShiftsSummaryResponse,
  type MonthlyShiftSummaryRow,
} from "@/services/reportService";
import {
  saveFullReport,
  subscribeToReport,
  updateCellEdit,
  type EditableField,
  type MonthlyShiftsFirestoreDoc,
} from "@/services/monthlyShiftsFirestoreService";
import { db } from "@/lib/firebase";

import {
  Card,
  CardContent,
  Typography,
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
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import { Loader2, Calendar, Pencil } from "lucide-react";
import { toast } from "sonner";

const EDITABLE_FIELDS: { key: EditableField; label: string }[] = [
  { key: "revenue_cash", label: "إيراد كاش" },
  { key: "revenue_bank", label: "إيراد بنك" },
  { key: "cost_cash", label: "مصروف كاش" },
  { key: "cost_bank", label: "مصروف بنك" },
  { key: "refund_cash", label: "استرداد كاش" },
  { key: "refund_bank", label: "استرداد بنك" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));
const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ][i],
}));

function getCellValue(
  row: MonthlyShiftSummaryRow,
  edits: Record<string, { original: number; edited: number }>,
  field: EditableField
): { display: number; isEdited: boolean; original?: number } {
  const key = `${row.id}_${field}`;
  const edit = edits[key];
  if (edit) {
    return { display: edit.edited, isEdited: true, original: edit.original };
  }
  const val = row[field] ?? 0;
  return { display: val, isEdited: false };
}

function computeRowNet(
  row: MonthlyShiftSummaryRow,
  edits: Record<string, { original: number; edited: number }>
): number {
  const revCash = getCellValue(row, edits, "revenue_cash").display;
  const revBank = getCellValue(row, edits, "revenue_bank").display;
  const costCash = getCellValue(row, edits, "cost_cash").display;
  const costBank = getCellValue(row, edits, "cost_bank").display;
  const refCash = getCellValue(row, edits, "refund_cash").display;
  const refBank = getCellValue(row, edits, "refund_bank").display;
  return revCash + revBank - costCash - costBank - refCash - refBank;
}

function computeSummary(
  rows: MonthlyShiftSummaryRow[],
  edits: Record<string, { original: number; edited: number }>
) {
  const sum = (field: EditableField) =>
    rows.reduce((acc, r) => {
      const { display } = getCellValue(r, edits, field);
      return acc + display;
    }, 0);

  const revCash = sum("revenue_cash");
  const revBank = sum("revenue_bank");
  const costCash = sum("cost_cash");
  const costBank = sum("cost_bank");
  const refCash = sum("refund_cash");
  const refBank = sum("refund_bank");

  return {
    revenue_cash: revCash,
    revenue_bank: revBank,
    cost_cash: costCash,
    cost_bank: costBank,
    refund_cash: refCash,
    refund_bank: refBank,
    net_total: revCash + revBank - costCash - costBank - refCash - refBank,
    net_cash: revCash - costCash - refCash,
    net_bank: revBank - costBank - refBank,
  };
}

interface EditableCellProps {
  row: MonthlyShiftSummaryRow;
  field: EditableField;
  edits: Record<string, { original: number; edited: number }>;
  color?: string;
  fontWeight?: string;
  onEdit: (shiftId: number, field: EditableField, original: number, edited: number) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  row,
  field,
  edits,
  color,
  fontWeight,
  onEdit,
}) => {
  const { display, isEdited, original } = getCellValue(row, edits, field);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVal, setEditVal] = useState(String(display));

  const handleOpen = () => {
    setEditVal(String(display));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const num = parseFloat(editVal.replace(/,/g, ""));
    if (isNaN(num)) {
      toast.error("قيمة غير صالحة");
      return;
    }
    const orig = original ?? (row[field] ?? 0);
    onEdit(row.id, field, orig, num);
    setDialogOpen(false);
  };

  const canEdit = !!db;

  return (
    <>
      <MUITableCell
        sx={{
          textAlign: "center",
          color: color ?? "inherit",
          fontWeight: fontWeight ?? "normal",
          cursor: canEdit ? "pointer" : "default",
          "&:hover": canEdit ? { backgroundColor: "action.hover" } : {},
        }}
        onClick={canEdit ? handleOpen : undefined}
      >
        <Box className="flex items-center justify-center gap-0.5">
          <span>{formatNumber(display)}</span>
          {isEdited && (
            <Tooltip title={`الأصلي: ${formatNumber(original ?? 0)}`} arrow placement="top">
              <Pencil className="h-3 w-3 text-amber-600 shrink-0" aria-label="تم التعديل" />
            </Tooltip>
          )}
        </Box>
      </MUITableCell>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تعديل {EDITABLE_FIELDS.find((f) => f.key === field)?.label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            الوردية #{row.id} • الأصلي: {formatNumber(original ?? row[field] ?? 0)}
          </Typography>
          <TextField
            autoFocus
            onFocus={(e) => e.target.select()}
            fullWidth
            type="number"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            inputProps={{ step: 0.01, min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const MonthlyShiftsReportPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [firestoreDoc, setFirestoreDoc] = useState<MonthlyShiftsFirestoreDoc | null>(null);

  const appliedFilters = {
    month: parseInt(selectedMonth),
    year: parseInt(selectedYear),
  };

  const { data: reportData, isLoading, error, isFetching } = useQuery<
    MonthlyShiftsSummaryResponse,
    Error
  >({
    queryKey: ["monthlyShiftsSummary", appliedFilters],
    queryFn: () =>
      getMonthlyShiftsSummary(appliedFilters.month, appliedFilters.year),
    placeholderData: keepPreviousData,
  });

  // Save full report to Firestore when loaded
  useEffect(() => {
    if (!reportData || !db) return;
    saveFullReport(db, appliedFilters.year, appliedFilters.month, reportData).catch(
      (err) => console.error("[Firestore] Failed to save report:", err)
    );
  }, [reportData, appliedFilters.year, appliedFilters.month]);

  // Subscribe to Firestore for edits
  useEffect(() => {
    if (!db) return;
    const unsub = subscribeToReport(
      db,
      appliedFilters.year,
      appliedFilters.month,
      setFirestoreDoc
    );
    return () => {
      unsub?.();
    };
  }, [appliedFilters.year, appliedFilters.month]);

  const edits = useMemo(
    () => firestoreDoc?.edits ?? {},
    [firestoreDoc?.edits]
  );

  const mergedRows = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data;
  }, [reportData?.data]);

  const computedSummary = useMemo(() => {
    if (!reportData) return null;
    return computeSummary(mergedRows, edits);
  }, [reportData, mergedRows, edits]);

  const handleEdit = useCallback(
    async (shiftId: number, field: EditableField, original: number, edited: number) => {
      if (!db) return;
      try {
        await updateCellEdit(
          db,
          appliedFilters.year,
          appliedFilters.month,
          shiftId,
          field,
          original,
          edited
        );
        toast.success("تم حفظ التعديل");
      } catch (err) {
        console.error(err);
        toast.error("فشل حفظ التعديل");
      }
    },
    [appliedFilters.year, appliedFilters.month]
  );

  const formatDateArabic = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "yyyy/MM/dd", { locale: arSA });
    } catch {
      return dateString;
    }
  };

  return (
    <Box className="container mx-auto py-2 space-y-3" dir="rtl">
      <Box className="flex flex-wrap items-center gap-3">
        <Box className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <Typography variant="h6" component="h1" fontWeight="bold">
            تقرير الورديات الشهري
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel id="month-label">الشهر</InputLabel>
          <MUISelect
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            labelId="month-label"
            label="الشهر"
          >
            {months.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </MUISelect>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel id="year-label">السنة</InputLabel>
          <MUISelect
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            labelId="year-label"
            label="السنة"
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </MUISelect>
        </FormControl>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          فشل تحميل التقرير: {error.message}
        </Alert>
      )}

      {isLoading && (
        <Box className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Box>
      )}

      {!isLoading && reportData && (
        <Card elevation={1} sx={{ "& .MuiCardContent-root": { py: 1.5, "&:last-child": { pb: 1.5 } } }}>
          <CardContent sx={{ pt: 1.5 }}>
            {reportData.data.length === 0 ? (
              <Alert severity="info">لا توجد ورديات مسجلة في هذا الشهر</Alert>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <MUITable size="small" sx={{ "& .MuiTableCell-root": { py: 0.5, fontSize: "0.8125rem" } }}>
                  <MUITableHead>
                    <MUITableRow sx={{ backgroundColor: "primary.main" }}>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>التاريخ</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>الوردية</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>إيراد كاش</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>إيراد بنك</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>مصروف كاش</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>مصروف بنك</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>استرداد كاش</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>استرداد بنك</MUITableCell>
                      <MUITableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center", py: 0.5, fontSize: "0.8125rem" }}>الصافي</MUITableCell>
                    </MUITableRow>
                  </MUITableHead>
                  <MUITableBody>
                    {mergedRows.map((row, index) => (
                      <MUITableRow
                        key={row.id}
                        sx={{
                          backgroundColor: index % 2 === 0 ? "grey.50" : "white",
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                      >
                        <MUITableCell sx={{ textAlign: "center" }}>
                          {formatDateArabic(row.date)}
                        </MUITableCell>
                        <MUITableCell sx={{ textAlign: "center" }}>
                          <Box className="flex items-center gap-1 justify-center">
                            <span>#{row.id}</span>
                            {row.user_opened && (
                              <span className="text-gray-600 text-sm">({row.user_opened.name})</span>
                            )}
                            {row.is_closed ? (
                              <Chip label="مغلقة" size="small" color="default" sx={{ fontSize: "0.7rem" }} />
                            ) : (
                              <Chip label="مفتوحة" size="small" color="success" sx={{ fontSize: "0.7rem" }} />
                            )}
                          </Box>
                        </MUITableCell>
                        <EditableCell row={row} field="revenue_cash" edits={edits} color="success.main" onEdit={handleEdit} />
                        <EditableCell row={row} field="revenue_bank" edits={edits} color="info.main" onEdit={handleEdit} />
                        <EditableCell row={row} field="cost_cash" edits={edits} color="error.main" onEdit={handleEdit} />
                        <EditableCell row={row} field="cost_bank" edits={edits} color="error.main" onEdit={handleEdit} />
                        <EditableCell row={row} field="refund_cash" edits={edits} color="warning.main" onEdit={handleEdit} />
                        <EditableCell row={row} field="refund_bank" edits={edits} color="warning.main" onEdit={handleEdit} />
                        <MUITableCell sx={{ textAlign: "center", fontWeight: "bold", color: "primary.main" }}>
                          {formatNumber(computeRowNet(row, edits))}
                        </MUITableCell>
                      </MUITableRow>
                    ))}
                  </MUITableBody>
                  <MUITableFooter>
                    <MUITableRow sx={{ backgroundColor: "grey.200" }}>
                      <MUITableCell colSpan={2} sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5 }}>
                        الإجمالي
                      </MUITableCell>
                      {computedSummary && (
                        <>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "success.main" }}>
                            {formatNumber(computedSummary.revenue_cash)}
                          </MUITableCell>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "info.main" }}>
                            {formatNumber(computedSummary.revenue_bank)}
                          </MUITableCell>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "error.main" }}>
                            {formatNumber(computedSummary.cost_cash)}
                          </MUITableCell>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "error.main" }}>
                            {formatNumber(computedSummary.cost_bank)}
                          </MUITableCell>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "warning.main" }}>
                            {formatNumber(computedSummary.refund_cash)}
                          </MUITableCell>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "warning.main" }}>
                            {formatNumber(computedSummary.refund_bank)}
                          </MUITableCell>
                          <MUITableCell sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.875rem", py: 0.5, color: "primary.main" }}>
                            {formatNumber(computedSummary.net_total)}
                          </MUITableCell>
                        </>
                      )}
                    </MUITableRow>
                  </MUITableFooter>
                </MUITable>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MonthlyShiftsReportPage;
