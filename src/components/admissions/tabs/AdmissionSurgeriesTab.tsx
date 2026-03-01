import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Autocomplete,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  Add,
  Delete,
  MedicalServices,
  CheckCircle,
  Cancel,
  Payments,
  Receipt,
  AccountBalanceWallet,
  WhatsApp,
  Link,
  Undo,
} from "@mui/icons-material";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { getDoctorsList } from "@/services/doctorService";
import { getSurgicalOperations } from "@/services/surgicalOperationService";
import type { SurgicalOperation } from "@/services/surgicalOperationService";
import type { DoctorStripped } from "@/types/doctors";
import dayjs from "dayjs";
import { Printer } from "lucide-react";
import { sendWhatsAppCloudTemplate } from "@/services/whatsappCloudApiService";

interface FinanceChargeItem {
  id: number;
  name: string;
  type: string;
  amount: number;
  beneficiary?: "center" | "staff";
  reference_type?: "total" | "charge" | null;
  reference_charge_id?: number | null;
}

interface RequestedSurgeryFinanceItem {
  id: number;
  amount: number;
  payment_method: "cash" | "bankak";
  doctor_id?: number | null;
  finance_charge: FinanceChargeItem;
}

interface RequestedSurgeryItem {
  id: number;
  admission_id: number;
  surgery_id: number;
  doctor_id: number | null;
  status: "pending" | "approved" | "rejected";
  approved_by: number | null;
  approved_at: string | null;
  surgery: SurgicalOperation;
  doctor: DoctorStripped | null;
  user: { id: number; name: string };
  finances: RequestedSurgeryFinanceItem[];
  total_price: number;
  admission?: {
    patient?: {
      id: number;
      name: string;
      phone: string;
    };
  };
}

interface AdmissionSurgeriesTabProps {
  admissionId: string | number;
}

const getRequestedSurgeries = async (
  admissionId: string | number,
): Promise<RequestedSurgeryItem[]> => {
  const response = await apiClient.get<RequestedSurgeryItem[]>(
    `/admissions/${admissionId}/requested-surgeries`,
  );
  return response.data;
};

const AdmissionSurgeriesTab = ({ admissionId }: AdmissionSurgeriesTabProps) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] =
    useState<RequestedSurgeryItem | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<number, string>>({});
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<
    Record<number, boolean>
  >({});

  const queryKey = ["admissionRequestedSurgeries", admissionId];

  const { data: requestedSurgeries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getRequestedSurgeries(admissionId),
  });

  useEffect(() => {
    if (financeDialogOpen && selectedSurgery) {
      const updated = requestedSurgeries.find(
        (s) => s.id === selectedSurgery.id,
      );
      if (updated && updated !== selectedSurgery) {
        setSelectedSurgery(updated);
      }
    }
  }, [requestedSurgeries, financeDialogOpen, selectedSurgery]);

  const { data: surgeries = [] } = useQuery({
    queryKey: ["surgicalOperations"],
    queryFn: getSurgicalOperations,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList(),
  });

  const requestMutation = useMutation({
    mutationFn: (data: { surgery_id: string; doctor_id: string }) =>
      apiClient.post(`/admissions/${admissionId}/requested-surgeries`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم طلب العملية بنجاح");
      handleCloseDialog();
    },
    onError: () => toast.error("فشل في طلب العملية"),
  });

  const deleteMutation = useMutation({
    mutationFn: (surgeryId: number) =>
      apiClient.delete(
        `/admissions/${admissionId}/requested-surgeries/${surgeryId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم حذف الطلب بنجاح");
    },
    onError: () => toast.error("فشل في حذف الطلب"),
  });

  const approveMutation = useMutation({
    mutationFn: (surgeryId: number) =>
      apiClient.post(
        `/admissions/${admissionId}/requested-surgeries/${surgeryId}/approve`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم اعتماد العملية بنجاح");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "فشل في اعتماد العملية"),
  });

  const rejectMutation = useMutation({
    mutationFn: (surgeryId: number) =>
      apiClient.post(
        `/admissions/${admissionId}/requested-surgeries/${surgeryId}/reject`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم رفض الطلب بنجاح");
    },
    onError: () => toast.error("فشل في رفض الطلب"),
  });

  const unapproveMutation = useMutation({
    mutationFn: (surgeryId: number) =>
      apiClient.post(
        `/admissions/${admissionId}/requested-surgeries/${surgeryId}/unapprove`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم التراجع عن الاعتماد بنجاح");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "فشل في التراجع عن الاعتماد"),
  });

  const handleSendWhatsApp = async (surgery: RequestedSurgeryItem) => {
    if (!surgery.admission?.patient?.phone) {
      toast.error("رقم الهاتف غير متوفر");
      return;
    }

    let phone = surgery.admission.patient.phone;
    if (!phone.startsWith("249")) {
      phone = `249${phone.replace(/^0/, "")}`;
    }

    setIsSendingWhatsApp((prev) => ({ ...prev, [surgery.id]: true }));

    try {
      const clinicName = "المركز الطبي";
      const totalVal = surgery.total_price || 0;
      const surgeryId = surgery.id;

      await sendWhatsAppCloudTemplate({
        to: phone,
        template_name: "surgery_payment_request",
        language_code: "ar",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: clinicName },
              { type: "text", text: String(totalVal) },
              { type: "text", text: String(surgeryId) },
            ],
          },
        ],
      });
      toast.success("تم إرسال إشعار الواتساب بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("فشل إرسال إشعار الواتساب");
    } finally {
      setIsSendingWhatsApp((prev) => ({ ...prev, [surgery.id]: false }));
    }
  };

  const updateFinanceMutation = useMutation({
    mutationFn: ({ financeId, data }: { financeId: number; data: any }) =>
      apiClient.patch(`/requested-surgery-finances/${financeId}`, data),
    onMutate: async ({ financeId, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousSurgeries =
        queryClient.getQueryData<RequestedSurgeryItem[]>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<RequestedSurgeryItem[]>(queryKey, (old) => {
        if (!old) return [];
        return old.map((surgery) => ({
          ...surgery,
          finances: surgery.finances.map((f) =>
            f.id === financeId ? { ...f, ...data } : f,
          ),
        }));
      });

      // Return a context object with the snapshotted value
      return { previousSurgeries };
    },
    onSuccess: (_, variables) => {
      setEditAmounts((prev) => {
        const next = { ...prev };
        delete next[variables.financeId];
        return next;
      });
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousSurgeries) {
        queryClient.setQueryData(queryKey, context.previousSurgeries);
      }
      toast.error("فشل في تحديث البيانات");
    },
    onSettled: () => {
      // Always refetch after error or success to guarantee we are in sync with the server
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSurgeryId("");
    setSelectedDoctorId("");
  };

  const handleOpenFinanceDialog = (item: RequestedSurgeryItem) => {
    setSelectedSurgery(item);
    setEditAmounts({});
    setFinanceDialogOpen(true);
  };

  const handleCloseFinanceDialog = () => {
    setFinanceDialogOpen(false);
    setSelectedSurgery(null);
    setEditAmounts({});
  };

  const handleOpenLedgerDialog = (surgery: RequestedSurgeryItem) => {
    setSelectedSurgery(surgery);
    setLedgerDialogOpen(true);
  };

  const handleCloseLedgerDialog = () => {
    setLedgerDialogOpen(false);
    setSelectedSurgery(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurgeryId) return;

    // Prevent duplicates
    const isDuplicate = requestedSurgeries.some(
      (s) => s.surgery_id === Number(selectedSurgeryId),
    );
    if (isDuplicate) {
      toast.error("هذه العملية مضافة مسبقاً لهذا المريض");
      return;
    }

    requestMutation.mutate({
      surgery_id: selectedSurgeryId,
      doctor_id: selectedDoctorId,
    });
  };

  const handleAmountChange = (financeId: number, value: string) => {
    setEditAmounts((prev) => ({ ...prev, [financeId]: value }));
  };

  const handleUpdateAmount = (financeId: number, amount: string) => {
    updateFinanceMutation.mutate({
      financeId,
      data: { amount: parseFloat(amount) },
    });
  };

  const getStatusChip = (status: RequestedSurgeryItem["status"]) => {
    const configs = {
      pending: { label: "قيد الانتظار", color: "warning" as const },
      approved: { label: "معتمدة", color: "success" as const },
      rejected: { label: "مرفوضة", color: "error" as const },
    };
    const config = configs[status];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">العمليات الجراحية المطلوبة</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          طلب عملية جديدة
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : requestedSurgeries.length === 0 ? (
        <Box
          p={4}
          textAlign="center"
          bgcolor="grey.50"
          borderRadius={1}
          border="1px dashed"
          borderColor="grey.300"
        >
          <Typography color="textSecondary">لا توجد عمليات مطلوبة</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>ID</TableCell>
                <TableCell>تاريخ الطلب</TableCell>
                <TableCell>اسم العملية</TableCell>
                <TableCell>الطبيب</TableCell>
                <TableCell>السعر الإجمالي</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>بواسطة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requestedSurgeries.map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell>#{item.id}</TableCell>
                    <TableCell>
                      {dayjs(item.created_at).format("YYYY-MM-DD HH:mm")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {item.surgery?.name}
                    </TableCell>
                    <TableCell>{item.doctor?.name || "—"}</TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: "primary.main" }}
                    >
                      {item.total_price.toLocaleString()} SDG
                    </TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>{item.user?.name}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={0.5}>
                        {item.status === "pending" && (
                          <>
                            <Tooltip title="اعتماد">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => approveMutation.mutate(item.id)}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending &&
                                approveMutation.variables === item.id ? (
                                  <CircularProgress size={18} color="inherit" />
                                ) : (
                                  <CheckCircle fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => rejectMutation.mutate(item.id)}
                                disabled={rejectMutation.isPending}
                              >
                                {rejectMutation.isPending &&
                                rejectMutation.variables === item.id ? (
                                  <CircularProgress size={18} color="inherit" />
                                ) : (
                                  <Cancel fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {item.status === "approved" && (
                          <Tooltip title="تراجع عن الاعتماد">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => unapproveMutation.mutate(item.id)}
                              disabled={unapproveMutation.isPending}
                            >
                              {unapproveMutation.isPending &&
                              unapproveMutation.variables === item.id ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <Undo fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          startIcon={<Payments />}
                          onClick={() => handleOpenFinanceDialog(item)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          توزيع النسب
                        </Button>
                        <Tooltip title="فاتورة مريض A5">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={async () => {
                              try {
                                const response = await apiClient.get(
                                  `/admissions/${admissionId}/requested-surgeries/${item.id}/invoice`,
                                  { responseType: "blob" },
                                );
                                const blob = new Blob([response.data], {
                                  type: "application/pdf",
                                });
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, "_blank");
                              } catch {
                                toast.error("حدث خطأ أثناء تحميل الفاتورة");
                              }
                            }}
                          >
                            <Receipt fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="إرسال إشعار الواتساب">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleSendWhatsApp(item)}
                            disabled={isSendingWhatsApp[item.id]}
                          >
                            {isSendingWhatsApp[item.id] ? (
                              <CircularProgress size={20} />
                            ) : (
                              <WhatsApp fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="كشف الحساب">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenLedgerDialog(item)}
                          >
                            <AccountBalanceWallet fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (
                                window.confirm("هل أنت متأكد من حذف هذا الطلب؟")
                              ) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending &&
                            deleteMutation.variables === item.id ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <Delete fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Request Surgery Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>طلب عملية جراحية</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <FormControl fullWidth>
              <InputLabel>العملية الجراحية</InputLabel>
              <Select
                value={selectedSurgeryId}
                label="العملية الجراحية"
                onChange={(e) => setSelectedSurgeryId(e.target.value)}
                required
              >
                {surgeries.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>الطبيب الجراح</InputLabel>
              <Select
                value={selectedDoctorId}
                label="الطبيب الجراح"
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <MenuItem value="">بدون طبيب</MenuItem>
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>إلغاء</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? "جاري الإرسال..." : "طلب العملية"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Finance Details Dialog */}
      <Dialog
        open={financeDialogOpen}
        onClose={handleCloseFinanceDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
            <Typography variant="h6">
              تفاصيل تكاليف العملية: {selectedSurgery?.surgery?.name}
            </Typography>
            {selectedSurgery && (
              <Chip
                label={`الإجمالي: ${selectedSurgery.finances.reduce((sum, f) => sum + Number(f.amount), 0).toLocaleString()} ج.س`}
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {selectedSurgery && (
              <Tooltip title="تباعة أمر التكليف">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={async () => {
                    try {
                      const response = await apiClient.get(
                        `/admissions/${admissionId}/requested-surgeries/${selectedSurgery.id}/print`,
                        { responseType: "blob" },
                      );
                      const blob = new Blob([response.data], {
                        type: "application/pdf",
                      });
                      const url = window.URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    } catch {
                      toast.error("حدث خطأ أثناء تحميل الملف");
                    }
                  }}
                >
                  <Printer size={20} />
                </IconButton>
              </Tooltip>
            )}
            {updateFinanceMutation.isPending && <CircularProgress size={24} />}
          </Box>
        </DialogTitle>
        {updateFinanceMutation.isPending && (
          <LinearProgress sx={{ width: "100%" }} />
        )}
        <DialogContent dividers sx={{ position: "relative" }}>
          {updateFinanceMutation.isPending && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: "rgba(255, 255, 255, 0.3)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
          )}

          {selectedSurgery?.status === "approved" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              هذه العملية معتمدة، لا يمكن تعديل التكاليف.
            </Alert>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>البند</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>المبلغ</TableCell>
                <TableCell>طريقة الدفع</TableCell>
                <TableCell>الطبيب المستحق</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedSurgery?.finances.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {f.finance_charge.name}
                      {f.finance_charge.reference_type && (
                        <Tooltip
                          title={`هذا البند محسوب تلقائياً بناءً على ${f.finance_charge.reference_type === "total" ? "إجمالي العملية" : "بند آخر"}`}
                        >
                          <Link
                            fontSize="small"
                            sx={{
                              color: "text.secondary",
                              transform: "rotate(-45deg)",
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {f.finance_charge.beneficiary === "staff" ? "طبيب" : "مركز"}
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={editAmounts[f.id] ?? f.amount}
                      onChange={(e) => handleAmountChange(f.id, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() =>
                        handleUpdateAmount(
                          f.id,
                          editAmounts[f.id] || f.amount.toString(),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const currentInput = e.target as HTMLInputElement;
                          const container = currentInput.closest("table");
                          if (container) {
                            const allInputs = Array.from(
                              container.querySelectorAll(
                                'input[type="number"]',
                              ),
                            ) as HTMLInputElement[];
                            const currentIndex =
                              allInputs.indexOf(currentInput);
                            if (
                              currentIndex > -1 &&
                              currentIndex < allInputs.length - 1
                            ) {
                              e.preventDefault();
                              const nextInput = allInputs[currentIndex + 1];
                              // Move focus in next tick to avoid race conditions with onBlur/re-renders
                              setTimeout(() => {
                                currentInput.blur();
                                nextInput.focus();
                                nextInput.select();
                              }, 0);
                            } else if (currentIndex === allInputs.length - 1) {
                              // If last row, just blur to save
                              currentInput.blur();
                            }
                          }
                        }
                      }}
                      sx={{ width: 100 }}
                      disabled={selectedSurgery?.status === "approved"}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={f.payment_method || "cash"}
                      onChange={(e) => {
                        updateFinanceMutation.mutate({
                          financeId: f.id,
                          data: { payment_method: e.target.value },
                        });
                      }}
                      sx={{ width: 100 }}
                      disabled={selectedSurgery?.status === "approved"}
                    >
                      <MenuItem value="cash">كاش</MenuItem>
                      <MenuItem value="bankak">بنكك</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {f.finance_charge.beneficiary === "staff" ? (
                      <Autocomplete
                        size="small"
                        options={doctors}
                        getOptionLabel={(option: any) => option.name || ""}
                        value={
                          doctors.find((d) => d.id === f.doctor_id) || null
                        }
                        onChange={(_, newValue) => {
                          updateFinanceMutation.mutate({
                            financeId: f.id,
                            data: { doctor_id: newValue?.id || null },
                          });
                        }}
                        disabled={selectedSurgery?.status === "approved"}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="اختر الطبيب" />
                        )}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "primary.light",
              color: "primary.contrastText",
              borderRadius: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography fontWeight={600}>إجمالي تكلفة العملية:</Typography>
            <Typography variant="h6" fontWeight={700}>
              {selectedSurgery?.total_price.toLocaleString()} SDG
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFinanceDialog} color="primary">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      <SurgeryLedgerDialog
        open={ledgerDialogOpen}
        onClose={handleCloseLedgerDialog}
        requestedSurgeryId={selectedSurgery?.id}
        surgeryName={selectedSurgery?.surgery?.name}
      />
    </Box>
  );
};

interface SurgeryLedgerDialogProps {
  open: boolean;
  onClose: () => void;
  requestedSurgeryId?: number;
  surgeryName?: string;
}

const SurgeryLedgerDialog = ({
  open,
  onClose,
  requestedSurgeryId,
  surgeryName,
}: SurgeryLedgerDialogProps) => {
  const [newTransaction, setNewTransaction] = useState({
    payment_method: "cash",
    amount: "",
    description: "دفعة من الحساب",
    notes: "",
  });

  const {
    data: ledgerData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["surgery-ledger", requestedSurgeryId],
    queryFn: async () => {
      const resp = await apiClient.get(
        `/requested-surgeries/${requestedSurgeryId}/ledger`,
      );
      return resp.data;
    },
    enabled: open && !!requestedSurgeryId,
  });

  const addTxMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post(
        `/requested-surgeries/${requestedSurgeryId}/transactions`,
        data,
      );
    },
    onSuccess: () => {
      toast.success("تمت إضافة المعاملة بنجاح");
      refetch();
      setNewTransaction({
        payment_method: "cash",
        amount: "",
        description: "دفعة من الحساب",
        notes: "",
      });
    },
    onError: () => toast.error("فشل إضافة المعاملة"),
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (txId: number) => {
      return apiClient.delete(
        `/requested-surgeries/${requestedSurgeryId}/transactions/${txId}`,
      );
    },
    onSuccess: () => {
      toast.success("تم حذف المعاملة بنجاح");
      refetch();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "فشل حذف المعاملة"),
  });

  const handlePrint = async () => {
    try {
      const response = await apiClient.get(
        `/requested-surgeries/${requestedSurgeryId}/print-ledger`,
        { responseType: "blob" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("حدث خطأ أثناء تحميل كشف الحساب");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">كشف حساب العملية: {surgeryName}</Typography>
        <IconButton
          onClick={handlePrint}
          color="primary"
          disabled={!ledgerData}
        >
          <Printer size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Box mb={3} display="flex" gap={2}>
              <Paper
                sx={{ p: 2, flex: 1, textAlign: "center", bgcolor: "#f0f4f8" }}
              >
                <Typography variant="caption" color="textSecondary">
                  إجمالي التكاليف
                </Typography>
                <Typography variant="h6" color="error">
                  {ledgerData?.summary?.total_debits?.toLocaleString()} SDG
                </Typography>
              </Paper>
              <Paper
                sx={{ p: 2, flex: 1, textAlign: "center", bgcolor: "#f0f4f8" }}
              >
                <Typography variant="caption" color="textSecondary">
                  إجمالي المدفوعات
                </Typography>
                <Typography variant="h6" color="success.main">
                  {ledgerData?.summary?.total_credits?.toLocaleString()} SDG
                </Typography>
              </Paper>
              <Paper
                sx={{ p: 2, flex: 1, textAlign: "center", bgcolor: "#e3f2fd" }}
              >
                <Typography variant="caption" color="textSecondary">
                  المتبقي (الرصيد)
                </Typography>
                <Typography variant="h6" color="primary">
                  {ledgerData?.summary?.balance?.toLocaleString()} SDG
                </Typography>
              </Paper>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              إضافة معاملة مالية (Payment/Debit)
            </Typography>
            <Box display="flex" gap={1} mb={3} alignItems="flex-start">
              <TextField
                select
                size="small"
                label="طريقة الدفع"
                value={newTransaction.payment_method}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    payment_method: e.target.value,
                  })
                }
                SelectProps={{ native: true }}
                sx={{ width: 130 }}
              >
                <option value="cash">نقداً (Cash)</option>
                <option value="bankak">بنكك (Bankak)</option>
              </TextField>
              <TextField
                size="small"
                label="المبلغ"
                type="number"
                value={newTransaction.amount}
                error={
                  !!newTransaction.amount &&
                  Number(newTransaction.amount) >
                    (ledgerData?.summary?.balance || 0)
                }
                helperText={
                  !!newTransaction.amount &&
                  Number(newTransaction.amount) >
                    (ledgerData?.summary?.balance || 0)
                    ? "المبلغ يتجاوز الرصيد"
                    : ""
                }
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    amount: e.target.value,
                  })
                }
                sx={{ width: 150 }}
              />
              <TextField
                size="small"
                label="البيان"
                fullWidth
                value={newTransaction.description}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    description: e.target.value,
                  })
                }
              />
              <Button
                variant="contained"
                onClick={() => addTxMutation.mutate(newTransaction)}
                disabled={
                  !newTransaction.amount ||
                  addTxMutation.isPending ||
                  (ledgerData?.summary?.balance || 0) <= 0 ||
                  Number(newTransaction.amount) >
                    (ledgerData?.summary?.balance || 0)
                }
              >
                إضافة
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>البيان</TableCell>
                    <TableCell align="center">مدين (+)</TableCell>
                    <TableCell align="center">دائن (-)</TableCell>
                    <TableCell>المستخدم</TableCell>
                    <TableCell align="center">حذف</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerData?.transactions?.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell>
                        {tx.description}
                        {tx.payment_method && (
                          <Chip
                            label={
                              tx.payment_method === "cash" ? "نقداً" : "بنكك"
                            }
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1, fontSize: "0.7rem", height: 20 }}
                          />
                        )}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "error.main",
                          fontWeight: tx.type === "debit" ? "bold" : "normal",
                        }}
                      >
                        {tx.type === "debit" ? tx.amount.toLocaleString() : ""}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "success.main",
                          fontWeight: tx.type === "credit" ? "bold" : "normal",
                        }}
                      >
                        {tx.type === "credit" ? tx.amount.toLocaleString() : ""}
                      </TableCell>
                      <TableCell>{tx.user?.name}</TableCell>
                      <TableCell align="center">
                        {tx.type === "credit" && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteTxMutation.mutate(tx.id)}
                            disabled={deleteTxMutation.isPending}
                          >
                            {deleteTxMutation.isPending &&
                            deleteTxMutation.variables === tx.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Delete fontSize="small" />
                            )}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {ledgerData?.transactions?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        لا توجد معاملات بعد
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdmissionSurgeriesTab;
