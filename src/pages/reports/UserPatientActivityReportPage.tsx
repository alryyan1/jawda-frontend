// src/pages/reports/UserPatientActivityReportPage.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Checkbox,
  FormControlLabel,
  Alert,
  Table as MUITable,
  TableBody as MUITableBody,
  TableCell as MUITableCell,
  TableContainer as MUITableContainer,
  TableHead as MUITableHead,
  TableRow as MUITableRow,
} from "@mui/material";
import { Loader2, Filter, ShieldAlert, FileText, AlertTriangle, Repeat } from "lucide-react";

import {
  getUserPatientActivityReport,
  downloadUserPatientActivityPdf,
} from "@/services/reportService";
import type { UserPatientActivityFilters, UserPatientActivityReportResponse } from "@/types/reports";
import { formatNumber } from "@/lib/utils";
import { getUsersList } from "@/services/userService";
import { getCompaniesList } from "@/services/companyService";

const UserPatientActivityReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [userId, setUserId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [companyId, setCompanyId] = useState<string>("");
  const [discountedOnly, setDiscountedOnly] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [filters, setFilters] = useState<UserPatientActivityFilters | null>(null);

  const { data: usersForFilter = [] } = useQuery({
    queryKey: ["usersListForReportFilter"],
    queryFn: () => getUsersList(),
  });

  const { data: companiesForFilter = [] } = useQuery({
    queryKey: ["companiesListForReportFilter"],
    queryFn: () => getCompaniesList(),
  });

  const {
    data: reportData,
    isLoading,
    isFetching,
    error,
  } = useQuery<UserPatientActivityReportResponse, Error>({
    queryKey: ["userPatientActivityReport", filters],
    queryFn: () => getUserPatientActivityReport(filters as UserPatientActivityFilters),
    enabled: !!(filters?.user_id && filters?.date_from && filters?.date_to),
  });

  const handleApplyFilters = () => {
    if (!userId) {
      toast.error("يرجى اختيار المستخدم المطلوب مراقبته أولاً");
      return;
    }
    setFilters({
      user_id: userId,
      date_from: dateFrom || defaultDateFrom,
      date_to: dateTo || defaultDateTo,
      company_id: companyId || null,
      discounted_only: discountedOnly,
    });
  };

  const handleDownloadPdf = async () => {
    if (!filters) return;
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadUserPatientActivityPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `User_Patient_Activity_${filters.date_from}_to_${filters.date_to}.pdf`;
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

  const dataItems = useMemo(() => reportData?.data || [], [reportData]);
  const reportPeriod = reportData?.report_period;
  const summary = reportData?.summary;
  const repeatPatients = reportData?.repeat_patients || [];

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">
            مراقبة نشاط تسجيل المرضى للمستخدم
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isLoading || !reportData}
            size="small"
            variant="contained"
            startIcon={!isGeneratingPdf ? <FileText className="h-4 w-4" /> : undefined}
          >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : "طباعة PDF"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-end !py-2">
          <div className="flex flex-col gap-1">
            <Typography className="text-xs">المستخدم</Typography>
            <FormControl size="small" required>
              <InputLabel id="upa-user-filter">المستخدم</InputLabel>
              <MUISelect
                value={userId}
                onChange={(e) => setUserId(String(e.target.value))}
                labelId="upa-user-filter"
                label="المستخدم"
              >
                <MenuItem value="">
                  <em>اختر مستخدماً</em>
                </MenuItem>
                {usersForFilter.map((user) => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
          </div>
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
            <Typography className="text-xs">الشركة</Typography>
            <FormControl size="small">
              <InputLabel id="upa-company-filter">الشركة</InputLabel>
              <MUISelect
                value={companyId}
                onChange={(e) => setCompanyId(String(e.target.value))}
                labelId="upa-company-filter"
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
          <div className="flex items-center gap-2">
            <FormControlLabel
              control={
                <Checkbox
                  checked={discountedOnly}
                  onChange={(e) => setDiscountedOnly(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography className="text-xs">المرضى الذين تم تخفيض عليهم فقط</Typography>}
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

      {(isLoading || isFetching) && (
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
            المستخدم: {reportData.user.name}
            {reportPeriod && (
              <>
                {" "}
                | الفترة: {format(parseISO(reportPeriod.from), "yyyy-MM-dd")} -{" "}
                {format(parseISO(reportPeriod.to), "yyyy-MM-dd")}
              </>
            )}
            {reportData.filters.company_name && <> | الشركة: {reportData.filters.company_name}</>}
          </Typography>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <SummaryTile label="إجمالي المرضى" value={summary.total_patients} />
              <SummaryTile label="مرضى بتخفيض" value={summary.discounted_patients_count} />
              <SummaryTile label="إجمالي الخصومات" value={formatNumber(summary.total_discount)} highlight />
              <SummaryTile
                label="خصم كامل (100%)"
                value={summary.full_discount_count}
                highlight={summary.full_discount_count > 0}
              />
            </div>
          )}

          {repeatPatients.length > 0 && (
            <Alert severity="warning" icon={<Repeat />} sx={{ py: 0.5 }}>
              <Typography variant="body2" className="font-semibold">
                مرضى تكرر تخفيضهم من هذا المستخدم (قد تستدعي المراجعة)
              </Typography>
              <ul className="text-xs mt-1 list-disc ltr:pl-4 rtl:pr-4">
                {repeatPatients.map((rp, idx) => (
                  <li key={idx}>
                    {rp.patient_name} ({rp.phone || "-"}) — تكرر {rp.times} مرات، إجمالي خصم{" "}
                    {formatNumber(rp.total_discount)}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <Card>
            <MUITableContainer sx={{ maxHeight: "calc(100vh - 320px)" }}>
            <MUITable
              stickyHeader
              size="small"
              sx={{ "& .MuiTableCell-root": { py: 0.5, px: 1, fontSize: "0.8125rem" } }}
            >
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center">اسم المريض</MUITableCell>
                  <MUITableCell align="center">رقم الهاتف</MUITableCell>
                  <MUITableCell align="center">الشركة</MUITableCell>
                  <MUITableCell align="center">تاريخ التسجيل</MUITableCell>
                  <MUITableCell align="center">وقت الدخول</MUITableCell>
                  <MUITableCell align="center">رقم الزيارة</MUITableCell>
                  <MUITableCell align="center">الإجمالي</MUITableCell>
                  <MUITableCell align="center">المبلغ المدفوع</MUITableCell>
                  <MUITableCell align="center">الخصم</MUITableCell>
                  <MUITableCell align="center">الصافي</MUITableCell>
                  <MUITableCell align="center">نسبة الخصم</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow>
                    <MUITableCell colSpan={11} align="center" className="h-16">
                      لا توجد بيانات للفترة
                    </MUITableCell>
                  </MUITableRow>
                )}
                {dataItems.map((item) => (
                  <MUITableRow
                    key={item.patient_id}
                    sx={item.is_high_risk ? { "& .MuiTableCell-root": { color: "error.main", fontWeight: 600 } } : undefined}
                  >
                    <MUITableCell align="center">{item.patient_name || "-"}</MUITableCell>
                    <MUITableCell align="center">{item.phone || "-"}</MUITableCell>
                    <MUITableCell align="center">{item.company_name || "نقد"}</MUITableCell>
                    <MUITableCell align="center">
                      {item.registered_at ? format(parseISO(item.registered_at), "yyyy-MM-dd") : "-"}
                    </MUITableCell>
                    <MUITableCell align="center">{item.registered_time || "-"}</MUITableCell>
                    <MUITableCell align="center">
                      {item.visit_id ? (
                        <Link to={`/patients/visit/${item.visit_id}`} className="underline text-primary">
                          #{item.visit_id}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.gross_total)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.amount_paid)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.discount_total)}</MUITableCell>
                    <MUITableCell align="center">{formatNumber(item.net_total)}</MUITableCell>
                    <MUITableCell align="center">{item.discount_percent}%</MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
            </MUITable>
            </MUITableContainer>
          </Card>
        </>
      )}
    </div>
  );
};

const SummaryTile: React.FC<{ label: string; value: React.ReactNode; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <Card className="!shadow-none border">
    <CardContent className="!py-2 !px-3 text-center">
      <Typography className="text-xs text-muted-foreground">{label}</Typography>
      <Typography className={`text-base font-bold ${highlight ? "text-destructive" : ""}`}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export default UserPatientActivityReportPage;
