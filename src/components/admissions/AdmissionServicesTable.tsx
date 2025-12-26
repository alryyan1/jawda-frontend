// src/components/admissions/AdmissionServicesTable.tsx
import * as React from "react";
import { useState } from "react";

import type { AdmissionRequestedService } from "@/types/admissions";
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
  Chip,
} from "@mui/material";
import {
  Loader2,
  Trash2,
  DollarSign,
  Save,
  Settings2,
  PackageOpen,
  Edit,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";
import {
  updateAdmissionService,
  deleteAdmissionService,
} from "@/services/admissionServiceService";
import AdmissionServiceCostsDialog from "./AdmissionServiceCostsDialog";
import AdmissionServiceDepositsDialog from "./AdmissionServiceDepositsDialog";
import type { AxiosError } from "axios";

interface AdmissionServicesTableProps {
  admissionId: number;
  requestedServices: AdmissionRequestedService[];
  isLoading: boolean;
  onAddMoreServices: () => void;
}

interface RowEditData {
  count: number;
  discount_per: number;
  discount: number;
}

const AdmissionServicesTable: React.FC<AdmissionServicesTableProps> = ({
  admissionId,
  requestedServices,
  isLoading,
  onAddMoreServices,
}) => {
  const queryClient = useQueryClient();
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  
  // Row options dialog
  const [isRowOptionsDialogOpen, setIsRowOptionsDialogOpen] = useState(false);
  const [rowOptionsService, setRowOptionsService] =
    useState<AdmissionRequestedService | null>(null);
  const [rowOptionsData, setRowOptionsData] = useState<{
    count: number;
    discount_per: number;
    discount: number;
  }>({ count: 1, discount_per: 0, discount: 0 });
  
  const [isManageServiceCostsDialogOpen, setIsManageServiceCostsDialogOpen] =
    useState(false);
  const [
    selectedRequestedServiceForCosts,
    setSelectedRequestedServiceForCosts,
  ] = useState<AdmissionRequestedService | null>(null);
  const [isManageDepositsDialogOpen, setIsManageDepositsDialogOpen] =
    useState(false);
  const [selectedServiceForDeposits, setSelectedServiceForDeposits] =
    useState<AdmissionRequestedService | null>(null);

  const handleManageDeposits = (requestedService: AdmissionRequestedService) => {
    setSelectedServiceForDeposits(requestedService);
    setIsManageDepositsDialogOpen(true);
  };

  const handleCloseDeposits = () => {
    setIsManageDepositsDialogOpen(false);
    setSelectedServiceForDeposits(null);
  };

  const handleDepositsUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ["admissionServices", admissionId],
    });
  };

  const updateMutation = useMutation({
    mutationFn: (data: {
      serviceId: number;
      payload: {
        count?: number;
        discount_per?: number;
        discount?: number;
      };
    }) => updateAdmissionService(data.serviceId, data.payload),
    onSuccess: () => {
      toast.success("تم التحديث بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionServices", admissionId],
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
      deleteAdmissionService(admissionId, requestedServiceId),
    onSuccess: () => {
      toast.success("تم الحذف بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionServices", admissionId],
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

  const handleOpenRowOptions = (rs: AdmissionRequestedService) => {
    setRowOptionsService(rs);
    setRowOptionsData({
      count: rs.count || 1,
      discount_per: rs.discount_per || 0,
      discount: rs.discount || 0,
    });
    setIsRowOptionsDialogOpen(true);
  };

  const handleSaveRowOptions = () => {
    if (!rowOptionsService) return;
    updateMutation.mutate({
      serviceId: rowOptionsService.id,
      payload: {
        count: rowOptionsData.count,
        discount_per: rowOptionsData.discount_per,
        discount: rowOptionsData.discount,
      },
    });
    setIsRowOptionsDialogOpen(false);
  };

  const handleManageServiceCosts = (requestedService: AdmissionRequestedService) => {
    if (!isManageServiceCostsDialogOpen) {
      setSelectedRequestedServiceForCosts(requestedService);
      setIsManageServiceCostsDialogOpen(true);
    }
  };

  const handleCloseServiceCostsDialog = () => {
    setIsManageServiceCostsDialogOpen(false);
    setSelectedRequestedServiceForCosts(null);
  };

  const calculateItemBalance = (rs: AdmissionRequestedService) => {
    // Use balance if available, otherwise calculate from net_payable_by_patient
    if (rs.balance !== undefined) {
      return rs.balance;
    }
    const netPayable = rs.net_payable_by_patient || 0;
    const amountPaid = Number(rs.amount_paid) || 0;
    return netPayable - amountPaid;
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
                        className="text-xl!"
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
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 120 }}
                      >
                        الإجمالي
                      </TableCell>
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
                        sx={{ width: 120 }}
                      >
                        الرصيد
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 100 }}
                      >
                        الحالة
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requestedServices.map((rs) => {
                      const price = Number(rs.price) || 0;
                      const hasPayment = Number(rs.amount_paid) > 0;
                      const balance = calculateItemBalance(rs);
                      return (
                        <React.Fragment key={rs.id}>
                          <TableRow
                            hover
                            onClick={() => handleOpenRowOptions(rs)}
                            sx={{ 
                              cursor: "pointer",
                              backgroundColor: hasPayment ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                              '&:hover': {
                                backgroundColor: hasPayment ? 'rgba(76, 175, 80, 0.15)' : undefined
                              }
                            }}
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
                            <TableCell className="text-xl!" align="center">
                              {formatNumber(rs.total_price || 0)}
                            </TableCell>
                            <TableCell className="text-xl!" align="center">
                              {formatNumber(rs.amount_paid)}
                            </TableCell>
                            <TableCell className="text-xl!" align="center">
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: balance > 0.01 ? 'error.main' : 'success.main',
                                }}
                              >
                                {formatNumber(balance)}
                              </Typography>
                            </TableCell>
                            <TableCell className="text-xl!" align="center">
                              <Box display="flex" gap={0.5} justifyContent="center">
                                <Chip
                                  label={rs.is_paid ? 'مدفوع' : 'غير مدفوع'}
                                  color={rs.is_paid ? 'success' : 'default'}
                                  size="small"
                                />
                                {rs.done && (
                                  <Chip
                                    label="مكتمل"
                                    color="info"
                                    size="small"
                                  />
                                )}
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
          <AdmissionServiceDepositsDialog
            open={isManageDepositsDialogOpen}
            onClose={handleCloseDeposits}
            service={selectedServiceForDeposits}
          />
        )}
        {selectedRequestedServiceForCosts && (
          <AdmissionServiceCostsDialog
            open={isManageServiceCostsDialogOpen}
            onClose={handleCloseServiceCostsDialog}
            service={selectedRequestedServiceForCosts}
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
                    disabled={rowOptionsService.amount_paid > 0}
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
                <Box className="flex flex-col">
                  <Typography variant="caption" fontWeight={600}>
                    نسبة التخفيض
                  </Typography>
                  <Select
                    label="نسبة التخفيض"
                    size="small"
                    disabled={rowOptionsService.amount_paid > 0}
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
                <Box>
                  <Typography variant="caption" fontWeight={600}>
                    خصم ثابت
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    disabled={rowOptionsService.amount_paid > 0}
                    inputProps={{ min: 0 }}
                    value={rowOptionsData.discount ?? 0}
                    onChange={(e) =>
                      setRowOptionsData({
                        ...rowOptionsData,
                        discount: parseFloat(e.target.value || "0") || 0,
                      })
                    }
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                </Box>
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
                  disabled={rowOptionsService.is_paid}
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
export default AdmissionServicesTable;

