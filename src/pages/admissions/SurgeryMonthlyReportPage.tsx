import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Skeleton,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Description as FileText,
  Download,
} from "@mui/icons-material";
import { getSurgeryDailyReport } from "@/services/surgicalOperationService";

interface DailyRecord {
  date: string;
  surgeries_count: number;
  total_income: number;
  staff_charges: number;
  center_charges: number;
  total_cash: number;
  total_bank: number;
}

export default function SurgeryMonthlyReportPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const theme = useTheme();

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: reportResponse, isLoading } = useQuery({
    queryKey: ["surgeryDailyReport", year, month],
    queryFn: () => getSurgeryDailyReport({ year, month }),
  });

  const reportData: DailyRecord[] = reportResponse?.data || [];

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const totals = reportData.reduce(
    (acc, curr) => ({
      count: acc.count + curr.surgeries_count,
      income: acc.income + curr.total_income,
      staff: acc.staff + curr.staff_charges,
      center: acc.center + curr.center_charges,
      cash: acc.cash + curr.total_cash,
      bank: acc.bank + curr.total_bank,
    }),
    { count: 0, income: 0, staff: 0, center: 0, cash: 0, bank: 0 },
  );

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "center" },
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            gutterBottom
            sx={{ letterSpacing: "-0.02em" }}
          >
            تقرير العمليات الشهري
          </Typography>
          <Typography variant="body1" color="text.secondary">
            عرض تفصيلي للعمليات والتحصيل اليومي
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 0.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: "blur(8px)",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <IconButton onClick={handlePrevMonth} size="small">
            <ChevronRight />
          </IconButton>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 2, minWidth: 160, justifyContent: "center" }}
          >
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={700}>
              {format(currentDate, "MMMM yyyy", { locale: ar })}
            </Typography>
          </Stack>

          <IconButton onClick={handleNextMonth} size="small">
            <ChevronLeft />
          </IconButton>
        </Paper>
      </Box>

      {/* Stats Cards Section */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard title="إجمالي العمليات" value={totals.count} unit="عملية" />
        <StatCard
          title="إجمالي الدخل"
          value={formatNumber(totals.income)}
          highlight
        />
        <StatCard title="إجمالي الكادر" value={formatNumber(totals.staff)} />
        <StatCard title="إجمالي المركز" value={formatNumber(totals.center)} />
      </Box>

      {/* Table Section */}
      <Paper
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 4px 20px -5px ${alpha(theme.palette.common.black, 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
            bgcolor: alpha(theme.palette.action.hover, 0.02),
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                p: 0.8,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                display: "flex",
              }}
            >
              <FileText fontSize="small" />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              تفاصيل الأيام
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            sx={{
              borderRadius: 1.5,
              borderColor: alpha(theme.palette.primary.main, 0.2),
              color: "primary.main",
              fontWeight: 600,
              fontSize: "0.75rem",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            تصدير PDF
          </Button>
        </Box>

        <TableContainer
          sx={{ maxHeight: "calc(100vh - 380px)", overflow: "auto" }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  التاريخ
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  العدد
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  الدخل
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    color: "success.main",
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  كادر
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  مركز
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  كاش
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    py: 1.5,
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  }}
                >
                  بنكك
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" height={24} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ height: 200 }}>
                    <Stack
                      spacing={2}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Typography variant="body1" color="text.secondary">
                        لا توجد بيانات لهذا الشهر
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((day) => (
                  <TableRow
                    key={day.date}
                    sx={{
                      "&:hover": {
                        bgcolor: alpha(theme.palette.action.hover, 0.02),
                      },
                      transition: "background-color 0.2s",
                    }}
                  >
                    <TableCell
                      sx={{ fontWeight: 600, py: 1, fontSize: "0.85rem" }}
                    >
                      {format(new Date(day.date), "dd EEE", { locale: ar })}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {day.surgeries_count > 0 ? day.surgeries_count : "-"}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {day.total_income > 0
                        ? formatNumber(day.total_income)
                        : "-"}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        color: "success.main",
                        fontWeight: 500,
                      }}
                    >
                      {day.staff_charges > 0
                        ? formatNumber(day.staff_charges)
                        : "-"}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        color: "primary.main",
                        fontWeight: 500,
                      }}
                    >
                      {day.center_charges > 0
                        ? formatNumber(day.center_charges)
                        : "-"}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {day.total_cash > 0 ? formatNumber(day.total_cash) : "-"}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {day.total_bank > 0 ? formatNumber(day.total_bank) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {!isLoading && reportData.length > 0 && (
                <TableRow
                  sx={{ bgcolor: alpha(theme.palette.action.hover, 0.06) }}
                >
                  <TableCell sx={{ fontWeight: 900, fontSize: "1.05rem" }}>
                    الإجمالي
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {totals.count}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatNumber(totals.income)}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      fontVariantNumeric: "tabular-nums",
                      color: "success.main",
                    }}
                  >
                    {formatNumber(totals.staff)}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      fontVariantNumeric: "tabular-nums",
                      color: "primary.main",
                    }}
                  >
                    {formatNumber(totals.center)}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatNumber(totals.cash)}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatNumber(totals.bank)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}

function StatCard({
  title,
  value,
  unit,
  highlight = false,
}: {
  title: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}) {
  const theme = useTheme();

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: highlight
          ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
          : alpha(theme.palette.background.paper, 0.8),
        color: highlight ? theme.palette.primary.contrastText : "inherit",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: `0 12px 20px -8px ${alpha(highlight ? theme.palette.primary.main : theme.palette.common.black, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            mb: 1.5,
            display: "block",
            textTransform: "uppercase",
            letterSpacing: 1,
            opacity: highlight ? 0.9 : 0.6,
          }}
        >
          {title}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="baseline">
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ letterSpacing: "-0.01em" }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography
              variant="caption"
              sx={{ opacity: 0.7, fontWeight: 600 }}
            >
              {unit}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
