// src/pages/reports/PatientPhonesReportPage.tsx
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
  Checkbox,
  FormControlLabel,
  Table as MUITable,
  TableBody as MUITableBody,
  TableCell as MUITableCell,
  TableHead as MUITableHead,
  TableRow as MUITableRow,
} from "@mui/material";
import { Loader2, Filter, Phone, AlertTriangle, FileSpreadsheet } from "lucide-react";

import {
  getPatientPhonesReport,
  downloadPatientPhonesExcel,
  type PatientPhoneReportFilters,
} from "@/services/reportService";
import { PATIENT_PHONE_REPORT_COLUMNS, type PatientPhoneReportResponse } from "@/types/reports";
import { getCompaniesList } from "@/services/companyService";
import type { Company } from "@/types/companies";

const DEFAULT_COLUMNS = ["name", "phone", "gender", "created_at"];

const PatientPhonesReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [gender, setGender] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const [filters, setFilters] = useState<PatientPhoneReportFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    gender: null,
    name: null,
    phone: null,
    company_id: null,
    columns: DEFAULT_COLUMNS,
  });

  const { data: companiesForFilter = [] } = useQuery<Company[], Error>({
    queryKey: ["companiesListForReportFilter"],
    queryFn: () => getCompaniesList(),
  });

  const {
    data: reportData,
    isLoading,
    isFetching,
    error,
  } = useQuery<PatientPhoneReportResponse, Error>({
    queryKey: ["patientPhonesReport", filters],
    queryFn: () => getPatientPhonesReport(filters),
    enabled: !!(filters.date_from && filters.date_to && filters.columns.length > 0),
  });

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleApplyFilters = () => {
    setFilters({
      date_from: dateFrom || defaultDateFrom,
      date_to: dateTo || defaultDateTo,
      gender: gender || null,
      name: name || null,
      phone: phone || null,
      company_id: companyId || null,
      columns: selectedColumns.length > 0 ? selectedColumns : DEFAULT_COLUMNS,
    });
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const blob = await downloadPatientPhonesExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Patient_Phones_${filters.date_from}_to_${filters.date_to}.xlsx`;
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
  const reportColumns = reportData?.columns || [];
  const reportPeriod = reportData?.report_period;

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">أرقام هواتف المرضى</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel || isLoading || dataItems.length === 0}
            size="small"
            variant="contained"
            startIcon={!isGeneratingExcel ? <FileSpreadsheet className="h-4 w-4" /> : undefined}
          >
            {isGeneratingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : "تصدير Excel"}
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
            <Typography className="text-xs">النوع</Typography>
            <FormControl size="small">
              <InputLabel id="ppr-gender-filter">النوع</InputLabel>
              <MUISelect
                value={gender}
                onChange={(e) => setGender(String(e.target.value))}
                labelId="ppr-gender-filter"
                label="النوع"
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="male">ذكر</MenuItem>
                <MenuItem value="female">أنثى</MenuItem>
                <MenuItem value="other">آخر</MenuItem>
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">الشركة</Typography>
            <FormControl size="small">
              <InputLabel id="ppr-company-filter">الشركة</InputLabel>
              <MUISelect
                value={companyId}
                onChange={(e) => setCompanyId(String(e.target.value))}
                labelId="ppr-company-filter"
                label="الشركة"
              >
                <MenuItem value="">كل الشركات</MenuItem>
                {companiesForFilter.map((company) => (
                  <MenuItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">اسم المريض</Typography>
            <TextField
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ابحث باسم المريض"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">رقم الهاتف</Typography>
            <TextField
              size="small"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ابحث برقم الهاتف"
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

      <Card>
        <CardContent className="!py-2">
          <Typography className="text-xs font-semibold mb-1">الأعمدة المطلوب تصديرها</Typography>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0">
            {PATIENT_PHONE_REPORT_COLUMNS.map((column) => (
              <FormControlLabel
                key={column.key}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                }
                label={<span className="text-xs">{column.label}</span>}
              />
            ))}
          </div>
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
                {format(parseISO(reportPeriod.to), "yyyy-MM-dd")} | إجمالي النتائج: {reportData.total}
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
                  {reportColumns.map((column) => (
                    <MUITableCell key={column.key} align="center">
                      {column.label}
                    </MUITableCell>
                  ))}
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow>
                    <MUITableCell colSpan={Math.max(1, reportColumns.length)} align="center" className="h-16">
                      لا توجد بيانات للفترة
                    </MUITableCell>
                  </MUITableRow>
                )}
                {dataItems.map((item) => (
                  <MUITableRow key={item.id}>
                    {reportColumns.map((column) => (
                      <MUITableCell key={column.key} align="center">
                        {item[column.key] ?? "-"}
                      </MUITableCell>
                    ))}
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

export default PatientPhonesReportPage;
