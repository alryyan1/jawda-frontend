import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Typography,
} from "@mui/material";
import type { Admission, DischargeFormData } from "@/types/admissions";
import { dischargeAdmission, getAdmissionBalance } from "@/services/admissionService";
import { formatNumber } from "@/lib/utils";

interface DischargeDialogProps {
  open: boolean;
  onClose: () => void;
  admission: Admission;
}

export default function DischargeDialog({ open, onClose, admission }: DischargeDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<DischargeFormData>({
    defaultValues: {
      discharge_date: new Date(),
      discharge_time: new Date().toTimeString().slice(0, 8), // HH:mm:ss format
      notes: '',
    },
  });
  const { control, handleSubmit, reset } = form;

  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['admissionBalance', admission.id],
    queryFn: () => getAdmissionBalance(admission.id),
    enabled: open,
  });

  const balance = balanceData?.balance ?? 0;
  const canDischarge = Math.abs(balance) < 0.01; // Allow small floating point differences

  const mutation = useMutation({
    mutationFn: (data: DischargeFormData) => dischargeAdmission(admission.id, data),
    onSuccess: () => {
      toast.success('تم إخراج المريض بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission', admission.id] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إخراج المريض');
    },
  });

  const onSubmit = (data: DischargeFormData) => {
    if (!canDischarge) {
      toast.error('لا يمكن إخراج المريض. الرصيد يجب أن يكون صفراً.');
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>إخراج المريض</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Balance Check */}
            {isLoadingBalance ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Paper sx={{ p: 2, bgcolor: canDischarge ? 'success.light' : 'error.light', color: 'common.white' }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    الرصيد الحالي
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatNumber(balance)}
                  </Typography>
                </Paper>
                {!canDischarge && (
                  <Alert severity="error">
                    لا يمكن إخراج المريض. الرصيد يجب أن يكون صفراً. الرصيد الحالي: {formatNumber(balance)}
                  </Alert>
                )}
              </>
            )}
            <Controller
              name="discharge_date"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="تاريخ الخروج"
                  type="date"
                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Controller
              name="discharge_time"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="وقت الخروج"
                  type="time"
                  {...field}
                  InputLabelProps={{ shrink: true }}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="ملاحظات طبية"
                  multiline
                  rows={3}
                  {...field}
                  disabled={mutation.isPending}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="error" 
            disabled={mutation.isPending || !canDischarge || isLoadingBalance}
          >
            {mutation.isPending ? <CircularProgress size={20} /> : 'إخراج'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

