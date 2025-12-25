import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@mui/material";
import type { Admission, DischargeFormData } from "@/types/admissions";
import { dischargeAdmission } from "@/services/admissionService";

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
      discharge_time: new Date().toTimeString().slice(0, 5),
      notes: '',
    },
  });
  const { control, handleSubmit, reset } = form;

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
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>إخراج المريض</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="discharge_date"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="تاريخ الإخراج"
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
                  label="وقت الإخراج"
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
                  label="ملاحظات"
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
          <Button type="submit" variant="contained" color="error" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'إخراج'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

