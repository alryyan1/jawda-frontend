import React, { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Link,
  Collapse,
  IconButton,
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { formatNumber } from "@/lib/utils";
import type { SpecialistShiftReportItem, DoctorShiftReportItem } from "@/types/reports";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface SpecialistShiftsReportTableProps {
  specialistShifts: SpecialistShiftReportItem[];
  isLoading: boolean;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

function SpecialistShiftsReportTable({
  specialistShifts,
  isLoading,
  rowsPerPage = 50,
  onRowsPerPageChange,
}: SpecialistShiftsReportTableProps) {
  const navigate = useNavigate();
  const [expandedSpecialists, setExpandedSpecialists] = useState<Set<number>>(new Set());
  
  const toggleSpecialist = (specialistId: number) => {
    const newExpanded = new Set(expandedSpecialists);
    if (newExpanded.has(specialistId)) {
      newExpanded.delete(specialistId);
    } else {
      newExpanded.add(specialistId);
    }
    setExpandedSpecialists(newExpanded);
  };

  const handleRowClick = (shift: DoctorShiftReportItem) => {
    sessionStorage.setItem('selectedShiftData', JSON.stringify(shift));
    navigate(`/reports/doctor-shifts/${shift.id}`, {
      state: { shiftData: shift }
    });
  };

  const handleDoctorNameClick = (shift: DoctorShiftReportItem, event: React.MouseEvent) => {
    event.stopPropagation();
    sessionStorage.setItem('selectedShiftData', JSON.stringify(shift));
    navigate(`/reports/doctor-shifts/${shift.id}`, {
      state: { shiftData: shift }
    });
  };

  // Calculate grand totals across all specialists
  const grandTotals = specialistShifts.reduce(
    (acc, specialist) => ({
      total_income: acc.total_income + specialist.totals.total_income,
      clinic_enurance: acc.clinic_enurance + specialist.totals.clinic_enurance,
      cash_entitlement: acc.cash_entitlement + specialist.totals.cash_entitlement,
      insurance_entitlement: acc.insurance_entitlement + specialist.totals.insurance_entitlement,
      total_doctor_entitlement: acc.total_doctor_entitlement + specialist.totals.total_doctor_entitlement,
      shifts_count: acc.shifts_count + specialist.totals.shifts_count,
    }),
    {
      total_income: 0,
      clinic_enurance: 0,
      cash_entitlement: 0,
      insurance_entitlement: 0,
      total_doctor_entitlement: 0,
      shifts_count: 0,
    }
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (specialistShifts.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        لا توجد مناوبات أطباء للعرض.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Rows Per Page Filter */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          عدد الصفوف في الصفحة:
        </Typography>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
            sx={{ fontSize: '0.875rem' }}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={200}>200</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer dir="ltr" component={Paper} elevation={2}>
        <Table size="small" sx={{ direction: 'ltr' }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: '50px' }}></TableCell>
              <TableCell align="center">التخصص</TableCell>
              <TableCell align="center">عدد المناوبات</TableCell>
              <TableCell align="center">إجمالي المدفوع</TableCell>
              <TableCell align="center">التحمل</TableCell>
              <TableCell align="center">استحقاق (كاش)</TableCell>
              <TableCell align="center">استحقاق (تأمين)</TableCell>
              <TableCell align="center">إجمالي الاستحقاق</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {specialistShifts.map((specialist) => {
              const isExpanded = expandedSpecialists.has(specialist.specialist_id);
              return (
                <React.Fragment key={specialist.specialist_id}>
                  {/* Specialist Summary Row */}
                  <TableRow
                    sx={{
                      backgroundColor: 'primary.light',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        opacity: 0.8,
                      },
                    }}
                    onClick={() => toggleSpecialist(specialist.specialist_id)}
                  >
                    <TableCell align="center">
                      <IconButton size="small">
                        {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                      {specialist.specialist_name}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {specialist.totals.shifts_count}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatNumber(specialist.totals.total_income)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      {formatNumber(specialist.totals.clinic_enurance)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {formatNumber(specialist.totals.cash_entitlement)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {formatNumber(specialist.totals.insurance_entitlement)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {formatNumber(specialist.totals.total_doctor_entitlement)}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Doctor Shifts Rows */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0, border: 'none' }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell align="center">الحالة</TableCell>
                                <TableCell align="center">تاريخ</TableCell>
                                <TableCell align="center">الطبيب</TableCell>
                                <TableCell align="center">إجمالي المدفوع</TableCell>
                                <TableCell align="center">التحمل</TableCell>
                                <TableCell align="center">استحقاق (كاش)</TableCell>
                                <TableCell align="center">استحقاق (تأمين)</TableCell>
                                <TableCell align="center">إجمالي الاستحقاق</TableCell>
                                <TableCell align="center">المستخدم</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {specialist.doctors.map((shift, index) => (
                                <TableRow
                                  key={shift.id}
                                  onClick={() => handleRowClick(shift)}
                                  sx={{
                                    backgroundColor: index % 2 === 0 ? 'background.paper' : 'grey.50',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <TableCell align="center">
                                    <Box
                                      sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: shift.status ? '#4CAF50' : '#F44336',
                                        margin: '0 auto',
                                        border: '2px solid',
                                        borderColor: shift.status ? '#2E7D32' : '#C62828',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                      }}
                                      title={shift.status ? 'مفتوح' : 'مغلق'}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    {shift.created_at ? dayjs(shift.created_at).format('DD/MM/YYYY HH:mm A') : '-'}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Link
                                      component="button"
                                      onClick={(e) => handleDoctorNameClick(shift, e)}
                                      sx={{
                                        color: 'primary.main',
                                        textDecoration: 'none',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          textDecoration: 'underline',
                                        },
                                        fontWeight: 'medium',
                                      }}
                                    >
                                      {shift.doctor_name || 'N/A'}
                                    </Link>
                                  </TableCell>
                                  <TableCell align="center" sx={{ color: 'success.main' }}>
                                    {formatNumber(shift.total_income || 0)}
                                  </TableCell>
                                  <TableCell align="center" sx={{ color: 'error.main' }}>
                                    {formatNumber(shift.clinic_enurance || 0)}
                                  </TableCell>
                                  <TableCell align="center">
                                    {formatNumber(shift.cash_entitlement || 0)}
                                  </TableCell>
                                  <TableCell align="center">
                                    {formatNumber(shift.insurance_entitlement || 0)}
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    {formatNumber(shift.total_doctor_entitlement || 0)}
                                  </TableCell>
                                  <TableCell align="center">
                                    {shift.user_name_opened || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            
            {/* Grand Total Row */}
            <TableRow
              sx={{
                backgroundColor: 'primary.warning',
                '& .MuiTableCell-root': {
                  fontWeight: 'bold',
                  borderTop: '2px solid',
                  borderColor: 'primary.main'
                }
              }}
            >
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                -
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                المجموع الكلي
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                {grandTotals.shifts_count}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: '1rem' }}>
                {formatNumber(grandTotals.total_income)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main', fontSize: '1rem' }}>
                {formatNumber(grandTotals.clinic_enurance)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                {formatNumber(grandTotals.cash_entitlement)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                {formatNumber(grandTotals.insurance_entitlement)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                {formatNumber(grandTotals.total_doctor_entitlement)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default SpecialistShiftsReportTable;

