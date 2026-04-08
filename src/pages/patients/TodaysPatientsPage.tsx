// src/pages/patients/TodaysPatientsPage.tsx
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Search as SearchIcon,
  CalendarToday as CalendarTodayIcon,
  Visibility as VisibilityIcon,
  PeopleAlt as PeopleAltIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
} from "@mui/icons-material";
import { Microscope, Stethoscope, Bed } from "lucide-react";

import {
  getPatientVisitsSummary,
  markRequestedServiceDone,
  type GetVisitsFilters,
} from "@/services/visitService";
import type { PatientVisitSummary, RequestedServiceSummary } from "@/types/visits";
import type { DoctorStripped } from "@/types/doctors";
import type { Company } from "@/types/companies";
import { useDebounce } from "@/hooks/useDebounce";
import { useCachedDoctorsList, useCachedCompaniesList } from "@/hooks/useCachedData";

// ─── Constants ───────────────────────────────────────────────────────────────

const todayIso = dayjs().format("YYYY-MM-DD");

// Main table columns (no services column — shown in expandable row)
const COLUMNS: { key: string; label: string; width?: number | string }[] = [
  { key: "expand",  label: "",         width: 40  },
  { key: "number",  label: "#",        width: 50  },
  { key: "patient", label: "المريض",   width: 200 },
  { key: "doctor",  label: "الطبيب",   width: 140 },
  { key: "company", label: "الشركة",   width: 130 },
  { key: "status",  label: "الحالة",   width: 120 },
  { key: "balance", label: "الرصيد",   width: 90  },
  { key: "time",    label: "الوقت",    width: 80  },
  { key: "actions", label: "",         width: 80  },
];

// ─── Status chip ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  waiting:         { label: "انتظار",       color: "default"   },
  with_doctor:     { label: "مع الطبيب",    color: "primary"   },
  lab_pending:     { label: "انتظار مختبر", color: "info"      },
  imaging_pending: { label: "انتظار أشعة",  color: "secondary" },
  payment_pending: { label: "انتظار دفع",   color: "warning"   },
  completed:       { label: "مكتملة",       color: "success"   },
  cancelled:       { label: "ملغاة",        color: "error"     },
  no_show:         { label: "لم يحضر",      color: "error"     },
} as const;

const VisitStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const config = STATUS_MAP[status as keyof typeof STATUS_MAP] ?? {
    label: status,
    color: "default" as const,
  };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontSize: "0.6875rem", fontWeight: 600, minWidth: 80 }}
    />
  );
};

// ─── Patient name cell ────────────────────────────────────────────────────────

const PatientNameCell: React.FC<{ visit: PatientVisitSummary }> = React.memo(({ visit }) => {
  const name = visit.patient?.name ?? "-";
  const initials = name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("");

  const hasLab =
    (visit.total_lab_value_will_pay ?? 0) > 0 || (visit.lab_requests?.length ?? 0) > 0;
  const hasServices =
    (visit.total_services_amount ?? 0) > 0 || (visit.requested_services_count ?? 0) > 0;
  const hasAdmission = !!visit.patient?.admission;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar
        sx={(theme) => ({
          width: 30,
          height: 30,
          fontSize: "0.7rem",
          fontWeight: 700,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          color: "primary.main",
          flexShrink: 0,
        })}
      >
        {initials}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} noWrap>
          {name}
        </Typography>
        {(hasLab || hasServices || hasAdmission) && (
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
            {hasLab && (
              <Tooltip title="طلب مختبر">
                <Box component="span" sx={{ display: "inline-flex", color: "info.main", "& svg": { width: 12, height: 12 } }}>
                  <Microscope />
                </Box>
              </Tooltip>
            )}
            {hasServices && (
              <Tooltip title="خدمات طبية">
                <Box component="span" sx={{ display: "inline-flex", color: "secondary.main", "& svg": { width: 12, height: 12 } }}>
                  <Stethoscope />
                </Box>
              </Tooltip>
            )}
            {hasAdmission && (
              <Tooltip title="منوم">
                <Box component="span" sx={{ display: "inline-flex", color: "warning.main", "& svg": { width: 12, height: 12 } }}>
                  <Bed />
                </Box>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
});

// ─── Complete button per service row ─────────────────────────────────────────

const CompleteServiceButton: React.FC<{ service: RequestedServiceSummary; visitQueryKey: readonly unknown[] }> = ({ service, visitQueryKey }) => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (done: boolean) => markRequestedServiceDone(service.id, done),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitQueryKey });
    },
  });

  if (service.done) {
    return (
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        disabled={isPending}
        onClick={(e) => { e.stopPropagation(); mutate(false); }}
        sx={{ fontSize: "0.7rem", py: 0.25, px: 1, minWidth: 0, color: "text.secondary" }}
      >
        تراجع
      </Button>
    );
  }

  return (
    <Button
      size="small"
      variant="contained"
      color="success"
      disableElevation
      disabled={isPending}
      onClick={(e) => { e.stopPropagation(); mutate(true); }}
      sx={{ fontSize: "0.7rem", py: 0.25, px: 1, minWidth: 0 }}
    >
      {isPending ? <CircularProgress size={12} color="inherit" /> : "إنجاز"}
    </Button>
  );
};

// ─── Expanded services table ──────────────────────────────────────────────────

const ServicesExpandedRow: React.FC<{ visit: PatientVisitSummary; open: boolean; visitQueryKey: readonly unknown[] }> = React.memo(
  ({ visit, open, visitQueryKey }) => {
    const services: RequestedServiceSummary[] =
      visit.requested_services_summary?.length
        ? visit.requested_services_summary
        : (visit.requested_services ?? []).map((rs) => ({
            id: rs.id,
            service_name: rs.service?.name ?? `خدمة #${rs.service_id}`,
            price: rs.price ?? 0,
            count: rs.count ?? 1,
            amount_paid: rs.amount_paid ?? 0,
            is_paid: rs.is_paid ?? false,
            done: rs.done ?? false,
          }));

    const labRequests = visit.lab_requests ?? [];
    const hasContent = services.length > 0 || labRequests.length > 0;

    return (
      <TableRow sx={{ "& > td": { py: 0, border: 0 } }}>
        <TableCell colSpan={COLUMNS.length} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={(theme) => ({
                mx: 2,
                my: 1,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                overflow: "hidden",
                bgcolor: alpha(theme.palette.primary.main, 0.02),
              })}
            >
              {!hasContent ? (
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", py: 2 }}>
                  لا توجد خدمات أو فحوصات مسجلة
                </Typography>
              ) : (
                <>
                  {/* ── Clinical services ── */}
                  {services.length > 0 && (
                    <>
                      <Box sx={{ px: 1.5, py: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box component="span" sx={{ display: "inline-flex", color: "secondary.main", "& svg": { width: 14, height: 14 } }}>
                          <Stethoscope />
                        </Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                          الخدمات الطبية
                        </Typography>
                      </Box>
                      <Table size="small" sx={{ "& td, & th": { fontSize: "0.8rem" } }}>
                        <TableHead>
                          <TableRow>
                            {["الخدمة", "السعر", "الكمية", "المدفوع", "الحالة", ""].map((h, i) => (
                              <TableCell
                                key={i}
                                align="center"
                                sx={(theme) => ({
                                  fontWeight: 700,
                                  color: "text.secondary",
                                  bgcolor: alpha(theme.palette.action.hover, 0.5),
                                  py: 0.5,
                                  borderBottom: `1px solid ${theme.palette.divider}`,
                                })}
                              >
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {services.map((s) => (
                            <TableRow key={s.id} hover sx={s.done ? { bgcolor: (theme) => alpha(theme.palette.success.main, 0.04) } : {}}>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                <Typography variant="body2" fontWeight={500}>{s.service_name}</Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {s.price.toLocaleString()}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {s.count}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {s.amount_paid > 0 ? (
                                  <Typography variant="body2" color="success.main" fontWeight={600}>
                                    {s.amount_paid.toLocaleString()}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">0</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {s.done ? (
                                  <Chip label="منجز" color="success" size="small" sx={{ fontSize: "0.6875rem", height: 20 }} />
                                ) : s.is_paid ? (
                                  <Chip label="مدفوع" color="info" size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 20 }} />
                                ) : (
                                  <Chip label="غير مدفوع" color="warning" size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 20 }} />
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                <CompleteServiceButton service={s} visitQueryKey={visitQueryKey} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {/* ── Lab requests ── */}
                  {labRequests.length > 0 && (
                    <>
                      {services.length > 0 && <Divider />}
                      <Box sx={{ px: 1.5, py: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box component="span" sx={{ display: "inline-flex", color: "info.main", "& svg": { width: 14, height: 14 } }}>
                          <Microscope />
                        </Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                          فحوصات المختبر
                        </Typography>
                      </Box>
                      <Table size="small" sx={{ "& td, & th": { fontSize: "0.8rem" } }}>
                        <TableHead>
                          <TableRow>
                            {["الفحص", "السعر", "المدفوع", "الحالة"].map((h) => (
                              <TableCell
                                key={h}
                                align="center"
                                sx={(theme) => ({
                                  fontWeight: 700,
                                  color: "text.secondary",
                                  bgcolor: alpha(theme.palette.action.hover, 0.5),
                                  py: 0.5,
                                  borderBottom: `1px solid ${theme.palette.divider}`,
                                })}
                              >
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {labRequests.map((lr) => (
                            <TableRow key={lr.id} hover>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {lr.main_test?.main_test_name ?? `فحص #${lr.main_test_id}`}
                                </Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {(lr.price ?? 0).toLocaleString()}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {lr.amount_paid > 0 ? (
                                  <Typography variant="body2" color="success.main" fontWeight={600}>
                                    {lr.amount_paid.toLocaleString()}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">0</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                {lr.is_paid ? (
                                  <Chip label="مدفوع" color="success" size="small" sx={{ fontSize: "0.6875rem", height: 20 }} />
                                ) : (
                                  <Chip label="غير مدفوع" color="warning" size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 20 }} />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    );
  },
);

// ─── Visit row group (main row + expandable row) ──────────────────────────────

const VisitRowGroup: React.FC<{ visit: PatientVisitSummary; idx: number; visitQueryKey: readonly unknown[] }> = React.memo(
  ({ visit, idx, visitQueryKey }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const companyName = visit.patient.company?.name || visit.company?.name || "-";
    const balance = visit.balance_due;
    const hasDetails =
      (visit.requested_services_summary?.length ?? 0) > 0 ||
      (visit.requested_services?.length ?? 0) > 0 ||
      (visit.lab_requests?.length ?? 0) > 0 ||
      (visit.requested_services_count ?? 0) > 0;

    return (
      <>
        <TableRow
          hover
          onClick={() => navigate(`/patients/visit/${visit.id}`)}
          sx={(theme) => ({
            cursor: "pointer",
            bgcolor: idx % 2 === 0 ? "transparent" : alpha(theme.palette.action.hover, 0.4),
            "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
            transition: "background-color 0.15s ease",
          })}
        >
          {/* Expand toggle */}
          <TableCell align="center" sx={{ ...cellSx, p: 0.5 }} onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
              disabled={!hasDetails}
              sx={{ width: 28, height: 28 }}
            >
              {open ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
            </IconButton>
          </TableCell>

          {/* # */}
          <TableCell align="center" sx={cellSx}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {visit.number}
            </Typography>
          </TableCell>

          {/* Patient */}
          <TableCell sx={cellSx}>
            <PatientNameCell visit={visit} />
          </TableCell>

          {/* Doctor */}
          <TableCell align="center" sx={cellSx}>
            <Typography variant="body2" noWrap>
              {visit.doctor_name || visit.doctor_shift_details?.doctor_name || "—"}
            </Typography>
          </TableCell>

          {/* Company */}
          <TableCell align="center" sx={cellSx}>
            {companyName === "-" ? (
              <Typography variant="caption" color="text.disabled">—</Typography>
            ) : (
              <Chip label={companyName} size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 20 }} />
            )}
          </TableCell>

          {/* Status */}
          <TableCell align="center" sx={cellSx}>
            <VisitStatusChip status={visit.status} />
          </TableCell>

          {/* Balance */}
          <TableCell align="center" sx={cellSx}>
            {!balance || balance === 0 ? (
              <Typography variant="caption" color="success.main" fontWeight={600}>مسدد</Typography>
            ) : (
              <Typography variant="body2" color="error.main" fontWeight={600}>
                {balance.toLocaleString()}
              </Typography>
            )}
          </TableCell>

          {/* Time */}
          <TableCell align="center" sx={cellSx}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {dayjs(visit.created_at).format("hh:mm A")}
            </Typography>
          </TableCell>

          {/* Actions */}
          <TableCell align="center" sx={cellSx}>
            <Button
              variant="contained"
              size="small"
              disableElevation
              startIcon={<VisibilityIcon sx={{ fontSize: "14px !important" }} />}
              onClick={(e) => { e.stopPropagation(); navigate(`/patients/visit/${visit.id}`); }}
              sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5, minWidth: 0, whiteSpace: "nowrap" }}
            >
              عرض
            </Button>
          </TableCell>
        </TableRow>

        {/* Expandable services row */}
        <ServicesExpandedRow visit={visit} open={open} visitQueryKey={visitQueryKey} />
      </>
    );
  },
);

const cellSx = {
  fontSize: "0.875rem",
  py: 1,
  px: 1,
  borderBottom: "1px solid",
  borderColor: "divider",
} as const;

// ─── Main component ───────────────────────────────────────────────────────────

const TodaysPatientsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);

  const { data: doctorsList } = useCachedDoctorsList();
  const { data: companiesList } = useCachedCompaniesList();

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorStripped | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const visitsQueryKey = [
    "patientVisitsSummary",
    debouncedSearchTerm,
    dateFrom || "all",
    dateTo || "all",
    selectedDoctor?.id || "all",
    selectedCompany?.id || "all",
  ] as const;

  const {
    data,
    isLoading,
    error,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: visitsQueryKey,
    queryFn: ({ pageParam = 1 }) => {
      const filters: GetVisitsFilters = {
        page: pageParam,
        per_page: 50,
        search: debouncedSearchTerm || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        doctor_id: selectedDoctor?.id ?? undefined,
        company_id: selectedCompany?.id ?? undefined,
      };
      return getPatientVisitsSummary(filters);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
  });

  const visits = data?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = data?.pages[data.pages.length - 1]?.meta?.total;
  const isToday = dateFrom === todayIso && dateTo === todayIso;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  return (
    <Box sx={{ py: 2, display: "flex", flexDirection: "column", gap: 2 }}>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
        <TextField
          size="small"
          type="search"
          placeholder="ابحث بالاسم أو الهاتف"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220, flex: 1 }}
        />
        <Autocomplete
          size="small"
          options={doctorsList || []}
          getOptionLabel={(o) => o.name}
          value={selectedDoctor}
          onChange={(_, v) => setSelectedDoctor(v)}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="الطبيب" />}
          sx={{ minWidth: 190 }}
        />
        <Autocomplete
          size="small"
          options={companiesList || []}
          getOptionLabel={(o) => o.name}
          value={selectedCompany}
          onChange={(_, v) => setSelectedCompany(v)}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="الشركة" />}
          sx={{ minWidth: 190 }}
        />
        <TextField
          label="من"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarTodayIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
          sx={{ width: 170 }}
        />
        <TextField
          label="إلى"
          type="date"
          size="small"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarTodayIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
          sx={{ width: 170 }}
        />
        {totalCount !== undefined && (
          <Chip
            icon={<PeopleAltIcon sx={{ fontSize: "16px !important" }} />}
            label={`${totalCount.toLocaleString()} زيارة`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, mr: "auto" }}
          />
        )}
      </Stack>

      {/* ── Refresh bar ─────────────────────────────────────────────────────── */}
      <LinearProgress
        sx={{
          borderRadius: 1,
          mt: -1,
          visibility: isFetching && !isFetchingNextPage ? "visible" : "hidden",
        }}
      />

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {isLoading && visits.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography color="error" gutterBottom>
              فشل جلب البيانات: {(error as Error).message}
            </Typography>
            <Button variant="outlined" color="error" onClick={() => refetch()} sx={{ mt: 1 }}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : visits.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <PeopleAltIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm || !isToday ? "لا توجد نتائج" : "لا توجد زيارات اليوم"}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {searchTerm
                ? "جرّب تغيير كلمة البحث"
                : !isToday
                ? "لا توجد زيارات في النطاق الزمني المحدد"
                : "لم يتم تسجيل أي زيارات حتى الآن"}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: "calc(100vh - 220px)" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.key}
                      align="center"
                      sx={(theme) => ({
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        color: "text.secondary",
                        letterSpacing: 0.3,
                        width: col.width,
                        py: 1.25,
                        px: 1,
                        whiteSpace: "nowrap",
                      })}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit, idx) => (
                  <VisitRowGroup key={visit.id} visit={visit} idx={idx} visitQueryKey={visitsQueryKey} />
                ))}

                {!hasNextPage && visits.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 2.5, borderBottom: "none" }}>
                      <Divider>
                        <Chip
                          label={`نهاية القائمة — ${visits.length} زيارة`}
                          size="small"
                          variant="outlined"
                          sx={{ color: "text.disabled", borderColor: "divider", fontSize: "0.75rem" }}
                        />
                      </Divider>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Infinite scroll sentinel */}
            <Box
              ref={loadMoreRef}
              sx={{ height: 40, display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              {isFetchingNextPage && <CircularProgress size={22} />}
            </Box>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
};

export default TodaysPatientsPage;
