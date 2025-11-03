import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"; // For is_active
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Clock,
  Settings,
} from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker"; // Assuming you have or create a TimePicker component

import type { ShiftDefinition } from "@/types/attendance"; // You'll need to define this type
import {
  getShiftDefinitions,
  createShiftDefinition,
  updateShiftDefinition,
  deleteShiftDefinition,
  type ShiftDefinitionFormData, // Define this for form/API payload
} from "@/services/attendanceService"; // Create this service
import { Badge } from "@/components/ui/badge";

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

const getShiftDefinitionSchema = (
  existingShiftDefinitionId?: number
) =>
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
      is_active: z.boolean().default(true),
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

  const {
    data: shiftDefinitions = [],
    isLoading,
    refetch,
  } = useQuery<ShiftDefinition[], Error>({
    queryKey: shiftDefinitionsQueryKey,
    queryFn: () => getShiftDefinitions({ active_only: false }), // Fetch all for management
    enabled: isOpen,
  });

  const formSchema = getShiftDefinitionSchema(editingShift?.id);
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
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "فشلت العملية، يرجى المحاولة لاحقًا"
      );
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

  const onSubmit = (data: ShiftDefinitionFormValues) => {
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
      onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingShift(null);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            إدارة تعريفات الورديات
          </DialogTitle>
          <DialogDescription>
            إضافة وتعديل وحذف تعريفات الورديات وساعات العمل.
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <>
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={handleAddNew} disabled={isLoading}>
                <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                إضافة تعريف جديد
              </Button>
            </div>
            <ScrollArea className="h-[400px] border rounded-md">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : shiftDefinitions.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground">
                  لا توجد تعريفات حالية.
                </p>
              ) : (
                <Table size="sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">
                        الرمز
                      </TableHead>
                      <TableHead>
                        الاسم
                      </TableHead>
                      <TableHead className="text-center">
                        وقت البدء
                      </TableHead>
                      <TableHead className="text-center">
                        وقت الانتهاء
                      </TableHead>
                      <TableHead className="text-center">
                        الحالة
                      </TableHead>
                      <TableHead className="text-right">
                        الإجراءات
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftDefinitions.map((def) => (
                      <TableRow key={def.id}>
                        <TableCell className="font-medium text-center">
                          {def.shift_label}
                        </TableCell>
                        <TableCell>{def.name}</TableCell>
                        <TableCell className="text-center">
                          {def.start_time}
                        </TableCell>
                        <TableCell className="text-center">
                          {def.end_time}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={def.is_active ? "success" : "outline"}
                          >
                            {def.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon_xs"
                            onClick={() => handleEdit(def)}
                            className="h-7 w-7"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon_xs"
                            onClick={() => handleDelete(def.id)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={
                              deleteMutation.isPending &&
                              deleteMutation.variables === def.id
                            }
                          >
                            {deleteMutation.isPending &&
                            deleteMutation.variables === def.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
            >
              <FormField
                control={form.control}
                name="shift_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      الرمز
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: وردية 1، صباحية" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      الاسم
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="مثال: الدوام الصباحي، المسائية العامة"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        وقت البدء
                      </FormLabel>
                      {/* Replace Input with your TimePicker */}
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        وقت الانتهاء
                      </FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="text-sm">
                      نشط
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={isMutating}
                >
                  الرجوع للقائمة
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {isMutating && (
                    <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                  )}
                  {editingShift ? "حفظ التغييرات" : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
        {!showForm && (
          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                إغلاق
              </Button>
            </DialogClose>
          </DialogFooter>
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
