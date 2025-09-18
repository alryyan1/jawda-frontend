// src/pages/reports/ClinicShiftSummaryReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  IconButton,
} from "@mui/material";
import {
  Loader2,
  FileSpreadsheet,
  Printer,
  XCircle,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import dayjs from "dayjs";

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

const reportFilterSchema = z.object({
  shift: z.string().min(1, "هذا الحقل مطلوب"),
  user: z.string().nullable(),
});

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const ClinicShiftSummaryReportPage: React.FC = () => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      shift: "",
      user: "all",
    },
  });

  // Fetch shifts for the dropdown
  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[], Error>(
    {
      queryKey: ["shiftsListForReportFilter"],
      queryFn: () => getShiftsList({ per_page: 0, is_closed: "" }),
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
      toast.error("فشل توليد ملف PDF", {
        description: apiError.response?.data?.message || apiError.message || "حدث خطأ غير معروف",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  const shiftOptions = useMemo(() => {
    return shifts?.map(s => ({
      label: `مناوبة #${s.id} ${dayjs(s.created_at).format('DD/MM/YYYY ')}`,
      id: s.id,
      originalShift: s 
    })) || [];
  }, [shifts]);

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
          ملخص مناوبة العيادة
        </h1>
      </div>
      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
          <Typography variant="body2" color="text.secondary">اختر المناوبة والمستخدم (اختياري) ثم اطبع التقرير</Typography>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleGeneratePdf)}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end"
          >
            <Controller
              name="shift"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  options={shiftOptions}
                  loading={isLoadingShifts}
                  getOptionLabel={(option) => option.label || ''}
                  value={shiftOptions.find(opt => String(opt.id) === field.value) || null}
                  onChange={(event, newValue) => {
                    field.onChange(newValue ? newValue.originalShift.id.toString() : "");
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  disabled={isGeneratingPdf}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={"اختر المناوبة"}
                      variant="outlined"
                      size="small"
                      error={!!form.formState.errors.shift}
                      helperText={form.formState.errors.shift?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingShifts ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />

            <Controller
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="user-select-label">المستخدم</InputLabel>
                  <MUISelect
                    labelId="user-select-label"
                    label="المستخدم"
                    onChange={field.onChange}
                    value={field.value || "all"}
                    defaultValue={field.value || "all"}
                    disabled={isLoadingDropdowns || isGeneratingPdf}
                  >
                    <MenuItem value="all">كل المستخدمين</MenuItem>
                    {isLoadingUsers ? (
                      <MenuItem value="loading_users" disabled>جارِ التحميل...</MenuItem>
                    ) : (
                      users?.map((u) => (
                        <MenuItem key={u.id} value={String(u.id)}>
                          {u.name} ({u.username})
                        </MenuItem>
                      ))
                    )}
                  </MUISelect>
                </FormControl>
              )}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isLoadingDropdowns || isGeneratingPdf}
              className="h-10 sm:mt-[26px]"
              startIcon={!isGeneratingPdf ? <Printer className="h-4 w-4" /> : undefined}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'طباعة التقرير'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isGeneratingPdf && !pdfUrl && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">
            جارِ توليد التقرير...
          </p>
        </div>
      )}

      {pdfUrl && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <Typography variant="h6">معاينة التقرير</Typography>
            <IconButton size="small" onClick={() => setPdfUrl(null)}>
              <XCircle className="h-5 w-5" />
            </IconButton>
          </CardHeader>
          <CardContent>
            <iframe
              src={pdfUrl}
              className="w-full h-[75vh] border rounded-md"
              title={'ملخص مناوبة العيادة'}
            ></iframe>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicShiftSummaryReportPage;

