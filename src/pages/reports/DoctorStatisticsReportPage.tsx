// src/pages/reports/DoctorStatisticsReportPage.tsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";

// MUI
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  TextField,
  Alert,
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
} from "@mui/material";
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

const DoctorStatisticsReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [filters, setFilters] = useState<DoctorStatisticsFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: "total_entitlement",
    sort_direction: "desc",
  });
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: doctorsForFilter = [] } = useQuery<DoctorStripped[], Error>({
    queryKey: ["doctorsListForReportFilter"],
    queryFn: () => getDoctorsList({ active: true }),
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
      date_from: dateFrom || defaultDateFrom,
      date_to: dateTo || defaultDateTo,
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
      toast.error('يرجى تحديد نطاق التاريخ');
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
      toast.success('تم توليد ملف PDF بنجاح');
    } catch (error: any) {
      toast.error('فشل توليد ملف PDF', {
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
        <ArrowUpDown className="h-3 w-3 opacity-30" />
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
            إحصائيات الأطباء
          </h1>
        </div>
        <Button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf || isLoading || dataItems.length === 0}
          size="small"
          variant="contained"
          startIcon={!isGeneratingPdf ? <FileText className="h-4 w-4" /> : undefined}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'طباعة PDF'
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <Typography className="text-xs">نطاق التاريخ (من)</Typography>
            <TextField size="small" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Typography className="text-xs">إلى</Typography>
            <TextField size="small" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Typography className="text-xs">الطبيب</Typography>
            <FormControl size="small">
              <InputLabel id="doc-label">الطبيب</InputLabel>
              <MUISelect
                labelId="doc-label"
                label="الطبيب"
                value={filters.doctor_id || ""}
                onChange={(e) => setFilters((f) => ({ ...f, doctor_id: String(e.target.value) || null }))}
              >
                <MenuItem value="">كل الأطباء</MenuItem>
                {doctorsForFilter.map((doc) => (
                  <MenuItem key={doc.id} value={String(doc.id)}>
                    {doc.name}
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1.5">
            <Typography className="text-xs">التخصص</Typography>
            <FormControl size="small">
              <InputLabel id="spec-label">التخصص</InputLabel>
              <MUISelect
                labelId="spec-label"
                label="التخصص"
                value={filters.specialist_id || ""}
                onChange={(e) => setFilters((f) => ({ ...f, specialist_id: String(e.target.value) || null }))}
              >
                <MenuItem value="">كل التخصصات</MenuItem>
                {specialistsForFilter.map((spec) => (
                  <MenuItem key={spec.id} value={String(spec.id)}>
                    {spec.name}
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <Button
            onClick={handleApplyFilters}
            className="h-9 mt-auto"
            variant="contained"
            size="small"
            disabled={isLoading || isFetching}
            startIcon={!isFetching ? <Filter className="h-4 w-4" /> : undefined}
          >
            {isFetching ? 'جارٍ التحديث...' : 'تطبيق المرشحات'}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography>فشل جلب البيانات</Typography>
          <Typography variant="body2" color="text.secondary">{error.message || 'حدث خطأ'}</Typography>
        </Alert>
      )}

      {reportData && !isLoading && (
        <>
          <Typography align="center" variant="body2" className="mb-2">
            {reportPeriod && (
              <>تقرير الفترة: {format(parseISO(reportPeriod.from), "PPP")} - {format(parseISO(reportPeriod.to), "PPP")} </>
            )}
          </Typography>
          <Card>
            <MUITable size="small">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" onClick={() => handleSort("doctor_name")} className="cursor-pointer">
                    <div className="flex items-center justify-center gap-1">
                      اسم الطبيب {getSortIcon("doctor_name")}
                    </div>
                  </MUITableCell>
                  <MUITableCell align="center" className="hidden sm:table-cell">التخصص</MUITableCell>
                  <MUITableCell align="center" onClick={() => handleSort("patient_count")} className="cursor-pointer">
                    <div className="flex items-center justify-center gap-1">
                      عدد المرضى {getSortIcon("patient_count")}
                    </div>
                  </MUITableCell>
                  <MUITableCell align="center" onClick={() => handleSort("total_income_generated")} className="cursor-pointer">
                    <div className="flex items-center justify-center gap-1">
                      إجمالي الدخل {getSortIcon("total_income_generated")}
                    </div>
                  </MUITableCell>
                  <MUITableCell align="center">استحقاق نقدي</MUITableCell>
                  <MUITableCell align="center">استحقاق تأميني</MUITableCell>
                  <MUITableCell align="center" onClick={() => handleSort("total_entitlement")} className="font-semibold cursor-pointer">
                    <div className="flex items-center justify-center gap-1">
                      إجمالي الاستحقاق {getSortIcon("total_entitlement")}
                    </div>
                  </MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow>
                    <MUITableCell colSpan={7} align="center" className="h-24">
                      لا توجد بيانات للفترة
                    </MUITableCell>
                  </MUITableRow>
                )}
                {dataItems.map((item: DoctorStatisticItem) => (
                  <MUITableRow key={item.doctor_id}>
                    <MUITableCell align="center">{item.doctor_name}</MUITableCell>
                    <MUITableCell align="center" className="hidden sm:table-cell">{item.specialist_name}</MUITableCell>
                    <MUITableCell align="center">{item.patient_count}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.total_income_generated)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.cash_entitlement)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.insurance_entitlement)}</MUITableCell>
                    <MUITableCell align="center" className="font-semibold">{formatNumber(item.total_entitlement)}</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
            </MUITable>
          </Card>
        </>
      )}
    </div>
  );
};

export default DoctorStatisticsReportPage;
