import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
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
  Checkbox,
  Tooltip,
  IconButton,
  Popover,
  FormControlLabel,
  Divider,
  Badge,
} from "@mui/material";
import { LockOpen, FactCheck } from "@mui/icons-material";
import { formatNumber } from "@/lib/utils";
import type { DoctorShiftReportItem } from "@/types/reports";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateDoctorShiftProofingFlags,
  reopenDoctorShift,
} from "@/services/doctorShiftService";

type ProofFlag =
  | "is_cash_revenue_prooved"
  | "is_cash_reclaim_prooved"
  | "is_company_revenue_prooved"
  | "is_company_reclaim_prooved";

interface DoctorShiftsReportTableProps {
  shifts: DoctorShiftReportItem[];
  isLoading: boolean;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

const proofColumns: { flag: ProofFlag; label: string }[] = [
  { flag: "is_cash_revenue_prooved",    label: " اثبات إيراد نقدي " },
  { flag: "is_cash_reclaim_prooved",    label: "اثبات الاستحقاق نقدي" },
  { flag: "is_company_revenue_prooved", label: "اثبات ايراد شركة" },
  { flag: "is_company_reclaim_prooved", label: "اثبات استحقاق شركة" },
];

function countProofed(shift: DoctorShiftReportItem): number {
  return proofColumns.filter((c) => shift[c.flag]).length;
}

function DoctorShiftsReportTable({
  shifts,
  isLoading,
  rowsPerPage = 50,
  onRowsPerPageChange,
}: DoctorShiftsReportTableProps) {
  const navigate = useNavigate();

  const [localShifts, setLocalShifts] = useState<DoctorShiftReportItem[]>(shifts);
  useEffect(() => { setLocalShifts(shifts); }, [shifts]);

  const [pendingReopen, setPendingReopen] = useState<Set<number>>(new Set());
  const [pendingFlag, setPendingFlag] = useState<Map<number, ProofFlag>>(new Map());

  // Popover state: anchor element + which shift id is open
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverShiftId, setPopoverShiftId] = useState<number | null>(null);

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
    onMutate: (shiftId) =>
      setPendingReopen((prev) => new Set(prev).add(shiftId)),
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

  const flagMutation = useMutation({
    mutationFn: ({ shiftId, flag, value }: { shiftId: number; flag: ProofFlag; value: boolean }) =>
      updateDoctorShiftProofingFlags(shiftId, { [flag]: value }),
    onMutate: ({ shiftId, flag }) =>
      setPendingFlag((prev) => new Map(prev).set(shiftId, flag)),
    onSuccess: (_, { shiftId, flag, value }) => {
      setLocalShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? {
                ...s,
                [flag]: value,
                status: flag === "is_cash_reclaim_prooved" ? false : s.status,
              }
            : s
        )
      );
      toast.success("تم تحديث العلامة");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "فشل تحديث العلامة"),
    onSettled: (_, __, { shiftId }) =>
      setPendingFlag((prev) => { const m = new Map(prev); m.delete(shiftId); return m; }),
  });

  const totals = localShifts.reduce(
    (acc, s) => ({
      total_income: acc.total_income + (s.total_income || 0),
      clinic_enurance: acc.clinic_enurance + (s.clinic_enurance || 0),
      cash_entitlement: acc.cash_entitlement + (s.cash_entitlement || 0),
      insurance_entitlement: acc.insurance_entitlement + (s.insurance_entitlement || 0),
      total_doctor_entitlement: acc.total_doctor_entitlement + (s.total_doctor_entitlement || 0),
    }),
    { total_income: 0, clinic_enurance: 0, cash_entitlement: 0, insurance_entitlement: 0, total_doctor_entitlement: 0 }
  );

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
      </Box>

      <TableContainer dir="ltr" component={Paper} elevation={2}>
        <Table size="small" sx={{ direction: "ltr" }}>
          <TableHead>
            <TableRow>
              <TableCell align="center">الحالة</TableCell>
              <TableCell align="center">تاريخ</TableCell>
              <TableCell align="center">التخصص</TableCell>
              <TableCell align="center">الطبيب</TableCell>
              <TableCell align="center">إجمالي المدفوع</TableCell>
              <TableCell align="center">التحمل</TableCell>
              <TableCell align="center">استحقاق (كاش)</TableCell>
              <TableCell align="center">استحقاق (تأمين)</TableCell>
              <TableCell align="center">إجمالي الاستحقاق</TableCell>
              <TableCell align="center">التحقق</TableCell>
              <TableCell align="center">المستخدم</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localShifts.map((shift, index) => {
              const isReopening = pendingReopen.has(shift.id);
              const proofedCount = countProofed(shift);

              return (
                <TableRow
                  key={shift.id}
                  onClick={() => handleRowClick(shift)}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "background.paper" : "grey.50",
                    cursor: "pointer",
                  }}
                >
                  {/* Status dot + reopen button */}
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: shift.status ? "#4CAF50" : "#F44336",
                          border: "2px solid",
                          borderColor: shift.status ? "#2E7D32" : "#C62828",
                          flexShrink: 0,
                        }}
                        title={shift.status ? "مفتوح" : "مغلق"}
                      />
                      {!shift.status && (
                        <Tooltip title="إعادة فتح المناوبة">
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={isReopening}
                              onClick={(e) => { e.stopPropagation(); reopenMutation.mutate(shift.id); }}
                              sx={{ p: 0.25 }}
                            >
                              {isReopening
                                ? <CircularProgress size={14} />
                                : <LockOpen sx={{ fontSize: 14 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    {shift.created_at ? dayjs(shift.created_at).format("DD/MM/YYYY HH:mm") : "-"}
                  </TableCell>
                  <TableCell align="center">{shift.doctor_specialist_name || "-"}</TableCell>
                  <TableCell align="center">
                    <Link
                      component="button"
                      onClick={(e) => handleDoctorNameClick(shift, e)}
                      sx={{ color: "primary.main", textDecoration: "none", cursor: "pointer", "&:hover": { textDecoration: "underline" }, fontWeight: "medium" }}
                    >
                      {shift.doctor_name || "N/A"}
                    </Link>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", color: "success.main" }}>
                    {formatNumber(shift.total_income || 0)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", color: "error.main" }}>
                    {formatNumber(shift.clinic_enurance || 0)}
                  </TableCell>
                  <TableCell align="center">{formatNumber(shift.cash_entitlement || 0)}</TableCell>
                  <TableCell align="center">{formatNumber(shift.insurance_entitlement || 0)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {formatNumber(shift.total_doctor_entitlement || 0)}
                  </TableCell>

                  {/* Proof flags — single compact cell, popover on click */}
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={`${proofedCount} / ${proofColumns.length} محقق`}>
                      <IconButton
                        size="small"
                        onClick={(e) => openPopover(e, shift.id)}
                        sx={{ p: 0.5 }}
                        color={proofedCount === proofColumns.length ? "success" : proofedCount > 0 ? "warning" : "default"}
                      >
                        <Badge badgeContent={proofedCount} color={proofedCount === proofColumns.length ? "success" : "warning"} max={4}>
                          <FactCheck sx={{ fontSize: 18 }} />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                  </TableCell>

                  <TableCell align="center">{shift.user_name_opened || "-"}</TableCell>
                </TableRow>
              );
            })}

            {/* Totals row */}
            <TableRow
              sx={{ "& .MuiTableCell-root": { fontWeight: "bold", borderTop: "2px solid", borderColor: "primary.main" } }}
            >
              <TableCell align="center">-</TableCell>
              <TableCell align="center" sx={{ fontSize: "1rem" }}>المجموع</TableCell>
              <TableCell align="center">-</TableCell>
              <TableCell align="center">-</TableCell>
              <TableCell align="center" sx={{ color: "success.main", fontSize: "1rem" }}>{formatNumber(totals.total_income)}</TableCell>
              <TableCell align="center" sx={{ color: "error.main", fontSize: "1rem" }}>{formatNumber(totals.clinic_enurance)}</TableCell>
              <TableCell align="center" sx={{ fontSize: "1rem" }}>{formatNumber(totals.cash_entitlement)}</TableCell>
              <TableCell align="center" sx={{ fontSize: "1rem" }}>{formatNumber(totals.insurance_entitlement)}</TableCell>
              <TableCell align="center" sx={{ fontSize: "1rem" }}>{formatNumber(totals.total_doctor_entitlement)}</TableCell>
              <TableCell align="center">-</TableCell>
              <TableCell align="center">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Proof flags popover — shared, one at a time */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        {popoverShift && (
          <Box sx={{ p: 1.5, minWidth: 200 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
              التحقق من المستحقات
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {proofColumns.map((col, i) => {
              const isPending = pendingFlag.get(popoverShift.id) === col.flag;
              const anyPending = pendingFlag.has(popoverShift.id);
              return (
                <Box key={col.flag}>
                  <FormControlLabel
                    control={
                      isPending ? (
                        <Box sx={{ width: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CircularProgress size={16} />
                        </Box>
                      ) : (
                        <Checkbox
                          size="small"
                          checked={!!popoverShift[col.flag]}
                          disabled={anyPending}
                          onChange={(e) =>
                            flagMutation.mutate({
                              shiftId: popoverShift.id,
                              flag: col.flag,
                              value: e.target.checked,
                            })
                          }
                        />
                      )
                    }
                    label={<Typography variant="body2">{col.label}</Typography>}
                    sx={{ display: "flex", m: 0 }}
                  />
                  {i < proofColumns.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>
    </Box>
  );
}

export default DoctorShiftsReportTable;
