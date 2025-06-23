// src/pages/reports/CostsReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Filter, FileBarChart2, Printer, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

import type { CostFilters, CostCategory, PaginatedCostsResponse, Cost } from "@/types/finance";
import type { User } from "@/types/users";
import type { Shift } from "@/types/shifts";
import type { PaginatedResponse } from "@/types/common";
import { getCostsReportData, getCostCategoriesList, downloadCostsReportPdf } from "@/services/costService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import type { DateRange } from "react-day-picker";
import { formatNumber } from "@/lib/utils";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog"; // Assuming you have this

const getCostReportFilterSchema = () =>
  z.object({
    date_range: z.custom<DateRange | undefined>().optional(),
    cost_category_id: z.string().optional(),
    user_cost_id: z.string().optional(),
    shift_id: z.string().optional(),
    payment_method: z.enum(["all", "cash", "bank", "mixed"]).optional(),
    search_description: z.string().optional(),
  });

type CostReportFilterFormValues = z.infer<ReturnType<typeof getCostReportFilterSchema>>;

const CostsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports", "common", "finances"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const defaultDateFrom = startOfMonth(new Date());
  const defaultDateTo = endOfMonth(new Date());

  const filterForm = useForm<CostReportFilterFormValues>({
    resolver: zodResolver(getCostReportFilterSchema()),
    defaultValues: {
      date_range: { from: defaultDateFrom, to: defaultDateTo },
      cost_category_id: "all", user_cost_id: "all", shift_id: "all",
      payment_method: "all", search_description: "",
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<Omit<CostFilters, "page" | "per_page">>({
    date_from: format(defaultDateFrom, "yyyy-MM-dd"),
    date_to: format(defaultDateTo, "yyyy-MM-dd"),
    cost_category_id: null, user_cost_id: null, shift_id: null,
    payment_method: null, search_description: "",
    sort_by: "created_at", sort_direction: "desc",
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('costs_report.pdf');


  const { data: costCategories, isLoading: isLoadingCategories } = useQuery<CostCategory[], Error>({
    queryKey: ["costCategoriesListForReport"],
    queryFn: getCostCategoriesList,
  });

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery<PaginatedResponse<User>, Error>({
    queryKey: ["usersListForCostReportFilter"],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });
  const usersList = useMemo(() => usersResponse?.data || [], [usersResponse]);

  const { data: shiftsList, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ["shiftsListForCostReportFilter"],
    queryFn: () => getShiftsList({ per_page: 200, is_closed: "" }), // Fetch all for dropdown
  });

  const reportQueryKey = ["costsReportData", currentPage, appliedFilters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<PaginatedCostsResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getCostsReportData({ page: currentPage, per_page: 20, ...appliedFilters }),
    placeholderData: keepPreviousData,
  });

  const handleFilterFormSubmit = (data: CostReportFilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters({
      date_from: data.date_range?.from ? format(data.date_range.from, "yyyy-MM-dd") : undefined,
      date_to: data.date_range?.to ? format(data.date_range.to, "yyyy-MM-dd") : undefined,
      cost_category_id: data.cost_category_id === "all" ? null : data.cost_category_id,
      user_cost_id: data.user_cost_id === "all" ? null : data.user_cost_id,
      shift_id: data.shift_id === "all" ? null : data.shift_id,
      payment_method: data.payment_method === "all" ? null : data.payment_method as CostFilters['payment_method'],
      search_description: data.search_description || undefined,
      sort_by: appliedFilters.sort_by, // Keep existing sort or add UI to change it
      sort_direction: appliedFilters.sort_direction,
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData?.data.length) {
        toast.info(t('common:error.noDataToExport'));
        return;
    }
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setIsPdfPreviewOpen(true); // Open dialog to show loader

    try {
      const blob = await downloadCostsReportPdf({ // Pass only non-pagination filters
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
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      setPdfFileName(`Costs_Report_${appliedFilters.date_from}_to_${appliedFilters.date_to}.pdf`);
      // toast.success(t("common:pdfGeneratedSuccess")); // Dialog will show preview
    } catch (err: unknown) {
      console.error("Failed to generate PDF:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t("common:error.pdfGeneratedError"), { description: errorMessage });
      setIsPdfPreviewOpen(false); // Close dialog on error
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl); // Clean up object URL
      }
    };
  }, [pdfUrl]);

  const costs = reportData?.data || [];
  const meta = reportData?.meta;
  const summary = reportData?.meta?.summary;
  const isLoadingDropdowns = isLoadingCategories || isLoadingUsers || isLoadingShifts;

  const getPaymentMethodForDisplay = (cost: Cost): string => {
    const hasCash = cost.amount > 0;
    const hasBank = cost.amount_bankak > 0;
    if (hasCash && hasBank) return t("finances:paymentMethods.mixed");
    if (hasCash) return t("finances:paymentMethods.cash");
    if (hasBank) return t("finances:paymentMethods.bank");
    return "-";
  };

  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t("reports:costsReport.pageTitle")}</h1>
        </div>
        <Card className="text-center py-10 text-destructive">
          <CardContent>
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p>{t("common:error.generic")}</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex items-center gap-2">
        <FileBarChart2 className="h-7 w-7 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">{t("reports:costsReport.pageTitle")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t("reports:filtersTitle")}</CardTitle></CardHeader>
        <CardContent>
          <Form {...filterForm}>
            <form onSubmit={filterForm.handleSubmit(handleFilterFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
                <FormField control={filterForm.control} name="date_range" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="text-xs">{t("reports:dateRange")}</FormLabel><DatePickerWithRange date={field.value} onDateChange={field.onChange} disabled={isFetching || isLoadingDropdowns} buttonSize="sm" /><FormMessage /></FormItem> )} />
                <FormField control={filterForm.control} name="cost_category_id" render={({ field }) => ( <FormItem><FormLabel className="text-xs">{t("reports:costsReport.categoryFilter")}</FormLabel><Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isLoadingDropdowns || isFetching}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder={t("reports:costsReport.allCategories")} /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">{t("reports:costsReport.allCategories")}</SelectItem>{costCategories?.map((cat) => (<SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={filterForm.control} name="user_cost_id" render={({ field }) => ( <FormItem><FormLabel className="text-xs">{t("reports:costsReport.userFilter")}</FormLabel><Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isLoadingDropdowns || isFetching}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder={t("reports:costsReport.allUsers")} /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">{t("reports:costsReport.allUsers")}</SelectItem>{usersList?.map((u: User) => (<SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={filterForm.control} name="shift_id" render={({ field }) => ( <FormItem><FormLabel className="text-xs">{t("reports:costsReport.shiftFilter")}</FormLabel><Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isLoadingDropdowns || isFetching}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder={t("reports:costsReport.allShifts")} /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">{t("reports:costsReport.allShifts")}</SelectItem>{shiftsList?.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.name || `${t("common:shift")} #${s.id} (${format(parseISO(s.created_at!),"P", {locale: dateLocale})})`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={filterForm.control} name="payment_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("reports:costsReport.paymentMethodFilter")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isFetching}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue placeholder={t("reports:costsReport.allPaymentMethods")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">{t("reports:costsReport.allPaymentMethods")}</SelectItem>
                        <SelectItem value="cash">{t("finances:paymentMethods.cash")}</SelectItem>
                        <SelectItem value="bank">{t("finances:paymentMethods.bank")}</SelectItem>
                        <SelectItem value="mixed">{t("finances:paymentMethods.mixed")}</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={filterForm.control} name="search_description" render={({ field }) => ( <FormItem className="lg:col-span-3 xl:col-span-1"><FormLabel className="text-xs">{t("reports:costsReport.searchDescription")}</FormLabel><FormControl><Input type="search" {...field} className="h-9" disabled={isFetching} /></FormControl><FormMessage /></FormItem> )} />
                <Button type="submit" className="h-9 self-end w-full sm:w-auto" disabled={isFetching || isLoadingDropdowns}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                  {t("reports:applyFilters")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isLoading && !isFetching && costs.length === 0) && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center py-2"><Loader2 className="inline h-4 w-4 animate-spin"/> {t("common:updatingList")}</div>}
      
      {!isLoading && !isFetching && costs.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground mt-6">
            <CardContent>{t("reports:costsReport.noData")}</CardContent>
        </Card>
      )}

      {!isLoading && costs.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <ScrollArea className="max-h-[calc(100vh-400px)]"> {/* Adjust max-height for table scroll */}
            <Table dir={i18n.dir()}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] text-center">{t("reports:costsReport.table.date")}</TableHead>
                  <TableHead className="min-w-[200px]">{t("reports:costsReport.table.description")}</TableHead>
                  <TableHead className="hidden md:table-cell text-center min-w-[120px]">{t("reports:costsReport.table.category")}</TableHead>
                  <TableHead className="hidden sm:table-cell text-center min-w-[120px]">{t("reports:costsReport.table.user")}</TableHead>
                  <TableHead className="text-center w-[100px]">{t("reports:costsReport.table.paymentMethod")}</TableHead>
                  <TableHead className="text-center w-[90px]">{t("reports:costsReport.table.cashAmount")}</TableHead>
                  <TableHead className="text-center w-[90px]">{t("reports:costsReport.table.bankAmount")}</TableHead>
                  <TableHead className="text-right w-[110px]">{t("reports:costsReport.table.totalAmount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost: Cost) => {
                  const totalCostForRow = cost.amount + cost.amount_bankak;
                  const paymentMethodDisplay = getPaymentMethodForDisplay(cost);
                  return (
                    <TableRow key={cost.id}>
                      <TableCell className="text-xs text-center">
                        {cost.created_at ? format(parseISO(cost.created_at), "Pp", { locale: dateLocale }) : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{cost.description}</TableCell>
                      <TableCell className="hidden md:table-cell text-center">{cost.cost_category_name || "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-center">{cost.user_cost_name || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={paymentMethodDisplay === t("finances:paymentMethods.bank") ? "secondary" : (paymentMethodDisplay === t("finances:paymentMethods.mixed") ? "info" : "outline")} className="text-[10px] px-1.5 py-0.5">
                          {paymentMethodDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatNumber(cost.amount)}</TableCell>
                      <TableCell className="text-center">{formatNumber(cost.amount_bankak)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNumber(totalCostForRow)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          {summary && (
            <CardFooter className="flex flex-col items-end gap-1 border-t pt-3 text-sm bg-muted/30 dark:bg-muted/20">
              <div>{t("reports:costsReport.totalCashPaid")}: <span className="font-bold">{formatNumber(summary.total_cash_paid)}</span></div>
              <div>{t("reports:costsReport.totalBankPaid")}: <span className="font-bold">{formatNumber(summary.total_bank_paid)}</span></div>
              <Separator className="my-1.5 w-52 self-end" />
              <div className="font-bold text-base">{t("reports:costsReport.grandTotalPaid")}: <span className="text-primary">{formatNumber(summary.grand_total_paid)}</span></div>
            </CardFooter>
          )}
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-6 flex items-center justify-center px-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>{t("common:previous")}</Button>
          <span className="text-sm text-muted-foreground">{t("common:pageXOfY", { current: meta.current_page, total: meta.last_page })}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>{t("common:next")}</Button>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || isLoading || costs.length === 0} size="sm" variant="default">
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          <span className="ltr:ml-2 rtl:mr-2">{t("common:generateAndPreviewPdf")}</span>
        </Button>
      </div>

      <PdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={(open) => {
            setIsPdfPreviewOpen(open);
            if (!open && pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
        }}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={t('reports:costsReport.pageTitle')}
        fileName={pdfFileName}
      />
    </div>
  );
};

export default CostsReportPage;