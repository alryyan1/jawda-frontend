// src/pages/reports/DoctorShiftsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

// MUI imports for Autocomplete
import { createTheme, ThemeProvider } from "@mui/material";
import { useTheme } from "next-themes";

import { Loader2, Download, FileSpreadsheet } from "lucide-react";

// Import the new components
import DoctorShiftsReportFilters from "@/components/reports/DoctorShiftsReportFilters";
import DoctorShiftsReportTable from "@/components/reports/DoctorShiftsReportTable";
import DoctorShiftsReportPagination from "@/components/reports/DoctorShiftsReportPagination";

import type {
  DoctorShiftReportItem,
} from "@/types/reports";
import type { Doctor } from "@/types/doctors";
import type { Shift as GeneralShiftType } from "@/types/shifts";
import type { PaginatedResponse } from "@/types/common";
import {
  getDoctorShiftsReport,
  downloadDoctorShiftsReportPdf,
  downloadDoctorShiftsReportExcel,
} from "@/services/reportService";
import { getDoctorsList } from "@/services/doctorService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
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


const DoctorShiftsReportPage: React.FC = () => {
  // translations removed; using direct Arabic strings
  const { user: currentUser } = useAuth();
  const { can } = useAuthorization();
  const { theme } = useTheme();

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

  const defaultDateFrom = format(new Date(), "yyyy-MM-dd");
  const defaultDateTo = format(new Date(), "yyyy-MM-dd");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filters, setFilters] = useState<Filters>({
    userIdOpened: canViewAllUsersShifts
      ? "all"
      : currentUser?.id?.toString() || "all",
    doctorId: "all",
    generalShiftId: "all",
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
    searchDoctorName: "",
    status: "all",
  });
  const [debouncedSearchDoctorName, setDebouncedSearchDoctorName] =
    useState("");


  const [isGeneratingListPdf, setIsGeneratingListPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
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
    setCurrentPage(1);
  }, [filters, debouncedSearchDoctorName, rowsPerPage]);

  useEffect(() => {
    if (
      !canViewAllUsersShifts &&
      filters.userIdOpened === "all" &&
      currentUser?.id
    ) {
      setFilters((f) => ({ ...f, userIdOpened: currentUser.id.toString() }));
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
    useQuery<GeneralShiftType[], Error>({
      queryKey: ["generalShiftsListForDSRFilter"],
      queryFn: () => getShiftsList({ per_page: 100, is_closed: "" }),
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
        doctor_id: filters.doctorId === "all" ? undefined : parseInt(filters.doctorId),
        status:
          filters.status === "all"
            ? undefined
            : filters.status === "open"
            ? "1"
            : "0",
        shift_id:
          filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened:
          filters.userIdOpened === "all"
            ? undefined
            : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchDoctorName || undefined,
      }),
    placeholderData: keepPreviousData,
  });


  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
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
        doctor_id: filters.doctorId === "all" ? undefined : parseInt(filters.doctorId),
        status: filters.status === "all" ? undefined : filters.status === "open" ? "1" : "0",
        shift_id: filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened: filters.userIdOpened === "all" ? undefined : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchDoctorName || undefined,
      }),
      'تقرير مناوبات الأطباء',
      `Doctor_Shifts_Report_${filters.dateFrom}_to_${filters.dateTo}.pdf`
    ).finally(() => setIsGeneratingListPdf(false));
  };

  const handleDownloadExcel = () => {
    if (!paginatedData?.data.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    
    setIsGeneratingExcel(true);
    
    generatePdf(
      () => downloadDoctorShiftsReportExcel({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        doctor_id: filters.doctorId === "all" ? undefined : parseInt(filters.doctorId),
        status: filters.status === "all" ? undefined : filters.status === "open" ? "1" : "0",
        shift_id: filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened: filters.userIdOpened === "all" ? undefined : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchDoctorName || undefined,
      }),
      'تقرير مناوبات الأطباء Excel',
      `Doctor_Shifts_Report_${filters.dateFrom}_to_${filters.dateTo}.xlsx`
    ).finally(() => setIsGeneratingExcel(false));
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
      <Box className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6 text-base">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2">
            <UIButton
              onClick={handleDownloadListPdf}
              variant="outline"
              size="sm"
              disabled={isGeneratingListPdf || isLoading || !shifts.length}
            >
              {isGeneratingListPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ltr:ml-2 rtl:mr-2">{"تصدير PDF"}</span>
            </UIButton>
            <UIButton
              onClick={handleDownloadExcel}
              variant="outline"
              size="sm"
              disabled={isGeneratingExcel || isLoading || !shifts.length}
            >
              {isGeneratingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span className="ltr:ml-2 rtl:mr-2">{"تصدير Excel"}</span>
            </UIButton>
          </div>
          
          {/* Count Display */}
          {!isLoading && shifts.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">
                  عدد مناوبات الأطباء المعروضة: {shifts.length}
                </span>
                {meta && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    من {((currentPage - 1) * rowsPerPage) + 1} إلى {Math.min(currentPage * rowsPerPage, meta.total)}
                    {meta.total > 0 && (
                      <span className="mr-1">من أصل {meta.total}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DoctorShiftsReportFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          usersForFilter={usersForFilter}
          doctorsForFilter={doctorsForFilter}
          generalShiftsForFilter={generalShiftsForFilter}
          isLoadingUIData={isLoadingUIData}
          isFetching={isFetching}
          canViewAllUsersShifts={canViewAllUsersShifts}
        />

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
          onRowsPerPageChange={setRowsPerPage}
        />

        <DoctorShiftsReportPagination
          meta={meta}
          currentPage={currentPage}
          isFetching={isFetching}
          onPageChange={setCurrentPage}
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
