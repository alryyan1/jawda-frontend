// src/components/services/AddServiceGroupDialog.tsx
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import { Loader2, PlusCircle } from "lucide-react";

import { createServiceGroup } from "@/services/serviceGroupService";
import type { ServiceGroup } from "@/types/services";

interface AddServiceGroupDialogProps {
  onServiceGroupAdded: (newGroup: ServiceGroup) => void;
  triggerButton?: React.ReactNode;
}

const serviceGroupSchema = z.object({
  name: z.string().min(1, { message: "اسم المجموعة مطلوب" }),
});

type ServiceGroupFormValues = z.infer<typeof serviceGroupSchema>;

const AddServiceGroupDialog: React.FC<AddServiceGroupDialogProps> = ({
  onServiceGroupAdded,
  triggerButton,
}) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceGroupFormValues>({
    resolver: zodResolver(serviceGroupSchema),
    defaultValues: { name: "" },
  });

  const mutation = useMutation({
    mutationFn: createServiceGroup,
    onSuccess: (newGroup) => {
      toast.success("تم إضافة مجموعة الخدمات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["serviceGroupsList"] });
      onServiceGroupAdded(newGroup);
      reset();
      setIsOpen(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message || "حدث خطأ أثناء إضافة المجموعة",
      );
    },
  });

  const onSubmit = (data: ServiceGroupFormValues) => mutation.mutate(data);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    reset();
  };

  return (
    <>
      {triggerButton ? (
        <Box onClick={handleOpen}>{triggerButton}</Box>
      ) : (
        <Tooltip title="إضافة مجموعة خدمات">
          <IconButton
            type="button"
            size="small"
            onClick={handleOpen}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <PlusCircle className="h-4 w-4" />
          </IconButton>
        </Tooltip>
      )}

      <Dialog
        open={isOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          style: { direction: "rtl" },
        }}
      >
        <DialogTitle>إضافة مجموعة خدمات جديدة</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Box mb={2}>يرجى إدخال اسم المجموعة الجديدة</Box>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="اسم المجموعة"
                  placeholder="أدخل اسم المجموعة"
                  fullWidth
                  size="small"
                  error={!!errors.name}
                  helperText={errors.name?.message as string}
                  disabled={mutation.isPending}
                  autoFocus
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={mutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
              )}
              حفظ
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default AddServiceGroupDialog;
