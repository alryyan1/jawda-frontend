// src/pages/reports/DoctorShiftsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";

// MUI imports for Autocomplete
import { createTheme, ThemeProvider } from "@mui/material";
import { useTheme } from "next-themes";

import { Loader2 } from "lucide-react";

// Import the new components
import DoctorShiftsReportHeader from "@/components/reports/DoctorShiftsReportHeader";
import DoctorShiftsReportFilters from "@/components/reports/DoctorShiftsReportFilters";
import DoctorShiftsReportTable from "@/components/reports/DoctorShiftsReportTable";
import DoctorShiftsReportPagination from "@/components/reports/DoctorShiftsReportPagination";

import type {
  DoctorShiftReportItem,
} from "@/types/reports";
import type { Doctor } from "@/types/doctors";
import type { User } from "@/types/auth";
import type { Shift as GeneralShiftType } from "@/types/shifts";
import type { PaginatedResponse } from "@/types/common";
import {
  getDoctorShiftsReport,
  downloadDoctorShiftsReportPdf,
  downloadDoctorShiftFinancialSummaryPdf,
} from "@/services/reportService";
import {
  endDoctorShift,
  updateDoctorShiftProofingFlags,
} from "@/services/doctorShiftService";
import { getDoctorsList } from "@/services/doctorService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import AddDoctorEntitlementCostDialog from "@/components/clinic/dialogs/AddDoctorEntitlementCostDialog";
import DoctorShiftFinancialReviewDialog from "@/components/clinic/dialogs/DoctorShiftFinancialReviewDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

interface Filters {
  userIdOpened: string;
  doctorId: string;
  generalShiftId: string;
  dateFrom: string;
  dateTo: string;
  searchDoctorName: string;
  status: "all" | "open" | "closed";
}

type ProofingFlagKey = keyof Pick<
  DoctorShiftReportItem,
  | "is_cash_revenue_prooved"
  | "is_cash_reclaim_prooved"
  | "is_company_revenue_prooved"
  | "is_company_reclaim_prooved"
>;

const DoctorShiftsReportPage: React.FC = () => {
  const { t } = useTranslation(["reports", "common", "clinic", "review"]);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { can } = useAuthorization();
  const { theme } = useTheme();

  // Create MUI theme that supports dark mode
  const muiTheme = useMemo(() => createTheme({
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
  const canCloseShifts = can("end doctor_shifts");
  const canRecordEntitlementCost = can("record clinic_costs");
  const canUpdateProofing = can("view doctor_shift_financial_summary");

  const defaultDateFrom = format(new Date(), "yyyy-MM-dd");
  const defaultDateTo = format(new Date(), "yyyy-MM-dd");

  const [currentPage, setCurrentPage] = useState(1);
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

  const [isFinancialSummaryDialogOpen, setIsFinancialSummaryDialogOpen] =
    useState(false);
  const [selectedShiftForSummaryDialog, setSelectedShiftForSummaryDialog] =
    useState<DoctorShiftReportItem | null>(null);

  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [selectedShiftForCostAction, setSelectedShiftForCostAction] =
    useState<DoctorShiftReportItem | null>(null);

  const [isGeneratingListPdf, setIsGeneratingListPdf] = useState(false);
  const [isGeneratingSummaryPdfId, setIsGeneratingSummaryPdfId] = useState<
    number | null
  >(null);
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
  }, [filters, debouncedSearchDoctorName]);

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
    enabled: canViewAllUsersShifts,
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
        per_page: 15,
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

  const closeShiftMutation = useMutation({
    mutationFn: (doctorShiftId: number) => endDoctorShift({ doctor_shift_id: doctorShiftId }),
    onSuccess: () => {
      toast.success(t("clinic:doctorShifts.shiftClosedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["doctorShiftsReport"] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t("clinic:doctorShifts.shiftCloseError"), { description: errorMessage });
    },
  });

  const proofingFlagsMutation = useMutation({
    mutationFn: (params: { shiftId: number; flags: Partial<Pick<DoctorShiftReportItem, ProofingFlagKey>> }) =>
      updateDoctorShiftProofingFlags(params.shiftId, params.flags),
    onSuccess: (updatedDoctorShift, variables) => {
      toast.success(t('review.proofingStatusUpdated'));
      queryClient.setQueryData(reportQueryKey, (oldData: PaginatedResponse<DoctorShiftReportItem> | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.map(ds => 
            ds.id === variables.shiftId 
            ? { ...ds, ...variables.flags }
            : ds
          ),
        };
      });
    },
    onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(t('review.proofingStatusUpdateFailed'), { description: errorMessage });
    },
  });

  const handleProofingAction = (shiftId: number, flagField: ProofingFlagKey, currentValue?: boolean) => {
    if (!canUpdateProofing) {
        toast.error(t('common:error.unauthorizedAction'));
        return;
    }
    if (proofingFlagsMutation.isPending) return;

    const flagsToUpdate: Partial<Pick<DoctorShiftReportItem, ProofingFlagKey>> = { [flagField]: !currentValue };
    proofingFlagsMutation.mutate({ shiftId, flags: flagsToUpdate });
  };

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleOpenAddCostDialog = (shift: DoctorShiftReportItem) => {
    if (!canRecordEntitlementCost) {
      toast.error(t("common:error.unauthorizedAction"));
      return;
    }
    setSelectedShiftForCostAction(shift);
    setIsAddCostDialogOpen(true);
  };

  const handleCostAddedAndProved = () => {
    setIsAddCostDialogOpen(false);
    setSelectedShiftForCostAction(null);
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
      toast.error(t("common:error.pdfGeneratedError"), { description: errorMessage });
    }
  };

  const handleDownloadListPdf = () => {
    if (!paginatedData?.data.length) {
      toast.info(t('common:error.noDataToExport'));
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
      t("reports:doctorShiftsReportTitle"),
      `Doctor_Shifts_Report_${filters.dateFrom}_to_${filters.dateTo}.pdf`
    ).finally(() => setIsGeneratingListPdf(false));
  };

  const handleDownloadSummaryPdf = async (shift: DoctorShiftReportItem) => {
    setIsGeneratingSummaryPdfId(shift.id);
    generatePdf(
      () => downloadDoctorShiftFinancialSummaryPdf(shift.id),
      t("reports:actions.printFinancialSummary"),
      `Doctor_Shift_Summary_${shift.id}.pdf`
    ).finally(() => setIsGeneratingSummaryPdfId(null));
  };

  const shifts = paginatedData?.data || [];
  const meta = paginatedData?.meta;
  const isLoadingUIData =
    isLoadingUsers || isLoadingDoctors || isLoadingGeneralShifts;

  if (error)
    return (
      <p className="text-destructive p-4 text-center">
        {t("common:error.fetchFailedExt", {
          entity: t("reports:doctorShiftsReportTitle"),
          message: error.message,
        })}
      </p>
    );

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6 text-base">
        <DoctorShiftsReportHeader
          isGeneratingListPdf={isGeneratingListPdf}
          isLoading={isLoading}
          hasData={shifts.length > 0}
          onDownloadListPdf={handleDownloadListPdf}
        />

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
          <div className="text-sm text-muted-foreground my-2 text-center py-2">
            <Loader2 className="inline h-4 w-4 animate-spin" />{" "}
            {t("common:updatingList")}
          </div>
        )}

        <DoctorShiftsReportTable
          shifts={shifts}
          isLoading={isLoading}
          isFetching={isFetching}
          isGeneratingSummaryPdfId={isGeneratingSummaryPdfId}
          closeShiftMutation={closeShiftMutation}
          proofingFlagsMutation={proofingFlagsMutation}
          canCloseShifts={canCloseShifts}
          canRecordEntitlementCost={canRecordEntitlementCost}
          canUpdateProofing={canUpdateProofing}
          onDownloadSummaryPdf={handleDownloadSummaryPdf}
          onOpenAddCostDialog={handleOpenAddCostDialog}
          onProofingAction={handleProofingAction}
        />

        <DoctorShiftsReportPagination
          meta={meta}
          currentPage={currentPage}
          isFetching={isFetching}
          onPageChange={setCurrentPage}
        />
      </div>

      {selectedShiftForSummaryDialog && (
        <DoctorShiftFinancialReviewDialog
          isOpen={isFinancialSummaryDialogOpen}
          onOpenChange={setIsFinancialSummaryDialogOpen}
        />
      )}

      {selectedShiftForCostAction && (
        <AddDoctorEntitlementCostDialog
          isOpen={isAddCostDialogOpen}
          onOpenChange={setIsAddCostDialogOpen}
          doctorShift={selectedShiftForCostAction}
          onCostAddedAndProved={handleCostAddedAndProved}
        />
      )}

      <PdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={(open) => {
          setIsPdfPreviewOpen(open);
          if (!open && pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}
        pdfUrl={pdfPreviewUrl}
        isLoading={
          isGeneratingListPdf || (!!isGeneratingSummaryPdfId && !pdfPreviewUrl)
        }
        title={pdfPreviewTitle}
        fileName={pdfPreviewFilename}
      />
    </ThemeProvider>
  );
};

export default DoctorShiftsReportPage;
