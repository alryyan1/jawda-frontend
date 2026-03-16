import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Box,
  Typography
} from "@mui/material";
import type { Employee } from "@/services/employeeService";
import { formatNumber } from "@/lib/utils";

interface AddExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  isLoadingEmployees: boolean;
  onConfirm: (data: { employee_id: number; amount: number; cash_amount: number; bank_amount: number }) => Promise<void>;
  isAdding: boolean;
}

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onClose,
  employees,
  isLoadingEmployees,
  onConfirm,
  isAdding
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");

  const handleEmployeeChange = (employee: Employee | null) => {
    setSelectedEmployee(employee);
    if (employee) {
      setCashAmount(employee.fixed_amount.toString());
      setBankAmount("0");
    } else {
      setCashAmount("");
      setBankAmount("");
    }
  };

  const handleCashChange = (val: string) => {
    if (!selectedEmployee) return;
    const fixed = selectedEmployee.fixed_amount;
    let cash = parseFloat(val) || 0;
    
    if (cash > fixed) cash = fixed;
    if (cash < 0) cash = 0;

    setCashAmount(cash.toString());
    setBankAmount((fixed - cash).toString());
  };

  const handleBankChange = (val: string) => {
    if (!selectedEmployee) return;
    const fixed = selectedEmployee.fixed_amount;
    let bank = parseFloat(val) || 0;
    
    if (bank > fixed) bank = fixed;
    if (bank < 0) bank = 0;

    setBankAmount(bank.toString());
    setCashAmount((fixed - bank).toString());
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) return;
    const cash = parseFloat(cashAmount) || 0;
    const bank = parseFloat(bankAmount) || 0;
    const total = cash + bank;

    await onConfirm({ 
      employee_id: selectedEmployee.id, 
      amount: total,
      cash_amount: cash,
      bank_amount: bank,
    });
    setCashAmount("");
    setBankAmount("");
    setSelectedEmployee(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ py: 1.5, fontSize: "1rem" }}>إضافة مصروف موظف</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Autocomplete
          size="small"
          options={employees}
          getOptionLabel={(option) => `${option.name} (${formatNumber(option.fixed_amount)})`}
          renderInput={(params) => <TextField {...params} label="الموظف" fullWidth variant="outlined" sx={{ mt: 1 }} />}
          value={selectedEmployee}
          onChange={(_, newValue) => handleEmployeeChange(newValue)}
          loading={isLoadingEmployees}
        />
        {selectedEmployee && (
          <Box sx={{ mt: 1.5, mb: 1.5, p: 1, bgcolor: "info.light", borderRadius: 1 }}>
            <Typography variant="caption" display="block">
              الاستحقاق الثابت: <strong>{formatNumber(selectedEmployee.fixed_amount)}</strong>
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
          <TextField
            label="كاش"
            type="number"
            fullWidth
            value={cashAmount}
            onChange={(e) => handleCashChange(e.target.value)}
            size="small"
          />
          <TextField
            label="بنكك"
            type="number"
            fullWidth
            value={bankAmount}
            onChange={(e) => handleBankChange(e.target.value)}
            size="small"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" onClick={onClose}>إلغاء</Button>
        <Button 
          size="small"
          variant="contained" 
          onClick={handleSubmit} 
          disabled={!selectedEmployee || (!cashAmount && !bankAmount) || isAdding}
        >
          إضافة
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddExpenseDialog;
