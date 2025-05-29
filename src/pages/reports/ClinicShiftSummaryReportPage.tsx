// src/pages/reports/ClinicShiftSummaryReportPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  FileSpreadsheet,
  Printer,
  XCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import type { Shift } from "@/types/shifts";
import { getShiftsList } from "@/services/shiftService";
import { getUsers } from "@/services/userService";
import {
  downloadClinicShiftSummaryPdf,
  type ClinicReportPdfFilters,
} from "@/services/reportService";

interface AppUser {
  id: number;
  name: string;
  username: string;
}

const reportFilterSchema = (t: (key: string) => string) =>
  z.object({
    shift: z.string().min(1, t("common:validation.requiredField")),
    user: z.string().nullable(),
  });

type ReportFilterValues = z.infer<ReturnType<typeof reportFilterSchema>>;

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const ClinicShiftSummaryReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema(t)),
    defaultValues: {
      shift: "",
      user: "all",
    },
  });

  // Fetch shifts for the dropdown
  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[], Error>(
    {
      queryKey: ["shiftsListForReportFilter"],
      queryFn: () => getShiftsList({ per_page: 100, is_closed: "" }),
    }
  );

  // Fetch users for the dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery<AppUser[], Error>({
    queryKey: ["usersListForReportFilter"],
    queryFn: async () => {
      const response = await getUsers();
      return response.data;
    },
  });

  const handleGeneratePdf = async (data: ReportFilterValues) => {
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    try {
      const filters: ClinicReportPdfFilters = {
        shift: parseInt(data.shift),
        user: data.user && data.user !== "all" ? parseInt(data.user) : null,
      };
      const blob = await downloadClinicShiftSummaryPdf(filters);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("PDF generation error:", error);
      const apiError = error as ApiError;
      toast.error(t("reports:pdfGeneratedError"), {
        description: apiError.response?.data?.message || apiError.message || t("common:error.unknown"),
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const isLoadingDropdowns = isLoadingShifts || isLoadingUsers;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-7 w-7 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t("reports:clinicShiftSummaryReport.pageTitle")}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("reports:clinicShiftSummaryReport.filterTitle")}
          </CardTitle>
          <CardDescription>
            {t("reports:clinicShiftSummaryReport.filterDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleGeneratePdf)}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end"
            >
              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("reports:clinicShiftSummaryReport.selectShiftLabel")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                      dir={i18n.dir()}
                      disabled={isLoadingDropdowns || isGeneratingPdf}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "reports:clinicShiftSummaryReport.selectShiftPlaceholder"
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingShifts ? (
                          <SelectItem value="loading" disabled>
                            {t("common:loading")}
                          </SelectItem>
                        ) : shifts && shifts.length > 0 ? (
                          shifts.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name ||
                                `${t("common:shift")} #${s.id} (${
                                  s.is_closed
                                    ? t("common:statusEnum.closed")
                                    : t("common:statusEnum.open")
                                }, ${
                                  s.created_at
                                    ? format(parseISO(s.created_at), "P")
                                    : ""
                                })`}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            {t(
                              "reports:clinicShiftSummaryReport.noShiftsAvailable"
                            )}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("reports:clinicShiftSummaryReport.selectUserLabel")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "all"}
                      defaultValue={field.value || "all"}
                      dir={i18n.dir()}
                      disabled={isLoadingDropdowns || isGeneratingPdf}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("common:allUsers", "All Users")}
                        </SelectItem>
                        {isLoadingUsers ? (
                          <SelectItem value="loading_users" disabled>
                            {t("common:loading")}
                          </SelectItem>
                        ) : (
                          users?.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name} ({u.username})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoadingDropdowns || isGeneratingPdf}
                className="h-10 sm:mt-[26px]"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                )}
                {t("reports:clinicShiftSummaryReport.generateButton")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isGeneratingPdf && !pdfUrl && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">
            {t("common:generatingReport")}
          </p>
        </div>
      )}

      {pdfUrl && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>{t("reports:reportPreview")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setPdfUrl(null)}>
              <XCircle className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <iframe
              src={pdfUrl}
              className="w-full h-[75vh] border rounded-md"
              title={t("reports:clinicShiftSummaryReport.pageTitle")}
            ></iframe>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicShiftSummaryReportPage;
