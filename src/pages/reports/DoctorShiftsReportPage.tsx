// src/pages/reports/DoctorShiftsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  FileBarChart2,
  MoreHorizontal,
  Download,
  Eye,
  XCircle,
  CheckCircle,
  ShieldQuestion,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

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
import { formatNumber } from "@/lib/utils";
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
  const { t, i18n } = useTranslation(["reports", "common", "clinic", "review"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { can } = useAuthorization();

  const canViewAllUsersShifts = can("list all_doctor_shifts");
  const canCloseShifts = can("end doctor_shifts");
  const canRecordEntitlementCost = can("record clinic_costs");
  const canUpdateProofing = can("view doctor_shift_financial_summary");
  const canViewFinancialSummary = can("view doctor_shift_financial_summary");

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

  const { data: usersForFilterResponse, isLoading: isLoadingUsers } = useQuery<
    PaginatedResponse<User>,
    Error
  >({
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

  // Removed unused financial summary query for now

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

  // Proofing functionality temporarily removed
// --- Mutation for Updating Proofing Flags ---
const proofingFlagsMutation = useMutation({
  mutationFn: (params: { shiftId: number; flags: Partial<Pick<DoctorShiftReportItem, ProofingFlagKey>> }) =>
    updateDoctorShiftProofingFlags(params.shiftId, params.flags),
  onSuccess: (updatedDoctorShift, variables) => {
    toast.success(t('review.proofingStatusUpdated'));
    // Optimistically update the specific shift in the cache or invalidate the whole list
    queryClient.setQueryData(reportQueryKey, (oldData: PaginatedResponse<DoctorShiftReportItem> | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: oldData.data.map(ds => 
          ds.id === variables.shiftId 
          ? { ...ds, ...variables.flags } // Merge the updated flags
          : ds
        ),
      };
    });
    // Or, simpler: queryClient.invalidateQueries({ queryKey: reportQueryKey });
  },
  onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('review.proofingStatusUpdateFailed'), { description: errorMessage });
  },
});

// --- Handler for Toggling a Proofing Flag ---
const handleProofingAction = (shiftId: number, flagField: ProofingFlagKey, currentValue?: boolean) => {
  if (!canUpdateProofing) {
      toast.error(t('common:error.unauthorizedAction'));
      return;
  }
  if (proofingFlagsMutation.isPending) return; // Prevent multiple rapid clicks

  const flagsToUpdate: Partial<Pick<DoctorShiftReportItem, ProofingFlagKey>> = { [flagField]: !currentValue };
  
  // Optional: Confirmation dialog for un-proving
  // if (currentValue === true) { // If trying to un-prove
  //   if (!window.confirm(t('review.confirmUnprove', { flagName: t(`review.flagNames.${flagField}`) }))) {
  //     return;
  //   }
  // }
  
  proofingFlagsMutation.mutate({ shiftId, flags: flagsToUpdate });
};

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleViewSummary = (shift: DoctorShiftReportItem) => {
    if (!canViewFinancialSummary) {
      toast.error(t("common:error.unauthorizedAction"));
      return;
    }
    setSelectedShiftForSummaryDialog(shift);
    setIsFinancialSummaryDialogOpen(true);
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

  if (isLoading && !isFetching && shifts.length === 0 && currentPage === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
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
    <>
      <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7 text-primary" />{" "}
            {t("reports:doctorShiftsReportTitle")}
          </h1>
          <Button
            onClick={handleDownloadListPdf}
            variant="outline"
            size="sm"
            disabled={isGeneratingListPdf || isLoading || shifts.length === 0}
          >
            {isGeneratingListPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ltr:ml-2 rtl:mr-2">{t("common:exportToPdf")}</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("reports:filters.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
              {/* User Opened By Filter */}
              {canViewAllUsersShifts && (
                <div className="min-w-[150px]">
                  <Label htmlFor="dsr-user-filter" className="text-xs">
                    {t("reports:filters.userOpened")}
                  </Label>
                  <Select
                    value={filters.userIdOpened}
                    onValueChange={(val) =>
                      handleFilterChange("userIdOpened", val)
                    }
                    dir={i18n.dir()}
                    disabled={isLoadingUIData || isFetching}
                  >
                    <SelectTrigger id="dsr-user-filter" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("reports:filters.allUsers")}
                      </SelectItem>
                      {usersForFilter?.map((u: User) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Doctor Filter */}
              <div className="min-w-[150px]">
                <Label htmlFor="dsr-doctor-filter" className="text-xs">
                  {t("reports:filters.doctor")}
                </Label>
                <Select
                  value={filters.doctorId}
                  onValueChange={(val) => handleFilterChange("doctorId", val)}
                  dir={i18n.dir()}
                  disabled={isLoadingUIData || isFetching}
                >
                  <SelectTrigger id="dsr-doctor-filter" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("reports:filters.allDoctors")}
                    </SelectItem>
                    {doctorsForFilter?.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Search Doctor Name */}
              <div className="min-w-[150px]">
                <Label htmlFor="dsr-search-doc" className="text-xs">
                  {t("reports:filters.searchDoctorName")}
                </Label>
                <Input
                  id="dsr-search-doc"
                  type="search"
                  placeholder={t("reports:filters.searchPlaceholderName")}
                  value={filters.searchDoctorName}
                  onChange={(e) =>
                    handleFilterChange("searchDoctorName", e.target.value)
                  }
                  className="h-9"
                />
              </div>
              {/* General Shift Filter */}
              <div className="min-w-[150px]">
                <Label htmlFor="dsr-gshift-filter" className="text-xs">
                  {t("reports:filters.generalShift")}
                </Label>
                <Select
                  value={filters.generalShiftId}
                  onValueChange={(val) =>
                    handleFilterChange("generalShiftId", val)
                  }
                  dir={i18n.dir()}
                  disabled={isLoadingUIData || isFetching}
                >
                  <SelectTrigger id="dsr-gshift-filter" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("reports:filters.allShifts")}
                    </SelectItem>
                    {generalShiftsForFilter?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name ||
                          `#${s.id} (${format(parseISO(s.created_at), "PP", {
                            locale: dateLocale,
                          })})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Status Filter */}
              <div className="min-w-[120px]">
                <Label htmlFor="dsr-status-filter" className="text-xs">
                  {t("reports:filters.status")}
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(val) =>
                    handleFilterChange("status", val as Filters["status"])
                  }
                  dir={i18n.dir()}
                  disabled={isFetching}
                >
                  <SelectTrigger id="dsr-status-filter" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("reports:filters.statusAll")}
                    </SelectItem>
                    <SelectItem value="open">
                      {t("reports:filters.statusOpen")}
                    </SelectItem>
                    <SelectItem value="closed">
                      {t("reports:filters.statusClosed")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Date From Input */}
              <div className="min-w-[150px]">
                <Label htmlFor="dsr-date-from" className="text-xs">
                  {t("reports:filters.dateFrom")}
                </Label>
                <Input
                  id="dsr-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="h-9"
                  disabled={isFetching}
                />
              </div>
              {/* Date To Input */}
              <div className="min-w-[150px]">
                <Label htmlFor="dsr-date-to" className="text-xs">
                  {t("reports:filters.dateTo")}
                </Label>
                <Input
                  id="dsr-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="h-9"
                  disabled={isFetching}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isFetching && !isLoading && (
          <div className="text-sm text-muted-foreground my-2 text-center py-2">
            <Loader2 className="inline h-4 w-4 animate-spin" />{" "}
            {t("common:updatingList")}
          </div>
        )}

        {!isLoading && shifts.length === 0 && !isFetching && (
          <Card className="text-center py-10 text-muted-foreground mt-6">
            <CardContent>{t("common:noDataAvailableFilters")}</CardContent>
          </Card>
        )}

        {shifts.length > 0 && (
          <Card className="mt-6 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-420px)] w-full">
              <div className="min-w-[1200px]">
                <Table className="text-xs" dir={i18n.dir()}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center min-w-[140px]">
                        {t("reports:doctorName")}
                      </TableHead>
                      <TableHead className="text-center hidden md:table-cell min-w-[110px]">
                        {t("reports:specialist")}
                      </TableHead>
                     
                      <TableHead className="text-center min-w-[90px]">
                        {t("reports:totalEntitlement")}
                      </TableHead>
                      <TableHead className="text-center hidden md:table-cell min-w-[90px]">
                        {t("reports:cashEntitlement")}
                      </TableHead>
                      <TableHead className="text-center hidden md:table-cell min-w-[90px]">
                        {t(
                          "reports:insuranceEntitlement"
                        )}
                      </TableHead>
                      <TableHead className="text-center min-w-[70px]">
                        {t("common:status")}
                      </TableHead>
                      <TableHead className="text-center min-w-[100px] hidden xl:table-cell">
                        {t("reports:openedBy")}
                      </TableHead>
                      <TableHead className="text-right min-w-[110px] sticky right-0 bg-card z-10">
                        {t("common:actions.title")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((ds: DoctorShiftReportItem) => (
                      <TableRow
                        key={ds.id}
                        className={
                          ds.status ? "bg-green-50/50 dark:bg-green-900/20" : ""
                        }
                      >
                        <TableCell className="font-medium text-center">
                          {ds.doctor_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          {ds.doctor_specialist_name || "-"}
                        </TableCell>
                      
                        <TableCell className="text-center font-semibold">
                          {formatNumber(ds.total_doctor_entitlement || 0)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          {formatNumber(ds.cash_entitlement || 0)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          {formatNumber(ds.insurance_entitlement || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={ds.status ? "success" : "outline"}
                            className={
                              ds.status
                                ? "border-green-600 bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300 dark:border-green-700"
                                : ""
                            }
                          >
                            {ds.status_text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden xl:table-cell">
                          {ds.user_name_opened || "-"}
                        </TableCell>
                        <TableCell className="text-right sticky right-0 bg-card z-10">
                          <DropdownMenu dir={i18n.dir()}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {canViewFinancialSummary && (
                                <DropdownMenuItem
                                  onClick={() => handleViewSummary(ds)}
                                >
                                  <Eye className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
                                  {t("reports:actions.viewFinancialSummary")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDownloadSummaryPdf(ds)}
                                disabled={isGeneratingSummaryPdfId === ds.id}
                              >
                                {isGeneratingSummaryPdfId === ds.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                <span className="ltr:ml-2 rtl:mr-2">
                                  {t("reports:actions.printFinancialSummary")}
                                </span>
                              </DropdownMenuItem>
                              {ds.status && canCloseShifts && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      closeShiftMutation.mutate(ds.id)
                                    }
                                    disabled={
                                      closeShiftMutation.isPending &&
                                      closeShiftMutation.variables === ds.id
                                    }
                                    className="text-destructive focus:text-destructive"
                                  >
                                    {closeShiftMutation.isPending &&
                                    closeShiftMutation.variables === ds.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    <span className="ltr:ml-2 rtl:ml-2">
                                      {t("clinic:doctorShifts.closeShiftButton")}
                                    </span>
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canRecordEntitlementCost &&
                                (ds.total_doctor_entitlement ?? 0) > 0 &&
                                !ds.is_cash_reclaim_prooved &&
                                !ds.is_company_reclaim_prooved && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleOpenAddCostDialog(ds)}
                                    >
                                      <Edit className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
                                      {t("review.recordEntitlementAsCost")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              {canUpdateProofing && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleProofingAction(
                                        ds.id,
                                        "is_cash_revenue_prooved",
                                        ds.is_cash_revenue_prooved
                                      )
                                    }
                                    disabled={proofingFlagsMutation.isPending}
                                  >
                                    {ds.is_cash_revenue_prooved ? (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <ShieldQuestion className="h-3.5 w-3.5" />
                                    )}{" "}
                                    <span className="ltr:ml-2 rtl:mr-2">
                                      {t("review.toggleCashRevenueProof")}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleProofingAction(
                                        ds.id,
                                        "is_cash_reclaim_prooved",
                                        ds.is_cash_reclaim_prooved
                                      )
                                    }
                                    disabled={proofingFlagsMutation.isPending}
                                  >
                                    {ds.is_cash_reclaim_prooved ? (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <ShieldQuestion className="h-3.5 w-3.5" />
                                    )}{" "}
                                    <span className="ltr:ml-2 rtl:mr-2">
                                      {t("review.toggleCashEntitlementProof")}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleProofingAction(
                                        ds.id,
                                        "is_company_revenue_prooved",
                                        ds.is_company_revenue_prooved
                                      )
                                    }
                                    disabled={proofingFlagsMutation.isPending}
                                  >
                                    {ds.is_company_revenue_prooved ? (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <ShieldQuestion className="h-3.5 w-3.5" />
                                    )}{" "}
                                    <span className="ltr:ml-2 rtl:mr-2">
                                      {t("review.toggleInsuranceRevenueProof")}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleProofingAction(
                                        ds.id,
                                        "is_company_reclaim_prooved",
                                        ds.is_company_reclaim_prooved
                                      )
                                    }
                                    disabled={proofingFlagsMutation.isPending}
                                  >
                                    {ds.is_company_reclaim_prooved ? (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <ShieldQuestion className="h-3.5 w-3.5" />
                                    )}{" "}
                                    <span className="ltr:ml-2 rtl:mr-2">
                                      {t(
                                        "review.toggleInsuranceEntitlementProof"
                                      )}
                                    </span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </Card>
        )}

        {meta && meta.last_page > 1 && (
          <div className="mt-6 flex items-center justify-center px-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
            >
              {t("common:previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("common:pageXOfY", {
                current: meta.current_page,
                total: meta.last_page,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(meta.last_page, p + 1))
              }
              disabled={currentPage === meta.last_page || isFetching}
            >
              {t("common:next")}
            </Button>
          </div>
        )}
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
    </>
  );
};

export default DoctorShiftsReportPage;
