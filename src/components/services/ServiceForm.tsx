// src/components/services/ServiceForm.tsx
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
} from "@mui/material";
import { Loader2 } from "lucide-react";

import {
  type ServiceFormData,
  type Service,
  type ServiceGroup,
} from "@/types/services";
import { getServiceGroupsList } from "@/services/serviceGroupService";
import AddServiceGroupDialog from "@/components/services/AddServiceGroupDialog";

const serviceFormSchema = z.object({
  name: z.string().min(1, { message: "الإسم مطلوب" }),
  service_group_id: z.string().min(1, { message: "المجموعة مطلوبة" }),
  price: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "يجب أن يكون السعر رقمًا موجبًا",
    }),
  activate: z.boolean(),
  variable: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: Service | null;
  onSubmit: (data: ServiceFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isLoading?: boolean;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isLoading = false,
}) => {
  const { data: serviceGroups, isLoading: isLoadingServiceGroups } = useQuery({
    queryKey: ["serviceGroupsList"],
    queryFn: getServiceGroupsList,
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      service_group_id: "",
      price: "0",
      activate: true,
      variable: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        service_group_id: String(initialData.service_group_id),
        price: String(initialData.price),
        activate: !!initialData.activate,
        variable: !!initialData.variable,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data: ServiceFormValues) => {
    onSubmit(data as ServiceFormData);
  };

  const handleServiceGroupAdded = (newGroup: ServiceGroup) => {
    setValue("service_group_id", String(newGroup.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-4 flex flex-col gap-2"
      style={{ direction: "rtl" }}
    >
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            label="الإسم"
            placeholder="أدخل اسم الخدمة"
            fullWidth
            size="small"
            disabled={isSubmitting}
            error={!!errors.name}
            helperText={errors.name?.message as string}
            {...field}
          />
        )}
      />

      <div className="flex items-center gap-2">
        <Controller
          name="service_group_id"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="small">
              <InputLabel id="group-label">المجموعة</InputLabel>
              <Select
                labelId="group-label"
                label="المجموعة"
                value={field.value || ""}
                onChange={(e) => field.onChange(String(e.target.value))}
                disabled={isSubmitting || isLoadingServiceGroups}
              >
                {isLoadingServiceGroups && (
                  <MenuItem value="loading" disabled>
                    جاري التحميل...
                  </MenuItem>
                )}
                {serviceGroups?.data?.map((sg) => (
                  <MenuItem key={sg.id} value={String(sg.id)}>
                    {sg.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
        <AddServiceGroupDialog onServiceGroupAdded={handleServiceGroupAdded} />
      </div>

      <Controller
        name="price"
        control={control}
        render={({ field }) => (
          <TextField
            label="السعر"
            placeholder="0.00"
            type="number"
            inputProps={{ step: "0.01" }}
            fullWidth
            size="small"
            disabled={isSubmitting}
            error={!!errors.price}
            helperText={errors.price?.message as string}
            {...field}
          />
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Controller
          name="activate"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(_, v) => field.onChange(v)}
                />
              }
              label="نشط"
            />
          )}
        />
        <Controller
          name="variable"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(_, v) => field.onChange(v)}
                />
              }
              label="سعر متغير"
            />
          )}
        />
      </div>

      <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
        <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
          )}
          حفظ
        </Button>
      </Box>
    </form>
  );
};

export default ServiceForm;
