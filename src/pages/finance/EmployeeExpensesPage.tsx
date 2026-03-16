import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
} from "@mui/material";
import { Plus, Users, Receipt, Loader2, Printer } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useEmployeeExpenses } from "@/hooks/useEmployeeExpenses";

// Components
import AddExpenseDialog from "@/components/finance/employee-expenses/AddExpenseDialog";
import ManageEmployeesDialog from "@/components/finance/employee-expenses/ManageEmployeesDialog";
import ExpenseTable from "@/components/finance/employee-expenses/ExpenseTable";

const EmployeeExpensesPage: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    employees,
    isLoadingEmployees,
    departments,
    expenses,
    groupedExpenses,
    isLoadingExpenses,
    totalAmount,
    isPrinting,
    handlePrint,
    addExpense,
    isAddingExpense,
    deleteExpense,
    isDeletingExpense,
    addEmployee,
    isAddingEmployee,
    removeEmployee,
    addDepartment,
    isAddingDepartment,
  } = useEmployeeExpenses();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isManageEmployeesOpen, setIsManageEmployeesOpen] = useState(false);

  return (
    <Box sx={{ p: 0.5 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, px: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
          <Receipt size={20} />
          مصروفات الموظفين
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setIsAddExpenseOpen(true)}
          >
            إضافة مصروف
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={isPrinting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
            onClick={handlePrint}
            disabled={isPrinting || expenses.length === 0}
          >
            طباعة تقرير
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<Users size={16} />}
            onClick={() => setIsManageEmployeesOpen(true)}
          >
            إدارة الموظفين
          </Button>
        </Box>
      </Box>

      {/* Summary Filter */}
      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardContent sx={{ p: "8px !important" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                type="date"
                label="التاريخ"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                الإجمالي: <Box component="span" sx={{ color: "primary.main" }}>{formatNumber(totalAmount)}</Box>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Main Tables by Category */}
      {isLoadingExpenses ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Loader2 className="animate-spin" size={32} />
        </Box>
      ) : Object.keys(groupedExpenses).length === 0 ? (
        <ExpenseTable 
          expenses={[]}
          isLoading={false}
          onDelete={deleteExpense}
          isDeleting={isDeletingExpense}
        />
      ) : (
        Object.entries(groupedExpenses).map(([dept, deptExpenses]) => (
          <Box key={dept} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1, px: 1, color: "primary.main", borderLeft: "4px solid", borderColor: "primary.main", pl: 1 }}>
              {dept}
            </Typography>
            <ExpenseTable 
              expenses={deptExpenses}
              isLoading={false}
              onDelete={deleteExpense}
              isDeleting={isDeletingExpense}
            />
          </Box>
        ))
      )}

      {/* Dialogs */}
      <AddExpenseDialog
        open={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        employees={employees}
        isLoadingEmployees={isLoadingEmployees}
        onConfirm={async (data) => {
          await addExpense({ ...data, date: selectedDate });
          setIsAddExpenseOpen(false);
        }}
        isAdding={isAddingExpense}
      />

      <ManageEmployeesDialog
        open={isManageEmployeesOpen}
        onClose={() => setIsManageEmployeesOpen(false)}
        employees={employees}
        departments={departments}
        onAdd={addEmployee}
        onAddDepartment={addDepartment}
        isAdding={isAddingEmployee}
        isAddingDepartment={isAddingDepartment}
        onRemove={removeEmployee}
      />
    </Box>
  );
};

export default EmployeeExpensesPage;
