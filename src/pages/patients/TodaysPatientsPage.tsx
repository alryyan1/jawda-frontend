// src/pages/patients/TodaysPatientsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO, startOfDay, endOfDay } from "date-fns"; // Date functions
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Your DateRangePicker
import type { DateRange } from "react-day-picker";
import { Loader2, Search, Eye, Filter, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  getPatientVisitsSummary,
  GetVisitsFilters,
} from "@/services/visitService";
import type { PaginatedResponse } from "@/types/common";
import type { PatientVisitSummary } from "@/types/visits"; // Ensure this type includes doctor_name, total_discount, visit_time_formatted
import { formatNumber } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import ViewVisitServicesDialog from "@/components/clinic/patients/ViewVisitServicesDialog";

// Update PatientVisitSummary type in src/types/visits.ts if not already done:
// export interface PatientVisitSummary {
//   // ... existing fields
//   visit_time_formatted?: string | null; // NEW
//   doctor_name?: string | null; // NEW (if doctor is just name, or use DoctorStripped)
//   // doctor?: DoctorStripped; // Alternative if you send full doctor object
//   total_discount: number; // NEW
// }

const TodaysPatientsPage: React.FC = () => {
  const { t, i18n } = useTranslation(["todaysPatients", "common"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // NEW: Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const [selectedVisitForServices, setSelectedVisitForServices] =
    useState<PatientVisitSummary | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page if date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange]);

  const visitsQueryKey = [
    "patientVisitsSummary",
    currentPage,
    debouncedSearchTerm,
    dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "all", // Add dates to query key
    dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "all",
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
        date_from: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
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
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t("todaysPatients:pageTitle")}
        </h1>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-56 md:w-64">
            <Input
              type="search"
              placeholder={t("common:searchByNameOrPhone")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10 rtl:pr-10 h-9"
            />
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
            align="end"
            buttonSize="sm" // Or your desired size
            className="w-full sm:w-auto"
            triggerClassName="h-9"
          />
        </div>
      </div>

      {isFetching && (
        <div className="text-sm text-muted-foreground mb-2 text-center py-2">
          <Loader2 className="inline h-4 w-4 animate-spin" />{" "}
          {t("common:updatingList")}
        </div>
      )}

      {isLoading && !isFetching && visits.length === 0 ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive p-4 text-center">
          {t("common:error.fetchFailedExt", {
            entity: t("todaysPatients:patients"),
            message: error.message,
          })}
        </p>
      ) : visits.length === 0 ? (
        <Card className="text-center py-10 text-muted-foreground">
          <CardContent>
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>
              {searchTerm ||
              (dateRange?.from &&
                dateRange.from.toDateString() !== new Date().toDateString())
                ? t("common:noResultsFound")
                : t("todaysPatients:noPatientsToday")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card  className="overflow-hidden">
          <ScrollArea className="max-h-[calc(100vh-250px)]">
            {" "}
            {/* Adjust max-height as needed */}
            <Table dir={i18n.language === "ar" ? "rtl" : "ltr"}>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-[80px]">
                    {t("todaysPatients:table.visitId")}
                  </TableHead>
                  <TableHead className="text-center">{t("todaysPatients:table.patientName")}</TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    {t("todaysPatients:table.doctorName")}
                  </TableHead>{" "}
                  {/* NEW */}
                  <TableHead className="text-center hidden sm:table-cell">
                    {t("todaysPatients:table.visitTime")}
                  </TableHead>{" "}
                  {/* NEW */}
                  <TableHead className="text-center">
                    {t("todaysPatients:table.totalAmount")}
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell">
                    {t("todaysPatients:table.discount")}
                  </TableHead>{" "}
                  {/* NEW */}
                  <TableHead className="text-center">
                    {t("todaysPatients:table.totalPaid")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("todaysPatients:table.balanceDue")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("common:status")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("common:actions.title")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-center font-medium">
                      {visit.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {visit.patient.name}
                      {visit.patient.company?.name && (
                        <Badge
                          variant="outline"
                          className="ltr:ml-2 rtl:mr-2 text-xs border-blue-500 text-blue-600"
                        >
                          {visit.patient.company.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {visit.doctor?.name || t("common:unassigned")}
                    </TableCell>{" "}
                    {/* NEW */}
                    <TableCell className="text-center hidden sm:table-cell">
                      {visit.visit_time_formatted || visit.visit_time || "-"}
                    </TableCell>{" "}
                    {/* NEW */}
                    <TableCell className="text-center">
                      {formatNumber(visit.total_amount)}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell text-orange-600">
                      {formatNumber(visit.total_discount)}
                    </TableCell>{" "}
                    {/* NEW */}
                    <TableCell className="text-center text-green-600">
                      {formatNumber(visit.total_paid)}
                    </TableCell>
                    <TableCell
                      className={`text-center font-semibold ${
                        visit.balance_due > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatNumber(visit.balance_due)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          visit.status === "completed"
                            ? "success"
                            : visit.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {t(
                          `clinic:workspace.status.${visit.status}`,
                          visit.status
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewServices(visit)}
                        className="h-7 px-2"
                      >
                        <Eye className="h-4 w-4 ltr:mr-1 rtl:ml-1" />{" "}
                        {t("todaysPatients:actions.viewServicesShort")}
                      </Button>
                  
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("common:pagination.pageInfo", {
              current: meta.current_page,
              total: meta.last_page,
            })}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage === meta.last_page || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.next")}
          </Button>
        </div>
      )}

      {selectedVisitForServices && (
        <ViewVisitServicesDialog
          isOpen={!!selectedVisitForServices}
          onOpenChange={() => setSelectedVisitForServices(null)}
          visit={selectedVisitForServices}
        />
      )}
    </div>
  );
};

export default TodaysPatientsPage;
