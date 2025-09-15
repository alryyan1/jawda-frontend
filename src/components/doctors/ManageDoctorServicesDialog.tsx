// src/components/doctors/ManageDoctorServicesDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
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
import { Loader2, PlusCircle, Trash2, Save } from "lucide-react";

import type {
  DoctorStripped,
  DoctorService,
  DoctorServiceFormData,
} from "@/types/doctors";
import type { Service as ServiceType } from "@/types/services"; // Base service type
import {
  getConfiguredServicesForDoctor,
  getAvailableServicesForDoctorConfig,
  addServiceConfigurationForDoctor,
  updateServiceConfigurationForDoctor,
  removeServiceConfigurationFromDoctor,
} from "@/services/doctorService"; // Or your new service file

interface ManageDoctorServicesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: DoctorStripped;
  onConfigurationUpdated?: () => void;
}

// Zod schema for a single item in the form/table
const doctorServiceItemSchema = z
  .object({
    doctor_service_id: z.number().optional().nullable(), // ID of the doctor_services pivot record (for updates)
    service_id: z.string().min(1, "الخدمة مطلوبة."),
    service_name: z.string().optional(), // For display
    percentage: z.string().nullable().optional(),
    fixed: z.string().nullable().optional(),
  });

type DoctorServiceFormItemValues = z.infer<typeof doctorServiceItemSchema>;

const ManageDoctorServicesFormSchema = z.object({
  configuredServices: z.array(doctorServiceItemSchema),
});
type ManageDoctorServicesFormValues = z.infer<
  typeof ManageDoctorServicesFormSchema
>;

const ManageDoctorServicesDialog: React.FC<ManageDoctorServicesDialogProps> = ({
  isOpen,
  onOpenChange,
  doctor,
}) => {
  const queryClient = useQueryClient();

  const configuredServicesQueryKey = ["configuredServicesForDoctor", doctor.id];
  const availableServicesQueryKey = [
    "availableServicesForDoctorConfig",
    doctor.id,
  ];

  const [isAddingNew, setIsAddingNew] = useState(false);

  const { data: configuredServicesList = [], isLoading: isLoadingConfigured } =
    useQuery<DoctorService[], Error>({
      queryKey: configuredServicesQueryKey,
      queryFn: () =>
        getConfiguredServicesForDoctor(doctor.id).then((res) => res.data),
      enabled: isOpen && !!doctor.id,
    });

  const { data: availableServices = [], isLoading: isLoadingAvailable } =
    useQuery<ServiceType[], Error>({
      queryKey: availableServicesQueryKey,
      queryFn: () => getAvailableServicesForDoctorConfig(doctor.id),
      enabled: isOpen && !!doctor.id,
    });

  const form = useForm<ManageDoctorServicesFormValues>({
    resolver: zodResolver(ManageDoctorServicesFormSchema),
    defaultValues: { configuredServices: [] },
  });

  const { control, reset, getValues, setValue, trigger } =
    form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "configuredServices",
    keyName: "fieldId",
  });

  // Only reset form when dialog opens or configuredServicesList changes
  useEffect(() => {
    if (isOpen && configuredServicesList.length > 0) {
      const formatted = configuredServicesList.map((cs) => ({
        doctor_service_id: cs.doctor_service_id,
        service_id: String(cs.service_id),
        service_name: cs.service_name,
        percentage: cs.percentage !== null ? String(cs.percentage) : "",
        fixed: cs.fixed !== null ? String(cs.fixed) : "",
      }));
      reset({ configuredServices: formatted });
      setIsAddingNew(false);
    }
  }, [isOpen, configuredServicesList, reset]);

  // Reset adding state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsAddingNew(false);
    }
  }, [isOpen]);

  const handleServiceSelectionForNewRow = (
    index: number,
    serviceId: string
  ) => {
    setValue(`configuredServices.${index}.service_id`, serviceId);
    const selectedService = availableServices.find(
      (s) => String(s.id) === serviceId
    );
    if (selectedService) {
      setValue(
        `configuredServices.${index}.service_name`,
        selectedService.name
      );
    }
  };

  const getPayload = (
    data: DoctorServiceFormItemValues
  ): DoctorServiceFormData => ({
    service_id: data.service_id,
    percentage: data.percentage?.trim() ? data.percentage : undefined,
    fixed: data.fixed?.trim() ? data.fixed : undefined,
  });

  const addMutation = useMutation({
    mutationFn: (data: DoctorServiceFormItemValues) =>
      addServiceConfigurationForDoctor(doctor.id, getPayload(data)),
    onSuccess: () => {
      toast.success("تمت إضافة تكوين الخدمة بنجاح!");
      queryClient.invalidateQueries({ queryKey: configuredServicesQueryKey });
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
      setIsAddingNew(false);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(
        err.response?.data?.message || "فشل في إنشاء التكوين"
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (data: DoctorServiceFormItemValues) =>
      updateServiceConfigurationForDoctor(
        doctor.id,
        parseInt(data.service_id),
        getPayload(data)
      ),
    onSuccess: () => {
      toast.success("تم تحديث تكوين الخدمة بنجاح!");
      queryClient.invalidateQueries({ queryKey: configuredServicesQueryKey });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(
        err.response?.data?.message || "فشل في تحديث التكوين"
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) =>
      removeServiceConfigurationFromDoctor(doctor.id, serviceId),
    onSuccess: () => {
      toast.success("تم الحذف بنجاح!");
      queryClient.invalidateQueries({ queryKey: configuredServicesQueryKey });
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(
        err.response?.data?.message || "فشل في الحذف"
      ),
  });

  const handleSaveRow = async (index: number) => {
    const isValid = await trigger(`configuredServices.${index}`);
    if (isValid) {
      const rowData = getValues(`configuredServices.${index}`);
      if (rowData.doctor_service_id) {
        updateMutation.mutate(rowData);
      } else {
        addMutation.mutate(rowData);
      }
    } else {
      toast.error("يرجى التحقق من الأخطاء في الصف");
    }
  };

  const handleAddNewField = () => {
    if (isAddingNew) return;
    append({
      service_id: "",
      percentage: "",
      fixed: "",
    });
    setIsAddingNew(true);
  };

  const handleCancelAddNew = (index: number) => {
    remove(index);
    setIsAddingNew(false);
  };

  const isMutating =
    addMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isMutating) onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-2xl xl:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            إدارة خدمات الطبيب: {doctor.name}
          </DialogTitle>
          <DialogDescription>
            إدارة الخدمات المخصصة لهذا الطبيب
          </DialogDescription>
        </DialogHeader>

        {isLoadingConfigured || isLoadingAvailable ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            {/* No global form onSubmit, saves happen per row */}
            <form className="flex-grow flex flex-col overflow-hidden">
              <ScrollArea className="flex-grow pr-1 -mr-2">
                <Table dir="rtl" className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">
                        اسم الخدمة
                      </TableHead>
                      <TableHead className="w-[120px] text-center">
                        النسبة
                      </TableHead>
                      <TableHead className="w-[120px] text-center">
                        المبلغ الثابت
                      </TableHead>
                      <TableHead className="w-[100px] text-center">
                        الإجراءات
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((fieldItem, index) => {
                      const isNewRow =
                        !fieldItem.doctor_service_id &&
                        index === fields.length - 1 &&
                        isAddingNew;
                      return (
                        <TableRow key={fieldItem.fieldId}>
                          <TableCell className="py-1 align-top">
                            {isNewRow ? (
                              <FormField
                                control={control}
                                name={`configuredServices.${index}.service_id`}
                                render={({ field: f }) => (
                                  <Select
                                    value={f.value}
                                    onValueChange={(val) =>
                                      handleServiceSelectionForNewRow(
                                        index,
                                        val
                                      )
                                    }
                                    disabled={isLoadingAvailable || isMutating}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue
                                        placeholder="اختر الخدمة..."
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableServices.map((s) => (
                                        <SelectItem
                                          key={s.id}
                                          value={String(s.id)}
                                        >
                                          {s.name} ({s.service_group?.name})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : (
                              <span>
                                {fieldItem.service_name ||
                                  configuredServicesList.find(
                                    (cs) =>
                                      cs.doctor_service_id ===
                                      fieldItem.doctor_service_id
                                  )?.service_name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-1 align-top">
                            <FormField
                              control={control}
                              name={`configuredServices.${index}.percentage`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  {...f}
                                  value={f.value || ""}
                                  className="h-7 text-xs text-center"
                                  placeholder="%"
                                  disabled={isMutating}
                                />
                              )}
                            />
                            <FormMessage className="text-[10px]">
                              {
                                form.formState.errors.configuredServices?.[
                                  index
                                ]?.percentage?.message
                              }
                            </FormMessage>
                          </TableCell>
                          <TableCell className="py-1 align-top">
                            <FormField
                              control={control}
                              name={`configuredServices.${index}.fixed`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  {...f}
                                  value={f.value || ""}
                                  className="h-7 text-xs text-center"
                                  placeholder="ج.س"
                                  disabled={isMutating}
                                />
                              )}
                            />
                            <FormMessage className="text-[10px]">
                              {
                                form.formState.errors.configuredServices?.[
                                  index
                                ]?.fixed?.message
                              }
                            </FormMessage>
                          </TableCell>
                          <TableCell className="py-1 text-center align-top">
                            <div className="flex items-center justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleSaveRow(index)}
                                disabled={isMutating}
                              >
                                {(addMutation.isPending && isNewRow) ||
                                (updateMutation.isPending &&
                                  updateMutation.variables?.service_id ===
                                    fieldItem.service_id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => {
                                  if (fieldItem.doctor_service_id) {
                                    deleteMutation.mutate(
                                      fieldItem.doctor_service_id
                                    );
                                  } else {
                                    handleCancelAddNew(index); // Remove new, unsaved row
                                  }
                                }}
                                disabled={
                                  deleteMutation.isPending &&
                                  deleteMutation.variables ===
                                    fieldItem.doctor_service_id
                                }
                              >
                                {deleteMutation.isPending &&
                                deleteMutation.variables ===
                                  fieldItem.doctor_service_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              {!isAddingNew && ( // Show Add button only if not currently adding a new row
                <div className="pt-3 flex justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewField}
                    className="text-xs"
                    disabled={isMutating}
                  >
                    <PlusCircle className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />{" "}
                    إضافة تكوين خدمة
                  </Button>
                </div>
              )}
              <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isMutating}>
                    تم
                  </Button>
                </DialogClose>
                {/* No global save button for the whole form as saves are per row */}
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default ManageDoctorServicesDialog;
