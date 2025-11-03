// src/pages/patients/TodaysPatientsPage.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  Chip,
  CircularProgress,
  Skeleton,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from "@mui/material";
import { Search as SearchIcon, CalendarMonth as CalendarIcon, Visibility as VisibilityIcon, Refresh as RefreshIcon, Clear as ClearIcon, Today as TodayIcon, DateRange as DateRangeIcon } from "@mui/icons-material";

import { getPatientVisitsSummary } from "@/services/visitService";
import type { PaginatedResponse } from "@/types/common";
import type { PatientVisitSummary } from "@/types/visits";
import { formatNumber } from "@/lib/utils";
import ViewVisitServicesDialog from "@/components/clinic/patients/ViewVisitServicesDialog";
import { useDebounce } from "@/hooks/useDebounce";

const TodaysPatientsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Simple date range with two inputs
  const todayIso = dayjs().format("YYYY-MM-DD");
  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);

  const [selectedVisitForServices, setSelectedVisitForServices] =
    useState<PatientVisitSummary | null>(null);

  // Helpers
  const setToday = useCallback(() => {
    const today = dayjs().format("YYYY-MM-DD");
    setDateFrom(today);
    setDateTo(today);
  }, []);

  const setThisMonth = useCallback(() => {
    setDateFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
    setDateTo(dayjs().endOf('month').format('YYYY-MM-DD'));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setToday();
    setCurrentPage(1);
  }, [setToday]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  const visitsQueryKey = useMemo(() => ([
    "patientVisitsSummary",
    currentPage,
    perPage,
    debouncedSearchTerm,
    dateFrom || "all",
    dateTo || "all",
  ] as const), [currentPage, perPage, debouncedSearchTerm, dateFrom, dateTo]);

  const {
    data: paginatedVisits,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<PatientVisitSummary>, Error>({
    queryKey: visitsQueryKey,
    queryFn: () => {
      const filters = {
        page: currentPage,
        per_page: perPage,
        search: debouncedSearchTerm || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
      return getPatientVisitsSummary(filters);
    },
    placeholderData: keepPreviousData,
  });

  const visits = paginatedVisits?.data || [];
  const meta = paginatedVisits?.meta;

  const handleViewServices = (visit: PatientVisitSummary) => {
    setSelectedVisitForServices(visit);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>مرضى اليوم</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr auto auto' }, gap: 1, alignItems: 'center', width: '100%' }}>
            <TextField
              fullWidth
              size="small"
              type="search"
              placeholder="ابحث بالاسم أو الهاتف"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
            />
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
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
              <Button variant="outlined" size="small" onClick={setToday} startIcon={<TodayIcon fontSize="small" />}>اليوم</Button>
              <Button variant="outlined" size="small" onClick={setThisMonth} startIcon={<DateRangeIcon fontSize="small" />}>هذا الشهر</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
              <Button variant="outlined" size="small" onClick={clearFilters} startIcon={<ClearIcon fontSize="small" />}>مسح</Button>
              <Button variant="contained" size="small" onClick={() => window.location.reload()} startIcon={<RefreshIcon fontSize="small" />}>تحديث</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {isFetching && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center', py: 1 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} /> جاري تحديث القائمة...
        </Typography>
      )}

      {isLoading && !isFetching && visits.length === 0 ? (
        <Card>
          <CardContent>
            {[...Array(6)].map((_, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px 180px 100px 100px 100px 100px 120px 120px', gap: 2, alignItems: 'center', py: 1 }}>
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="rectangular" height={28} />
                <Skeleton variant="rectangular" height={28} />
              </Box>
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Typography color="error" sx={{ p: 2, textAlign: 'center' }}>
          فشل جلب المرضى: {error.message}
        </Typography>
      ) : visits.length === 0 ? (
        <Card sx={{ textAlign: 'center' }}>
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
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: 80 }}>رقم الزيارة</TableCell>
                  <TableCell align="center">اسم المريض</TableCell>
                  <TableCell align="center">الطبيب</TableCell>
                  <TableCell align="center">التاريخ</TableCell>
                  <TableCell align="center">الإجمالي</TableCell>
                  <TableCell align="center">الخصم</TableCell>
                  <TableCell align="center">المدفوع</TableCell>
                  <TableCell align="center">المتبقي</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id} hover>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>{visit.id}</TableCell>
                    <TableCell align="center">
                      {visit.patient.name}
                    </TableCell>
                    <TableCell align="center">{visit.doctor?.name || 'غير معين'}</TableCell>
                    <TableCell align="center">{dayjs((visit as unknown as { created_at?: string }).created_at).format("DD/MM/YYYY HH:mm")}</TableCell>
                    <TableCell align="center">{formatNumber(visit.total_amount)}</TableCell>
                    <TableCell align="center" sx={{ color: 'orange' }}>{formatNumber(visit.total_discount)}</TableCell>
                    <TableCell align="center" sx={{ color: 'green' }}>{formatNumber(visit.total_paid)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: visit.balance_due > 0 ? 'error.main' : 'success.main' }}>{formatNumber(visit.balance_due)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={visit.status}
                        color={visit.status === 'completed' ? 'success' : visit.status === 'cancelled' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button variant="outlined" size="small" onClick={() => handleViewServices(visit)} startIcon={<VisibilityIcon fontSize="small" />}>عرض الخدمات</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {meta && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="per-page-label">عدد الصفوف</InputLabel>
            <Select
              labelId="per-page-label"
              label="عدد الصفوف"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {[10, 15, 25, 50].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 'auto' }}>
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
              onClick={() => setCurrentPage((p) => Math.min(meta.last_page || currentPage, p + 1))}
              disabled={(meta.last_page ? currentPage === meta.last_page : false) || isFetching}
            >
              التالي
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {meta.total !== undefined ? `إجمالي النتائج: ${meta.total}` : ''}
          </Typography>
        </Box>
      )}

      {selectedVisitForServices && (
        <ViewVisitServicesDialog
          isOpen={!!selectedVisitForServices}
          onOpenChange={() => setSelectedVisitForServices(null)}
          visit={selectedVisitForServices}
        />
      )}
    </Box>
  );
};

export default TodaysPatientsPage;
