// src/components/clinic/RequestedServicesTable.tsx
import * as React from "react";
import { useState } from "react";

import type { RequestedService } from "@/types/services";
import type { DoctorVisit } from "@/types/visits";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Loader2,
  Trash2,
  DollarSign,
  Edit,
  XCircle,
  Save,
  Settings2,
  PackageOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ServicePaymentDialog from "./ServicePaymentDialog";
import { formatNumber } from "@/lib/utils";
import {
  updateRequestedServiceDetails,
  removeRequestedServiceFromVisit,
} from "@/services/visitService";
import ManageRequestedServiceCostsDialog from "./ManageRequestedServiceCostsDialog";
import ManageServiceDepositsDialog from "./ManageServiceDepositsDialog";
import type { AxiosError } from "axios";

interface RequestedServicesTableProps {
  visitId: number;
  visit?: DoctorVisit;
  requestedServices: RequestedService[];
  isLoading: boolean;
  currentClinicShiftId: number | null;
  onAddMoreServices: () => void;
  handlePrintReceipt: () => void;
}

interface RowEditData {
  count: number;
  discount_per: number;
  endurance?: number;
  visit?: DoctorVisit;
}

const RequestedServicesTable: React.FC<RequestedServicesTableProps> = ({
  visit,
  visitId,
  requestedServices,
  isLoading,
  currentClinicShiftId,
  onAddMoreServices,
  handlePrintReceipt,
}) => {
  void onAddMoreServices; // silence unused prop for now
  const queryClient = useQueryClient();
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [payingService, setPayingService] = useState<RequestedService | null>(null);
  const [currentEditData, setCurrentEditData] = useState<RowEditData>({
    count: 1,
    discount_per: 0,
    endurance: 0,
  });
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const [isManageServiceCostsDialogOpen, setIsManageServiceCostsDialogOpen] = useState(false);
  const [selectedRequestedServiceForCosts, setSelectedRequestedServiceForCosts] = useState<RequestedService | null>(null);
  const [isManageDepositsDialogOpen, setIsManageDepositsDialogOpen] = useState(false);
  const [selectedServiceForDeposits, setSelectedServiceForDeposits] = useState<RequestedService | null>(null);

  const handleManageDeposits = (requestedService: RequestedService) => {
    setSelectedServiceForDeposits(requestedService);
    setIsManageDepositsDialogOpen(true);
  };

  const handleCloseDeposits = () => {
    setIsManageDepositsDialogOpen(false);
    setSelectedServiceForDeposits(null);
  };

  const handleDepositsUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ["requestedServicesForVisit", visitId],
    });
  };

  const isCompanyPatient = !!visit?.patient?.company_id;

  const updateMutation = useMutation({
    mutationFn: (data: {
      rsId: number;
      payload: Partial<
        Pick<RequestedService, "count" | "discount_per" | "endurance">
      >;
    }) => updateRequestedServiceDetails(visitId, data.rsId, data.payload),
    onSuccess: () => {
      toast.success("تم التحديث بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["requestedServicesForVisit", visitId],
      });
      setEditingRowId(null);
      setCurrentEditData({ count: 1, discount_per: 0, endurance: 0 });
    },
    onError: (error: AxiosError) =>
      toast.error((error.response?.data as { message?: string })?.message || "فشل في التحديث"),
  });

  const removeMutation = useMutation({
    mutationFn: (requestedServiceId: number) =>
      removeRequestedServiceFromVisit(visitId, requestedServiceId),
    onSuccess: () => {
      toast.success("تم الحذف بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["requestedServicesForVisit", visitId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ["availableServicesForVisit", visitId],
        exact: true,
      });
      setServiceToDelete(null);
    },
    onError: (error: AxiosError) =>
     {
      toast.error((error.response?.data as { message?: string })?.message || "فشل في الطلب")
     }
  });

  const handleCancelEdit = () => setEditingRowId(null);

  const handleEdit = (rs: RequestedService) => {
    setEditingRowId(rs.id);
    setCurrentEditData({
      count: rs.count || 1,
      discount_per: rs.discount_per || 0,
      endurance: isCompanyPatient ? rs.endurance || 0 : 0,
    });
  };

  const handleSaveEdit = (rsId: number) => {
    if (currentEditData.count < 1) {
      toast.error("العدد يجب أن يكون واحد على الأقل");
      return;
    }
    const payload: Partial<
      Pick<RequestedService, "count" | "discount_per" | "endurance">
    > = {
      count: currentEditData.count,
    };
    if (!isCompanyPatient) {
      payload.discount_per = currentEditData.discount_per;
    }
    if (isCompanyPatient) {
      payload.endurance = currentEditData.endurance;
    }
    updateMutation.mutate({ rsId, payload });
  };

  const handleManageServiceCosts = (requestedService: RequestedService) => {
    if (!isManageServiceCostsDialogOpen) {
      setSelectedRequestedServiceForCosts(requestedService);
      setIsManageServiceCostsDialogOpen(true);
    }
  };

  const handleCloseServiceCostsDialog = () => {
    setIsManageServiceCostsDialogOpen(false);
    setSelectedRequestedServiceForCosts(null);
  };



  const calculateItemBalance = (
    rs: RequestedService,
    editData?: RowEditData
  ) => {
    const price = Number(rs.price) || 0;
    const count = editData ? editData.count : Number(rs.count) || 1;

    let itemDiscountPer = 0;
    if (!isCompanyPatient) {
      itemDiscountPer = editData
        ? editData.discount_per
        : Number(rs.discount_per) || 0;
    }

    const itemFixedDiscount = Number(rs.discount) || 0;

    const subTotal = price * count;
    const discountAmountFromPercentage = (subTotal * itemDiscountPer) / 100;
    const totalItemDiscount = discountAmountFromPercentage + itemFixedDiscount;

    let itemEndurance = 0;
    if (isCompanyPatient) {
      itemEndurance =
        editData && editData.endurance !== undefined
          ? editData.endurance
          : Number(rs.endurance) || 0;
    }

    const netPrice = subTotal - totalItemDiscount - itemEndurance;
    const amountPaid = Number(rs.amount_paid) || 0;
    return netPrice - amountPaid;
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <React.Fragment>
      <Box display="flex" flexDirection="column" gap={1.5}>
        <Box display="flex" justifyContent="flex-end">
      
        </Box>
        {requestedServices.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>لم يتم طلب أي خدمات بعد</Typography>
        )}
        {requestedServices.length > 0 && (
          <Card dir="rtl">
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">اسم الخدمة</TableCell>
                      <TableCell align="center" sx={{ width: 90 }}>السعر</TableCell>
                      <TableCell align="center" sx={{ width: 120 }}>المبلغ المدفوع</TableCell>
                      <TableCell align="center" sx={{ width: 80 }}>دفع</TableCell>
                      <TableCell align="center" sx={{ width: 60 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                {requestedServices.map((rs) => {
                  const isEditingThisRow = editingRowId === rs.id;
                  const isExpanded = expandedRowId === rs.id;
                  const price = Number(rs.price) || 0;
                  return (
                    <React.Fragment key={rs.id}>
                      <TableRow selected={isEditingThisRow}>
                        <TableCell align="center" sx={{ py: 1.25, fontWeight: 500 }}>
                          {rs.service?.name || "خدمة غير معروفة"}
                          {rs.service?.service_group?.name && (
                            <Typography variant="caption" display="block" color="text.secondary">({rs.service.service_group.name})</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.25 }}>
                          {formatNumber(price)}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.25, color: 'success.main' }}>
                          {formatNumber(rs.amount_paid)}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.25 }}>
                          {calculateItemBalance(rs) <= 0.01 ? (
                            <CheckCircle className="h-5 w-5 text-green-600" aria-label="مدفوع بالكامل" />
                          ) : (
                            <Button size="small" variant="outlined" onClick={() => setPayingService(rs)} disabled={!currentClinicShiftId} startIcon={<DollarSign className="h-3 w-3" />}>دفع</Button>
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.25 }}>
                          <IconButton size="small" onClick={() => setExpandedRowId(isExpanded ? null : rs.id)} aria-label={isExpanded ? "طي" : "توسيع"}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ backgroundColor: 'action.hover', p: 2 }}>
                            <Box display="flex" flexDirection="column" gap={1.5}>
                              {/* Details Section */}
                              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} fontSize={14}>
                                <Box><strong>العدد:</strong> {rs.count}</Box>
                                {!isCompanyPatient && (
                                  <Box><strong>نسبة الخصم:</strong> {rs.discount_per}%</Box>
                                )}
                                {isCompanyPatient && (
                                  <Box><strong>التعاون:</strong> {formatNumber(rs.endurance)}</Box>
                                )}
                                <Box><strong>إجمالي سعر العنصر:</strong> {formatNumber(Number(rs.price) * Number(rs.count))}</Box>
                                <Box><strong>الرصيد:</strong> {formatNumber(calculateItemBalance(rs))}</Box>
                              </Box>

                              {/* Action Buttons */}
                              <Box display="flex" flexWrap="wrap" gap={1}>
                                {/* Edit Button */}
                                <Button size="small" variant="outlined" onClick={() => handleEdit(rs)} disabled={editingRowId !== null} startIcon={<Edit className="h-3 w-3" />}>تعديل</Button>

                                {/* Manage Costs Button */}
                                <Button size="small" variant="outlined" onClick={() => handleManageServiceCosts(rs)} startIcon={<Settings2 className="h-3 w-3" />}>إدارة التكاليف</Button>

                                {/* Manage Deposits Button */}
                                <Button size="small" variant="outlined" onClick={() => handleManageDeposits(rs)} startIcon={<PackageOpen className="h-3 w-3" />}>إدارة الودائع</Button>

                                {/* Delete Button */}
                                <Button size="small" color="error" variant="outlined" onClick={() => setServiceToDelete(rs.id)} startIcon={<Trash2 className="h-3 w-3" />}>حذف</Button>
                              </Box>

                              {/* Edit Form (when editing) */}
                              {isEditingThisRow && (
                                <Box border={1} borderColor="divider" borderRadius={1} p={2}>
                                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={1.5}>
                                    {/* Count Input */}
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>العدد</Typography>
                                      <TextField type="number" size="small" inputProps={{ min: 1 }} value={currentEditData.count}
                                        onChange={(e) => setCurrentEditData({ ...currentEditData, count: parseInt(e.target.value || '1') || 1 })} />
                                    </Box>

                                    {/* Discount/Endurance Input */}
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>{isCompanyPatient ? "التعاون" : "نسبة الخصم"}</Typography>
                                      <TextField type="number" size="small" inputProps={{ min: 0 }}
                                        value={isCompanyPatient ? currentEditData.endurance : currentEditData.discount_per}
                                        onChange={(e) => setCurrentEditData({ ...currentEditData, [isCompanyPatient ? 'endurance' : 'discount_per']: parseFloat(e.target.value || '0') || 0 })} />
                                    </Box>
                                  </Box>

                                  {/* Save/Cancel Buttons */}
                                  <Box display="flex" gap={1} mt={1.5}>
                                    <Button size="small" onClick={() => handleSaveEdit(rs.id)} disabled={updateMutation.isPending} startIcon={updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}>حفظ</Button>
                                    <Button size="small" variant="outlined" onClick={handleCancelEdit} startIcon={<XCircle className="h-3 w-3" />}>إلغاء</Button>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
        {payingService && currentClinicShiftId && visit && (
          <ServicePaymentDialog
          handlePrintReceipt={handlePrintReceipt}
            visit={visit}
            isOpen={!!payingService}
            onOpenChange={(open) => !open && setPayingService(null)}
            requestedService={payingService}
            visitId={visitId}
            currentClinicShiftId={currentClinicShiftId}
            onPaymentSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ["requestedServicesForVisit", visitId],
              });
              setPayingService(null);
            }}
          />
        )}
        <Dialog open={!!serviceToDelete} onClose={() => setServiceToDelete(null)}>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogContent>
            <DialogContentText>هل أنت متأكد من حذف هذه الخدمة؟</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setServiceToDelete(null)}>إلغاء</Button>
            <Button color="error" onClick={() => serviceToDelete && removeMutation.mutate(serviceToDelete)} disabled={removeMutation.isPending} startIcon={removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}>حذف</Button>
          </DialogActions>
        </Dialog>

        {selectedServiceForDeposits && (
          <ManageServiceDepositsDialog
            isOpen={isManageDepositsDialogOpen}
            onOpenChange={handleCloseDeposits}
            requestedService={selectedServiceForDeposits}
            onAllDepositsUpdated={handleDepositsUpdated}
          />
        )}
        {selectedRequestedServiceForCosts && (
          <ManageRequestedServiceCostsDialog
            isOpen={isManageServiceCostsDialogOpen}
            onOpenChange={handleCloseServiceCostsDialog}
            requestedService={selectedRequestedServiceForCosts}
            onCostsUpdated={() => {
              queryClient.invalidateQueries({
                queryKey: ["requestedServicesForVisit", visitId],
                exact: true,
              });
              handleCloseServiceCostsDialog();
            }}
          />
        )}
      </Box>
    </React.Fragment>
  );
};
export default RequestedServicesTable;
