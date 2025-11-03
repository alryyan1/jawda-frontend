import React, { useState, useEffect } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Typography,
} from "@mui/material";
import { PlusCircle, Edit, Trash2, Clock } from "lucide-react";
// استخدام حقل وقت افتراضي من MUI عبر TextField type="time"

import type { ShiftDefinition } from "@/types/attendance"; // You'll need to define this type
import {
  getShiftDefinitions,
  createShiftDefinition,
  updateShiftDefinition,
  deleteShiftDefinition,
  type ShiftDefinitionFormData, // Define this for form/API payload
} from "@/services/attendanceService"; // Create this service

// Define ShiftDefinition type if not already done in types/attendance.ts
// export interface ShiftDefinition {
//   id: number;
//   name: string;
//   shift_label: string;
//   start_time: string; // "HH:mm"
//   end_time: string;   // "HH:mm"
//   is_active: boolean;
//   duration_hours?: number; // Optional, might be calculated
// }

// export interface ShiftDefinitionFormData {
//   name: string;
//   shift_label: string;
//   start_time: string; // "HH:mm"
//   end_time: string;   // "HH:mm"
//   is_active?: boolean;
// }

const getShiftDefinitionSchema = () =>
  z
    .object({
      name: z
        .string()
        .min(1, { message: "هذا الحقل مطلوب" })
        .max(100),
      shift_label: z
        .string()
        .min(1, { message: "هذا الحقل مطلوب" })
        .max(50),
      start_time: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
          message: "الوقت غير صالح (يجب أن يكون بالتنسيق HH:mm)",
        }),
      end_time: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
          message: "الوقت غير صالح (يجب أن يكون بالتنسيق HH:mm)",
        }),
      is_active: z.boolean(),
    })
    .refine(
      (data) => {
        // Basic check: end time should be after start time if on the same day
        // More complex logic needed for overnight shifts spanning midnight if not handled by simple HH:mm comparison
        // For now, assumes same-day shifts or backend handles overnight logic
        if (data.start_time && data.end_time) {
          return (
            data.end_time > data.start_time || data.end_time < data.start_time
          ); // Allow overnight
        }
        return true;
      },
      {
        message: "يجب أن يكون وقت الانتهاء بعد وقت البدء أو ضمن وردية ليلية",
        path: ["end_time"],
      }
    );

type ShiftDefinitionFormValues = z.infer<
  ReturnType<typeof getShiftDefinitionSchema>
>;

interface ManageShiftDefinitionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ManageShiftDefinitionDialog: React.FC<
  ManageShiftDefinitionDialogProps
> = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const [editingShift, setEditingShift] = useState<ShiftDefinition | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);

  const shiftDefinitionsQueryKey = ["shiftDefinitionsList"];

  const { data: shiftDefinitions = [], isLoading } = useQuery<
    ShiftDefinition[],
    Error
  >({
    queryKey: shiftDefinitionsQueryKey,
    queryFn: () => getShiftDefinitions({ active_only: false }), // Fetch all for management
    enabled: isOpen,
  });

  const formSchema = getShiftDefinitionSchema();
  const form = useForm<ShiftDefinitionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shift_label: "",
      start_time: "08:00",
      end_time: "16:00",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingShift) {
      form.reset({
        name: editingShift.name,
        shift_label: editingShift.shift_label,
        start_time: editingShift.start_time, // Assumes "HH:mm"
        end_time: editingShift.end_time, // Assumes "HH:mm"
        is_active: editingShift.is_active,
      });
      setShowForm(true);
    } else {
      form.reset({
        name: "",
        shift_label: "",
        start_time: "08:00",
        end_time: "16:00",
        is_active: true,
      });
    }
  }, [editingShift, form, isOpen]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftDefinitionsQueryKey });
      setShowForm(false);
      setEditingShift(null);
      form.reset();
    },
    onError: (error: unknown) => {
      const maybeMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message ===
          "string"
          ? (error as { response?: { data?: { message?: unknown } } }).response!.data!.message
          : null;
      toast.error((maybeMessage as string | null) ?? "فشلت العملية، يرجى المحاولة لاحقًا");
    },
  };

  const createMutation = useMutation({
    mutationFn: (data: ShiftDefinitionFormData) => createShiftDefinition(data),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("تم إنشاء التعريف بنجاح");
      mutationOptions.onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: ShiftDefinitionFormData }) =>
      updateShiftDefinition(data.id, data.payload),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("تم تحديث التعريف بنجاح");
      mutationOptions.onSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteShiftDefinition(id),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("تم حذف التعريف بنجاح");
      mutationOptions.onSuccess(); // This will also refetch
    },
  });

  const onSubmit: SubmitHandler<ShiftDefinitionFormValues> = (data) => {
    const payload: ShiftDefinitionFormData = {
      ...data,
      start_time: data.start_time, // Already HH:mm
      end_time: data.end_time, // Already HH:mm
    };
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (shiftDef: ShiftDefinition) => {
    setEditingShift(shiftDef);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (
      window.confirm(
        "هل أنت متأكد من حذف تعريف الوردية؟ لا يمكن التراجع عن هذا الإجراء."
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingShift(null);
    form.reset({
      name: "",
      shift_label: "",
      start_time: "09:00",
      end_time: "17:00",
      is_active: true,
    });
    setShowForm(true);
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setShowForm(false);
        setEditingShift(null);
        onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[85vh] flex flex-col">
        <Box display="flex" flexDirection="column" gap={0.5} mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Clock className="h-6 w-6" />
            <DialogTitle sx={{ p: 0 }}>إدارة تعريفات الورديات</DialogTitle>
          </Box>
          <Typography variant="body2" color="text.secondary">
            إضافة وتعديل وحذف تعريفات الورديات وساعات العمل.
          </Typography>
        </Box>

        {!showForm ? (
          <>
            <Box display="flex" justifyContent="end" mb={2}>
              <Button size="small" variant="contained" onClick={handleAddNew} disabled={isLoading} startIcon={<PlusCircle className="h-4 w-4" />}>
                إضافة تعريف جديد
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
              {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <CircularProgress size={28} />
                </Box>
              ) : shiftDefinitions.length === 0 ? (
                <Box p={2} textAlign="center" color="text.secondary">لا توجد تعريفات حالية.</Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">الرمز</TableCell>
                      <TableCell>الاسم</TableCell>
                      <TableCell align="center">وقت البدء</TableCell>
                      <TableCell align="center">وقت الانتهاء</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                      <TableCell align="right">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shiftDefinitions.map((def) => (
                      <TableRow key={def.id}>
                        <TableCell align="center" sx={{ fontWeight: 500 }}>{def.shift_label}</TableCell>
                        <TableCell>{def.name}</TableCell>
                        <TableCell align="center">{def.start_time}</TableCell>
                        <TableCell align="center">{def.end_time}</TableCell>
                        <TableCell align="center">
                          <Chip color={def.is_active ? "success" : "default"} variant={def.is_active ? "filled" : "outlined"} label={def.is_active ? "نشط" : "غير نشط"} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleEdit(def)}>
                            <Edit className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(def.id)}
                            disabled={deleteMutation.isPending && deleteMutation.variables === def.id}
                            color="error"
                          >
                            {deleteMutation.isPending && deleteMutation.variables === def.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ paddingTop: 8, paddingBottom: 8 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Controller
                control={form.control}
                name="shift_label"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="الرمز"
                    placeholder="مثال: وردية 1، صباحية"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="الاسم"
                    placeholder="مثال: الدوام الصباحي، المسائية العامة"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                <Controller
                  control={form.control}
                  name="start_time"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="time"
                      label="وقت البدء"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="end_time"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="time"
                      label="وقت الانتهاء"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                    />
                  )}
                />
              </Box>
              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                    label="نشط"
                  />
                )}
              />
            </Box>

            <DialogActions sx={{ pt: 2 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => setShowForm(false)}
                disabled={isMutating}
              >
                الرجوع للقائمة
              </Button>
              <Button type="submit" variant="contained" disabled={isMutating} startIcon={isMutating ? <CircularProgress size={16} /> : undefined}>
                {editingShift ? "حفظ التغييرات" : "إنشاء"}
              </Button>
            </DialogActions>
          </form>
        )}
        {!showForm && (
          <DialogActions sx={{ mt: "auto", pt: 2 }}>
            <Button type="button" variant="outlined" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </DialogActions>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageShiftDefinitionDialog;

// You would also need to create a simple TimePicker component or use a library for it.
// Example for a very basic shadcn-style TimePicker using native input:
// src/components/ui/time-picker.tsx
// import React from 'react';
// import { Input } from './input';
// interface TimePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {}
// export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
//   ({ value, onChange, ...props }, ref) => {
//     return (
//       <Input
//         type="time"
//         ref={ref}
//         value={value} // Expects HH:mm
//         onChange={onChange}
//         {...props}
//       />
//     );
//   }
// );
// TimePicker.displayName = 'TimePicker';
