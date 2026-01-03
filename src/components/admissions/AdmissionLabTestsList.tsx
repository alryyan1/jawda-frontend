import * as React from "react";
import { useState, useEffect } from "react";

import type { AdmissionRequestedLabTest } from "@/types/admissions";
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
  Plus,
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";
import {
  updateAdmissionLabTest,
  deleteAdmissionLabTest,
  getAdmissionLabTests,
} from "@/services/admissionLabTestService";
import AddAdmissionLabTestDialog from "./AddAdmissionLabTestDialog";
import type { AxiosError } from "axios";

interface AdmissionLabTestsListProps {
  admissionId: number;
}

const AdmissionLabTestsList: React.FC<AdmissionLabTestsListProps> = ({
  admissionId,
}) => {
  const queryClient = useQueryClient();
  const [testToDelete, setTestToDelete] = useState<number | null>(null);
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
  const [rowOptionsTest, setRowOptionsTest] =
    useState<AdmissionRequestedLabTest | null>(null);
  const [rowOptionsData, setRowOptionsData] = useState<{
    discount_per: number;
    discount: number;
  }>({ discount_per: 0, discount: 0 });
  
  const { data: requestedLabTests = [], isLoading } = useQuery({
    queryKey: ['admissionLabTests', admissionId],
    queryFn: () => getAdmissionLabTests(admissionId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      labTestId: number;
      payload: {
        discount_per?: number;
        discount?: number;
      };
    }) => updateAdmissionLabTest(data.labTestId, data.payload),
    onSuccess: () => {
      toast.success("تم التحديث بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionLabTests", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admission", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionBalance", admissionId],
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
    mutationFn: (labTestId: number) =>
      deleteAdmissionLabTest(admissionId, labTestId),
    onSuccess: () => {
      toast.success("تم الحذف بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["admissionLabTests", admissionId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ["admission", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionBalance", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionLedger", admissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admissionTransactions", admissionId],
      });
      setTestToDelete(null);
    },
    onError: (error: AxiosError) => {
      toast.error(
        (error.response?.data as { message?: string })?.message ||
          "فشل في الطلب"
      );
    },
  });

  const handleOpenRowOptions = (test: AdmissionRequestedLabTest) => {
    setRowOptionsTest(test);
    setRowOptionsData({
      discount_per: test.discount_per || 0,
      discount: test.discount || 0,
    });
    setIsRowOptionsDialogOpen(true);
  };

  const handleSaveRowOptions = () => {
    if (!rowOptionsTest) return;
    updateMutation.mutate({
      labTestId: rowOptionsTest.id,
      payload: {
        discount_per: rowOptionsData.discount_per,
        discount: rowOptionsData.discount,
      },
    });
    setIsRowOptionsDialogOpen(false);
  };

  // Calculate totals
  const totalNetPayable = requestedLabTests.reduce((sum, test) => {
    const netPayable = test.net_payable_by_patient || (test.price - (test.discount || 0)) || 0;
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
            الفحوصات المختبرية المطلوبة
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            إضافة فحص
          </Button>
        </Box>
        {requestedLabTests.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={2}
          >
            لم يتم طلب أي فحوصات مختبرية بعد
          </Typography>
        )}
        {requestedLabTests.length > 0 && (
          <Card dir="rtl">
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell className="text-xl!" align="center">
                        اسم الفحص
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 120 }}
                      >
                        السعر
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 100 }}
                      >
                        نسبة الخصم
                      </TableCell>
                      <TableCell
                        className="text-xl!"
                        align="center"
                        sx={{ width: 120 }}
                      >
                        مبلغ الخصم
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
                    {requestedLabTests.map((test) => {
                      const price = Number(test.price) || 0;
                      const discount = Number(test.discount) || 0;
                      const discountPer = Number(test.discount_per) || 0;
                      const discountAmount = discountPer > 0 
                        ? (price * discountPer / 100) 
                        : discount;
                      const netPayable = test.net_payable_by_patient || (price - discountAmount) || 0;
                      return (
                        <TableRow
                          key={test.id}
                          hover
                          onClick={() => handleOpenRowOptions(test)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell className="text-xl!" align="center">
                            {test.main_test?.main_test_name || "فحص غير معروف"}
                          </TableCell>
                          <TableCell className="text-xl!" align="center">
                            {formatNumber(price)}
                          </TableCell>
                          <TableCell className="text-xl!" align="center">
                            {discountPer > 0 ? `${discountPer}%` : '-'}
                          </TableCell>
                          <TableCell className="text-xl!" align="center">
                            {formatNumber(discountAmount)}
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
                      <TableCell className="text-xl!" align="center" colSpan={4}>
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
          open={!!testToDelete}
          onClose={() => setTestToDelete(null)}
        >
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogContent>
            <DialogContentText>
              هل أنت متأكد من حذف هذا الفحص؟
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTestToDelete(null)}>إلغاء</Button>
            <Button
              color="error"
              onClick={() =>
                testToDelete && removeMutation.mutate(testToDelete)
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

        <AddAdmissionLabTestDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          admissionId={admissionId}
        />

        {rowOptionsTest && (
          <Dialog
            open={isRowOptionsDialogOpen}
            onClose={() => setIsRowOptionsDialogOpen(false)}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle className="text-center">
              {rowOptionsTest.main_test?.main_test_name || "فحص غير معروف"}
            </DialogTitle>
            <DialogContent>
              <Box className="flex flex-col gap-2">
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
                justifyContent="flex-end"
                gap={1.25}
                mt={2}
              >
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => {
                    setIsRowOptionsDialogOpen(false);
                    setTestToDelete(rowOptionsTest.id);
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

export default AdmissionLabTestsList;

