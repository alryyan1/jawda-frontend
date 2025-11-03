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
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Loader2,
  Trash2,
  DollarSign,
  Save,
  Settings2,
  PackageOpen,
  CheckCircle,
  CreditCard,
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
import {
  getDepositsForRequestedService,
  updateRequestedServiceDeposit,
} from "@/services/requestedServiceDepositService";
import { useAuthorization } from "@/hooks/useAuthorization";

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
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [payingService, setPayingService] = useState<RequestedService | null>(
    null
  );
  // Removed expandable rows; using dialog instead
  // Row options dialog
  const [isRowOptionsDialogOpen, setIsRowOptionsDialogOpen] = useState(false);
  const [rowOptionsService, setRowOptionsService] =
    useState<RequestedService | null>(null);
  const [rowOptionsData, setRowOptionsData] = useState<{
    count: number;
    discount_per: number;
    endurance?: number;
  }>({ count: 1, discount_per: 0 });
  const {can} = useAuthorization();
  const [isManageServiceCostsDialogOpen, setIsManageServiceCostsDialogOpen] =
    useState(false);
  const [
    selectedRequestedServiceForCosts,
    setSelectedRequestedServiceForCosts,
  ] = useState<RequestedService | null>(null);
  const [isManageDepositsDialogOpen, setIsManageDepositsDialogOpen] =
    useState(false);
  const [selectedServiceForDeposits, setSelectedServiceForDeposits] =
    useState<RequestedService | null>(null);

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
    },
    onError: (error: AxiosError) =>
      toast.error(
        (error.response?.data as { message?: string })?.message ||
          "فشل في التحديث"
      ),
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
    onError: (error: AxiosError) => {
      toast.error(
        (error.response?.data as { message?: string })?.message ||
          "فشل في الطلب"
      );
    },
  });

  // Track which service is being updated
  const [updatingServiceId, setUpdatingServiceId] = useState<number | null>(
    null
  );

  // Mutation to set all deposits is_bank = 1
  const setAllDepositsBankMutation = useMutation({
    mutationFn: async (requestedServiceId: number) => {
      setUpdatingServiceId(requestedServiceId);
      // Get all deposits for the requested service
      const deposits = await getDepositsForRequestedService(requestedServiceId);

      // Update each deposit to set is_bank = true (1)
      const updatePromises = deposits.map((deposit) =>
        updateRequestedServiceDeposit(deposit.id, { is_bank: true })
      );

      await Promise.all(updatePromises);
      return { count: deposits.length, serviceId: requestedServiceId };
    },
    onSuccess: ({ count }) => {
      toast.success(`تم تحديث ${count} دفعة كدفعة بنكية`);
      queryClient.invalidateQueries({
        queryKey: ["requestedServicesForVisit", visitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["depositsForRequestedService"],
      });
      setUpdatingServiceId(null);
    },
    onError: (error: AxiosError) => {
      toast.error(
        (error.response?.data as { message?: string })?.message ||
          "فشل في تحديث الدفعات"
      );
      setUpdatingServiceId(null);
    },
  });

  // Inline edit removed (using dialog instead)

  const handleOpenRowOptions = (rs: RequestedService) => {
    setRowOptionsService(rs);
    setRowOptionsData({
      count: rs.count || 1,
      discount_per: rs.discount_per || 0,
      endurance: Number(rs.endurance) || 0,
    });
    setIsRowOptionsDialogOpen(true);
  };

  const handleSaveRowOptions = () => {
    if (!rowOptionsService) return;
    updateMutation.mutate({
      rsId: rowOptionsService.id,
      payload: {
        count: rowOptionsData.count,
        discount_per: isCompanyPatient ? 0 : rowOptionsData.discount_per,
        ...(isCompanyPatient
          ? { endurance: Number(rowOptionsData.endurance) || 0 }
          : {}),
      },
    });
    setIsRowOptionsDialogOpen(false);
  };

  // Inline edit removed

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

    console.log(
      subTotal,
      "subTotal",
      totalItemDiscount,
      "totalItemDiscount",
      itemEndurance,
      "itemEndurance",
      rs.endurance,
      "rs.endurance"
    );
    const netPrice = subTotal - totalItemDiscount - itemEndurance;
    const amountPaid = Number(rs.amount_paid) || 0;
    console.log(netPrice, "netPrice", amountPaid, "amountPaid");
    if (visit?.company) {
      return rs.endurance - rs.amount_paid;
    } else {
      return netPrice - amountPaid;
    }
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
      <Box display="flex" flexDirection="column" gap={1}>
        <Box display="flex" justifyContent="flex-end"></Box>
        {requestedServices.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={2}
          >
            لم يتم طلب أي خدمات بعد
          </Typography>
        )}
        {requestedServices.length > 0 && (
          <Card dir="rtl">
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell className="text-xl!" align="center">
                        اسم الخدمة
                      </TableCell>
                      <TableCell
                        className="text-xl!    "
                        align="center"
                        sx={{ width: 90 }}
                      >
                        السعر
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 90 }}
                      >
                        العدد
                      </TableCell>
                      {isCompanyPatient && (
                        <TableCell
                          className="text-xl!"
                          align="center"
                          sx={{ width: 110 }}
                        >
                          التحمل
                        </TableCell>
                      )}
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 120 }}
                      >
                        
                        المدفوع
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 80 }}
                      >
                        دفع
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requestedServices.map((rs) => {
                      const price = Number(rs.price) || 0;
                      return (
                        <React.Fragment key={rs.id}>
                          <TableRow
                            hover
                            onClick={() => handleOpenRowOptions(rs)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell className="text-xl!" align="center">
                              {rs.service?.name || "خدمة غير معروفة"}
                            </TableCell>
                            <TableCell className="text-xl!" align="center">
                              <Box
                                display="flex"
                                flexDirection="column"
                                alignItems="center"
                              >
                                <span>{formatNumber(price)}</span>
                                {Number(rs.count) > 1 && (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="error"
                                  >
                                    x {Number(rs.count)}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell className="text-xl!" align="center">
                              {Number(rs.count)}
                            </TableCell>
                            {isCompanyPatient && (
                              <TableCell className="text-xl!" align="center">
                                {formatNumber(Number(rs.endurance) || 0)}
                              </TableCell>
                            )}
                            <TableCell className="text-xl!" align="center">
                              {formatNumber(rs.amount_paid)}
                            </TableCell>
                            <TableCell className="text-xl!" align="center">
                              <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                gap={0.5}
                              >
                                {calculateItemBalance(rs) <= 0.01 ? (
                                  <CheckCircle
                                    className="h-5 w-5 text-green-600"
                                    aria-label="مدفوع بالكامل"
                                  />
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPayingService(rs);
                                    }}
                                    disabled={!currentClinicShiftId}
                                    startIcon={
                                      <DollarSign className="h-3 w-3" />
                                    }
                                  >
                                    دفع
                                  </Button>
                                )}
                                <Tooltip title="تعيين جميع الدفعات كدفعة بنكية">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAllDepositsBankMutation.mutate(rs.id);
                                    }}
                                    disabled={
                                      updatingServiceId === rs.id || !rs.id
                                    }
                                    color="primary"
                                  >
                                    {updatingServiceId === rs.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      'بنكك'
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
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
        <Dialog
          open={!!serviceToDelete}
          onClose={() => setServiceToDelete(null)}
        >
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogContent>
            <DialogContentText>
              هل أنت متأكد من حذف هذه الخدمة؟
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setServiceToDelete(null)}>إلغاء</Button>
            <Button
              color="error"
              onClick={() =>
                serviceToDelete && removeMutation.mutate(serviceToDelete)
              }
              disabled={removeMutation.isPending}
              startIcon={
                removeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )
              }
            >
              حذف
            </Button>
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

        {rowOptionsService && (
          <Dialog
            open={isRowOptionsDialogOpen}
            onClose={() => setIsRowOptionsDialogOpen(false)}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle className="text-center">
              {rowOptionsService.service?.name || "خدمة غير معروفة"}
            </DialogTitle>
            <DialogContent>
              <Box className="flex flex-col gap-2">
                <Box>
                  <Typography variant="caption" fontWeight={600}>
                    العدد
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ min: 1 }}
                    value={rowOptionsData.count ?? 1}
                    onChange={(e) =>
                      setRowOptionsData({
                        ...rowOptionsData,
                        count: parseInt(e.target.value || "1") || 1,
                      })
                    }
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                </Box>
                {isCompanyPatient && (
                  <Box>
                    <Typography variant="caption" fontWeight={600}>
                      التحمل
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      inputProps={{ min: 0 }}
                      value={rowOptionsData.endurance ?? 0}
                      onChange={(e) =>
                        setRowOptionsData({
                          ...rowOptionsData,
                          endurance: parseFloat(e.target.value || "0") || 0,
                        })
                      }
                    />
                  </Box>
                )}
                {!isCompanyPatient && (
                  <Box className="flex flex-col ">
                    <Typography variant="caption" fontWeight={600}>
                      نسبة التخفيض
                    </Typography>

                    <Select
                      label="نسبة التخفيض"
                      size="small"
                      disabled={!can('تخفيض خدمه')}
                      value={rowOptionsData.discount_per}
                      onChange={(e) =>
                        setRowOptionsData({
                          ...rowOptionsData,
                          discount_per: Number(e.target.value),
                        })
                      }
                    >
                      {Array.from({ length: 11 }).map((_, i) => {
                        const value = i * 10;
                        return (
                          <MenuItem key={value} value={value}>
                            {value}%
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </Box>
                )}
              </Box>
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="space-between"
                gap={1.25}
                mt={2}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsRowOptionsDialogOpen(false);
                    handleManageServiceCosts(rowOptionsService);
                  }}
                  startIcon={<Settings2 className="h-4 w-4" />}
                >
                  
                  التكاليف
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsRowOptionsDialogOpen(false);
                    handleManageDeposits(rowOptionsService);
                  }}
                  startIcon={<PackageOpen className="h-4 w-4" />}
                >
                  
                  المدفوعات
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => {
                    setIsRowOptionsDialogOpen(false);
                    setServiceToDelete(rowOptionsService.id);
                  }}
                  startIcon={<Trash2 className="h-4 w-4" />}
                  disabled={!can('حذف خدمه مضافه') }
                >
                  حذف
                </Button>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsRowOptionsDialogOpen(false)}>
                إغلاق
              </Button>
              <Button
                onClick={handleSaveRowOptions}
                startIcon={
                  updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )
                }
                disabled={updateMutation.isPending}
              >
                حفظ
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </React.Fragment>
  );
};
export default RequestedServicesTable;
