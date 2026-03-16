import React from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Box
} from "@mui/material";
import { Trash2, Loader2 } from "lucide-react";
import type { EmployeeExpense } from "@/services/employeeService";
import { formatNumber } from "@/lib/utils";
import dayjs from "dayjs";

interface ExpenseTableProps {
  expenses: EmployeeExpense[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  isLoading,
  onDelete,
  isDeleting
}) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead sx={{ bgcolor: "action.hover" }}>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>#</TableCell>
            <TableCell sx={{ fontWeight: "bold", py: 0.5 }}>الموظف</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>كاش</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>بنكك</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>الإجمالي</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>التاريخ</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>بواسطة</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", py: 0.5 }}>حذف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                <Loader2 className="animate-spin" size={20} />
              </TableCell>
            </TableRow>
          ) : expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                لا توجد سجلات
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense, index) => (
              <TableRow key={expense.id} hover>
                <TableCell align="center" sx={{ py: 0.25 }}>{index + 1}</TableCell>
                <TableCell sx={{ fontWeight: "medium", py: 0.25 }}>{expense.employee?.name}</TableCell>
                <TableCell align="center" sx={{ py: 0.25, color: "success.main" }}>{formatNumber(expense.cash_amount)}</TableCell>
                <TableCell align="center" sx={{ py: 0.25, color: "info.main" }}>{formatNumber(expense.bank_amount)}</TableCell>
                <TableCell align="center" sx={{ py: 0.25, fontWeight: 'bold' }}>{formatNumber(expense.amount)}</TableCell>
                <TableCell align="center" sx={{ py: 0.25 }}>
                  <Box sx={{ fontSize: '0.85rem' }}>{dayjs(expense.created_at).format("hh:mm A")}</Box>
                </TableCell>
                <TableCell align="center" sx={{ py: 0.25, fontSize: "0.8rem" }}>{expense.recorded_by?.name || "-"}</TableCell>
                <TableCell align="center" sx={{ py: 0.25 }}>
                  <IconButton 
                    color="error" 
                    size="small" 
                    onClick={() => onDelete(expense.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExpenseTable;
