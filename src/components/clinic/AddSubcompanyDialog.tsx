// src/components/clinic/AddSubcompanyDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import { createSubcompany } from "@/services/companyService";
import type { Subcompany } from "@/types/companies";

interface AddSubcompanyDialogProps {
  companyId: number | null;
  companyName?: string;
  onSubcompanyAdded: (newSubcompany: Subcompany) => void;
  triggerButton?: React.ReactNode;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface SubcompanyFormValues {
  name: string;
  lab_endurance: string;
  service_endurance: string;
}

const AddSubcompanyDialog: React.FC<AddSubcompanyDialogProps> = ({
  companyId,
  companyName,
  onSubcompanyAdded,
  triggerButton,
  disabled,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const dialogOpen = open ?? isOpen;
  const setDialogOpen = onOpenChange ?? setIsOpen;

  const form = useForm<SubcompanyFormValues>({
    defaultValues: {
      name: "",
      lab_endurance: "0",
      service_endurance: "0",
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: SubcompanyFormValues) => {
      if (!companyId) throw new Error("معرّف الشركة الأم مطلوب.");
      const result = await createSubcompany({
        name: formData.name,
        lab_endurance: parseFloat(formData.lab_endurance),
        service_endurance: parseFloat(formData.service_endurance),
        company_id: companyId,
      });
      return result;
    },
    onSuccess: (newSubcompany) => {
      toast.success("تمت إضافة الشركة الفرعية بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["subcompaniesList", companyId],
      });
      onSubcompanyAdded(newSubcompany);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "فشل الحفظ");
    },
  });

  const onSubmit: SubmitHandler<SubcompanyFormValues> = (data) => {
    if (!data.name.trim()) {
      toast.error("اسم الشركة الفرعية مطلوب");
      return;
    }
    if (!companyId) {
      toast.error("معرّف الشركة الأم مطلوب");
      return;
    }
    mutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  const defaultTrigger = (
    <Tooltip title={!companyId ? "اختر الشركة الأم أولاً" : "إضافة شركة فرعية"}>
      <span>
        <IconButton
          size="small"
          aria-label="إضافة شركة فرعية"
          disabled={disabled || !companyId}
          onClick={() => setDialogOpen(true)}
          sx={{ width: 28, height: 28 }}
        >
          <AddCircleOutlineIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <>
      {triggerButton ? (
        <span onClick={() => !disabled && companyId && setDialogOpen(true)}>{triggerButton}</span>
      ) : (
        defaultTrigger
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة شركة فرعية{companyName ? ` (${companyName})` : ""}</DialogTitle>
        <DialogContent dividers>
          <Stack component="form" spacing={2} sx={{ pt: 1 }} onSubmit={form.handleSubmit(onSubmit)}>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="اسم الشركة الفرعية"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  fullWidth
                />
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                control={form.control}
                name="lab_endurance"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="تحمل المختبر"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                control={form.control}
                name="service_endurance"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="تحمل الخدمة"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={mutation.isPending} variant="outlined">إلغاء</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending || !companyId} variant="contained">
            {mutation.isPending && (
              <Typography component="span" sx={{ mr: 1, display: 'inline-flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
              </Typography>
            )}
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddSubcompanyDialog;
