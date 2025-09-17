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
  CardHeader,
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
  CircularProgress
} from "@mui/material";
import { Search as SearchIcon, CalendarMonth as CalendarIcon, Visibility as VisibilityIcon } from "@mui/icons-material";

import {
  getPatientVisitsSummary,
  GetVisitsFilters,
} from "@/services/visitService";
import type { PaginatedResponse } from "@/types/common";
import type { PatientVisitSummary } from "@/types/visits";
import { formatNumber } from "@/lib/utils";
import ViewVisitServicesDialog from "@/components/clinic/patients/ViewVisitServicesDialog";

const TodaysPatientsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Simple date range with two inputs
  const todayIso = dayjs().format("YYYY-MM-DD");
  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);

  const [selectedVisitForServices, setSelectedVisitForServices] =
    useState<PatientVisitSummary | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  const visitsQueryKey = [
    "patientVisitsSummary",
    currentPage,
    debouncedSearchTerm,
    dateFrom || "all",
    dateTo || "all",
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
        per_page: 15,
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
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
                      {visit.patient.company?.name && (
                        <Chip label={visit.patient.company.name} size="small" variant="outlined" color="primary" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell align="center">{visit.doctor?.name || 'غير معين'}</TableCell>
                    <TableCell align="center">{dayjs(visit.created_at).format("DD/MM/YYYY HH:mm")}</TableCell>
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
    </Box>
  );
};

export default TodaysPatientsPage;
