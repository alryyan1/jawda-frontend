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
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Autocomplete,
  LinearProgress,
  Alert,
} from "@mui/material";
import { Delete, Link, WhatsApp } from "@mui/icons-material";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { prepareWhatsApp, markRequestSent } from "@/services/admissionService";
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

export interface RequestedSurgeryForFinance {
  id: number;
  surgery?: { name?: string };
  initial_price?: number | null;
  status: string;
  approved_at?: string | null;
  finances: RequestedSurgeryFinanceItem[];
  total_price: number;
  admission?: {
    patient?: { name?: string; phone?: string };
  };
}

interface DoctorOption {
  id: number;
  name: string;
}

export interface SurgeryFinanceDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSurgery: RequestedSurgeryForFinance | null;
  admissionId: string | number;
  editAmounts: Record<number, string>;
  onAmountChange: (financeId: number, value: string) => void;
  onUpdateAmount: (financeId: number, amount: string) => void;
  onUpdateFinance: (params: { financeId: number; data: Record<string, unknown> }) => void;
  onDeleteFinance: (financeId: number) => void;
  doctors: DoctorOption[];
  isUpdating: boolean;
  isDeleting: boolean;
  isSendingWhatsApp: Record<number, boolean>;
  onSendWhatsAppStart: (surgeryId: number) => void;
  onSendWhatsAppEnd: (surgeryId: number) => void;
  onRequestSentSuccess?: () => void;
}

export function SurgeryFinanceDialog({
  open,
  onClose,
  selectedSurgery,
  admissionId,
  editAmounts,
  onAmountChange,
  onUpdateAmount,
  onUpdateFinance,
  onDeleteFinance,
  doctors,
  isUpdating,
  isDeleting,
  isSendingWhatsApp,
  onSendWhatsAppStart,
  onSendWhatsAppEnd,
  onRequestSentSuccess,
}: SurgeryFinanceDialogProps) {
  const handleSendWhatsApp = async () => {
    if (!selectedSurgery?.admission?.patient?.phone) {
      toast.error("رقم الهاتف غير متوفر");
      return;
    }

    let phone = selectedSurgery.admission.patient.phone;
    if (!phone.startsWith("249")) {
      phone = `249${phone.replace(/^0/, "")}`;
    }

    onSendWhatsAppStart(selectedSurgery.id);

    let prepareToastId: string | number | undefined;
    try {
      prepareToastId = toast.loading("جاري حفظ التفاصيل ورفع التقرير...");

      await prepareWhatsApp(admissionId, selectedSurgery.id);

      toast.success("تم التحضير. جاري الإرسال...", { id: prepareToastId });

      const sanitize = (s: string) => s.replace(/[\n\r\t]+/g, " ").replace(/\s{5,}/g, "    ");
      const operationName = sanitize(selectedSurgery.surgery?.name ?? "");
      const patientName = sanitize(selectedSurgery.admission?.patient?.name ?? "");

      await sendWhatsAppCloudTemplate({
        to: phone,
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
          { type: "button", sub_type: "quick_reply", index: 1, parameters: [{ type: "payload", payload: `admission_${admissionId}_surgery_${selectedSurgery.id}_approve` }] },
          { type: "button", sub_type: "quick_reply", index: 2, parameters: [{ type: "payload", payload: `admission_${admissionId}_surgery_${selectedSurgery.id}_reject` }] },
        ],
      });

      await markRequestSent(admissionId, selectedSurgery.id);
      toast.success("تم إرسال طلب اعتماد الحصص بنجاح");
      onRequestSentSuccess?.();
    } catch (error) {
      console.error(error);
      if (prepareToastId != null) toast.dismiss(prepareToastId);
      toast.error("فشل إرسال طلب اعتماد الحصص");
    } finally {
      onSendWhatsAppEnd(selectedSurgery.id);
    }
  };

  const currentTotal = selectedSurgery?.finances.reduce(
    (s, f) => s + Number(editAmounts[f.id] ?? f.amount),
    0
  ) ?? 0;
  const staffTotal =
    selectedSurgery?.finances
      .filter((f) => f.finance_charge.beneficiary === "staff")
      .reduce((s, f) => s + Number(editAmounts[f.id] ?? f.amount), 0) ?? 0;
  const centerTotal =
    selectedSurgery?.finances
      .filter((f) => f.finance_charge.beneficiary === "center")
      .reduce((s, f) => s + Number(editAmounts[f.id] ?? f.amount), 0) ?? 0;
  const cashTotal =
    selectedSurgery?.finances
      .filter((f) => f.payment_method === "cash")
      .reduce((s, f) => s + Number(editAmounts[f.id] ?? f.amount), 0) ?? 0;
  const bankakTotal =
    selectedSurgery?.finances
      .filter((f) => f.payment_method === "bankak")
      .reduce((s, f) => s + Number(editAmounts[f.id] ?? f.amount), 0) ?? 0;
  const exceedsInitialPrice =
    selectedSurgery?.initial_price != null &&
    selectedSurgery.initial_price > 0 &&
    currentTotal > selectedSurgery.initial_price;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h6">
            تفاصيل تكاليف العملية: {selectedSurgery?.surgery?.name}
          </Typography>
          {selectedSurgery && (
            <>
              <Chip
                label={`السعر: ${(selectedSurgery.initial_price ?? 0).toLocaleString()}`}
                color="default"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`اجمالي الكادر: ${staffTotal.toLocaleString()}`}
                color="primary"
                size="small"
                variant="outlined"
              />
              <Chip
                label={`اجمالي المركز: ${centerTotal.toLocaleString()}`}
                color="secondary"
                size="small"
                variant="outlined"
              />
              <Chip
                label={`اجمالي كاش: ${cashTotal.toLocaleString()}`}
                color="success"
                size="small"
                variant="outlined"
              />
              <Chip
                label={`اجمالي بنكك: ${bankakTotal.toLocaleString()}`}
                color="info"
                size="small"
                variant="outlined"
              />
            </>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {selectedSurgery && (
            <>
              <Tooltip title={selectedSurgery.status === "approved" ? "العملية معتمدة بالفعل" : "إرسال طلب اعتماد الحصص عبر واتساب"}>
                <span>
                  <IconButton
                    size="small"
                    color="success"
                    onClick={handleSendWhatsApp}
                    disabled={selectedSurgery.status === "approved" || isSendingWhatsApp[selectedSurgery.id]}
                  >
                  {isSendingWhatsApp[selectedSurgery.id] ? (
                    <CircularProgress size={20} />
                  ) : (
                    <WhatsApp sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="طباعة أمر التكليف">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={async () => {
                    try {
                      const response = await apiClient.get(
                        `/admissions/${admissionId}/requested-surgeries/${selectedSurgery.id}/print`,
                        { responseType: "blob" }
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
            </>
          )}
          {isUpdating && <CircularProgress size={24} />}
        </Box>
      </DialogTitle>
      {isUpdating && <LinearProgress sx={{ width: "100%" }} />}
      <DialogContent dividers sx={{ position: "relative" }}>
        {isUpdating && (
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
        {exceedsInitialPrice && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            إجمالي التكاليف يتجاوز السعر المبدئي. سيتم تعديل المبلغ تلقائياً عند الحفظ.
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
              <TableCell align="center">إزالة</TableCell>
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
                          sx={{ color: "text.secondary", transform: "rotate(-45deg)" }}
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
                    onChange={(e) => onAmountChange(f.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() =>
                      onUpdateAmount(f.id, editAmounts[f.id] || f.amount.toString())
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const currentInput = e.target as HTMLInputElement;
                        const container = currentInput.closest("table");
                        if (container) {
                          const allInputs = Array.from(
                            container.querySelectorAll('input[type="number"]')
                          ) as HTMLInputElement[];
                          const currentIndex = allInputs.indexOf(currentInput);
                          if (currentIndex > -1 && currentIndex < allInputs.length - 1) {
                            e.preventDefault();
                            const nextInput = allInputs[currentIndex + 1];
                            setTimeout(() => {
                              currentInput.blur();
                              nextInput.focus();
                              nextInput.select();
                            }, 0);
                          } else if (currentIndex === allInputs.length - 1) {
                            currentInput.blur();
                          }
                        }
                      }
                    }}
                    sx={{ width: 150 }}
                    disabled={selectedSurgery?.status === "approved" || selectedSurgery.approved_at != null}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={f.payment_method || "cash"}
                    onChange={(e) => {
                      onUpdateFinance({
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
                      sx={{ width: 300 }}
                      size="small"
                      options={doctors}
                      getOptionLabel={(option: DoctorOption) => option.name || ""}
                      value={doctors.find((d) => d.id === f.doctor_id) || null}
                      onChange={(_, newValue) => {
                        onUpdateFinance({
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
                <TableCell align="center">
                  <Tooltip title="حذف البند">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={
                          selectedSurgery?.status === "approved" || isDeleting
                        }
                        onClick={() => {
                          if (
                            window.confirm("هل أنت متأكد من حذف هذا البند من التكاليف؟")
                          ) {
                            onDeleteFinance(f.id);
                          }
                        }}
                      >
                        {isDeleting ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Delete fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
