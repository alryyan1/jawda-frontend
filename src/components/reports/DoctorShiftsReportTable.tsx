import React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { formatNumber } from "@/lib/utils";
import type { DoctorShiftReportItem } from "@/types/reports";

interface DoctorShiftsReportTableProps {
  shifts: DoctorShiftReportItem[];
  isLoading: boolean;
  isFetching: boolean;
  isGeneratingSummaryPdfId: number | null;
  closeShiftMutation: any;
  proofingFlagsMutation: any;
  canCloseShifts: boolean;
  canRecordEntitlementCost: boolean;
  canUpdateProofing: boolean;
  onDownloadSummaryPdf: (shift: DoctorShiftReportItem) => void;
  onOpenAddCostDialog: (shift: DoctorShiftReportItem) => void;
  onProofingAction: (shiftId: number, flagField: string, currentValue?: boolean) => void;
}

function DoctorShiftsReportTable({
  shifts,
  isLoading,
  isFetching,
  isGeneratingSummaryPdfId,
  closeShiftMutation,
  proofingFlagsMutation,
  canCloseShifts,
  canRecordEntitlementCost,
  canUpdateProofing,
  onDownloadSummaryPdf,
  onOpenAddCostDialog,
  onProofingAction,
}: DoctorShiftsReportTableProps) {
  // Calculate grand totals
  const grandTotals = shifts.reduce(
    (acc, shift) => ({
      total_entitlement: acc.total_entitlement + (shift.total_doctor_entitlement || 0),
      cash_entitlement: acc.cash_entitlement + (shift.cash_entitlement || 0),
      insurance_entitlement: acc.insurance_entitlement + (shift.insurance_entitlement || 0),
    }),
    { total_entitlement: 0, cash_entitlement: 0, insurance_entitlement: 0 }
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
    <TableContainer dir="ltr  " component={Paper} elevation={2}>
      <Table size="small" sx={{ direction: 'ltr' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'primary.main', '& .MuiTableCell-head': { color: 'white' } }}>
            <TableCell align="center">التخصص</TableCell>
            <TableCell align="center">الطبيب</TableCell>
            <TableCell align="center">إجمالي المستحق</TableCell>
            <TableCell align="center">استحقاق (كاش)</TableCell>
            <TableCell align="center">استحقاق (تأمين)</TableCell>
            <TableCell align="center">الموظف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shifts.map((shift, index) => (
            <TableRow 
              key={shift.id} 
              sx={{ 
                backgroundColor: index % 2 === 0 ? 'background.paper' : 'grey.50',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <TableCell align="center">
                {shift.doctor_specialist_name || '-'}
              </TableCell>
              <TableCell align="center">
                {shift.doctor_name || 'N/A'}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                {formatNumber(shift.total_doctor_entitlement || 0)}
              </TableCell>
              <TableCell align="center">
                {formatNumber(shift.cash_entitlement || 0)}
              </TableCell>
              <TableCell align="center">
                {formatNumber(shift.insurance_entitlement || 0)}
              </TableCell>
              <TableCell align="center">
                {shift.user_name_opened || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DoctorShiftsReportTable;