// src/pages/reports/PatientServiceCostsReportPage.tsx
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
import { Loader2, Filter, Coins, AlertTriangle, FileText } from "lucide-react";

import {
  getPatientServiceCostsReport,
  downloadPatientServiceCostsPdf,
  type PatientServiceCostFilters,
} from "@/services/reportService";
import type { PatientServiceCostReportResponse } from "@/types/reports";
import { formatNumber } from "@/lib/utils";
import { getPartiesList } from "@/services/partyService";
import type { Party } from "@/types/parties";

const PatientServiceCostsReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [partyId, setPartyId] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [filters, setFilters] = useState<PatientServiceCostFilters>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    party_id: null,
  });

  const { data: partiesForFilter = [] } = useQuery<Party[], Error>({
    queryKey: ["partiesListForReportFilter"],
    queryFn: getPartiesList,
  });

  const {
    data: reportData,
    isLoading,
    isFetching,
    error,
  } = useQuery<PatientServiceCostReportResponse, Error>({
    queryKey: ["patientServiceCostsReport", filters],
    queryFn: () => getPatientServiceCostsReport(filters),
    enabled: !!(filters.date_from && filters.date_to),
  });

  const handleApplyFilters = () => {
    setFilters({
      date_from: dateFrom || defaultDateFrom,
      date_to: dateTo || defaultDateTo,
      party_id: partyId || null,
    });
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadPatientServiceCostsPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Patient_Service_Costs_${filters.date_from}_to_${filters.date_to}.pdf`;
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

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">
            تكاليف الخدمات المطلوبة للمرضى
          </h1>
        </div>
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
            <Typography className="text-xs">الجهة</Typography>
            <FormControl size="small">
              <InputLabel id="psc-party-filter">الجهة</InputLabel>
              <MUISelect
                value={partyId}
                onChange={(e) => setPartyId(String(e.target.value))}
                labelId="psc-party-filter"
                label="الجهة"
              >
                <MenuItem value="">كل الجهات</MenuItem>
                {partiesForFilter.map((party) => (
                  <MenuItem key={party.id} value={String(party.id)}>
                    {party.name}
                  </MenuItem>
                ))}
              </MUISelect>
            </FormControl>
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
                  <MUITableCell align="center">الخدمة</MUITableCell>
                  <MUITableCell align="center">إجمالي التكلفة</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {dataItems.length === 0 && (
                  <MUITableRow>
                    <MUITableCell colSpan={4} align="center" className="h-16">
                      لا توجد بيانات للفترة
                    </MUITableCell>
                  </MUITableRow>
                )}
                {dataItems.map((item) => (
                  <MUITableRow key={item.requested_service_id}>
                    <MUITableCell align="center" className="font-medium">
                      {item.patient_name || "-"}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.visit_date
                        ? format(parseISO(item.visit_date), "yyyy-MM-dd")
                        : "-"}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {item.service_name || "-"}
                    </MUITableCell>
                    <MUITableCell align="center" className="font-semibold">
                      {formatNumber(item.total_cost)}
                    </MUITableCell>
                  </MUITableRow>
                ))}
              </MUITableBody>
              {dataItems.length > 0 && (
                <MUITableFooter>
                  <MUITableRow>
                    <MUITableCell align="center" colSpan={3}>
                      الإجمالي الكلي
                    </MUITableCell>
                    <MUITableCell align="center" className="font-bold">
                      {formatNumber(reportData.total_cost)}
                    </MUITableCell>
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

export default PatientServiceCostsReportPage;
