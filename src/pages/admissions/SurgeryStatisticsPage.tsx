import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getSurgeryStatistics } from "@/services/surgicalOperationService";
import {
  MedicalServices,
  AttachMoney,
  AccountBalanceWallet,
  WarningAmber,
} from "@mui/icons-material";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
const STATUS_COLORS = {
  pending: "#FFBB28",
  approved: "#00C49F",
  rejected: "#FF8042",
};

export default function SurgeryStatisticsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["surgeryStatistics", startDate, endDate],
    queryFn: () =>
      getSurgeryStatistics({ start_date: startDate, end_date: endDate }),
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box p={3}>
        <Typography color="error">Error loading statistics.</Typography>
      </Box>
    );
  }

  const {
    summary,
    top_surgeries,
    status_breakdown,
    monthly_trend,
    doctor_performance,
  } = data;

  const pieData = [
    { name: "قيد الانتظار", value: status_breakdown.pending },
    { name: "معتمد", value: status_breakdown.approved },
    { name: "مرفوض", value: status_breakdown.rejected },
  ].filter((d) => d.value > 0);

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          إحصائيات العمليات الجراحية
        </Typography>

        <Box display="flex" gap={2}>
          <TextField
            label="من تاريخ"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            size="small"
          />
          <TextField
            label="إلى تاريخ"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            size="small"
          />
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}
          >
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="subtitle2">إجمالي العمليات</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.total_surgeries}
                  </Typography>
                </Box>
                <MedicalServices fontSize="large" sx={{ opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ bgcolor: "success.light", color: "success.contrastText" }}
          >
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="subtitle2">
                    إجمالي الإيرادات (تمت الفوترة)
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.total_revenue.toLocaleString()} SDG
                  </Typography>
                </Box>
                <AttachMoney fontSize="large" sx={{ opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "info.light", color: "info.contrastText" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="subtitle2">
                    إجمالي التحصيل (المدفوع)
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.total_collected.toLocaleString()} SDG
                  </Typography>
                </Box>
                <AccountBalanceWallet fontSize="large" sx={{ opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor:
                summary.outstanding_balance > 0 ? "warning.light" : "grey.200",
              color:
                summary.outstanding_balance > 0
                  ? "warning.contrastText"
                  : "text.primary",
            }}
          >
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="subtitle2">الرصيد المتبقي</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.outstanding_balance.toLocaleString()} SDG
                  </Typography>
                </Box>
                <WarningAmber fontSize="large" sx={{ opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" mb={2}>
              التوجه الشهري للعمليات
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="عدد العمليات"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" mb={2} align="center">
              حالة العمليات
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => {
                      let color = STATUS_COLORS.pending;
                      if (entry.name === "معتمد")
                        color = STATUS_COLORS.approved;
                      if (entry.name === "مرفوض")
                        color = STATUS_COLORS.rejected;
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 & Table */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" mb={2}>
              أكثر 5 عمليات طلبًا
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top_surgeries}
                  layout="vertical"
                  margin={{ left: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="count" name="عدد المرات" fill="#82ca9d">
                    {top_surgeries.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" mb={2}>
              أداء الأطباء (حسب العمليات المطلوبة)
            </Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الطبيب</TableCell>
                    <TableCell align="center">عدد العمليات</TableCell>
                    <TableCell align="left">الإيرادات (SDG)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {doctor_performance.map((row) => (
                    <TableRow key={row.doctor_id}>
                      <TableCell component="th" scope="row">
                        {row.doctor_name}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            bgcolor: "primary.main",
                            color: "white",
                            borderRadius: "10px",
                            px: 1,
                            py: 0.5,
                            display: "inline-block",
                            minWidth: "30px",
                          }}
                        >
                          {row.surgery_count}
                        </Box>
                      </TableCell>
                      <TableCell align="left">
                        {row.generated_revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {doctor_performance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
