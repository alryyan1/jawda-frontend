import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Stack,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Operation, OperationFilters } from "../../types/operations";
import { operationService } from "../../services/operationService";
import { format } from "date-fns";

export default function OperationsListPage() {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OperationFilters>({
    status: "",
    date_from: "",
    date_to: "",
  });

  // Financial summary
  const [summary, setSummary] = useState({
    totalStaff: 0,
    totalCenter: 0,
    totalAmount: 0,
    totalBalance: 0,
  });

  useEffect(() => {
    loadOperations();
  }, [filters]);

  const loadOperations = async () => {
    try {
      setLoading(true);
      const response = await operationService.getOperations(filters);
      setOperations(response.data);

      // Calculate summary
      const totalStaff = response.data.reduce(
        (sum, op) => sum + op.total_staff,
        0,
      );
      const totalCenter = response.data.reduce(
        (sum, op) => sum + op.total_center,
        0,
      );
      const totalAmount = response.data.reduce(
        (sum, op) => sum + op.total_amount,
        0,
      );
      const totalBalance = response.data.reduce(
        (sum, op) => sum + op.balance,
        0,
      );

      setSummary({
        totalStaff,
        totalCenter,
        totalAmount,
        totalBalance,
      });
    } catch (error) {
      console.error("Error loading operations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof OperationFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "مكتملة";
      case "pending":
        return "قيد الانتظار";
      case "cancelled":
        return "ملغاة";
      default:
        return status;
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذه العملية؟")) {
      try {
        await operationService.deleteOperation(id);
        loadOperations();
      } catch (error) {
        console.error("Error deleting operation:", error);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">إدارة العمليات الجراحية</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/operations/new")}
        >
          عملية جديدة
        </Button>
      </Box>

      {/* Financial Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي الكادر
              </Typography>
              <Typography variant="h5">
                ${summary.totalStaff.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المركز
              </Typography>
              <Typography variant="h5">
                ${summary.totalCenter.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الإجمالي الكلي
              </Typography>
              <Typography variant="h5">
                ${summary.totalAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor:
                summary.totalBalance > 0 ? "#fff3e0" : "background.paper",
            }}
          >
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الرصيد المتبقي
              </Typography>
              <Typography
                variant="h5"
                color={
                  summary.totalBalance > 0 ? "warning.main" : "success.main"
                }
              >
                ${summary.totalBalance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="الحالة"
            select
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="pending">قيد الانتظار</MenuItem>
            <MenuItem value="completed">مكتملة</MenuItem>
            <MenuItem value="cancelled">ملغاة</MenuItem>
          </TextField>

          <TextField
            label="من تاريخ"
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => handleFilterChange("date_from", e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <TextField
            label="إلى تاريخ"
            type="date"
            value={filters.date_to || ""}
            onChange={(e) => handleFilterChange("date_to", e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Stack>
      </Paper>

      {/* Operations Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الوقت</TableCell>
              <TableCell>نوع العملية</TableCell>
              <TableCell>المريض</TableCell>
              <TableCell>نصيب الجراح</TableCell>
              <TableCell>إجمالي الكادر</TableCell>
              <TableCell>إجمالي المركز</TableCell>
              <TableCell>المبلغ الكلي</TableCell>
              <TableCell>الرصيد</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : operations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  لا توجد عمليات
                </TableCell>
              </TableRow>
            ) : (
              operations.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell>
                    {format(new Date(operation.operation_date), "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell>{operation.operation_time || "-"}</TableCell>
                  <TableCell>{operation.operation_type}</TableCell>
                  <TableCell>
                    {operation.admission?.patient?.name || "غير محدد"}
                  </TableCell>
                  <TableCell>${operation.surgeon_fee.toFixed(2)}</TableCell>
                  <TableCell>${operation.total_staff.toFixed(2)}</TableCell>
                  <TableCell>${operation.total_center.toFixed(2)}</TableCell>
                  <TableCell>
                    <strong>${operation.total_amount.toFixed(2)}</strong>
                  </TableCell>
                  <TableCell>
                    <Typography
                      color={
                        operation.balance > 0 ? "warning.main" : "success.main"
                      }
                      fontWeight="bold"
                    >
                      ${operation.balance.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(operation.status)}
                      color={getStatusColor(operation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/operations/${operation.id}`)}
                      title="عرض"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        navigate(`/operations/${operation.id}/edit`)
                      }
                      title="تعديل"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(operation.id)}
                      title="حذف"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
