import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton
} from "@mui/material";
import { Users, Trash2, UserPlus } from "lucide-react";
import type { Employee } from "@/services/employeeService";
import { formatNumber } from "@/lib/utils";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface ManageEmployeesDialogProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onAdd: (data: { name: string; job_title: string; department: string; fixed_amount: number }) => Promise<void>;
  onRemove: (id: number) => void;
  isAdding: boolean;
}

const ManageEmployeesDialog: React.FC<ManageEmployeesDialogProps> = ({
  open,
  onClose,
  employees,
  onAdd,
  onRemove,
  isAdding
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    job_title: "",
    department: "",
    fixed_amount: ""
  });

  const handleAdd = async () => {
    if (!newEmployee.name || !newEmployee.fixed_amount) return;
    await onAdd({
      ...newEmployee,
      fixed_amount: parseFloat(newEmployee.fixed_amount)
    });
    setNewEmployee({ name: "", job_title: "", department: "", fixed_amount: "" });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, fontSize: "1rem" }}>
        <Users size={18} />
        إدارة الموظفين
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab label="قائمة الموظفين" sx={{ minHeight: 48 }} />
          <Tab label="إضافة جديد" sx={{ minHeight: 48 }} />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 1 }}>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ py: 0.5 }}>الاسم</TableCell>
                    <TableCell sx={{ py: 0.5 }}>المسمى الوظيفي</TableCell>
                    <TableCell sx={{ py: 0.5 }}>القسم</TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>الاستحقاق</TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id} hover>
                      <TableCell sx={{ py: 0.25 }}>{emp.name}</TableCell>
                      <TableCell sx={{ py: 0.25 }}>{emp.job_title || "-"}</TableCell>
                      <TableCell sx={{ py: 0.25 }}>{emp.department || "-"}</TableCell>
                      <TableCell align="center" sx={{ py: 0.25 }}>{formatNumber(emp.fixed_amount)}</TableCell>
                      <TableCell align="center" sx={{ py: 0.25 }}>
                        <IconButton color="error" size="small" onClick={() => onRemove(emp.id)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2 }}>
            <TextField 
              size="small"
              label="اسم الموظف" 
              value={newEmployee.name} 
              onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
              fullWidth 
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField 
                size="small"
                label="المسمى الوظيفي" 
                value={newEmployee.job_title} 
                onChange={(e) => setNewEmployee({...newEmployee, job_title: e.target.value})}
                fullWidth 
              />
              <TextField 
                size="small"
                label="القسم" 
                value={newEmployee.department} 
                onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                fullWidth 
              />
            </Box>
            <TextField 
              size="small"
              label="الاستحقاق اليومي الثابت" 
              type="number" 
              value={newEmployee.fixed_amount} 
              onChange={(e) => setNewEmployee({...newEmployee, fixed_amount: e.target.value})}
              fullWidth 
            />
            <Button 
              variant="contained" 
              size="small"
              startIcon={<UserPlus size={16} />} 
              onClick={handleAdd}
              disabled={!newEmployee.name || !newEmployee.fixed_amount || isAdding}
            >
              إضافة الموظف
            </Button>
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions sx={{ py: 1, px: 2 }}>
        <Button size="small" onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageEmployeesDialog;
