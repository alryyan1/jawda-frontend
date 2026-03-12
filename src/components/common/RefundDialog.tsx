// src/components/common/RefundDialog.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { Loader2, RotateCcw } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import dayjs from "dayjs";

export interface RefundRecord {
  id: number;
  amount: number;
  returned_payment_method: string;
  user_id: number;
  user?: { id: number; name: string };
  created_at: string;
}

interface RefundDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  itemLabel: string;
  maxRefundable: number;
  refunds: RefundRecord[];
  onRefund: (amount: number, returned_payment_method: "cash" | "bank") => Promise<void>;
  onSuccess?: () => void;
}

const RefundDialog: React.FC<RefundDialogProps> = ({
  open,
  onClose,
  title,
  itemLabel,
  maxRefundable,
  refunds,
  onRefund,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    setError(null);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("أدخل مبلغاً صحيحاً");
      return;
    }
    if (numAmount > maxRefundable) {
      setError(`الحد الأقصى للاسترداد: ${formatNumber(maxRefundable)}`);
      return;
    }
    setIsSubmitting(true);
    try {
      await onRefund(numAmount, paymentMethod);
      setAmount("");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown; status?: number }; message?: string };
      const data = axiosErr?.response?.data;
      let msg = "فشل تسجيل الاسترداد";
      if (!axiosErr?.response) {
        msg = "خطأ في الاتصال بالخادم - تحقق من الاتصال";
      } else if (data && typeof data === "object") {
        const d = data as { message?: string; errors?: Record<string, string[]> };
        msg = d.message ?? msg;
        if (d.errors && typeof d.errors === "object") {
          const first = Object.values(d.errors).flat()[0];
          if (first) msg = first;
        }
      }
      if (import.meta.env.DEV) console.error("[RefundDialog]", err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {itemLabel} — الحد الأقصى للاسترداد: {formatNumber(maxRefundable)}
          </Typography>
          <TextField
            label="المبلغ المسترد"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            size="small"
            fullWidth
            error={!!error}
            helperText={error}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>طريقة الاسترداد</InputLabel>
            <Select
              value={paymentMethod}
              label="طريقة الاسترداد"
              onChange={(e) => setPaymentMethod(e.target.value as "cash" | "bank")}
            >
              <MenuItem value="cash">كاش</MenuItem>
              <MenuItem value="bank">بنك</MenuItem>
            </Select>
          </FormControl>
          {refunds.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                إثبات الاسترداد
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">المبلغ</TableCell>
                    <TableCell align="center">الطريقة</TableCell>
                    <TableCell align="center">بواسطة</TableCell>
                    <TableCell align="center">التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {refunds.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell align="center">{formatNumber(r.amount)}</TableCell>
                      <TableCell align="center">{r.returned_payment_method === "bank" ? "بنك" : "كاش"}</TableCell>
                      <TableCell align="center">{r.user?.name ?? "-"}</TableCell>
                      <TableCell align="center">{dayjs(r.created_at).format("YYYY/MM/DD HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-start" }}>
        <Button onClick={handleClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxRefundable}
          startIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        >
          {isSubmitting ? "جاري التسجيل..." : "تسجيل الاسترداد"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RefundDialog;
