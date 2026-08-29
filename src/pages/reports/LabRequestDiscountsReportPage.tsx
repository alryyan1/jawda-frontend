// src/pages/reports/LabRequestDiscountsReportPage.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

// MUI
import {
  Card,
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
  TableBody as MUITableBody,
  TableCell as MUITableCell,
  TableHead as MUITableHead,
  TableRow as MUITableRow,
  TableFooter as MUITableFooter,
} from "@mui/material";
import { Loader2, Filter, Percent, AlertTriangle, FileText, FileSpreadsheet } from "lucide-react";

import {
  getLabRequestDiscountsReport,
  downloadLabRequestDiscountsPdf,
  downloadLabRequestDiscountsExcel,
  type LabRequestDiscountFilters,
} from "@/services/reportService";
import type { LabRequestDiscountReportResponse } from "@/types/reports";
import { formatNumber } from "@/lib/utils";
import { getDoctorsList } from "@/services/doctorService";
import type { DoctorStripped } from "@/types/doctors";

const DISCOUNT_PERCENT_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const LabRequestDiscountsReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [doctorId, setDoctorId] = useState<string>("");
  const [minDiscountPer, setMinDiscountPer] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const [filters, setFilters] = useState<LabRequestDiscountFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    doctor_id: null,
    min_discount_per: null,
    comment: null,
    patient_name: null,
  });

  const { data: doctorsForFilter = [] } = useQuery<DoctorStripped[], Error>({
    queryKey: ["doctorsListForReportFilter"],
    queryFn: () => getDoctorsList(),
  });

  const {
    data: reportData,
    isLoading,
    isFetching,
    error,
  } = useQuery<LabRequestDiscountReportResponse, Error>({
    queryKey: ["labRequestDiscountsReport", filters],
    queryFn: () => getLabRequestDiscountsReport(filters),
    enabled: !!(filters.date_from && filters.date_to),
  });

  const handleApplyFilters = () => {
    setFilters({
      date_from: dateFrom || defaultDateFrom,
      date_to: dateTo || defaultDateTo,
      doctor_id: doctorId || null,
      min_discount_per: minDiscountPer || null,
      comment: comment || null,
      patient_name: patientName || null,
    });
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadLabRequestDiscountsPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Lab_Request_Discounts_${filters.date_from}_to_${filters.date_to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("تم توليد ملف PDF بنجاح");
    } catch (err: any) {
      toast.error("فشل توليد ملف PDF", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const blob = await downloadLabRequestDiscountsExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Lab_Request_Discounts_${filters.date_from}_to_${filters.date_to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("تم توليد ملف Excel بنجاح");
    } catch (err: any) {
      toast.error("فشل توليد ملف Excel", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const dataItems = useMemo(() => reportData?.data || [], [reportData]);
  const reportPeriod = reportData?.report_period;

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">
            خصومات المختبر للمرضى
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel || isLoading || dataItems.length === 0}
            size="small"
            variant="outlined"
            startIcon={!isGeneratingExcel ? <FileSpreadsheet className="h-4 w-4" /> : undefined}
          >
            {isGeneratingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : "تصدير Excel"}
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isLoading || dataItems.length === 0}
            size="small"
            variant="contained"
            startIcon={!isGeneratingPdf ? <FileText className="h-4 w-4" /> : undefined}
          >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : "طباعة PDF"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end !py-2">
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">من تاريخ</Typography>
            <TextField
              size="small"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">إلى تاريخ</Typography>
            <TextField
              size="small"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">الطبيب</Typography>
            <FormControl size="small">
              <InputLabel id="lrd-doctor-filter">الطبيب</InputLabel>
              <MUISelect
                value={doctorId}
                onChange={(e) => setDoctorId(String(e.target.value))}
                labelId="lrd-doctor-filter"
                label="الطبيب"
              >
                <MenuItem value="">كل الأطباء</MenuItem>
                {doctorsForFilter.map((doctor) => (
                  <MenuItem key={doctor.id} value={String(doctor.id)}>
                    {doctor.name}
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">الحد الأدنى لنسبة الخصم %</Typography>
            <FormControl size="small">
              <InputLabel id="lrd-min-discount-filter">نسبة الخصم</InputLabel>
              <MUISelect
                value={minDiscountPer}
                onChange={(e) => setMinDiscountPer(String(e.target.value))}
                labelId="lrd-min-discount-filter"
                label="نسبة الخصم"
              >
                <MenuItem value="">الكل</MenuItem>
                {DISCOUNT_PERCENT_OPTIONS.map((percent) => (
                  <MenuItem key={percent} value={String(percent)}>
                    {percent}%
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">اسم المريض</Typography>
            <TextField
              size="small"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="ابحث باسم المريض"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">ملاحظات الخصم</Typography>
            <TextField
              size="small"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ابحث في الملاحظات"
            />
          </div>
          <Button
            onClick={handleApplyFilters}
            disabled={isLoading || isFetching}
            variant="contained"
            size="small"
          >
            <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            تطبيق المرشحات
          </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <Alert severity="error" icon={<AlertTriangle />} sx={{ py: 0.5 }}>
          <Typography variant="body2">فشل جلب البيانات</Typography>
          <Typography variant="caption" color="text.secondary">
            {error.message || "حدث خطأ"}
          </Typography>
        </Alert>
      )}

      {reportData && !isLoading && (
        <>
          <Typography className="text-center text-xs text-muted-foreground">
            {reportPeriod && (
              <>
                تقرير الفترة: {format(parseISO(reportPeriod.from), "yyyy-MM-dd")} -{" "}
                {format(parseISO(reportPeriod.to), "yyyy-MM-dd")}
              </>
            )}
          </Typography>
          <Card>
            <MUITable
              size="small"
              sx={{ "& .MuiTableCell-root": { py: 0.5, px: 1, fontSize: "0.8125rem" } }}
            >
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center">اسم المريض</MUITableCell>
                  <MUITableCell align="center">تاريخ الزيارة</MUITableCell>
                  <MUITableCell align="center">الطبيب</MUITableCell>
                  <MUITableCell align="center">التحليل</MUITableCell>
                  <MUITableCell align="center">السعر</MUITableCell>
                  <MUITableCell align="center">نسبة الخصم</MUITableCell>
                  <MUITableCell align="center">قيمة الخصم</MUITableCell>
                  <MUITableCell align="center">ملاحظات</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow>
                    <MUITableCell colSpan={8} align="center" className="h-16">
                      لا توجد بيانات للفترة
                    </MUITableCell>
                  </MUITableRow>
                )}
                {dataItems.map((item) => (
                  <MUITableRow key={item.lab_request_id}>
                    <MUITableCell align="center" className="font-medium">
                      {item.patient_name || "-"}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.visit_date
                        ? format(parseISO(item.visit_date), "yyyy-MM-dd")
                        : "-"}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.doctor_name || "-"}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.test_name || "-"}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {formatNumber(item.price)}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.discount_per}%
                    </MUITableCell>
                    <MUITableCell align="center" className="font-semibold">
                      {formatNumber(item.discount_amount)}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.comment || "-"}
                    </MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
              {dataItems.length > 0 && (
                <MUITableFooter>
                  <MUITableRow>
                    <MUITableCell align="center" colSpan={6}>
                      الإجمالي الكلي
                    </MUITableCell>
                    <MUITableCell align="center" className="font-bold">
                      {formatNumber(reportData.total_discount)}
                    </MUITableCell>
                    <MUITableCell align="center" />
                  </MUITableRow>
                </MUITableFooter>
              )}
            </MUITable>
          </Card>
        </>
      )}
    </div>
  );
};

export default LabRequestDiscountsReportPage;
