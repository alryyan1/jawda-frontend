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
  IconButton,
  Autocomplete,
  Divider,
  Typography,
  Select,
  MenuItem
} from "@mui/material";
import { Users, Trash2, UserPlus, Plus } from "lucide-react";
import type { Employee, Department } from "@/services/employeeService";
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
  departments: Department[];
  onAdd: (data: { name: string; job_title: string; department_id: number; fixed_amount: number }) => Promise<Employee>;
  onRemove: (id: number) => void;
  onUpdate: (id: number, data: Partial<Employee>) => Promise<Employee>;
  onAddDepartment: (data: { name: string }) => Promise<Department>;
  isAdding: boolean;
  isAddingDepartment: boolean;
  isUpdating: boolean;
}

const ManageEmployeesDialog: React.FC<ManageEmployeesDialogProps> = ({
  open,
  onClose,
  employees,
  departments,
  onAdd,
  onRemove,
  onUpdate,
  onAddDepartment,
  isAdding,
  isAddingDepartment,
  isUpdating
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    job_title: "",
    department_id: "" as string | number,
    fixed_amount: ""
  });
  const [newDeptName, setNewDeptName] = useState("");

  const handleAdd = async () => {
    if (!newEmployee.name || !newEmployee.fixed_amount || !newEmployee.department_id) return;
    await onAdd({
      ...newEmployee,
      department_id: Number(newEmployee.department_id),
      fixed_amount: parseFloat(newEmployee.fixed_amount)
    });
    setNewEmployee({ name: "", job_title: "", department_id: "", fixed_amount: "" });
  };

  const handleAddDepartment = async () => {
    if (!newDeptName) return;
    await onAddDepartment({ name: newDeptName });
    setNewDeptName("");
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
                      <TableCell sx={{ py: 0.25 }}>
                        <Select
                          size="small"
                          value={emp.department_id || ""}
                          onChange={(e) => onUpdate(emp.id, { department_id: Number(e.target.value) })}
                          disabled={isUpdating}
                          variant="standard"
                          sx={{ fontSize: "0.875rem" }}
                          fullWidth
                        >
                          {departments.map((d) => (
                            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
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
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Department Section */}
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                إدارة الأقسام
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField 
                  size="small"
                  label="اسم قسم جديد" 
                  value={newDeptName} 
                  onChange={(e) => setNewDeptName(e.target.value)}
                  fullWidth 
                />
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={handleAddDepartment}
                  disabled={!newDeptName || isAddingDepartment}
                >
                  إضافة
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* Employee Section */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                بيانات الموظف
              </Typography>
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
                <Autocomplete
                  size="small"
                  fullWidth
                  options={departments}
                  getOptionLabel={(option) => option.name}
                  value={departments.find(d => d.id === newEmployee.department_id) || null}
                  onChange={(_, v) => setNewEmployee({...newEmployee, department_id: v?.id || ""})}
                  renderInput={(params) => <TextField {...params} label="القسم" />}
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
                disabled={!newEmployee.name || !newEmployee.fixed_amount || !newEmployee.department_id || isAdding}
              >
                إضافة الموظف
              </Button>
            </Box>
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
