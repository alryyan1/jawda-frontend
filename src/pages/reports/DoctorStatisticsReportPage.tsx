// src/pages/reports/DoctorStatisticsReportPage.tsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import {
  Loader2,
  Filter,
  FileText,
  BarChartHorizontalBig,
  AlertTriangle,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  TrendingDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getDoctorStatisticsReport,
  downloadDoctorStatisticsPdf,
  type DoctorStatisticsFilters,
} from "@/services/reportService";
import type {
  DoctorStatisticItem,
  DoctorStatisticsReportResponse,
} from "@/types/reports";
import { formatNumber } from "@/lib/utils";
import { getDoctorsList, getSpecialistsList } from "@/services/doctorService"; // For filters
import type { DoctorStripped, Specialist } from "@/types/doctors";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const DoctorStatisticsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports", "common", "doctors"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [filters, setFilters] = useState<DoctorStatisticsFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: "total_entitlement", // Default sort
    sort_direction: "desc",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseISO(defaultDateFrom),
    to: parseISO(defaultDateTo),
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: doctorsForFilter = [] } = useQuery<DoctorStripped[], Error>({
    queryKey: ["doctorsListForReportFilter"],
    queryFn: () => getDoctorsList({ active: true }), // Fetch active doctors
  });
  const { data: specialistsForFilter = [] } = useQuery<Specialist[], Error>({
    queryKey: ["specialistsListForReportFilter"],
    queryFn: getSpecialistsList,
  });

  const reportQueryKey = ["doctorStatisticsReport", filters] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery<DoctorStatisticsReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getDoctorStatisticsReport(filters),
    enabled: !!(filters.date_from && filters.date_to),
  });

  const handleApplyFilters = () => {
    const newFilters: DoctorStatisticsFilters = {
      ...filters,
      date_from: dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : defaultDateFrom,
      date_to: dateRange?.to
        ? format(dateRange.to, "yyyy-MM-dd")
        : defaultDateTo,
    };
    setFilters(newFilters);
  };

  const handleSort = (columnKey: DoctorStatisticsFilters["sort_by"]) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: columnKey,
      sort_direction:
        prev.sort_by === columnKey && prev.sort_direction === "desc"
          ? "asc"
          : "desc",
    }));
  };

  const handleDownloadPdf = async () => {
    if (!filters.date_from || !filters.date_to) {
      toast.error(t("common:validation.dateRangeRequired"));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadDoctorStatisticsPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Doctor_Statistics_${filters.date_from}_to_${filters.date_to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("reports:pdfGeneratedSuccess"));
    } catch (error: any) {
      toast.error(t("reports:pdfGeneratedError"), {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dataItems = reportData?.data || [];
  const reportPeriod = reportData?.report_period;

  const getSortIcon = (columnKey: DoctorStatisticsFilters["sort_by"]) => {
    if (filters.sort_by !== columnKey)
      return (
        <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />
      );
    return filters.sort_direction === "asc" ? (
      <TrendingUp className="h-3 w-3 text-primary" />
    ) : (
      <TrendingDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("reports:doctorStatisticsReport.title")}
          </h1>
        </div>
        <Button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf || isLoading || dataItems.length === 0}
          size="sm"
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
          ) : (
            <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          )}
          {t("common:printPdf")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("reports:filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs">{t("common:dateRange")}</Label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              align="start"
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="dsr-doc-filter" className="text-xs">
              {t("common:doctor")}
            </Label>
            <Select
              value={filters.doctor_id || ""}
              onValueChange={(val) =>
                setFilters((f) => ({
                  ...f,
                  doctor_id: val === "" ? null : val,
                }))
              }
              dir={i18n.dir()}
            >
              <SelectTrigger id="dsr-doc-filter" className="h-9">
                <SelectValue placeholder={t("common:allDoctors")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">{t("common:allDoctors")}</SelectItem>
                {doctorsForFilter.map((doc) => (
                  <SelectItem key={doc.id} value={String(doc.id)}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="dsr-spec-filter" className="text-xs">
              {t("doctors:specialist")}
            </Label>
            <Select
              value={filters.specialist_id || ""}
              onValueChange={(val) =>
                setFilters((f) => ({
                  ...f,
                  specialist_id: val === "" ? null : val,
                }))
              }
              dir={i18n.dir()}
            >
              <SelectTrigger id="dsr-spec-filter" className="h-9">
                <SelectValue placeholder={t("doctors:allSpecialists")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">{t("doctors:allSpecialists")}</SelectItem>
                {specialistsForFilter.map((spec) => (
                  <SelectItem key={spec.id} value={String(spec.id)}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleApplyFilters}
            className="h-9 mt-auto"
            disabled={isLoading || isFetching}
          >
            <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("reports:applyFiltersButton")}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle /> {t("common:error.fetchFailedTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message || t("common:error.generic")}</p>
          </CardContent>
        </Card>
      )}

      {reportData && !isLoading && (
        <>
          <CardDescription className="text-center text-sm">
            {reportPeriod &&
              t("reports:reportForPeriod", {
                from: format(parseISO(reportPeriod.from), "PPP", {
                  locale: dateLocale,
                }),
                to: format(parseISO(reportPeriod.to), "PPP", {
                  locale: dateLocale,
                }),
              })}
          </CardDescription>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer group"
                    onClick={() => handleSort("doctor_name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t("reports:doctorStatisticsReport.table.doctorName")}{" "}
                      {getSortIcon("doctor_name")}
                    </div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center">
                    {t("reports:doctorStatisticsReport.table.specialistName")}
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer group"
                    onClick={() => handleSort("patient_count")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t("reports:doctorStatisticsReport.table.patientCount")}{" "}
                      {getSortIcon("patient_count")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer group"
                    onClick={() => handleSort("total_income_generated")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t(
                        "reports:doctorStatisticsReport.table.totalIncomeGenerated"
                      )}{" "}
                      {getSortIcon("total_income_generated")}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    {t("reports:doctorStatisticsReport.table.cashEntitlement")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t(
                      "reports:doctorStatisticsReport.table.insuranceEntitlement"
                    )}
                  </TableHead>
                  <TableHead
                    className="text-center font-semibold cursor-pointer group"
                    onClick={() => handleSort("total_entitlement")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {t(
                        "reports:doctorStatisticsReport.table.totalEntitlement"
                      )}{" "}
                      {getSortIcon("total_entitlement")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t("common:noDataAvailableForPeriod")}
                    </TableCell>
                  </TableRow>
                )}
                {dataItems.map((item) => (
                  <TableRow key={item.doctor_id}>
                    <TableCell className="font-medium text-center">
                      {item.doctor_name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      {item.specialist_name}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.patient_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatNumber(item.total_income_generated)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatNumber(item.cash_entitlement)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatNumber(item.insurance_entitlement)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {formatNumber(item.total_entitlement)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {/* Optional: Add a TableFooter for grand totals if your backend provides them or you calculate on frontend */}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export default DoctorStatisticsReportPage;
