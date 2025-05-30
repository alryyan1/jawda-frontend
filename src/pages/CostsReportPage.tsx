import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Filter,
  FileBarChart2,
  Printer,
  AlertTriangle,
} from "lucide-react";

import type {
  CostFilters,
  CostCategory,
  PaginatedCostsResponse,
  Cost,
} from "@/types/finance";
import type { User } from "@/types/auth";
import type { Shift } from "@/types/shifts";
import {
  getCostsReportData,
  getCostCategoriesList,
  downloadCostsReportPdf,
} from "@/services/costService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import type { DateRange } from "react-day-picker";

// Zod schema for filter form
const getCostReportFilterSchema = (
  t: (key: string, options?: Record<string, unknown>) => string
) =>
  z.object({
    date_range: z.custom<DateRange | undefined>().optional(),
    cost_category_id: z.string().optional(),
    user_cost_id: z.string().optional(),
    shift_id: z.string().optional(),
    payment_method: z.enum(["all", "cash", "bank"]).optional(),
    search_description: z.string().optional(),
  });

type CostReportFilterFormValues = z.infer<
  ReturnType<typeof getCostReportFilterSchema>
>;

const CostsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports", "common", "finances"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const defaultDateFrom = startOfMonth(new Date());
  const defaultDateTo = endOfMonth(new Date());

  const filterForm = useForm<CostReportFilterFormValues>({
    resolver: zodResolver(getCostReportFilterSchema(t)),
    defaultValues: {
      date_range: { from: defaultDateFrom, to: defaultDateTo },
      cost_category_id: "all",
      user_cost_id: "all",
      shift_id: "all",
      payment_method: "all",
      search_description: "",
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<
    Omit<CostFilters, "page" | "per_page">
  >({
    date_from: format(defaultDateFrom, "yyyy-MM-dd"),
    date_to: format(defaultDateTo, "yyyy-MM-dd"),
    cost_category_id: null,
    user_cost_id: null,
    shift_id: null,
    payment_method: null,
    search_description: "",
    sort_by: "created_at",
    sort_direction: "desc",
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // --- Data Fetching for Filters ---
  const { data: costCategories, isLoading: isLoadingCategories } = useQuery<
    CostCategory[],
    Error
  >({
    queryKey: ["costCategoriesListForReport"],
    queryFn: getCostCategoriesList,
  });

  const { data: usersList, isLoading: isLoadingUsers } = useQuery<
    User[],
    Error
  >({
    queryKey: ["usersListForReportFilter"],
    queryFn: () => getUsers({ per_page: 200 }).then(res => res.data),
  });

  const { data: shiftsList, isLoading: isLoadingShifts } = useQuery<
    Shift[],
    Error
  >({
    queryKey: ["shiftsListForReportFilter"],
    queryFn: () => getShiftsList({ per_page: 200, is_closed: "" }),
  });

  // --- Data Fetching for Report ---
  const reportQueryKey = [
    "costsReportData",
    currentPage,
    appliedFilters,
  ] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedCostsResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () =>
      getCostsReportData({
        page: currentPage,
        per_page: 20,
        ...appliedFilters,
      }),
    placeholderData: keepPreviousData,
  });

  const handleFilterFormSubmit = (data: CostReportFilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters({
      date_from: data.date_range?.from
        ? format(data.date_range.from, "yyyy-MM-dd")
        : undefined,
      date_to: data.date_range?.to
        ? format(data.date_range.to, "yyyy-MM-dd")
        : undefined,
      cost_category_id:
        data.cost_category_id === "all" ? null : data.cost_category_id,
      user_cost_id: data.user_cost_id === "all" ? null : data.user_cost_id,
      shift_id: data.shift_id === "all" ? null : data.shift_id,
      payment_method:
        data.payment_method === "all" ? null : data.payment_method,
      search_description: data.search_description || undefined,
      sort_by: appliedFilters.sort_by,
      sort_direction: appliedFilters.sort_direction,
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData?.data.length) return;

    setIsGeneratingPdf(true);
    try {
      const blob = await downloadCostsReportPdf({
        date_from: appliedFilters.date_from,
        date_to: appliedFilters.date_to,
        cost_category_id: appliedFilters.cost_category_id,
        user_cost_id: appliedFilters.user_cost_id,
        shift_id: appliedFilters.shift_id,
        payment_method: appliedFilters.payment_method,
        search_description: appliedFilters.search_description,
        sort_by: appliedFilters.sort_by,
        sort_direction: appliedFilters.sort_direction,
      });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      toast.success(t("common:pdfGeneratedSuccess"));
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error(t("common:error.pdfGeneratedError"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const costs = reportData?.data || [];
  const meta = reportData?.meta;
  const summary = reportData?.meta?.summary;
  const isLoadingDropdowns =
    isLoadingCategories || isLoadingUsers || isLoadingShifts;

  if (error)
    return (
      <Card className="border-destructive bg-destructive/5">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-destructive text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("common:error.fetchFailed", {
              entity: t("reports:costsReport.titleShort"),
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm pb-2">
          {error instanceof Error ? error.message : t("common:error.unknown")}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileBarChart2 className="h-7 w-7 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t("reports:costsReport.pageTitle")}
        </h1>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("reports:doctorShiftsReport.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...filterForm}>
            <form
              onSubmit={filterForm.handleSubmit(handleFilterFormSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
                <FormField
                  control={filterForm.control}
                  name="date_range"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs">
                        {t("reports:doctorShiftsReport.dateRange")}
                      </FormLabel>
                      <DatePickerWithRange
                        date={field.value}
                        onDateChange={field.onChange}
                        disabled={isFetching || isLoadingDropdowns}
                        buttonSize="sm"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={filterForm.control}
                  name="cost_category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("reports:costsReport.categoryFilter")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        dir={i18n.dir()}
                        disabled={isLoadingDropdowns || isFetching}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("reports:costsReport.allCategories")}
                          </SelectItem>
                          {costCategories?.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={filterForm.control}
                  name="user_cost_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("reports:costsReport.userFilter")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        dir={i18n.dir()}
                        disabled={isLoadingDropdowns || isFetching}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("reports:costsReport.allUsers")}
                          </SelectItem>
                          {usersList?.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={filterForm.control}
                  name="shift_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("reports:costsReport.shiftFilter")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        dir={i18n.dir()}
                        disabled={isLoadingDropdowns || isFetching}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("reports:costsReport.allShifts")}
                          </SelectItem>
                          {shiftsList?.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name ||
                                `${t("common:shift")} #${s.id} (${format(
                                  parseISO(s.created_at!),
                                  "P"
                                )})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={filterForm.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("reports:costsReport.paymentMethodFilter")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        dir={i18n.dir()}
                        disabled={isFetching}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("reports:costsReport.allPaymentMethods")}
                          </SelectItem>
                          <SelectItem value="cash">
                            {t("finances:paymentMethods.cash")}
                          </SelectItem>
                          <SelectItem value="bank">
                            {t("finances:paymentMethods.bank")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={filterForm.control}
                  name="search_description"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel className="text-xs">
                        {t("reports:costsReport.searchDescription")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="search"
                          {...field}
                          className="h-9"
                          disabled={isFetching}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="h-9 self-end"
                  disabled={isFetching || isLoadingDropdowns}
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  )}
                  {t("reports:doctorShiftsReport.applyFilters")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Report Table and Summary */}
      {isLoading && !isFetching && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {isFetching && (
        <div className="text-sm text-muted-foreground mb-2 text-center">
          {t("common:updatingList")}
        </div>
      )}

      {!isLoading && !isFetching && costs.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground">
          <CardContent>{t("reports:costsReport.noData")}</CardContent>
        </Card>
      )}

      {!isLoading && costs.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">
                  {t("reports:costsReport.table.date")}
                </TableHead>
                <TableHead>
                  {t("reports:costsReport.table.description")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("reports:costsReport.table.category")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("reports:costsReport.table.user")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("reports:costsReport.table.shift")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports:costsReport.table.paymentMethod")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports:costsReport.table.totalAmount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost: Cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="text-xs">
                    {cost.created_at
                      ? format(parseISO(cost.created_at), "Pp", {
                          locale: dateLocale,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {cost.description}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cost.cost_category_name || "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {cost.user_cost_name || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {cost.shift_name ||
                      (cost.shift_id ? `#${cost.shift_id}` : "-")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        cost.payment_method === "bank" ? "secondary" : "outline"
                      }
                    >
                      {t(`finances:paymentMethods.${cost.payment_method}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(cost.total_cost_amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {summary && (
            <CardFooter className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
              <div>
                {t("reports:costsReport.totalCashPaid")}:{" "}
                <span className="font-bold">
                  {Number(summary.total_cash_paid).toFixed(2)}
                </span>
              </div>
              <div>
                {t("reports:costsReport.totalBankPaid")}:{" "}
                <span className="font-bold">
                  {Number(summary.total_bank_paid).toFixed(2)}
                </span>
              </div>
              <Separator className="my-1 w-40 self-end" />
              <div className="font-bold text-md">
                {t("reports:costsReport.grandTotalPaid")}:{" "}
                <span className="text-primary">
                  {Number(summary.grand_total_paid).toFixed(2)}
                </span>
              </div>
            </CardFooter>
          )}
        </Card>
      )}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {t("common:pageXOfY", {
              current: meta.current_page,
              total: meta.last_page,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
            >
              {t("common:previous")}
            </Button>
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
        </div>
      )}

      {/* PDF Button (could be placed near filters or top of page) */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf || isLoading || costs.length === 0}
          size="sm"
          variant="outline"
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          <span className="ltr:ml-2 rtl:mr-2">{t("common:generatePdf")}</span>
        </Button>
      </div>
      {pdfUrl && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("reports:reportPreview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={pdfUrl}
              className="w-full h-[600px] border-0"
              title={t("reports:costsReport.titleShort")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default CostsReportPage;
