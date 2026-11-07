// src/pages/reports/DepartmentRevenueExpensesReportPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

import type {
  DepartmentRevenueExpenseResponse,
  DepartmentRevenueExpenseRow,
  CostCategory,
} from "@/types/finance";
import type { ServiceGroup } from "@/types/services";
import {
  getDepartmentRevenueExpensesReport,
  getCostCategoriesList,
  updateCostCategory,
} from "@/services/costService";
import { getAllServiceGroupsList } from "@/services/serviceGroupService";
import { formatNumber } from "@/lib/utils";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import LinkIcon from "@mui/icons-material/Link";

const NetAmount: React.FC<{ value: number }> = ({ value }) => (
  <Typography component="span" fontWeight="bold" color={value >= 0 ? "success.main" : "error.main"}>
    {formatNumber(value)}
  </Typography>
);

const DepartmentRevenueExpensesReportPage: React.FC = () => {
  const defaultDateFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultDateTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [dateFromInput, setDateFromInput] = useState(defaultDateFrom);
  const [dateToInput, setDateToInput] = useState(defaultDateTo);
  const [appliedFilters, setAppliedFilters] = useState({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
  });
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: report, isLoading, isFetching, error } = useQuery<DepartmentRevenueExpenseResponse, Error>({
    queryKey: ["departmentRevenueExpenses", appliedFilters],
    queryFn: () => getDepartmentRevenueExpensesReport(appliedFilters),
  });

  const { data: costCategories, isLoading: isLoadingCategories } = useQuery<CostCategory[], Error>({
    queryKey: ["costCategoriesListForReport"],
    queryFn: getCostCategoriesList,
  });

  const { data: serviceGroups, isLoading: isLoadingServiceGroups } = useQuery<ServiceGroup[], Error>({
    queryKey: ["serviceGroupsListForDepartmentReport"],
    queryFn: getAllServiceGroupsList,
  });

  const linkMutation = useMutation({
    mutationFn: ({ costCategoryId, serviceGroupId }: { costCategoryId: number; serviceGroupId: number | null }) =>
      updateCostCategory(costCategoryId, { service_group_id: serviceGroupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costCategoriesListForReport"] });
      queryClient.invalidateQueries({ queryKey: ["departmentRevenueExpenses"] });
      toast.success("تم تحديث ربط القسم");
    },
    onError: () => toast.error("فشل تحديث الربط"),
  });

  const handleApplyFilters = () => {
    setAppliedFilters({ date_from: dateFromInput, date_to: dateToInput });
  };

  const rows = report?.data ?? [];
  const summary = report?.summary;
  const unassigned = report?.unassigned_expense;

  if (error && !isLoading) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        حدث خطأ أثناء الجلب: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }} useFlexGap>
        <TextField
          label="من"
          type="date"
          size="small"
          value={dateFromInput}
          onChange={(e) => setDateFromInput(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          label="إلى"
          type="date"
          size="small"
          value={dateToInput}
          onChange={(e) => setDateToInput(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <Button
          variant="contained"
          startIcon={isFetching ? <CircularProgress size={16} color="inherit" /> : <FilterListIcon />}
          onClick={handleApplyFilters}
          disabled={isFetching}
        >
          تطبيق
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => setIsLinkDialogOpen(true)}>
          ربط فئات المصروفات بالأقسام
        </Button>
      </Stack>

      {unassigned && unassigned.total > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          مصروفات غير مرتبطة بقسم: {formatNumber(unassigned.total)}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>القسم</TableCell>
              <TableCell align="center">إيرادات نقدي</TableCell>
              <TableCell align="center">إيرادات بنكي</TableCell>
              <TableCell align="center">إجمالي الإيراد</TableCell>
              <TableCell align="center">المصروفات المرتبطة</TableCell>
              <TableCell align="center">صافي الإيراد</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(isLoading || isFetching) && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isFetching && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isFetching &&
              rows.map((row: DepartmentRevenueExpenseRow) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight="bold">{row.name}</Typography>
                      {row.is_lab && <Chip label="معمل" color="primary" size="small" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">{formatNumber(row.revenue.cash)}</TableCell>
                  <TableCell align="center">{formatNumber(row.revenue.bank)}</TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold">{formatNumber(row.revenue.total)}</Typography>
                  </TableCell>
                  <TableCell align="center">{formatNumber(row.expense.total)}</TableCell>
                  <TableCell align="center">
                    <NetAmount value={row.net} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
          {summary && rows.length > 0 && (
            <TableBody>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell>
                  <Typography fontWeight="bold">الإجمالي</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">{formatNumber(summary.revenue_cash)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">{formatNumber(summary.revenue_bank)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">{formatNumber(summary.revenue_total)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">{formatNumber(summary.expense_total)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <NetAmount value={summary.net} />
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </TableContainer>

      <Dialog open={isLinkDialogOpen} onClose={() => setIsLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ربط فئات المصروفات بالأقسام</DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>فئة المصروف</TableCell>
                  <TableCell align="center" sx={{ width: 240 }}>
                    القسم المرتبط
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(isLoadingCategories || isLoadingServiceGroups) && (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingCategories && !isLoadingServiceGroups && (costCategories?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد فئات مصروفات</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingCategories &&
                  !isLoadingServiceGroups &&
                  costCategories?.map((category) => (
                    <TableRow key={category.id} hover>
                      <TableCell>{category.name}</TableCell>
                      <TableCell align="center">
                        <FormControl size="small" fullWidth>
                          <InputLabel id={`sg-label-${category.id}`}>القسم</InputLabel>
                          <Select
                            labelId={`sg-label-${category.id}`}
                            label="القسم"
                            value={category.service_group_id ? String(category.service_group_id) : ""}
                            onChange={(e) =>
                              linkMutation.mutate({
                                costCategoryId: category.id,
                                serviceGroupId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          >
                            <MenuItem value="">بدون</MenuItem>
                            {serviceGroups?.map((g) => (
                              <MenuItem key={g.id} value={String(g.id)}>
                                {g.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLinkDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentRevenueExpensesReportPage;
