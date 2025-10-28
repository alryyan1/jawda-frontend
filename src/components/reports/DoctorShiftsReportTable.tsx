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
} from "@mui/material";
import { formatNumber } from "@/lib/utils";
import type { DoctorShiftReportItem } from "@/types/reports";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface DoctorShiftsReportTableProps {
  shifts: DoctorShiftReportItem[];
  isLoading: boolean;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

function DoctorShiftsReportTable({
  shifts,
  isLoading,
  rowsPerPage = 50,
  onRowsPerPageChange,
}: DoctorShiftsReportTableProps) {
  const navigate = useNavigate();
  
  const handleRowClick = (shift: DoctorShiftReportItem) => {
    // const reportUrl = `http://server1/jawda-medical/public/reports/clinic-report-old/pdf?doctor_shift_id=${shiftId}`;
    sessionStorage.setItem('selectedShiftData', JSON.stringify(shift));
    navigate(`/reports/doctor-shifts/${shift.id}`, {
      state: { shiftData: shift }
    });
    // window.open(reportUrl, '_blank');
  };

  const handleDoctorNameClick = (shift: DoctorShiftReportItem, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    
    // Store the shift data in sessionStorage as a fallback
    sessionStorage.setItem('selectedShiftData', JSON.stringify(shift));
    
    navigate(`/reports/doctor-shifts/${shift.id}`, {
      state: { shiftData: shift }
    });
  };

  // Calculate totals for all financial columns
  const totals = shifts.reduce(
    (acc, shift) => ({
      total_income: acc.total_income + (shift.total_income || 0),
      clinic_enurance: acc.clinic_enurance + (shift.clinic_enurance || 0),
      cash_entitlement: acc.cash_entitlement + (shift.cash_entitlement || 0),
      insurance_entitlement: acc.insurance_entitlement + (shift.insurance_entitlement || 0),
      total_doctor_entitlement: acc.total_doctor_entitlement + (shift.total_doctor_entitlement || 0),
    }),
    {
      total_income: 0,
      clinic_enurance: 0,
      cash_entitlement: 0,
      insurance_entitlement: 0,
      total_doctor_entitlement: 0,
    }
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (shifts.length === 0) {
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

      <TableContainer dir="ltr  " component={Paper} elevation={2}>
        <Table size="small" sx={{ direction: 'ltr' }}>
        <TableHead>
          <TableRow>
            <TableCell align="center">الحالة</TableCell>
            <TableCell align="center">تاريخ </TableCell>
            <TableCell align="center">التخصص</TableCell>
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
          {shifts.map((shift, index) => (
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
                    backgroundColor: shift.status ? '#4CAF50' : '#F44336', // Green for open, red for closed
                    margin: '0 auto',
                    border: '2px solid',
                    borderColor: shift.status ? '#2E7D32' : '#C62828', // Darker border
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  title={shift.status ? 'مفتوح' : 'مغلق'}
                />
              </TableCell>
              <TableCell align="center">
                {shift.created_at ? dayjs(shift.created_at).format('DD/MM/YYYY HH:mm A') : '-'}
              </TableCell>
              <TableCell align="center">
                {shift.doctor_specialist_name || '-'}
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
              <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {formatNumber(shift.total_income || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main' }}>
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
          {/* Summary Row */}
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
              المجموع
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              -
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              -
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: '1rem' }}>
              {formatNumber(totals.total_income)}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main', fontSize: '1rem' }}>
              {formatNumber(totals.clinic_enurance)}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              {formatNumber(totals.cash_entitlement)}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              {formatNumber(totals.insurance_entitlement)}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              {formatNumber(totals.total_doctor_entitlement)}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              -
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
    </Box>
  );
}

export default DoctorShiftsReportTable;