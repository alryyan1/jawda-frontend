import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Link,
  Tooltip,
  IconButton,
  Popover,
  Checkbox,
} from "@mui/material";
import { LockOpen, AccountBalance, ViewColumn as ViewColumnIcon } from "@mui/icons-material";
import { Button } from "@mui/material";
import JournalEntryDialog from "@/components/clinic/JournalEntryDialog";
import { formatNumber } from "@/lib/utils";
import type { DoctorShiftReportItem } from "@/types/reports";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { reopenDoctorShift } from "@/services/doctorShiftService";
import { markDoctorShiftJournal } from "@/services/reportService";

// ── column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "index",             label: "#",                   defaultVisible: true },
  { key: "status",            label: "الحالة",             defaultVisible: true },
  { key: "date",              label: "تاريخ",              defaultVisible: true },
  { key: "specialty",         label: "التخصص",             defaultVisible: true },
  { key: "doctor",            label: "الطبيب",             defaultVisible: true },
  { key: "income",            label: "الإيراد المدفوع",   defaultVisible: true },
  { key: "deduction",         label: "التحمل",             defaultVisible: true },
  { key: "ins_revenue",       label: "إيراد التأمين",     defaultVisible: true },
  { key: "patients",          label: "عدد المرضى",         defaultVisible: true },
  { key: "cash_pct",          label: "% كاش",             defaultVisible: true },
  { key: "ins_pct",           label: "% تأمين",           defaultVisible: true },
  { key: "cash_entitlement",  label: "استحقاق (كاش)",      defaultVisible: true },
  { key: "ins_entitlement",   label: "استحقاق (تأمين)",    defaultVisible: true },
  { key: "total_entitlement", label: "إجمالي الاستحقاق",  defaultVisible: true },
  { key: "journal",           label: "قيد",                defaultVisible: true },
  { key: "user",              label: "المستخدم",           defaultVisible: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const COLS_STORAGE_KEY = "doctor_shifts_table_cols";

function loadVisibility(): Record<ColumnKey, boolean> {
  try {
    const stored = JSON.parse(localStorage.getItem(COLS_STORAGE_KEY) ?? "{}");
    return Object.fromEntries(
      COLUMNS.map((c) => [c.key, stored[c.key] ?? c.defaultVisible])
    ) as Record<ColumnKey, boolean>;
  } catch {
    return Object.fromEntries(
      COLUMNS.map((c) => [c.key, c.defaultVisible])
    ) as Record<ColumnKey, boolean>;
  }
}

// ── component ─────────────────────────────────────────────────────────────────

interface DoctorShiftsReportTableProps {
  shifts: DoctorShiftReportItem[];
  isLoading: boolean;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

function DoctorShiftsReportTable({
  shifts,
  isLoading,
  rowsPerPage = 50,
  onRowsPerPageChange,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: DoctorShiftsReportTableProps) {
  const navigate = useNavigate();

  const [localShifts, setLocalShifts] = useState<DoctorShiftReportItem[]>(shifts);
  useEffect(() => { setLocalShifts(shifts); }, [shifts]);

  const [pendingReopen, setPendingReopen] = useState<Set<number>>(new Set());
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverShiftId, setPopoverShiftId] = useState<number | null>(null);
  const [journalShift, setJournalShift] = useState<DoctorShiftReportItem | null>(null);
  const [journaledShiftIds, setJournaledShiftIds] = useState<Set<number>>(new Set());

  // Column visibility
  const [colVisibility, setColVisibility] = useState<Record<ColumnKey, boolean>>(loadVisibility);
  const [colMenuAnchor, setColMenuAnchor] = useState<HTMLElement | null>(null);

  const vis = (key: ColumnKey) => colVisibility[key];

  const toggleColumn = (key: ColumnKey) => {
    setColVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const visibleColCount =
    COLUMNS.filter((c) => colVisibility[c.key]).length + (selectable ? 1 : 0);

  const openPopover = (e: React.MouseEvent<HTMLElement>, shiftId: number) => {
    e.stopPropagation();
    setPopoverAnchor(e.currentTarget);
    setPopoverShiftId(shiftId);
  };

  const closePopover = () => {
    setPopoverAnchor(null);
    setPopoverShiftId(null);
  };

  const popoverShift = localShifts.find((s) => s.id === popoverShiftId) ?? null;

  const handleRowClick = (shift: DoctorShiftReportItem) => {
    sessionStorage.setItem("selectedShiftData", JSON.stringify(shift));
    navigate(`/reports/doctor-shifts/${shift.id}`, { state: { shiftData: shift } });
  };

  const handleDoctorNameClick = (shift: DoctorShiftReportItem, e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem("selectedShiftData", JSON.stringify(shift));
    navigate(`/reports/doctor-shifts/${shift.id}`, { state: { shiftData: shift } });
  };

  const reopenMutation = useMutation({
    mutationFn: (shiftId: number) => reopenDoctorShift(shiftId),
    onMutate: (shiftId) => setPendingReopen((prev) => new Set(prev).add(shiftId)),
    onSuccess: (_, shiftId) => {
      setLocalShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, status: true, end_time: null } : s))
      );
      toast.success("تم إعادة فتح المناوبة");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "فشل إعادة فتح المناوبة"),
    onSettled: (_, __, shiftId) =>
      setPendingReopen((prev) => { const s = new Set(prev); s.delete(shiftId); return s; }),
  });

  type DayTotals = {
    total_income: number; clinic_enurance: number;
    snap_total_insurance_revenue: number; snap_patients_count: number;
    cash_entitlement: number; insurance_entitlement: number; total_doctor_entitlement: number;
  };

  const sumShifts = (arr: DoctorShiftReportItem[]): DayTotals =>
    arr.reduce(
      (acc, s) => ({
        total_income:                  acc.total_income                  + (s.total_income                  || 0),
        clinic_enurance:               acc.clinic_enurance               + (s.clinic_enurance               || 0),
        snap_total_insurance_revenue: acc.snap_total_insurance_revenue + (Number(s.snap_total_insurance_revenue) || 0),
        snap_patients_count:           acc.snap_patients_count           + (Number(s.snap_patients_count)           || 0),
        cash_entitlement:              acc.cash_entitlement              + (s.cash_entitlement              || 0),
        insurance_entitlement:         acc.insurance_entitlement         + (s.insurance_entitlement         || 0),
        total_doctor_entitlement:      acc.total_doctor_entitlement      + (s.total_doctor_entitlement      || 0),
      }),
      { total_income: 0, clinic_enurance: 0, snap_total_insurance_revenue: 0, snap_patients_count: 0, cash_entitlement: 0, insurance_entitlement: 0, total_doctor_entitlement: 0 }
    );

  const dayGroups = useMemo(() => {
    const map = new Map<string, DoctorShiftReportItem[]>();
    for (const s of localShifts) {
      const key = s.created_at ? dayjs(s.created_at).format("YYYY-MM-DD") : "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, shifts]) => ({ date, shifts, totals: sumShifts(shifts) }));
  }, [localShifts]);

  const monthTotals = useMemo(() => sumShifts(localShifts), [localShifts]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (localShifts.length === 0) {
    return <Alert severity="info" sx={{ mb: 2 }}>لا توجد مناوبات أطباء للعرض.</Alert>;
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 2, gap: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          عدد الصفوف في الصفحة:
        </Typography>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
            sx={{ fontSize: "0.875rem" }}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={200}>200</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="تحكم بالأعمدة">
          <IconButton size="small" onClick={(e) => setColMenuAnchor(e.currentTarget)}>
            <ViewColumnIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Column visibility popover */}
      <Popover
        open={Boolean(colMenuAnchor)}
        anchorEl={colMenuAnchor}
        onClose={() => setColMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
            الأعمدة المرئية
          </Typography>
          {COLUMNS.map((col) => (
            <Box key={col.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={colVisibility[col.key]}
                onChange={() => toggleColumn(col.key)}
              />
              <Typography variant="body2">{col.label}</Typography>
            </Box>
          ))}
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => {
              const all = Object.fromEntries(COLUMNS.map((c) => [c.key, true])) as Record<ColumnKey, boolean>;
              setColVisibility(all);
              localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(all));
            }}
          >
            إظهار الكل
          </Button>
        </Box>
      </Popover>

      <Table size="small" sx={{ direction: "ltr", width: "100%", "& .MuiTableCell-root": { whiteSpace: "nowrap" } }}>
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox" align="center" sx={{ width: 40 }}>
                <Checkbox
                  size="small"
                  indeterminate={selectedIds.size > 0 && selectedIds.size < localShifts.length}
                  checked={localShifts.length > 0 && selectedIds.size === localShifts.length}
                  onChange={(e) => {
                    onSelectionChange?.(e.target.checked ? new Set(localShifts.map((s) => s.id)) : new Set());
                  }}
                />
              </TableCell>
            )}
            {vis("index")             && <TableCell align="center" sx={{ width: 36 }}>#</TableCell>}
            {vis("status")            && <TableCell align="center">الحالة</TableCell>}
            {vis("date")              && <TableCell align="center">تاريخ</TableCell>}
            {vis("specialty")         && <TableCell align="center">التخصص</TableCell>}
            {vis("doctor")            && <TableCell align="center">الطبيب</TableCell>}
            {vis("income")            && <TableCell align="center">الإيراد المدفوع</TableCell>}
            {vis("deduction")         && <TableCell align="center">التحمل</TableCell>}
            {vis("ins_revenue")       && <TableCell align="center">إيراد التأمين</TableCell>}
            {vis("patients")          && <TableCell align="center">عدد المرضى</TableCell>}
            {vis("cash_pct")          && <TableCell align="center">% كاش</TableCell>}
            {vis("ins_pct")           && <TableCell align="center">% تأمين</TableCell>}
            {vis("cash_entitlement")  && <TableCell align="center">استحقاق (كاش)</TableCell>}
            {vis("ins_entitlement")   && <TableCell align="center">استحقاق (تأمين)</TableCell>}
            {vis("total_entitlement") && <TableCell align="center">إجمالي الاستحقاق</TableCell>}
            {vis("journal")           && <TableCell align="center">قيد</TableCell>}
            {vis("user")              && <TableCell align="center">المستخدم</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {dayGroups.map(({ date, shifts: dayShifts, totals: dayTotals }) => {
            const dateLabel = dayjs(date).isValid()
              ? dayjs(date).locale("ar").format("dddd DD/MM/YYYY")
              : date;

            return (
              <React.Fragment key={date}>
                {/* ── Day header ── */}
                <TableRow sx={{ bgcolor: "#1565C0" }}>
                  <TableCell
                    colSpan={visibleColCount}
                    align="center"
                    sx={{ color: "#fff", fontWeight: 700, py: 0.75, fontSize: 13, letterSpacing: 0.5 }}
                  >
                    {dateLabel}
                  </TableCell>
                </TableRow>

                {/* ── Day rows ── */}
                {dayShifts.map((shift, index) => {
                  const isReopening = pendingReopen.has(shift.id);
                  return (
                    <TableRow
                      key={shift.id}
                      onClick={() => !selectable && handleRowClick(shift)}
                      selected={selectable && selectedIds.has(shift.id)}
                      sx={{
                        backgroundColor: index % 2 === 0 ? "background.paper" : "grey.50",
                        cursor: selectable ? "default" : "pointer",
                        ...(selectable && selectedIds.has(shift.id) && { bgcolor: "primary.50 !important" }),
                      }}
                    >
                      {selectable && (
                        <TableCell padding="checkbox" align="center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={selectedIds.has(shift.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              e.target.checked ? next.add(shift.id) : next.delete(shift.id);
                              onSelectionChange?.(next);
                            }}
                          />
                        </TableCell>
                      )}
                      {vis("index") && (
                        <TableCell align="center" sx={{ color: "text.secondary", fontSize: 11, fontWeight: 600 }}>{index + 1}</TableCell>
                      )}
                      {vis("status") && (
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: shift.status ? "#4CAF50" : "#F44336", border: "2px solid", borderColor: shift.status ? "#2E7D32" : "#C62828", flexShrink: 0 }} title={shift.status ? "مفتوح" : "مغلق"} />
                            {!shift.status && (
                              <Tooltip title="إعادة فتح المناوبة">
                                <span>
                                  <IconButton size="small" color="warning" disabled={isReopening} onClick={(e) => { e.stopPropagation(); reopenMutation.mutate(shift.id); }} sx={{ p: 0.25 }}>
                                    {isReopening ? <CircularProgress size={14} /> : <LockOpen sx={{ fontSize: 14 }} />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                      {vis("date")              && <TableCell align="center">{shift.created_at ? dayjs(shift.created_at).locale("ar").format("hh:mm A") : "-"}</TableCell>}
                      {vis("specialty")         && <TableCell align="center">{shift.doctor_specialist_name || "-"}</TableCell>}
                      {vis("doctor")            && (
                        <TableCell align="center">
                          <Link component="button" onClick={(e) => handleDoctorNameClick(shift, e)} sx={{ color: "primary.main", textDecoration: "none", cursor: "pointer", "&:hover": { textDecoration: "underline" }, fontWeight: "medium" }}>
                            {shift.doctor_name || "N/A"}
                          </Link>
                        </TableCell>
                      )}
                      {vis("income")            && <TableCell align="center" sx={{ fontWeight: "bold", color: "success.main" }}>{formatNumber(shift.total_income || 0)}</TableCell>}
                      {vis("deduction")         && <TableCell align="center" sx={{ fontWeight: "bold", color: "error.main" }}>{formatNumber(shift.clinic_enurance || 0)}</TableCell>}
                      {vis("ins_revenue")       && <TableCell align="center" sx={{ color: "warning.dark" }}>{formatNumber(Number(shift.snap_total_insurance_revenue) || 0)}</TableCell>}
                      {vis("patients")          && <TableCell align="center">{shift.snap_patients_count ?? "-"}</TableCell>}
                      {vis("cash_pct")          && <TableCell align="center" sx={{ color: "text.secondary", fontSize: 12 }}>{shift.snap_doctor_cash_percentage != null ? `${shift.snap_doctor_cash_percentage}%` : "-"}</TableCell>}
                      {vis("ins_pct")           && <TableCell align="center" sx={{ color: "text.secondary", fontSize: 12 }}>{shift.snap_doctor_insurance_percentage != null ? `${shift.snap_doctor_insurance_percentage}%` : "-"}</TableCell>}
                      {vis("cash_entitlement")  && <TableCell align="center">{formatNumber(shift.cash_entitlement || 0)}</TableCell>}
                      {vis("ins_entitlement")   && <TableCell align="center">{formatNumber(shift.insurance_entitlement || 0)}</TableCell>}
                      {vis("total_entitlement") && <TableCell align="center" sx={{ fontWeight: "bold" }}>{formatNumber(shift.total_doctor_entitlement || 0)}</TableCell>}
                      {vis("journal")           && (
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={shift.has_journal || journaledShiftIds.has(shift.id) ? "تم إنشاء القيد" : "قيد محاسبي"}>
                            <span>
                              <IconButton size="small" disabled={shift.has_journal || journaledShiftIds.has(shift.id)} onClick={(e) => { e.stopPropagation(); openPopover(e, shift.id); }} sx={{ p: 0.5 }}>
                                <AccountBalance sx={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      )}
                      {vis("user") && <TableCell align="center">{shift.user_name_opened || "-"}</TableCell>}
                    </TableRow>
                  );
                })}

                {/* ── Day totals ── */}
                <TableRow sx={{ bgcolor: "#E3F2FD", "& .MuiTableCell-root": { fontWeight: 700, py: 0.5, fontSize: 12 } }}>
                  {selectable            && <TableCell />}
                  {vis("index")          && <TableCell />}
                  {vis("status")         && <TableCell />}
                  {vis("date")           && <TableCell align="center" sx={{ color: "primary.dark" }}>مجموع اليوم</TableCell>}
                  {vis("specialty")      && <TableCell />}
                  {vis("doctor")         && <TableCell />}
                  {vis("income")         && <TableCell align="center" sx={{ color: "success.dark" }}>{formatNumber(dayTotals.total_income)}</TableCell>}
                  {vis("deduction")      && <TableCell align="center" sx={{ color: "error.dark" }}>{formatNumber(dayTotals.clinic_enurance)}</TableCell>}
                  {vis("ins_revenue")    && <TableCell align="center" sx={{ color: "warning.dark" }}>{formatNumber(dayTotals.snap_total_insurance_revenue)}</TableCell>}
                  {vis("patients")       && <TableCell align="center">{dayTotals.snap_patients_count}</TableCell>}
                  {vis("cash_pct")       && <TableCell />}
                  {vis("ins_pct")        && <TableCell />}
                  {vis("cash_entitlement")  && <TableCell align="center">{formatNumber(dayTotals.cash_entitlement)}</TableCell>}
                  {vis("ins_entitlement")   && <TableCell align="center">{formatNumber(dayTotals.insurance_entitlement)}</TableCell>}
                  {vis("total_entitlement") && <TableCell align="center">{formatNumber(dayTotals.total_doctor_entitlement)}</TableCell>}
                  {vis("journal")        && <TableCell />}
                  {vis("user")           && <TableCell />}
                </TableRow>
              </React.Fragment>
            );
          })}

          {/* ── Monthly totals ── */}
          <TableRow sx={{ "& .MuiTableCell-root": { fontWeight: 700, borderTop: "3px solid", borderColor: "primary.main", fontSize: "0.95rem" } }}>
            {selectable            && <TableCell />}
            {vis("index")          && <TableCell />}
            {vis("status")         && <TableCell />}
            {vis("date")           && <TableCell align="center" sx={{ color: "primary.main" }}>مجموع الشهر</TableCell>}
            {vis("specialty")      && <TableCell />}
            {vis("doctor")         && <TableCell />}
            {vis("income")         && <TableCell align="center" sx={{ color: "success.main" }}>{formatNumber(monthTotals.total_income)}</TableCell>}
            {vis("deduction")      && <TableCell align="center" sx={{ color: "error.main" }}>{formatNumber(monthTotals.clinic_enurance)}</TableCell>}
            {vis("ins_revenue")    && <TableCell align="center" sx={{ color: "warning.dark" }}>{formatNumber(monthTotals.snap_total_insurance_revenue)}</TableCell>}
            {vis("patients")       && <TableCell align="center">{monthTotals.snap_patients_count}</TableCell>}
            {vis("cash_pct")       && <TableCell />}
            {vis("ins_pct")        && <TableCell />}
            {vis("cash_entitlement")  && <TableCell align="center">{formatNumber(monthTotals.cash_entitlement)}</TableCell>}
            {vis("ins_entitlement")   && <TableCell align="center">{formatNumber(monthTotals.insurance_entitlement)}</TableCell>}
            {vis("total_entitlement") && <TableCell align="center">{formatNumber(monthTotals.total_doctor_entitlement)}</TableCell>}
            {vis("journal")        && <TableCell />}
            {vis("user")           && <TableCell />}
          </TableRow>
        </TableBody>
      </Table>

      {/* Journal popover */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        {popoverShift && (
          <Box sx={{ p: 1.5, minWidth: 160 }}>
            <Button
              fullWidth size="small" variant="outlined" color="primary"
              startIcon={<AccountBalance fontSize="small" />}
              onClick={() => { setJournalShift(popoverShift); closePopover(); }}
            >
              قيد محاسبي
            </Button>
          </Box>
        )}
      </Popover>

      {journalShift && (
        <JournalEntryDialog
          open={!!journalShift}
          onClose={() => setJournalShift(null)}
          onSuccess={() => {
            setJournaledShiftIds(prev => new Set(prev).add(journalShift.id));
            markDoctorShiftJournal(journalShift.id);
          }}
          doctorName={journalShift.doctor_name}
          doctorId={journalShift.doctor_id}
          totalAmount={journalShift.total_doctor_entitlement ?? 0}
          cashAmount={journalShift.cash_entitlement ?? 0}
          bankAmount={journalShift.insurance_entitlement ?? 0}
          date={(journalShift.created_at ?? new Date().toISOString()).slice(0, 10)}
          reference={`DS-${journalShift.id}`}
          clinicShiftId={journalShift.shift_id}
          doctorShiftId={journalShift.id}
        />
      )}
    </Box>
  );
}

export default DoctorShiftsReportTable;
