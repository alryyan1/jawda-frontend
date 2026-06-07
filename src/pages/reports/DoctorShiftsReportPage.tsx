// src/pages/reports/DoctorShiftsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { arSA } from "date-fns/locale";
import { toast } from "sonner";

// MUI imports for Autocomplete
import { createTheme, ThemeProvider } from "@mui/material";
import { useTheme } from "next-themes";

import { Loader2, Download, FileSpreadsheet, Users, Calculator, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Import the new components
import DoctorShiftsReportTable from "@/components/reports/DoctorShiftsReportTable";
import DoctorShiftsReportPagination from "@/components/reports/DoctorShiftsReportPagination";

import type {
  DoctorShiftReportItem,
} from "@/types/reports";
import type { Doctor } from "@/types/doctors";
import type { PaginatedResponse } from "@/types/common";
import {
  getDoctorShiftsReport,
  downloadDoctorShiftsReportPdf,
  downloadDoctorShiftsReportExcel,
  computeDoctorShiftSnapshotBatch,
} from "@/services/reportService";
import { getDoctorsList } from "@/services/doctorService";
import { getUsers } from "@/services/userService";
import { getAllShifts } from "@/services/shiftService";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
// Removed PdfPreviewDialog; using MUI Dialog instead

// MUI components for inline UI and PDF dialog
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Menu,
  MenuItem as MuiMenuItem,
  Popover,
  ListItemIcon,
  ListItemText,
  Badge,
  IconButton,
} from "@mui/material";
import { Button as UIButton } from "@/components/ui/button";

interface Filters {
  userIdOpened: string;
  doctorId: string;
  generalShiftId: string;
  dateFrom: string;
  dateTo: string;
  searchDoctorName: string;
  status: "all" | "open" | "closed";
}

interface AutocompleteOption {
  id: string;
  name: string;
}


const DoctorShiftsReportPage: React.FC = () => {
  // translations removed; using direct Arabic strings
  const { user: currentUser } = useAuth();
  const { can } = useAuthorization();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Create MUI theme that supports dark mode
  const muiTheme = useMemo(() => createTheme({
    typography: {
      fontFamily: "'Tajawal', 'Cairo', sans-serif",
    },
    palette: {
      mode: theme === 'dark' ? 'dark' : 'light',
      primary: {
        main: theme === 'dark' ? '#3b82f6' : '#2563eb',
      },
      background: {
        default: theme === 'dark' ? '#0f0f23' : '#ffffff',
        paper: theme === 'dark' ? '#1a1a2e' : '#ffffff',
      },
      text: {
        primary: theme === 'dark' ? '#e5e7eb' : '#1f2937',
        secondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
      },
    },
    components: {
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              height: '40px',
              fontSize: '16px',
            },
            '& .MuiInputLabel-root': {
              fontSize: '14px',
            },
          },
        },
      },
    },
  }), [theme]);

  const canViewAllUsersShifts = can("list all_doctor_shifts");
  const dateLocale = arSA;

  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo   = format(endOfMonth(new Date()),   "yyyy-MM-dd");

  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get("perPage")) || 50);
  const [filters, setFilters] = useState<Filters>({
    userIdOpened:    searchParams.get("userIdOpened")    ?? "",
    doctorId:        searchParams.get("doctorId")        ?? "all",
    generalShiftId:  searchParams.get("generalShiftId")  ?? "all",
    dateFrom:        searchParams.get("dateFrom")        ?? defaultDateFrom,
    dateTo:          searchParams.get("dateTo")          ?? defaultDateTo,
    searchDoctorName:searchParams.get("searchDoctorName")?? "",
    status:         (searchParams.get("status")          ?? "all") as Filters["status"],
  });
  const [debouncedSearchDoctorName, setDebouncedSearchDoctorName] =
    useState(searchParams.get("searchDoctorName") ?? "");

  const buildUrlParams = (f: Filters, page: number, perPage: number): Record<string, string> => {
    const params: Record<string, string> = { dateFrom: f.dateFrom, dateTo: f.dateTo };
    if (f.userIdOpened && f.userIdOpened !== "")         params.userIdOpened     = f.userIdOpened;
    if (f.doctorId     && f.doctorId !== "all")          params.doctorId         = f.doctorId;
    if (f.generalShiftId && f.generalShiftId !== "all")  params.generalShiftId   = f.generalShiftId;
    if (f.searchDoctorName)                              params.searchDoctorName  = f.searchDoctorName;
    if (f.status !== "all")                              params.status            = f.status;
    if (page !== 1)                                      params.page              = String(page);
    if (perPage !== 50)                                  params.perPage           = String(perPage);
    return params;
  };


  const queryClient = useQueryClient();
  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<number>>(new Set());

  const computeMutation = useMutation({
    mutationFn: (ids: number[]) => computeDoctorShiftSnapshotBatch(ids),
    onSuccess: (result) => {
      toast.success(`تم حساب ${result.processed} وردية`);
      if (result.errors.length) toast.warning(`فشل ${result.errors.length} وردية`);
      setSelectMode(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["doctorShiftsReport"] });
    },
    onError: () => toast.error("فشل في الحساب"),
  });

  const [isGeneratingListPdf, setIsGeneratingListPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [exportAnchor,  setExportAnchor]  = useState<null | HTMLElement>(null);
  const [searchAnchor,  setSearchAnchor]  = useState<null | HTMLElement>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState("report.pdf");
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedSearchDoctorName(filters.searchDoctorName),
      500
    );
    return () => clearTimeout(handler);
  }, [filters.searchDoctorName]);

  useEffect(() => {
    if (
      !canViewAllUsersShifts &&
      filters.userIdOpened === "all" &&
      currentUser?.id
    ) {
      const newFilters = { ...filters, userIdOpened: currentUser.id.toString() };
      setFilters(newFilters);
      setSearchParams(buildUrlParams(newFilters, 1, rowsPerPage), { replace: true });
      setCurrentPage(1);
    }
  }, [canViewAllUsersShifts, currentUser, filters.userIdOpened]);

  const { data: usersForFilterResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["usersListForDSRFilter"],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });
  const usersForFilter = useMemo(
    () => usersForFilterResponse?.data || [],
    [usersForFilterResponse]
  );

  const { data: doctorsForFilter, isLoading: isLoadingDoctors } = useQuery<
    Doctor[],
    Error
  >({
    queryKey: ["doctorsListForDSRFilter"],
    queryFn: () => getDoctorsList().then((res) => res as Doctor[]),
  });

  const { data: generalShiftsForFilter, isLoading: isLoadingGeneralShifts } =
    useQuery({
      queryKey: ["generalShiftsListForDSRFilter"],
      queryFn: () => getAllShifts(),
    });

  const reportQueryKey = [
    "doctorShiftsReport",
    currentPage,
    rowsPerPage,
    filters,
    debouncedSearchDoctorName,
  ] as const;

  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<DoctorShiftReportItem>, Error>({
    queryKey: reportQueryKey,
    queryFn: () =>
      getDoctorShiftsReport({
        page: currentPage,
        per_page: rowsPerPage,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        doctor_id: filters.doctorId === "all" || filters.doctorId === "" ? undefined : parseInt(filters.doctorId),
        status:
          filters.status === "all"
            ? undefined
            : filters.status === "open"
            ? "1"
            : "0",
        shift_id:
          filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened:
          filters.userIdOpened === "all" || filters.userIdOpened === ""
            ? undefined
            : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchDoctorName || undefined,
        include_financials: true, // Request financial data for reports
      }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });


  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [filterName]: value };
      setSearchParams(buildUrlParams(newFilters, 1, rowsPerPage), { replace: true });
      return newFilters;
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSearchParams(buildUrlParams(filters, page, rowsPerPage), { replace: true });
  };

  const handleRowsPerPageChange = (perPage: number) => {
    setRowsPerPage(perPage);
    setCurrentPage(1);
    setSearchParams(buildUrlParams(filters, 1, perPage), { replace: true });
  };


  const generatePdf = async (
    fetchFn: () => Promise<Blob>,
    title: string,
    baseFilename: string
  ) => {
    try {
      const blob = await fetchFn();
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl(objectUrl);
      setPdfPreviewFilename(baseFilename);
      setPdfPreviewTitle(title);
      setIsPdfPreviewOpen(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
    }
  };

  const handleDownloadListPdf = () => {
    if (!paginatedData?.data.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    setIsGeneratingListPdf(true);
    generatePdf(
      () => downloadDoctorShiftsReportPdf({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        doctor_id: filters.doctorId === "all" || filters.doctorId === "" ? undefined : parseInt(filters.doctorId),
        status: filters.status === "all" ? undefined : filters.status === "open" ? "1" : "0",
        shift_id: filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened: filters.userIdOpened === "all" || filters.userIdOpened === "" ? undefined : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchDoctorName || undefined,
      }),
      'تقرير مناوبات الأطباء',
      `Doctor_Shifts_Report_${filters.dateFrom}_to_${filters.dateTo}.pdf`
    ).finally(() => setIsGeneratingListPdf(false));
  };

  const handleDownloadExcel = async () => {
    if (!paginatedData?.data.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    
    setIsGeneratingExcel(true);
    
    try {
      const blob = await downloadDoctorShiftsReportExcel({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        doctor_id: filters.doctorId === "all" || filters.doctorId === "" ? undefined : parseInt(filters.doctorId),
        status: filters.status === "all" ? undefined : filters.status === "open" ? "1" : "0",
        shift_id: filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened: filters.userIdOpened === "all" || filters.userIdOpened === "" ? undefined : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchDoctorName || undefined,
      });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Doctor_Shifts_Report_${filters.dateFrom}_to_${filters.dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('تم تنزيل ملف Excel بنجاح');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('فشل تنزيل ملف Excel', { description: errorMessage });
    } finally {
      setIsGeneratingExcel(false);
    }
  };


  const shifts = paginatedData?.data || [];
  const meta = paginatedData?.meta;
  const isLoadingUIData =
    isLoadingUsers || isLoadingDoctors || isLoadingGeneralShifts;

  if (error)
    return (
      <Typography color="error" className="p-4 text-center">
        فشل جلب البيانات: تقرير مناوبات الأطباء: {error.message}
      </Typography>
    );

  const handleClosePdfDialog = (open: boolean) => {
    setIsPdfPreviewOpen(open);
    if (!open && pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleDownloadFromDialog = () => {
    if (!pdfPreviewUrl) return;
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = pdfPreviewFilename || 'report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box className="container mx-auto py-1 sm:py-1 lg:py-1 space-y-1 text-base">
        <div className="flex items-center gap-2 flex-wrap mb-2">

          {/* ── Date From ── */}
          <TextField
            type="date" label="من تاريخ" value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            size="small" disabled={isFetching} InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {/* ── Date To ── */}
          <TextField
            type="date" label="إلى تاريخ" value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            size="small" disabled={isFetching} InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {/* ── General Shift ── */}
          <Autocomplete<AutocompleteOption>
            id="dsr-gshift-filter"
            options={[
              { id: "all", name: "كل المناوبات" },
              ...(generalShiftsForFilter?.map((s) => ({
                id: s.id.toString(),
                name: s.name || `#${s.id} (${format(parseISO(s.created_at), "PP", { locale: dateLocale })})`,
              })) || []),
            ]}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={(() => {
              if (filters.generalShiftId === "all") return { id: "all", name: "كل المناوبات" };
              const s = generalShiftsForFilter?.find((s) => s.id.toString() === filters.generalShiftId);
              return s ? { id: s.id.toString(), name: s.name || `#${s.id}` } : null;
            })()}
            onChange={(_, v) => handleFilterChange("generalShiftId", v?.id || "all")}
            disabled={isLoadingUIData || isFetching}
            sx={{ width: 200 }}
            renderInput={(p) => <TextField {...p} size="small" label="المناوبة العامة" />}
          />

          {/* ── Search popup (doctor + user) ── */}
          <IconButton
            size="small"
            onClick={(e) => setSearchAnchor(e.currentTarget)}
            sx={{
              border: "1px solid",
              borderColor: (filters.doctorId !== "all" && filters.doctorId !== "") || (filters.userIdOpened !== "" && filters.userIdOpened !== "all")
                ? "primary.main" : "divider",
              borderRadius: 1,
              px: 1.5, py: 0.75,
              gap: 0.5,
              fontSize: 13,
              color: "text.primary",
            }}
          >
            <Badge
              color="primary"
              variant="dot"
              invisible={!(filters.doctorId !== "all" && filters.doctorId !== "") && !(filters.userIdOpened !== "" && filters.userIdOpened !== "all")}
            >
              <Users size={16} />
            </Badge>
            <span style={{ marginRight: 4 }}>فلتره</span>
          </IconButton>

          <Popover
            open={Boolean(searchAnchor)}
            anchorEl={searchAnchor}
            onClose={() => setSearchAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, width: 260 }}>
              <Autocomplete<AutocompleteOption>
                id="dsr-user-filter"
                options={[
                  ...(canViewAllUsersShifts ? [{ id: "all", name: "كل المستخدمين" }] : []),
                  ...usersForFilter.map((u) => ({ id: u.id.toString(), name: u.name })),
                ]}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={(() => {
                  if (!filters.userIdOpened || filters.userIdOpened === "") return null;
                  if (filters.userIdOpened === "all") return canViewAllUsersShifts ? { id: "all", name: "كل المستخدمين" } : null;
                  const u = usersForFilter.find((u) => u.id.toString() === filters.userIdOpened);
                  return u ? { id: u.id.toString(), name: u.name } : null;
                })()}
                onChange={(_, v) => handleFilterChange("userIdOpened", v?.id || "")}
                disabled={isLoadingUIData || isFetching}
                renderInput={(p) => <TextField {...p} size="small" label="المستخدم الذي فتح" />}
              />
              <Autocomplete<AutocompleteOption>
                id="dsr-doctor-filter"
                options={[
                  { id: "all", name: "كل الأطباء" },
                  ...(doctorsForFilter?.map((doc) => ({ id: doc.id.toString(), name: doc.name })) || []),
                ]}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={(() => {
                  if (!filters.doctorId || filters.doctorId === "all") return null;
                  const d = doctorsForFilter?.find((d) => d.id.toString() === filters.doctorId);
                  return d ? { id: d.id.toString(), name: d.name } : null;
                })()}
                onChange={(_, v) => handleFilterChange("doctorId", v?.id || "")}
                disabled={isLoadingUIData || isFetching}
                renderInput={(p) => <TextField {...p} size="small" label="الطبيب" />}
              />
            </Box>
          </Popover>

          {/* ── Export dropdown ── */}
          <IconButton
            size="small"
            disabled={!shifts.length}
            onClick={(e) => setExportAnchor(e.currentTarget)}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, px: 1.5, py: 0.75, gap: 0.5, fontSize: 13, color: "text.primary" }}
          >
            <Download size={16} />
            <span style={{ marginRight: 4 }}>تصدير</span>
          </IconButton>

          <Menu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <MuiMenuItem
              disabled={isGeneratingListPdf || isLoading}
              onClick={() => { setExportAnchor(null); handleDownloadListPdf(); }}
            >
              <ListItemIcon>{isGeneratingListPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={16} />}</ListItemIcon>
              <ListItemText>تصدير PDF</ListItemText>
            </MuiMenuItem>
            <MuiMenuItem
              disabled={isGeneratingExcel || isLoading}
              onClick={() => { setExportAnchor(null); handleDownloadExcel(); }}
            >
              <ListItemIcon>{isGeneratingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet size={16} />}</ListItemIcon>
              <ListItemText>تصدير Excel</ListItemText>
            </MuiMenuItem>
          </Menu>

          {/* ── Calculate / select mode ── */}
          {selectMode ? (
            <>
              <UIButton size="sm" variant="default"
                disabled={selectedIds.size === 0 || computeMutation.isPending}
                onClick={() => computeMutation.mutate([...selectedIds])}
              >
                {computeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                <span className="ltr:ml-2 rtl:mr-2">احسب المحدد {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
              </UIButton>
              <UIButton size="sm" variant="outline" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                <X className="h-4 w-4" /><span className="ltr:ml-2 rtl:mr-2">إلغاء</span>
              </UIButton>
            </>
          ) : (
            <UIButton size="sm" variant="outline" disabled={!shifts.length} onClick={() => setSelectMode(true)}>
              <Calculator className="h-4 w-4" /><span className="ltr:ml-2 rtl:mr-2"> احتساب التفاصيل الماليه للورديات</span>
            </UIButton>
          )}

          {/* ── Specialist shifts ── */}
          <UIButton onClick={() => navigate("/reports/specialist-shifts")} variant="default" size="sm">
            <Users className="h-4 w-4" /><span className="ltr:ml-2 rtl:mr-2">عرض حسب التخصص</span>
          </UIButton>

        </div>

        {isFetching && !isLoading && (
          <Typography variant="body2" color="text.secondary" className="my-2 text-center py-2">
            <Loader2 className="inline h-4 w-4 animate-spin" />{" "}
            جاري تحديث القائمة...
          </Typography>
        )}

        <DoctorShiftsReportTable
          shifts={shifts}
          isLoading={isLoading}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          selectable={selectMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        <DoctorShiftsReportPagination
          meta={meta}
          currentPage={currentPage}
          isFetching={isFetching}
          onPageChange={handlePageChange}
        />
      </Box>

      {/* PDF Preview Dialog using MUI */}
      <Dialog
        open={isPdfPreviewOpen}
        onClose={() => handleClosePdfDialog(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{pdfPreviewTitle || 'معاينة الملف'}</DialogTitle>
        <DialogContent dividers>
          {(!pdfPreviewUrl || isGeneratingListPdf) ? (
            <Box className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </Box>
          ) : (
            <Box className="h-[70vh]">
              <iframe
                title="pdf-preview"
                src={pdfPreviewUrl || ''}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadFromDialog} variant="outlined">تنزيل</Button>
          <Button onClick={() => handleClosePdfDialog(false)} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>

    </ThemeProvider>
  );
};

export default DoctorShiftsReportPage;
