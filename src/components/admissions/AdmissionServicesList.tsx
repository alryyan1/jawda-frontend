// src/components/admissions/AdmissionServicesList.tsx
import * as React from "react";
import { useState, useEffect } from "react";

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
} from "@mui/material";
import {
  Loader2,
  Trash2,
  Save,
  Settings2,
  Plus,
  FileText,
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";
import {
  updateAdmissionService,
  deleteAdmissionService,
  getAdmissionServices,
} from "@/services/admissionServiceService";
import AdmissionServiceCostsDialog from "./AdmissionServiceCostsDialog";
import AddAdmissionServiceDialog from "./AddAdmissionServiceDialog";
import type { AxiosError } from "axios";
import { generateServicesPdf, downloadPdf } from "@/services/admissionPdfService";
import { getAdmissionById } from "@/services/admissionService";
import type { Admission } from "@/types/admissions";

interface AdmissionServicesListProps {
  admissionId: number;
}

const AdmissionServicesList: React.FC<AdmissionServicesListProps> = ({
  admissionId,
}) => {
  const queryClient = useQueryClient();
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Get admission data for PDF
  const { data: admissionData } = useQuery({
    queryKey: ['admission', admissionId],
    queryFn: () => getAdmissionById(admissionId).then(res => res.data as Admission),
    enabled: !!admissionId,
  });

  const handleGenerateServicesPdf = async () => {
    if (!admissionData) return;
    setGeneratingPdf(true);
    try {
      const blob = await generateServicesPdf(admissionData, requestedServices);
      const filename = `admission-${admissionId}-services-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPdf(blob, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Keyboard shortcut: Plus key to open add dialog
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if Plus key is pressed (both + and = keys on keyboard)
      if (event.key === '+' || event.key === '=' || (event.shiftKey && event.key === '=')) {
        // Don't trigger if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        event.preventDefault();
        setAddDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  
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

  const { data: requestedServices = [], isLoading } = useQuery({
    queryKey: ['admissionServices', admissionId],
    queryFn: () => getAdmissionServices(admissionId),
  });

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
      queryClient.invalidateQueries({
        queryKey: ["admission", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionLedger", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionTransactions", admissionId],
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
      queryClient.invalidateQueries({
        queryKey: ["admission", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionLedger", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionTransactions", admissionId],
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

  // Calculate totals
  const totalNetPayable = requestedServices.reduce((sum, rs) => {
    const netPayable = rs.net_payable_by_patient || rs.total_price || 0;
    return sum + netPayable;
  }, 0);

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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            الخدمات الطبية المطلوبة
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<FileText size={16} />}
              onClick={handleGenerateServicesPdf}
              disabled={generatingPdf || requestedServices.length === 0}
              size="small"
            >
              {generatingPdf ? 'جاري الإنشاء...' : 'طباعة PDF'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setAddDialogOpen(true)}
              size="small"
            >
              إضافة خدمة
            </Button>
          </Box>
        </Box>
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
                        sx={{ width: 100 }}
                      >
                        السعر
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 80 }}
                      >
                        العدد
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 120 }}
                      >
                        الصافي المستحق
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requestedServices.map((rs) => {
                      const price = Number(rs.price) || 0;
                      const netPayable = rs.net_payable_by_patient || 0;
                      return (
                        <TableRow
                          key={rs.id}
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
                                  color="text.secondary"
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
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {formatNumber(netPayable)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Summary Row */}
                    <TableRow
                      sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        '& td': {
                          fontWeight: 600,
                          borderTop: 2,
                          borderColor: 'divider',
                        }
                      }}
                    >
                      <TableCell className="text-xl!" align="center" colSpan={3}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          الإجمالي
                        </Typography>
                      </TableCell>
                      <TableCell className="text-xl!" align="center">
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {formatNumber(totalNetPayable)}
                        </Typography>
                      </TableCell>
                    </TableRow>
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

        {selectedRequestedServiceForCosts && (
          <AdmissionServiceCostsDialog
            open={isManageServiceCostsDialogOpen}
            onClose={handleCloseServiceCostsDialog}
            service={selectedRequestedServiceForCosts}
          />
        )}

        <AddAdmissionServiceDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          admissionId={admissionId}
        />

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
                <Box className="flex flex-col">
                  <Typography variant="caption" fontWeight={600}>
                    نسبة التخفيض
                  </Typography>
                  <Select
                    label="نسبة التخفيض"
                    size="small"
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
                  color="error"
                  variant="outlined"
                  onClick={() => {
                    setIsRowOptionsDialogOpen(false);
                    setServiceToDelete(rowOptionsService.id);
                  }}
                  startIcon={<Trash2 className="h-4 w-4" />}
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

export default AdmissionServicesList;
