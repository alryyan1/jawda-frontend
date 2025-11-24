// src/pages/reports/SpecialistShiftsReportPage.tsx
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
import SpecialistShiftsReportFilters from "@/components/reports/SpecialistShiftsReportFilters";
import SpecialistShiftsReportTable from "@/components/reports/SpecialistShiftsReportTable";
import SpecialistShiftsReportPagination from "@/components/reports/SpecialistShiftsReportPagination";

import type {
  DoctorShiftReportItem,
  SpecialistShiftReportItem,
} from "@/types/reports";
import type { Specialist } from "@/types/doctors";
import type { Shift as GeneralShiftType } from "@/types/shifts";
import type { PaginatedResponse } from "@/types/common";
import {
  getDoctorShiftsReport,
  downloadSpecialistShiftsReportPdf,
  downloadSpecialistShiftsReportExcel,
} from "@/services/reportService";
import { getSpecialistsList } from "@/services/doctorService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";

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
  specialistId: string;
  generalShiftId: string;
  dateFrom: string;
  dateTo: string;
  searchSpecialistName: string;
  status: "all" | "open" | "closed";
}

const SpecialistShiftsReportPage: React.FC = () => {
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
    userIdOpened: "",
    specialistId: "",
    generalShiftId: "all",
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
    searchSpecialistName: "",
    status: "all",
  });
  const [debouncedSearchSpecialistName, setDebouncedSearchSpecialistName] =
    useState("");

  const [isGeneratingListPdf, setIsGeneratingListPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isGeneratingExcelSummary, setIsGeneratingExcelSummary] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState("report.pdf");
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedSearchSpecialistName(filters.searchSpecialistName),
      500
    );
    return () => clearTimeout(handler);
  }, [filters.searchSpecialistName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearchSpecialistName, rowsPerPage]);

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
    queryKey: ["usersListForSSRFilter"],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });
  const usersForFilter = useMemo(
    () => usersForFilterResponse?.data || [],
    [usersForFilterResponse]
  );

  const { data: specialistsForFilter, isLoading: isLoadingSpecialists } = useQuery<
    Specialist[],
    Error
  >({
    queryKey: ["specialistsListForSSRFilter"],
    queryFn: () => getSpecialistsList(),
  });

  const { data: generalShiftsForFilter, isLoading: isLoadingGeneralShifts } =
    useQuery<GeneralShiftType[], Error>({
      queryKey: ["generalShiftsListForSSRFilter"],
      queryFn: () => getShiftsList({ per_page: 100, is_closed: "" }),
    });

  const reportQueryKey = [
    "specialistShiftsReport",
    currentPage,
    rowsPerPage,
    filters,
    debouncedSearchSpecialistName,
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
        doctor_id: undefined, // We'll filter by specialist instead
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
        doctor_name_search: debouncedSearchSpecialistName || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  // Group doctor shifts by specialist
  const groupedBySpecialist = useMemo(() => {
    if (!paginatedData?.data || !specialistsForFilter) {
      return [];
    }

    const shifts = paginatedData.data;
    
    // Filter by specialist if selected
    let filteredShifts = shifts;
    if (filters.specialistId && filters.specialistId !== "" && filters.specialistId !== "all") {
      const specialistId = parseInt(filters.specialistId);
      const selectedSpecialist = specialistsForFilter.find(s => s.id === specialistId);
      if (selectedSpecialist) {
        filteredShifts = shifts.filter(shift => 
          shift.doctor_specialist_name === selectedSpecialist.name
        );
      }
    }

    // Group by specialist
    const grouped = new Map<number, {
      specialist_id: number;
      specialist_name: string;
      doctors: DoctorShiftReportItem[];
    }>();

    filteredShifts.forEach(shift => {
      const specialistName = shift.doctor_specialist_name || "غير محدد";
      const specialist = specialistsForFilter.find(s => s.name === specialistName);
      const specialistId = specialist?.id || 0;

      if (!grouped.has(specialistId)) {
        grouped.set(specialistId, {
          specialist_id: specialistId,
          specialist_name: specialistName,
          doctors: [],
        });
      }

      grouped.get(specialistId)!.doctors.push(shift);
    });

    // Convert to array and calculate totals
    const result: SpecialistShiftReportItem[] = Array.from(grouped.values()).map(group => {
      const totals = group.doctors.reduce(
        (acc, shift) => ({
          total_income: acc.total_income + (shift.total_income || 0),
          clinic_enurance: acc.clinic_enurance + (shift.clinic_enurance || 0),
          cash_entitlement: acc.cash_entitlement + (shift.cash_entitlement || 0),
          insurance_entitlement: acc.insurance_entitlement + (shift.insurance_entitlement || 0),
          total_doctor_entitlement: acc.total_doctor_entitlement + (shift.total_doctor_entitlement || 0),
          shifts_count: acc.shifts_count + 1,
        }),
        {
          total_income: 0,
          clinic_enurance: 0,
          cash_entitlement: 0,
          insurance_entitlement: 0,
          total_doctor_entitlement: 0,
          shifts_count: 0,
        }
      );

      return {
        ...group,
        totals,
      };
    });

    // Sort by specialist name
    return result.sort((a, b) => a.specialist_name.localeCompare(b.specialist_name));
  }, [paginatedData?.data, specialistsForFilter, filters.specialistId]);

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
    if (!groupedBySpecialist.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    setIsGeneratingListPdf(true);
    generatePdf(
      () => downloadSpecialistShiftsReportPdf({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        specialist_id: filters.specialistId === "" || filters.specialistId === "all" ? undefined : parseInt(filters.specialistId),
        status: filters.status === "all" ? undefined : filters.status === "open" ? "1" : "0",
        shift_id: filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened: filters.userIdOpened === "all" || filters.userIdOpened === "" ? undefined : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchSpecialistName || undefined,
      }),
      'تقرير مناوبات الأطباء حسب التخصص',
      `Specialist_Shifts_Report_${filters.dateFrom}_to_${filters.dateTo}.pdf`
    ).finally(() => setIsGeneratingListPdf(false));
  };

  const handleDownloadExcel = async (includeBreakdown: boolean = true) => {
    if (!groupedBySpecialist.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    
    if (includeBreakdown) {
      setIsGeneratingExcel(true);
    } else {
      setIsGeneratingExcelSummary(true);
    }
    
    try {
      const blob = await downloadSpecialistShiftsReportExcel({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        specialist_id: filters.specialistId === "" || filters.specialistId === "all" ? undefined : parseInt(filters.specialistId),
        status: filters.status === "all" ? undefined : filters.status === "open" ? "1" : "0",
        shift_id: filters.generalShiftId === "all" ? undefined : parseInt(filters.generalShiftId),
        user_id_opened: filters.userIdOpened === "all" || filters.userIdOpened === "" ? undefined : parseInt(filters.userIdOpened),
        doctor_name_search: debouncedSearchSpecialistName || undefined,
        include_breakdown: includeBreakdown,
      });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileNameSuffix = includeBreakdown ? 'With_Breakdown' : 'Summary_Only';
      a.download = `Specialist_Shifts_Report_${fileNameSuffix}_${filters.dateFrom}_to_${filters.dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('تم تنزيل ملف Excel بنجاح');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('فشل تنزيل ملف Excel', { description: errorMessage });
    } finally {
      if (includeBreakdown) {
        setIsGeneratingExcel(false);
      } else {
        setIsGeneratingExcelSummary(false);
      }
    }
  };

  const meta = paginatedData?.meta;
  const isLoadingUIData =
    isLoadingUsers || isLoadingSpecialists || isLoadingGeneralShifts;

  if (error)
    return (
      <Typography color="error" className="p-4 text-center">
        فشل جلب البيانات: تقرير مناوبات الأطباء حسب التخصص: {error.message}
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
              disabled={isGeneratingListPdf || isLoading || !groupedBySpecialist.length}
            >
              {isGeneratingListPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ltr:ml-2 rtl:mr-2">{"تصدير PDF"}</span>
            </UIButton>
            <UIButton
              onClick={(e) => {
                e.preventDefault();
                handleDownloadExcel(true);
              }}
              variant="outline"
              size="sm"
              disabled={isGeneratingExcel || isLoading || !groupedBySpecialist.length}
            >
              {isGeneratingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span className="ltr:ml-2 rtl:mr-2">{"تصدير Excel (مع التفاصيل)"}</span>
            </UIButton>
            <UIButton
              onClick={(e) => {
                e.preventDefault();
                handleDownloadExcel(false);
              }}
              variant="outline"
              size="sm"
              disabled={isGeneratingExcelSummary || isLoading || !groupedBySpecialist.length}
            >
              {isGeneratingExcelSummary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span className="ltr:ml-2 rtl:mr-2">{"تصدير Excel (ملخص فقط)"}</span>
            </UIButton>
          </div>
          
          {/* Count Display */}
          {!isLoading && groupedBySpecialist.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">
                  عدد التخصصات المعروضة: {groupedBySpecialist.length}
                </span>
                {meta && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    من {((currentPage - 1) * rowsPerPage) + 1} إلى {Math.min(currentPage * rowsPerPage, meta.total)}
                    {meta.total > 0 && (
                      <span className="mr-1">من أصل {meta.total} مناوبة</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <SpecialistShiftsReportFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          usersForFilter={usersForFilter}
          specialistsForFilter={specialistsForFilter}
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

        <SpecialistShiftsReportTable
          specialistShifts={groupedBySpecialist}
          isLoading={isLoading}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
        />

        <SpecialistShiftsReportPagination
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

export default SpecialistShiftsReportPage;

