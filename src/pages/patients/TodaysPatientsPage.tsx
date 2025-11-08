// src/pages/patients/TodaysPatientsPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";

// MUI
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  MenuItem,
  FormControlLabel,
  Switch
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { Search as SearchIcon, CalendarMonth as CalendarIcon } from "@mui/icons-material";

import {
  getPatientVisitsSummary,
  type GetVisitsFilters,
} from "@/services/visitService";
import type { PaginatedResponse } from "@/types/common";
import type { PatientVisitSummary } from "@/types/visits";
import { formatNumber } from "@/lib/utils";
import ViewVisitServicesDialog from "@/components/clinic/patients/ViewVisitServicesDialog";
import ServicesDialog from "@/components/clinic/patients/ServicesDialog";
import LabRequestsDialog from "@/components/clinic/patients/LabRequestsDialog";
import { getDoctorsList } from "@/services/doctorService";
import type { DoctorStripped } from "@/types/doctors";
import { getCompaniesList } from "@/services/companyService";
import type { Company } from "@/types/companies";

const TodaysPatientsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // pagination size options
  const perPageOptions = [10, 50, 100, 300, 500, 1000];
  const [perPage, setPerPage] = useState<number>(15);

  // Simple date range with two inputs
  const todayIso = dayjs().format("YYYY-MM-DD");
  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);

  // doctor filter
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorStripped | null>(null);
  
  // company filter
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // filter by patients with company only
  const [onlyWithCompany, setOnlyWithCompany] = useState<boolean>(false);

  const [selectedVisitForServices, setSelectedVisitForServices] =
    useState<PatientVisitSummary | null>(null);
  
  // State for services and lab dialogs
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  // Window height state for table container
  const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Track window height changes
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, selectedCompany, selectedDoctor, onlyWithCompany]);

  const visitsQueryKey = [
    "patientVisitsSummary",
    currentPage,
    debouncedSearchTerm,
    dateFrom || "all",
    dateTo || "all",
    perPage,
    selectedDoctor?.id || "all",
    selectedCompany?.id || "all",
    onlyWithCompany,
  ] as const;

  const {
    data: paginatedVisits,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<PatientVisitSummary>, Error>({
    queryKey: visitsQueryKey,
    queryFn: () => {
      const filters: GetVisitsFilters = {
        page: currentPage,
        per_page: perPage,
        search: debouncedSearchTerm || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        doctor_id: selectedDoctor?.id ?? undefined,
        company_id: selectedCompany?.id ?? undefined,
        has_company: onlyWithCompany ? true : false,
      };
      return getPatientVisitsSummary(filters);
    },
    placeholderData: keepPreviousData,
  });

  // doctors list for autocomplete (active only if available)
  const { data: doctorsList } = useQuery<DoctorStripped[]>({
    queryKey: ["doctors-list", { active: true }],
    queryFn: () => getDoctorsList({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  // companies list for autocomplete
  const { data: companiesList } = useQuery<Company[]>({
    queryKey: ["companies-list", { status: true }],
    queryFn: () => getCompaniesList({ status: true }),
    staleTime: 5 * 60 * 1000,
  });

  const visits = paginatedVisits?.data || [];
  const meta = paginatedVisits?.meta;

  // Calculate sums for the current page
  const totals = visits.reduce(
    (acc, visit) => ({
      total_services_amount: acc.total_services_amount + (visit.total_services_amount || 0),
      total_lab_value_will_pay: acc.total_lab_value_will_pay + (visit.total_lab_value_will_pay || 0),
      total_services_paid: acc.total_services_paid + (visit.total_services_paid || 0),
      lab_paid: acc.lab_paid + (visit.lab_paid || 0),
      balance_due: acc.balance_due + (visit.balance_due || 0),
    }),
    {
      total_services_amount: 0,
      total_lab_value_will_pay: 0,
      total_services_paid: 0,
      lab_paid: 0,
      balance_due: 0,
    }
  );

  return (
    <Box sx={{  py: 2 }}>
      <Box className="pb-1 mb-1" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>مرضى اليوم</Typography>
        {/* Filters */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <Box sx={{ position: 'relative', flexGrow: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="search"
              placeholder="ابحث بالاسم أو الهاتف"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
            />
          </Box>
          {/* Doctor filter */}
          <Box sx={{ minWidth: 220 }}>
            <Autocomplete
              size="small"
              options={doctorsList || []}
              getOptionLabel={(option) => option.name}
              value={selectedDoctor}
              onChange={(_, value) => {
                setSelectedDoctor(value);
                setCurrentPage(1);
              }}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="الطبيب" placeholder="اختر الطبيب" />
              )}
            />
          </Box>
          {/* Company filter */}
          <Box sx={{ minWidth: 220 }}>
            <Autocomplete
              size="small"
              options={companiesList || []}
              getOptionLabel={(option) => option.name}
              value={selectedCompany}
              onChange={(_, value) => {
                setSelectedCompany(value);
                setCurrentPage(1);
              }}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="الشركة" placeholder="اختر الشركة" />
              )}
            />
          </Box>
          {/* Toggle: Only patients with company */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyWithCompany}
                  onChange={(e) => {
                    setOnlyWithCompany(e.target.checked);
                    setCurrentPage(1);
                  }}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  فقط المرضى بالشركات
                </Typography>
              }
            />
          </Box>
          <TextField
            label="من"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {/* Rows per page selector */}
          <TextField
            select
            size="small"
            label="عدد الصفوف"
            value={perPage}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPerPage(next);
              setCurrentPage(1);
            }}
            sx={{ minWidth: 130 }}
          >
            {perPageOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      {isFetching && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center', py: 1 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} /> جاري تحديث القائمة...
        </Typography>
      )}

      {isLoading && !isFetching && visits.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ p: 2, textAlign: 'center' }}>
          فشل جلب المرضى: {error.message}
        </Typography>
      ) : visits.length === 0 ? (
        <Card sx={{ textAlign: 'center' }} className="pb-1 mb-1">
          <CardContent>
            <CalendarIcon sx={{ mx: 'auto', display: 'block', mb: 1, opacity: 0.3 }} />
            <Typography color="text.secondary">
              {searchTerm || (dateFrom !== todayIso || dateTo !== todayIso)
                ? 'لا توجد نتائج'
                : 'لا توجد زيارات اليوم'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer component={Paper} sx={{ maxHeight: `${windowHeight - 200}px` }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: 80 }}>الكود </TableCell>
                  <TableCell align="center">اسم المريض</TableCell>
                  <TableCell align="center">اسم المستخدم</TableCell>
                  <TableCell align="center">الشركه</TableCell>
                  <TableCell align="center">الطبيب</TableCell>
                  <TableCell align="center">التاريخ</TableCell>
                  <TableCell align="center">اجمالي الخدمات</TableCell>
                  <TableCell align="center">اجمالي المختبر</TableCell>
                  <TableCell align="center">المدفوع(خدمات)</TableCell>
                  <TableCell align="center">المدفوع(مختبر)</TableCell>
                  <TableCell align="center">المتبقي</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id} hover>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>{visit.id}</TableCell>
                    <TableCell align="center">
                      {visit.patient.name}
                    </TableCell>
                    <TableCell align="center">{visit.patient.user?.username || visit.patient.user?.name || '-'}</TableCell>
                    <TableCell align="center">{visit.patient.company?.name || '-'}</TableCell>
                    <TableCell align="center">{visit.doctor_name || visit.doctor_shift_details?.doctor_name || '-'}</TableCell>
                    <TableCell align="center">{dayjs(visit.created_at).format("YYYY/MM/DD hh:mm A")}</TableCell>
                    <TableCell 
                      align="center" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVisitId(visit.id);
                        setServicesDialogOpen(true);
                      }}
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'action.hover' },
                        color: 'primary.main',
                        fontWeight: 500
                      }}
                    >
                      {formatNumber(visit.total_services_amount)}
                    </TableCell>
                    <TableCell 
                      align="center" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVisitId(visit.id);
                        setLabDialogOpen(true);
                      }}
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'action.hover' },
                        color: 'primary.main',
                        fontWeight: 500
                      }}
                    >
                      {formatNumber(visit.total_lab_value_will_pay)}
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'green' }}>{formatNumber(visit.total_services_paid)}</TableCell>
                    <TableCell align="center" sx={{ color: 'green' }}>{formatNumber(visit.lab_paid)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: visit.balance_due > 0 ? 'error.main' : 'success.main' }}>{formatNumber(visit.balance_due)}</TableCell>
                  </TableRow>
                ))}
                {/* Sum Row */}
                {visits.length > 0 && (
                  <TableRow sx={{ backgroundColor: 'action.selected', '& td': { fontWeight: 700, borderTop: 2, borderColor: 'divider' } }}>
                    <TableCell align="center" colSpan={6}>
                      <Typography variant="body2" fontWeight={700}>المجموع</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{formatNumber(totals.total_services_amount)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{formatNumber(totals.total_lab_value_will_pay)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'green' }}>{formatNumber(totals.total_services_paid)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'green' }}>{formatNumber(totals.lab_paid)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: totals.balance_due > 0 ? 'error.main' : 'success.main' }}>{formatNumber(totals.balance_due)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
          >
            السابق
          </Button>
          <Typography variant="body2" color="text.secondary">
            صفحة {meta.current_page} من {meta.last_page}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={currentPage === meta.last_page || isFetching}
          >
            التالي
          </Button>
        </Box>
      )}

      {selectedVisitForServices && (
        <ViewVisitServicesDialog
          isOpen={!!selectedVisitForServices}
          onOpenChange={() => setSelectedVisitForServices(null)}
          visit={selectedVisitForServices}
        />
      )}

      {/* Services Dialog */}
      {selectedVisitId && (
        <ServicesDialog
          isOpen={servicesDialogOpen}
          onOpenChange={(open) => {
            setServicesDialogOpen(open);
            if (!open) setSelectedVisitId(null);
          }}
          visitId={selectedVisitId}
        />
      )}

      {/* Lab Requests Dialog */}
      {selectedVisitId && (
        <LabRequestsDialog
          isOpen={labDialogOpen}
          onOpenChange={(open) => {
            setLabDialogOpen(open);
            if (!open) setSelectedVisitId(null);
          }}
          visitId={selectedVisitId}
        />
      )}
    </Box>
  );
};

export default TodaysPatientsPage;
