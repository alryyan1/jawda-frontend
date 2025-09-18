import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Loader2, MoreHorizontal, Download, XCircle, CheckCircle, ShieldQuestion, Edit } from "lucide-react";

import { formatNumber } from "@/lib/utils";

import type { DoctorShiftReportItem } from "@/types/reports";

// MUI components
import {
  Card,
  Table as MUITable,
  TableBody as MUITableBody,
  TableCell as MUITableCell,
  TableHead as MUITableHead,
  TableRow as MUITableRow,
  TableContainer,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Typography,
  Box,
} from "@mui/material";

type ProofingFlagKey = keyof Pick<
  DoctorShiftReportItem,
  | "is_cash_revenue_prooved"
  | "is_cash_reclaim_prooved"
  | "is_company_revenue_prooved"
  | "is_company_reclaim_prooved"
>;

interface DoctorShiftsReportTableProps {
  shifts: DoctorShiftReportItem[];
  isLoading: boolean;
  isFetching: boolean;
  isGeneratingSummaryPdfId: number | null;
  closeShiftMutation: {
    mutate: (id: number) => void;
    isPending: boolean;
    variables: number | undefined;
  };
  proofingFlagsMutation: {
    isPending: boolean;
  };
  canCloseShifts: boolean;
  canRecordEntitlementCost: boolean;
  canUpdateProofing: boolean;
  onDownloadSummaryPdf: (shift: DoctorShiftReportItem) => void;
  onOpenAddCostDialog: (shift: DoctorShiftReportItem) => void;
  onProofingAction: (shiftId: number, flagField: ProofingFlagKey, currentValue?: boolean) => void;
}

const DoctorShiftsReportTable: React.FC<DoctorShiftsReportTableProps> = ({
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
}) => {
  const dateLocale = arSA;

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRowId, setMenuRowId] = useState<number | null>(null);
  const isMenuOpen = Boolean(menuAnchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, rowId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRowId(rowId);
  };
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuRowId(null);
  };

  if (isLoading && !isFetching && shifts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (shifts.length === 0 && !isFetching) {
    return (
      <Card className="text-center py-10 text-muted-foreground mt-6">
        <div className="p-4">لا توجد بيانات مطابقة للمرشحات</div>
      </Card>
    );
  }

  const currentRow = shifts.find((s) => s.id === menuRowId) || null;

  return (
    <Card className="mt-6 overflow-hidden">
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 420px)' }}>
        <Box className="min-w-[1200px]">
          <MUITable size="small">
            <MUITableHead>
              <MUITableRow>
                <MUITableCell align="center" className="min-w-[140px]">اسم الطبيب</MUITableCell>
                <MUITableCell align="center" className="hidden md:table-cell min-w-[110px]">التخصص</MUITableCell>
                <MUITableCell align="center" className="min-w-[90px]">إجمالي الاستحقاق</MUITableCell>
                <MUITableCell align="center" className="hidden md:table-cell min-w-[90px]">استحقاق نقدي</MUITableCell>
                <MUITableCell align="center" className="hidden md:table-cell min-w-[90px]">استحقاق تأميني</MUITableCell>
                <MUITableCell align="center" className="min-w-[70px]">الحالة</MUITableCell>
                <MUITableCell align="center" className="min-w-[100px] hidden xl:table-cell">فُتحت بواسطة</MUITableCell>
                <MUITableCell align="center" className="min-w-[100px] hidden xl:table-cell">تاريخ الإنشاء</MUITableCell>
                <MUITableCell align="right" className="min-w-[110px] sticky right-0 bg-card z-10">إجراءات</MUITableCell>
              </MUITableRow>
            </MUITableHead>
            <MUITableBody>
              {shifts.map((ds: DoctorShiftReportItem) => (
                <MUITableRow key={ds.id} className={ds.status ? "bg-green-50/50 dark:bg-green-900/20" : ""}>
                  <MUITableCell align="center" className="font-medium">{ds.doctor_name}</MUITableCell>
                  <MUITableCell align="center" className="hidden md:table-cell">{ds.doctor_specialist_name || "-"}</MUITableCell>
                  <MUITableCell align="center" className="font-semibold">{formatNumber(ds.total_doctor_entitlement || 0)}</MUITableCell>
                  <MUITableCell align="center" className="hidden md:table-cell">{formatNumber(ds.cash_entitlement || 0)}</MUITableCell>
                  <MUITableCell align="center" className="hidden md:table-cell">{formatNumber(ds.insurance_entitlement || 0)}</MUITableCell>
                  <MUITableCell align="center">
                    <Chip
                      label={ds.status_text}
                      color={ds.status ? "success" : "default"}
                      variant={ds.status ? "filled" : "outlined"}
                      size="small"
                    />
                  </MUITableCell>
                  <MUITableCell align="center" className="hidden xl:table-cell">{ds.user_name_opened || "-"}</MUITableCell>
                  <MUITableCell align="center" className="hidden xl:table-cell">
                    {ds.created_at ? format(parseISO(ds.created_at), "PP", { locale: dateLocale }) : "-"}
                  </MUITableCell>
                  <MUITableCell align="right" className="sticky right-0 bg-card z-10">
                    <IconButton size="small" onClick={(e) => handleOpenMenu(e, ds.id)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </IconButton>
                  </MUITableCell>
                </MUITableRow>
              ))}
            </MUITableBody>
          </MUITable>
        </Box>
      </TableContainer>

      {/* Row actions menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {currentRow && (
          <>
            <MenuItem
              onClick={() => { onDownloadSummaryPdf(currentRow); handleCloseMenu(); }}
              disabled={isGeneratingSummaryPdfId === currentRow.id}
            >
              {isGeneratingSummaryPdfId === currentRow.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="ltr:ml-2 rtl:mr-2">تقرير خاص</span>
            </MenuItem>

            {currentRow.status && canCloseShifts && (
              <>
                <Divider />
                <MenuItem
                  onClick={() => { closeShiftMutation.mutate(currentRow.id); handleCloseMenu(); }}
                  disabled={closeShiftMutation.isPending && closeShiftMutation.variables === currentRow.id}
                  className="text-destructive"
                >
                  {closeShiftMutation.isPending && closeShiftMutation.variables === currentRow.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span className="ltr:ml-2 rtl:ml-2">إغلاق المناوبة</span>
                </MenuItem>
              </>
            )}

            {canRecordEntitlementCost &&
              (currentRow.total_doctor_entitlement ?? 0) > 0 &&
              !currentRow.is_cash_reclaim_prooved &&
              !currentRow.is_company_reclaim_prooved && (
                <>
                  <Divider />
                  <MenuItem onClick={() => { onOpenAddCostDialog(currentRow); handleCloseMenu(); }}>
                    <Edit className="h-3.5 w-3.5 ltr:mr-2 rtl:ml-2" />
                    تسجيل الاستحقاق كتكلفة
                  </MenuItem>
                </>
              )}

            {canUpdateProofing && (
              <>
                <Divider />
                <MenuItem
                  onClick={() => {
                    onProofingAction(currentRow.id, "is_cash_revenue_prooved", currentRow.is_cash_revenue_prooved);
                    handleCloseMenu();
                  }}
                  disabled={proofingFlagsMutation.isPending}
                >
                  {currentRow.is_cash_revenue_prooved ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ShieldQuestion className="h-3.5 w-3.5" />
                  )}
                  <span className="ltr:ml-2 rtl:mr-2">تبديل إثبات إيراد نقدي</span>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onProofingAction(currentRow.id, "is_cash_reclaim_prooved", currentRow.is_cash_reclaim_prooved);
                    handleCloseMenu();
                  }}
                  disabled={proofingFlagsMutation.isPending}
                >
                  {currentRow.is_cash_reclaim_prooved ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ShieldQuestion className="h-3.5 w-3.5" />
                  )}
                  <span className="ltr:ml-2 rtl:mr-2">تبديل إثبات استحقاق نقدي</span>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onProofingAction(currentRow.id, "is_company_revenue_prooved", currentRow.is_company_revenue_prooved);
                    handleCloseMenu();
                  }}
                  disabled={proofingFlagsMutation.isPending}
                >
                  {currentRow.is_company_revenue_prooved ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ShieldQuestion className="h-3.5 w-3.5" />
                  )}
                  <span className="ltr:ml-2 rtl:mr-2">تبديل إثبات إيراد تأميني</span>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onProofingAction(currentRow.id, "is_company_reclaim_prooved", currentRow.is_company_reclaim_prooved);
                    handleCloseMenu();
                  }}
                  disabled={proofingFlagsMutation.isPending}
                >
                  {currentRow.is_company_reclaim_prooved ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ShieldQuestion className="h-3.5 w-3.5" />
                  )}
                  <span className="ltr:ml-2 rtl:mr-2">تبديل إثبات استحقاق تأميني</span>
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
    </Card>
  );
};

export default DoctorShiftsReportTable; 