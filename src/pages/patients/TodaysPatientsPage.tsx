// src/pages/patients/TodaysPatientsPage.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  LinearProgress,
  Pagination,
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
import Autocomplete from "@mui/material/Autocomplete";
import {
  Search as SearchIcon,
  CalendarToday as CalendarTodayIcon,
  Visibility as VisibilityIcon,
  PeopleAlt as PeopleAltIcon,
} from "@mui/icons-material";
import { Stethoscope } from "lucide-react";

import {
  getPatientVisitsSummary,
  getDoctorVisitById,
  getRequestedServicesForVisit,
  type GetVisitsFilters,
} from "@/services/visitService";
import type { PatientVisitSummary } from "@/types/visits";
import RequestedServicesTable from "@/components/clinic/RequestedServicesTable";
import QuickAddPatientDialog from "@/components/admissions/QuickAddPatientDialog";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import type { Company } from "@/types/companies";
import { useDebounce } from "@/hooks/useDebounce";
import { useCachedCompaniesList } from "@/hooks/useCachedData";
import { useAuth } from "@/contexts/AuthContext";
import { getServicesList } from "@/services/serviceService";
import { getUsersList } from "@/services/userService";

// ─── Constants ───────────────────────────────────────────────────────────────

const todayIso = dayjs().format("YYYY-MM-DD");

const COLUMNS: { key: string; label: string; width?: number | string }[] = [
  { key: "number",   label: "#",              width: 50  },
  { key: "patient",  label: "المريض",         width: 200 },
  { key: "time",     label: "التاريخ والوقت", width: 140 },
  { key: "total",    label: "الإجمالي",       width: 90  },
  { key: "paid",     label: "المدفوع",        width: 90  },
  { key: "balance",  label: "المتبقي",        width: 90  },
  { key: "services", label: "الخدمات",        width: 90  },
  { key: "actions",  label: "المختبر",        width: 80  },
  { key: "info",     label: "المعلومات",      width: 110 },
];

// ─── Visit services dialog ────────────────────────────────────────────────────

const VisitServicesDialog: React.FC<{ visitId: number; open: boolean; onClose: () => void }> = ({ visitId, open, onClose }) => {
  const { data: visit, isLoading: isLoadingVisit } = useQuery({
    queryKey: ["doctorVisit", visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: open,
  });

  const { data: requestedServices = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["requestedServicesForVisit", visitId],
    queryFn: () => getRequestedServicesForVisit(visitId),
    enabled: open,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        خدمات الزيارة — {visit?.patient?.name ?? ""}
      </DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <RequestedServicesTable
          visitId={visitId}
          visit={visit}
          requestedServices={requestedServices}
          isLoading={isLoadingVisit || isLoadingServices}
          currentClinicShiftId={null}
          onAddMoreServices={() => {}}
          handlePrintReceipt={() => {}}
          showExtraColumns
        />
      </DialogContent>
    </Dialog>
  );
};



// ─── Lab requests dialog ─────────────────────────────────────────────────────

const LabRequestsDialog: React.FC<{ visitId: number; open: boolean; onClose: () => void }> = ({ visitId, open, onClose }) => {
  const { data: visit, isLoading } = useQuery({
    queryKey: ["doctorVisit", visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: open,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        فحوصات المختبر — {visit?.patient?.name ?? ""}
      </DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <LabRequestsColumn
          activeVisitId={visitId}
          visit={visit}
          isLoading={isLoading}
          onPrintReceipt={() => {}}
        />
      </DialogContent>
    </Dialog>
  );
};

// ─── Visit row group ─────────────────────────────────────────────────────────

const VisitRowGroup: React.FC<{ visit: PatientVisitSummary; idx: number }> = React.memo(
  ({ visit, idx }) => {
    const [servicesOpen, setServicesOpen] = useState(false);
    const [labOpen, setLabOpen] = useState(false);
    const [patientDialogOpen, setPatientDialogOpen] = useState(false);

    const companyName = visit.patient.company?.name || visit.company?.name || "-";

    return (
      <>
        <VisitServicesDialog
          visitId={visit.id}
          open={servicesOpen}
          onClose={() => setServicesOpen(false)}
        />
        <LabRequestsDialog
          visitId={visit.id}
          open={labOpen}
          onClose={() => setLabOpen(false)}
        />
        {patientDialogOpen && (
          <QuickAddPatientDialog
            open
            onClose={() => setPatientDialogOpen(false)}
            patientId={visit.patient.id}
            onPatientAdded={() => setPatientDialogOpen(false)}
            onPatientUpdated={() => setPatientDialogOpen(false)}
          />
        )}
        <TableRow hover>
          {/* # */}
          <TableCell align="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {visit.id}
            </Typography>
          </TableCell>

          {/* Patient */}
          <TableCell align="center">
            <Typography variant="body2" noWrap>{visit.patient.name}</Typography>
          </TableCell>

       
    

          {/* Date & Time */}
          <TableCell align="center" >
            <Typography variant="caption" color="text.secondary" noWrap>
              {dayjs(visit.created_at).format("YYYY-MM-DD")}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {dayjs(visit.created_at).format("hh:mm A")}
            </Typography>
          </TableCell>

          {/* الإجمالي */}
          <TableCell align="center">
            <Typography variant="body2" fontWeight={600}>
              {((visit.total_services_amount ?? 0) + (visit.total_lab_value_will_pay ?? 0)).toLocaleString()}
            </Typography>
          </TableCell>

          {/* المدفوع */}
          <TableCell align="center">
            <Typography variant="body2" color="success.main" fontWeight={600}>
              {((visit.total_services_paid ?? 0) + (visit.lab_paid ?? 0)).toLocaleString()}
            </Typography>
          </TableCell>

          {/* المتبقي */}
          <TableCell align="center">
            {(visit.balance_due ?? 0) > 0 ? (
              <Typography variant="body2" color="error.main" fontWeight={600}>
                {visit.balance_due.toLocaleString()}
              </Typography>
            ) : (
              <Typography variant="caption" color="success.main" fontWeight={600}>مسدد</Typography>
            )}
          </TableCell>

          {/* Services */}
          <TableCell align="center">
            <Button
              variant="outlined"
              size="small"
              disableElevation
              startIcon={<Stethoscope size={13} />}
              onClick={(e) => { e.stopPropagation(); setServicesOpen(true); }}
              sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5, minWidth: 0, whiteSpace: "nowrap" }}
            >
              خدمات
            </Button>
          </TableCell>

          {/* Actions */}
          <TableCell align="center">
            <Button
              variant="contained"
              size="small"
              disableElevation
              onClick={(e) => { e.stopPropagation(); setLabOpen(true); }}
            >
              المختبر
            </Button>
          </TableCell>
             {/* Patient info button */}
          <TableCell align="center">
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => { e.stopPropagation(); setPatientDialogOpen(true); }}
              sx={{ fontSize: "0.7rem", py: 0.25, px: 1, minWidth: 0, whiteSpace: "nowrap" }}
            >
              بيانات المريض
            </Button>
          </TableCell>

        </TableRow>

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

  useAuth();
  const { data: companiesList } = useCachedCompaniesList();

  const [page, setPage] = useState(1);
  const [selectedDiagnosisUser, setSelectedDiagnosisUser] = useState<{ id: number; name: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: number; name: string } | null>(null);

  // Reset to page 1 whenever any filter changes
  const resetPage = () => setPage(1);

  const { data: servicesList = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["servicesList"],
    queryFn: getServicesList,
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersList = [], isLoading: isLoadingUsers } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["usersList"],
    queryFn: getUsersList,
    staleTime: 5 * 60 * 1000,
  });

  const visitsQueryKey = [
    "patientVisitsSummary",
    debouncedSearchTerm,
    dateFrom || "all",
    dateTo || "all",
    selectedDiagnosisUser?.id || "all",
    selectedCompany?.id || "all",
    selectedService?.id || "all",
    page,
  ] as const;

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: visitsQueryKey,
    queryFn: () =>
      getPatientVisitsSummary({
        page,
        per_page: 100,
        search: debouncedSearchTerm || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        diagnosis_user_id: selectedDiagnosisUser?.id ?? undefined,
        company_id: selectedCompany?.id ?? undefined,
        service_id: selectedService?.id ?? undefined,
      } as GetVisitsFilters),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const visits = data?.data ?? [];
  const totalCount = data?.meta?.total;
  const lastPage = data?.meta?.last_page ?? 1;
  const isToday = dateFrom === todayIso && dateTo === todayIso;

  return (
    <Box sx={{ py: 2, display: "flex", flexDirection: "column", gap: 2 }}>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
        <TextField
          size="small"
          type="search"
          placeholder="ابحث بالاسم أو الهاتف"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
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
          options={usersList}
          loading={isLoadingUsers}
          getOptionLabel={(o) => o.name}
          value={selectedDiagnosisUser}
          onChange={(_, v) => { setSelectedDiagnosisUser(v); resetPage(); }}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="المشخِّص" />}
          sx={{ minWidth: 190 }}
        />
        <Autocomplete
          size="small"
          options={servicesList}
          loading={isLoadingServices}
          getOptionLabel={(o) => o.name}
          value={selectedService}
          onChange={(_, v) => { setSelectedService(v); resetPage(); }}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="الخدمة" />}
          sx={{ minWidth: 210 }}
        />
        {/* <Autocomplete
          size="small"
          options={companiesList || []}
          getOptionLabel={(o) => o.name}
          value={selectedCompany}
          onChange={(_, v) => { setSelectedCompany(v); resetPage(); }}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="الشركة" />}
          sx={{ minWidth: 190 }}
        /> */}
        <TextField
          label="من"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
       
          sx={{ width: 170 }}
        />
        <TextField
          label="إلى"
          type="date"
          size="small"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
       
          sx={{ width: 170 }}
        />
    
      </Stack>

      {/* ── Refresh bar ─────────────────────────────────────────────────────── */}
      <LinearProgress
        sx={{
          borderRadius: 1,
          mt: -1,
          visibility: isFetching ? "visible" : "hidden",
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
                  <VisitRowGroup key={visit.id} visit={visit} idx={idx} />
                ))}

       
              </TableBody>
            </Table>

          </TableContainer>
      )}

      {/* ── Pagination ── */}
      {lastPage > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {totalCount?.toLocaleString()} زيارة — صفحة {page} من {lastPage}
          </Typography>
          <Pagination
            count={lastPage}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            size="small"
            siblingCount={1}
          />
        </Box>
      )}
    </Box>
  );
};

export default TodaysPatientsPage;
