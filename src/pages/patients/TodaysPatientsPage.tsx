// src/pages/patients/TodaysPatientsPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

// MUI
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  CircularProgress,
  TableRow,
  Tooltip,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { Search as SearchIcon, CalendarMonth as CalendarIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { Microscope, Stethoscope, Bed } from "lucide-react";

import {
  getPatientVisitsSummary,
  type GetVisitsFilters,
} from "@/services/visitService";
import type { PatientVisitSummary } from "@/types/visits";
import { getDoctorsList } from "@/services/doctorService";
import type { DoctorStripped } from "@/types/doctors";
import { getCompaniesList } from "@/services/companyService";
import type { Company } from "@/types/companies";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper<PatientVisitSummary>();

const TodaysPatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const todayIso = dayjs().format("YYYY-MM-DD");
  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorStripped | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.current_page < lastPage.meta.last_page) {
        return lastPage.meta.current_page + 1;
      }
      return undefined;
    },
  });

  const visits = data?.pages.flatMap((p) => p.data) ?? [];

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

  const { data: doctorsList } = useQuery<DoctorStripped[]>({
    queryKey: ["doctors-list", { active: true }],
    queryFn: () => getDoctorsList({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: companiesList } = useQuery<Company[]>({
    queryKey: ["companies-list", { status: true }],
    queryFn: () => getCompaniesList({ status: true }),
    staleTime: 5 * 60 * 1000,
  });

  const columns = [
    columnHelper.accessor("id", {
      header: "الكود",
      cell: (info) => info.getValue(),
      meta: { align: "center", width: 80 },
    }),
    columnHelper.display({
      id: "patientName",
      header: "اسم المريض",
      cell: ({ row }) => {
        const visit = row.original;
        const name = visit.patient?.name ?? "-";
        const hasLab =
          (visit.total_lab_value_will_pay ?? 0) > 0 ||
          (visit.lab_requests?.length ?? 0) > 0;
        const hasServices =
          (visit.total_services_amount ?? 0) > 0 ||
          (visit.requested_services_count ?? 0) > 0;
        const hasAdmission = !!visit.patient?.admission;
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            <span>{name}</span>
            {hasLab && (
              <Tooltip title="طلب مختبر">
                <Box component="span" sx={{ display: "inline-flex", color: "text.secondary" }}>
                  <Microscope className="h-4 w-4" />
                </Box>
              </Tooltip>
            )}
            {hasServices && (
              <Tooltip title="سماعة طبية">
                <Box component="span" sx={{ display: "inline-flex", color: "text.secondary" }}>
                  <Stethoscope className="h-4 w-4" />
                </Box>
              </Tooltip>
            )}
            {hasAdmission && (
              <Tooltip title="منوم">
                <Box component="span" sx={{ display: "inline-flex", color: "text.secondary" }}>
                  <Bed className="h-4 w-4" />
                </Box>
              </Tooltip>
            )}
          </Box>
        );
      },
      meta: { align: "center" },
    }),
    columnHelper.accessor((r) => r.patient.user?.username || r.patient.user?.name || "-", {
      id: "userName",
      header: "اسم المستخدم",
      cell: (info) => info.getValue(),
      meta: { align: "center" },
    }),
    columnHelper.accessor((r) => r.patient.company?.name || "-", {
      id: "company",
      header: "الشركه",
      cell: (info) => info.getValue(),
      meta: { align: "center" },
    }),
    columnHelper.accessor((r) => r.doctor_name || r.doctor_shift_details?.doctor_name || "-", {
      id: "doctor",
      header: "الطبيب",
      cell: (info) => info.getValue(),
      meta: { align: "center" },
    }),
    columnHelper.accessor("created_at", {
      header: "التاريخ",
      cell: (info) => dayjs(info.getValue()).format("YYYY/MM/DD hh:mm A"),
      meta: { align: "center" },
    }),
    columnHelper.display({
      id: "actions",
      header: "إجراءات",
      cell: ({ row }) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon fontSize="small" />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/patients/visit/${row.original.id}`);
          }}
        >
          عرض
        </Button>
      ),
      meta: { align: "center" },
    }),
  ] as ColumnDef<PatientVisitSummary>[];

  const table = useReactTable({
    data: visits,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ py: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          pb: 1,
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, width: { xs: "100%", sm: "auto" } }}>
          <Box sx={{ position: "relative", flexGrow: 1 }}>
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
          <Box sx={{ minWidth: 220 }}>
            <Autocomplete
              size="small"
              options={doctorsList || []}
              getOptionLabel={(option) => option.name}
              value={selectedDoctor}
              onChange={(_, value) => setSelectedDoctor(value)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="الطبيب" placeholder="اختر الطبيب" />
              )}
            />
          </Box>
          <Box sx={{ minWidth: 220 }}>
            <Autocomplete
              size="small"
              options={companiesList || []}
              getOptionLabel={(option) => option.name}
              value={selectedCompany}
              onChange={(_, value) => setSelectedCompany(value)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="الشركة" placeholder="اختر الشركة" />
              )}
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

      {isFetching && !isFetchingNextPage && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: "center", py: 1 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} /> جاري تحديث القائمة...
        </Typography>
      )}

      {isLoading && visits.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ p: 2, textAlign: "center" }}>
          فشل جلب المرضى: {(error as Error).message}
        </Typography>
      ) : visits.length === 0 ? (
        <Card sx={{ textAlign: "center" }} className="pb-1 mb-1">
          <Box sx={{ p: 3 }}>
            <CalendarIcon sx={{ mx: "auto", display: "block", mb: 1, opacity: 0.3 }} />
            <Typography color="text.secondary">
              {searchTerm || dateFrom !== todayIso || dateTo !== todayIso
                ? "لا توجد نتائج"
                : "لا توجد زيارات اليوم"}
            </Typography>
          </Box>
        </Card>
      ) : (
        <Card>
          <Box
            ref={scrollContainerRef}
            sx={{ maxHeight: `${windowHeight - 100}px`, overflow: "auto" }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "#fff" }}>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        style={{
                          textAlign: "center",
                          padding: "8px 6px",
                          borderBottom: "2px solid",
                          borderColor: "divider",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          backgroundColor: "inherit",
                        }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => navigate(`/patients/visit/${row.original.id}`)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          textAlign: "center",
                          padding: "6px 8px",
                          fontSize: "0.875rem",
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </TableRow>
                ))}
              </tbody>
            </table>
            <div ref={loadMoreRef} style={{ height: 20, display: "flex", justifyContent: "center", padding: 8 }}>
              {isFetchingNextPage && <CircularProgress size={20} />}
            </div>
          </Box>
        </Card>
      )}

    </Box>
  );
};

export default TodaysPatientsPage;
