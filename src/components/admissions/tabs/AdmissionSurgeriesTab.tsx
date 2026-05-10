import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Add,
  Delete,
  CheckCircle,
  Cancel,
  Payments,
  Receipt,
  AccountBalanceWallet,
  WhatsApp,
  Undo,
  Link,
  Refresh,
  Sync,
} from "@mui/icons-material";
import { toast } from "sonner";
import dayjs from "dayjs";
import apiClient from "@/services/api";
import { getDoctorsList } from "@/services/doctorService";
import { getSurgicalOperations } from "@/services/surgicalOperationService";
import type { SurgicalOperation } from "@/services/surgicalOperationService";
import type { DoctorStripped } from "@/types/doctors";
import { Printer } from "lucide-react";
import { sendWhatsAppCloudTemplate } from "@/services/whatsappCloudApiService";
import {
  prepareWhatsApp,
  markRequestSent,
  syncAllFromFirestore,
} from "@/services/admissionService";
import { useAdmissionFirestoreListener } from "@/hooks/useAdmissionFirestoreListener";
import { SurgeryFinanceDialog } from "./SurgeryFinanceDialog";

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
  initial_price?: number | null;
  doctor_id: number | null;
  status: "pending" | "approved" | "rejected";
  approved_by: number | null;
  approved_at: string | null;
  request_send_status?: boolean;
  in_firestore?: boolean;
  created_at?: string;
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

export interface RequestedSurgeriesPanelProps {
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

/** Standalone panel for requested surgeries (list + dialogs). Use in tabs or registration page. */
export function RequestedSurgeriesPanel({ admissionId }: RequestedSurgeriesPanelProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string>("");
  const [initialPrice, setInitialPrice] = useState<string>("");
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] =
    useState<RequestedSurgeryItem | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<number, string>>({});
  const [editInitialPrice, setEditInitialPrice] = useState<Record<number, string>>({});
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<
    Record<number, boolean>
  >({});
  const [isSendingFinanceApproval, setIsSendingFinanceApproval] = useState(false);
  const [isSyncingFromFirestore, setIsSyncingFromFirestore] = useState(false);

  const queryKey = ["admissionRequestedSurgeries", admissionId];

  useAdmissionFirestoreListener(admissionId, queryKey);

  const { data: requestedSurgeries = [], isLoading, refetch } = useQuery({
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
    mutationFn: (data: { surgery_id: string; initial_price?: number }) =>
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

  const updateInitialPriceMutation = useMutation({
    mutationFn: ({ requestedSurgeryId, initialPrice }: { requestedSurgeryId: number; initialPrice: number | null }) =>
      apiClient.patch(
        `/admissions/${admissionId}/requested-surgeries/${requestedSurgeryId}`,
        { initial_price: initialPrice },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey });
      setEditInitialPrice((prev) => {
        const next = { ...prev };
        delete next[variables.requestedSurgeryId];
        return next;
      });
      toast.success("تم تحديث السعر الأولي");
    },
    onError: () => toast.error("فشل تحديث السعر الأولي"),
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
      const clinicName = "مستشفي ون كير";
      const totalVal = surgery.initial_price || 0;
      const surgeryId = surgery.id;

      await sendWhatsAppCloudTemplate({
        to: phone,
        template_name: "payment_request_notice",
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

  const handleSendFinanceApproval = async () => {
    const surgery = requestedSurgeries[0];
    if (!surgery?.admission?.patient?.phone) {
      toast.error("رقم الهاتف غير متوفر");
      return;
    }

    let phone = surgery.admission.patient.phone;
    if (!phone.startsWith("249")) {
      phone = `249${phone.replace(/^0/, "")}`;
    }

    setIsSendingFinanceApproval(true);

    let prepareToastId: string | number | undefined;
    try {
      prepareToastId = toast.loading("جاري حفظ التفاصيل ورفع التقرير...");

      await prepareWhatsApp(admissionId, surgery.id);

      toast.success("تم التحضير. جاري الإرسال...", { id: prepareToastId });

      const sanitize = (s: string) => s.replace(/[\n\r\t]+/g, " ").replace(/\s{5,}/g, "    ");
      const operationName = sanitize(surgery.surgery?.name ?? "");
      const patientName = sanitize(surgery.admission?.patient?.name ?? "");

      await sendWhatsAppCloudTemplate({
        to: '249123619560',
        template_name: "request_finance_approve",
        language_code: "ar",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: operationName },
              { type: "text", text: patientName },
            ],
          },
          { type: "button", sub_type: "quick_reply", index: 0, parameters: [{ type: "payload", payload: `admission_${admissionId}` }] },
          { type: "button", sub_type: "quick_reply", index: 1, parameters: [{ type: "payload", payload: `admission_${admissionId}_surgery_${surgery.id}_approve` }] },
          { type: "button", sub_type: "quick_reply", index: 2, parameters: [{ type: "payload", payload: `admission_${admissionId}_surgery_${surgery.id}_reject` }] },
        ],
      });

      await markRequestSent(admissionId, surgery.id);
      toast.success("تم إرسال طلب اعتماد الحصص بنجاح");
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      console.error(error);
      if (prepareToastId != null) toast.dismiss(prepareToastId);
      toast.error("فشل إرسال طلب اعتماد الحصص");
    } finally {
      setIsSendingFinanceApproval(false);
    }
  };

  const handleSyncFromFirestore = async () => {
    setIsSyncingFromFirestore(true);
    try {
      const res = await syncAllFromFirestore(admissionId);
      const { synced, surgeries } = res;
      if (synced === 0) {
        toast.info((res as { message?: string }).message ?? "لا توجد اعتمادات جديدة في Firestore");
        return;
      }
      toast.success(`تم مزامنة ${synced} عملية من Firestore`);
      queryClient.setQueryData(queryKey, surgeries);
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "فشل جلب البيانات من Firestore");
    } finally {
      setIsSyncingFromFirestore(false);
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
    onError: (err: { response?: { data?: { message?: string }; status?: number } }, _variables, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousSurgeries) {
        queryClient.setQueryData(queryKey, context.previousSurgeries);
      }
      const msg = err.response?.data?.message;
      toast.error(msg || "فشل في تحديث البيانات");
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
    setInitialPrice("");
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

    const price = initialPrice.trim() ? parseFloat(initialPrice) : undefined;
    requestMutation.mutate({
      surgery_id: selectedSurgeryId,
      ...(price != null && !isNaN(price) && price >= 0 ? { initial_price: price } : {}),
    });
  };

  const handleAmountChange = (financeId: number, value: string) => {
    setEditAmounts((prev) => ({ ...prev, [financeId]: value }));
  };

  const handleUpdateAmount = (financeId: number, amount: string) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) return;

    let finalAmount = parsed;
    const initialPrice = selectedSurgery?.initial_price;
    if (initialPrice != null && initialPrice > 0) {
      const otherSum = selectedSurgery!.finances
        .filter((f) => f.id !== financeId)
        .reduce((s, f) => s + Number(f.amount), 0);
      const maxForThis = Math.max(0, initialPrice - otherSum);
      if (parsed > maxForThis) {
        finalAmount = maxForThis;
        toast.warning(
          `لا يمكن تجاوز السعر المبدئي (${initialPrice.toLocaleString()} ج.س). تم تعديل المبلغ إلى ${maxForThis.toLocaleString()}`
        );
      }
    }

    updateFinanceMutation.mutate({
      financeId,
      data: { amount: finalAmount },
    });
  };

  const deleteFinanceMutation = useMutation({
    mutationFn: (financeId: number) =>
      apiClient.delete(`/requested-surgery-finances/${financeId}`),
    onSuccess: () => {
      toast.success("تم حذف البند بنجاح");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          "فشل في حذف البند. تأكد من أنه غير مرتبط ببنود أخرى.",
      );
    },
  });

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">العمليات  </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => refetch()}
            title="تحديث من الخادم"
            sx={{ color: "text.secondary" }}
          >
            <Refresh fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleSyncFromFirestore}
            disabled={isSyncingFromFirestore}
            title="جلب الاعتمادات من Firestore ومزامنتها مع قاعدة البيانات"
            sx={{ color: "text.secondary" }}
          >
            {isSyncingFromFirestore ? (
              <CircularProgress size={20} />
            ) : (
              <Sync fontSize="small" />
            )}
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
          >
            طلب عملية 
          </Button>
        </Box>
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
        <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden",p:1 }}>
        <List dense disablePadding>
          {requestedSurgeries.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                alignItems="flex-start"
                disablePadding
                sx={{
                  py: 0.75,
                  px: 1.5,
                  flexWrap: "wrap",
                  gap: 0.5,
                  bgcolor:
                    item.status === "approved"
                      ? (theme) => alpha(theme.palette.success.light, 0.18)
                      : "transparent",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                    minWidth: 0,
                    flex: "1 1 auto",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      #{item.id}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ flex: "1 1 auto", minWidth: 0 }}
                    >
                      {item.surgery?.name ?? "—"}
                    </Typography>
                    <Chip
                      label={item.request_send_status ? "تم إرسال الطلب" : "لم يتم الإرسال"}
                      size="small"
                      color={item.request_send_status ? "success" : "default"}
                      variant="outlined"
                      sx={{ fontSize: "0.7rem" }}
                    />
                    {item.in_firestore && (
                      <Chip
                        label="متصل بـ Firestore"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                        icon={<Link sx={{ fontSize: 14 }} />}
                      />
                    )}
                    <TextField
                      size="small"
                      type="number"
                      placeholder="سعر"
                      value={
                        editInitialPrice[item.id] ??
                        (item.initial_price != null
                          ? String(item.initial_price)
                          : "")
                      }
                      onChange={(e) =>
                        setEditInitialPrice((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        const raw =
                          editInitialPrice[item.id] ??
                          (item.initial_price != null
                            ? String(item.initial_price)
                            : "");
                        const num = raw === "" ? null : parseFloat(raw);
                        if (
                          raw !== "" &&
                          (isNaN(num as number) || (num as number) < 0)
                        )
                          return;
                        if (num !== (item.initial_price ?? null)) {
                          updateInitialPriceMutation.mutate({
                            requestedSurgeryId: item.id,
                            initialPrice: num,
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          (e.target as HTMLInputElement).blur();
                      }}
                      disabled={
                        updateInitialPriceMutation.isPending &&
                        updateInitialPriceMutation.variables
                          ?.requestedSurgeryId === item.id || item.approved_at !== null
                      }
                      sx={{
                        width: 166,
                        "& .MuiInputBase-input": {
                          fontSize: "1.15rem",
                          py: 0.25,
                        },
                      }}
                    />
                  </Box>
                  {item.status === "approved" && item.approved_at && (
                    <Typography
                      variant="caption"
                      color="success.dark"
                      sx={{ mt: 0.25 }}
                    >
                      تم الاعتماد:{" "}
                      {dayjs(item.approved_at).format("DD/MM/YYYY HH:mm")}
                    </Typography>
                  )}
                  <List dense disablePadding sx={{ width: "100%", mt: 0.5 }}>
                    {item.status === "pending" && (
                      <>
                        {/* <Divider /> */}
                        {/* <ListItemButton
                          dense
                          onClick={() => approveMutation.mutate(item.id)}
                          disabled={approveMutation.isPending}
                          sx={{ py: 0.25, minHeight: 36 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {approveMutation.isPending && approveMutation.variables === item.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <CheckCircle color="success" sx={{ fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="اعتماد" primaryTypographyProps={{ variant: "body2" }} />
                        </ListItemButton> */}
                        {/* <Divider /> */}
                        {/* <ListItemButton
                          dense
                          onClick={() => rejectMutation.mutate(item.id)}
                          disabled={rejectMutation.isPending}
                          sx={{ py: 0.25, minHeight: 36 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {rejectMutation.isPending && rejectMutation.variables === item.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <Cancel color="warning" sx={{ fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="رفض" primaryTypographyProps={{ variant: "body2" }} />
                        </ListItemButton> */}
                      </>
                    )}
                    {item.status === "approved" && (
                      <>
                        <Divider />
                        <ListItemButton
                          dense
                          onClick={() => unapproveMutation.mutate(item.id)}
                          disabled={unapproveMutation.isPending}
                          sx={{ py: 0.25, minHeight: 36 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {unapproveMutation.isPending && unapproveMutation.variables === item.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <Undo color="secondary" sx={{ fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="تراجع عن الاعتماد" primaryTypographyProps={{ variant: "body2" }} />
                        </ListItemButton>
                      </>
                    )}
                    <Divider />
                    <ListItemButton dense onClick={() => handleOpenFinanceDialog(item)} sx={{ py: 0.25, minHeight: 36 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Payments color="info" sx={{ fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText primary="توزيع النسب" primaryTypographyProps={{ variant: "body2" }} />
                    </ListItemButton>
                    <Divider />
                    <ListItemButton
                      dense
                      onClick={async () => {
                        try {
                          const response = await apiClient.get(`/admissions/${admissionId}/requested-surgeries/${item.id}/invoice`, { responseType: "blob" });
                          const blob = new Blob([response.data], { type: "application/pdf" });
                          window.open(URL.createObjectURL(blob), "_blank");
                        } catch {
                          toast.error("حدث خطأ أثناء تحميل الفاتورة");
                        }
                      }}
                      sx={{ py: 0.25, minHeight: 36 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Receipt color="secondary" sx={{ fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText primary="فاتورة مريض A5" primaryTypographyProps={{ variant: "body2" }} />
                    </ListItemButton>
                    <Divider />
                    <ListItemButton
                      dense
                      onClick={() => handleSendWhatsApp(item)}
                      disabled={isSendingWhatsApp[item.id]}
                      sx={{ py: 0.25, minHeight: 36 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {isSendingWhatsApp[item.id] ? (
                          <CircularProgress size={20} />
                        ) : (
                          <WhatsApp sx={{ fontSize: 20 }} color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText primary="إرسال إشعار الواتساب" primaryTypographyProps={{ variant: "body2" }} />
                    </ListItemButton>
                    <Divider />
                    <ListItemButton dense onClick={() => handleOpenLedgerDialog(item)} sx={{ py: 0.25, minHeight: 36 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <AccountBalanceWallet color="success" sx={{ fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText primary="كشف الحساب" primaryTypographyProps={{ variant: "body2" }} />
                    </ListItemButton>
                    {item.approved_at && (
                      <>
                        <Divider />
                        <ListItem dense sx={{ py: 0.25, minHeight: 36 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircle color="success" sx={{ fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={`تاريخ الاعتماد: ${dayjs(item.approved_at).format("DD/MM/YYYY HH:mm")}`}
                            primaryTypographyProps={{ variant: "body2", color: "success.dark" }}
                          />
                        </ListItem>
                      </>
                    )}
                    <Divider />
                    <ListItemButton
                      dense
                      onClick={() => {
                        if (window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) deleteMutation.mutate(item.id);
                      }}
                      disabled={deleteMutation.isPending}
                      sx={{ py: 0.25, minHeight: 36 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {deleteMutation.isPending && deleteMutation.variables === item.id ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <Delete color="error" sx={{ fontSize: 20 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText primary="حذف" primaryTypographyProps={{ variant: "body2" }} />
                    </ListItemButton>
                  </List>
                </Box>
              </ListItem>
              <ListItem sx={{textAlign:'center',display:'flex',justifyContent:'center'}}>
              {requestedSurgeries.length > 0 && (
            <Button
             
              variant="contained"
              color="success"
              startIcon={
                isSendingFinanceApproval ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <WhatsApp />
                )
              }
              onClick={handleSendFinanceApproval}
              disabled={isSendingFinanceApproval ||item.approved_at !== null || item.initial_price == null }
              sx={{ textTransform: "none" }}
            >
              ارسال طلب اعتماد
            </Button>
          )}
              </ListItem>
            </React.Fragment>
          ))}
        </List>
       
        </Paper>
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
            <Autocomplete
              fullWidth
              options={surgeries}
              getOptionLabel={(s) => s.name}
              value={surgeries.find((s) => String(s.id) === selectedSurgeryId) ?? null}
              onChange={(_, newVal) => setSelectedSurgeryId(newVal ? String(newVal.id) : "")}
              renderInput={(params) => (
                <TextField {...params} label="العملية الجراحية" required />
              )}
            />

            <TextField
              fullWidth
              label="السعر "
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              value={initialPrice}
              onChange={(e) => setInitialPrice(e.target.value)}
              placeholder="اختياري"
            />
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

      <SurgeryFinanceDialog
        open={financeDialogOpen}
        onClose={handleCloseFinanceDialog}
        selectedSurgery={selectedSurgery}
        admissionId={admissionId}
        editAmounts={editAmounts}
        onAmountChange={handleAmountChange}
        onUpdateAmount={handleUpdateAmount}
        onUpdateFinance={(params) =>
          updateFinanceMutation.mutate({
            financeId: params.financeId,
            data: params.data,
          })
        }
        onDeleteFinance={(id) => deleteFinanceMutation.mutate(id)}
        doctors={doctors}
        isUpdating={updateFinanceMutation.isPending}
        isDeleting={deleteFinanceMutation.isPending}
        isSendingWhatsApp={isSendingWhatsApp}
        onSendWhatsAppStart={(surgeryId) =>
          setIsSendingWhatsApp((prev) => ({ ...prev, [surgeryId]: true }))
        }
        onSendWhatsAppEnd={(surgeryId) =>
          setIsSendingWhatsApp((prev) => ({ ...prev, [surgeryId]: false }))
        }
        onRequestSentSuccess={() => queryClient.invalidateQueries({ queryKey })}
      />

      <SurgeryLedgerDialog
        open={ledgerDialogOpen}
        onClose={handleCloseLedgerDialog}
        requestedSurgeryId={selectedSurgery?.id}
        surgeryName={selectedSurgery?.surgery?.name}
        initialPrice={selectedSurgery?.initial_price ?? undefined}
      />
    </Box>
  );
};

interface SurgeryLedgerDialogProps {
  open: boolean;
  onClose: () => void;
  requestedSurgeryId?: number;
  surgeryName?: string;
  initialPrice?: number | null;
}

const SurgeryLedgerDialog = ({
  open,
  onClose,
  requestedSurgeryId,
  surgeryName,
  initialPrice,
}: SurgeryLedgerDialogProps) => {
  const [newTransaction, setNewTransaction] = useState({
    payment_method: "cash",
    amount: "",
    description: " رقم العملية ",
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

  const paid = ledgerData?.summary?.total_credits ?? 0;
  const balance = (initialPrice ?? 0) - paid;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
          py: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          كشف حساب العملية: {surgeryName}
        </Typography>
        <IconButton
          onClick={handlePrint}
          color="primary"
          disabled={!ledgerData}
          size="small"
        >
          <Printer size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 3, p: 3 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <Box
              display="flex"
              flexDirection={{ xs: "column", sm: "row" }}
              gap={2}
              flexWrap="wrap"
            >
              <Paper
                elevation={0}
                sx={{
                  flex: "1 1 140px",
                  minWidth: 120,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  إجمالي التكاليف
                </Typography>
                <Typography variant="h6" color="error.main" fontWeight={700} sx={{ mt: 0.5 }}>
                  {(initialPrice ?? ledgerData?.summary?.total_debits ?? 0).toLocaleString()} SDG
                </Typography>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  flex: "1 1 140px",
                  minWidth: 120,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  إجمالي المدفوعات
                </Typography>
                <Typography variant="h6" color="success.main" fontWeight={700} sx={{ mt: 0.5 }}>
                  {ledgerData?.summary?.total_credits?.toLocaleString()} SDG
                </Typography>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  flex: "1 1 140px",
                  minWidth: 120,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  المتبقي (الرصيد)
                </Typography>
                <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mt: 0.5 }}>
                  {balance.toLocaleString()} SDG
                </Typography>
              </Paper>
            </Box>

            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                إضافة معاملة مالية (Payment/Debit)
              </Typography>
              <Box
                display="flex"
                flexWrap="wrap"
                gap={2}
                alignItems="flex-start"
              >
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
                  sx={{ minWidth: 130 }}
                >
                  <option value="cash">نقداً (Cash)</option>
                  <option value="bankak">بنكك (Bankak)</option>
                </TextField>
                <TextField
                  size="small"
                  label="المبلغ"
                  type="number"
                  value={newTransaction.amount}
                  error={!!newTransaction.amount && Number(newTransaction.amount) > balance}
                  helperText={
                    !!newTransaction.amount && Number(newTransaction.amount) > balance
                      ? "المبلغ يتجاوز الرصيد"
                      : ""
                  }
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      amount: e.target.value,
                    })
                  }
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  size="small"
                  label="البيان"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      description: e.target.value,
                    })
                  }
                  sx={{ flex: "1 1 180px", minWidth: 180 }}
                />
                <Button
                  variant="contained"
                  onClick={() => addTxMutation.mutate(newTransaction)}
                  disabled={
                    !newTransaction.amount ||
                    addTxMutation.isPending ||
                    balance <= 0 ||
                    Number(newTransaction.amount) > balance
                  }
                  sx={{ alignSelf: "flex-start" }}
                >
                  إضافة
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "grey.100" }}>
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
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: "none" }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdmissionSurgeriesTab({ admissionId }: RequestedSurgeriesPanelProps) {
  return <RequestedSurgeriesPanel admissionId={admissionId} />;
}
