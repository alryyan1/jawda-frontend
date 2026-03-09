// src/components/services/AddServiceDialog.tsx
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogTitle, DialogContent, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import ServiceForm from "./ServiceForm";
import { createService } from "@/services/serviceService";
import { type ServiceFormData, ServiceFormMode } from "@/types/services";

const AddServiceDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ServiceFormData) => createService(data),
    onSuccess: () => {
      toast.success("تم إضافة الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل إضافة الخدمة");
    },
  });

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleSubmit = (data: ServiceFormData) => {
    mutation.mutate(data);
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={handleOpen}
        startIcon={<Plus className="h-4 w-4" />}
      >
        إضافة خدمة
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        // Ensure dialog content is RTL for consistency
        PaperProps={{
          style: { direction: "rtl" },
        }}
      >
        <DialogTitle>إضافة خدمة جديدة</DialogTitle>
        <DialogContent dividers>
          <ServiceForm
            mode={ServiceFormMode.CREATE}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={mutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddServiceDialog;
