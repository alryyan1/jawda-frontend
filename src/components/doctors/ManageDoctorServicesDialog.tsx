// src/components/doctors/ManageDoctorServicesDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  FormHelperText,
} from "@mui/material";
import { DarkThemeAutocomplete } from "@/components/ui/mui-autocomplete";
import { PlusCircle, Trash2, Save } from "lucide-react";

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
    service: ServiceType | null
  ) => {
    if (service) {
      setValue(`configuredServices.${index}.service_id`, String(service.id));
      setValue(
        `configuredServices.${index}.service_name`,
        service.name
      );
    } else {
      setValue(`configuredServices.${index}.service_id`, "");
      setValue(`configuredServices.${index}.service_name`, "");
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

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!isMutating) onOpenChange(false);
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle>
        إدارة خدمات الطبيب: {doctor.name}
      </DialogTitle>
      <DialogContent dividers sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 0 }}>
        {isLoadingConfigured || isLoadingAvailable ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
              <Table size="small" dir="rtl" sx={{ fontSize: '0.75rem' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 200, fontWeight: 'bold' }}>
                      اسم الخدمة
                    </TableCell>
                    <TableCell align="center" sx={{ width: 120, fontWeight: 'bold' }}>
                      النسبة
                    </TableCell>
                    <TableCell align="center" sx={{ width: 120, fontWeight: 'bold' }}>
                      المبلغ الثابت
                    </TableCell>
                    <TableCell align="center" sx={{ width: 100, fontWeight: 'bold' }}>
                      الإجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                    {fields.map((fieldItem, index) => {
                      const isNewRow =
                        !fieldItem.doctor_service_id &&
                        index === fields.length - 1 &&
                        isAddingNew;
                      return (
                        <TableRow key={fieldItem.fieldId}>
                          <TableCell sx={{ py: 0.5, verticalAlign: 'top' }}>
                            {isNewRow ? (
                              <Controller
                                control={control}
                                name={`configuredServices.${index}.service_id`}
                                render={({ field: f, fieldState: { error } }) => {
                                  const selectedService = availableServices.find(
                                    (s) => String(s.id) === f.value
                                  );
                                  return (
                                    <Box>
                                      <DarkThemeAutocomplete
                                        options={availableServices}
                                        getOptionLabel={(option) => 
                                          `${option.name} (${option.service_group?.name || ''})`
                                        }
                                        value={selectedService || null}
                                        onChange={(_, newValue) =>
                                          handleServiceSelectionForNewRow(
                                            index,
                                            newValue
                                          )
                                        }
                                        disabled={isLoadingAvailable || isMutating}
                                        size="small"
                                        renderInput={(params) => (
                                          <TextField
                                            {...params}
                                            placeholder="اختر الخدمة..."
                                            size="small"
                                            error={!!error}
                                            sx={{
                                              '& .MuiOutlinedInput-root': {
                                                height: '28px',
                                                fontSize: '0.75rem',
                                              },
                                              '& .MuiInputBase-input': {
                                                padding: '4px 8px',
                                                fontSize: '0.75rem',
                                              },
                                            }}
                                          />
                                        )}
                                        isOptionEqualToValue={(option, value) => 
                                          option.id === value?.id
                                        }
                                      />
                                      {error && (
                                        <FormHelperText error sx={{ fontSize: '0.625rem', m: 0, mt: 0.5 }}>
                                          {error.message}
                                        </FormHelperText>
                                      )}
                                    </Box>
                                  );
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {fieldItem.service_name ||
                                  configuredServicesList.find(
                                    (cs) =>
                                      cs.doctor_service_id ===
                                      fieldItem.doctor_service_id
                                  )?.service_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 0.5, verticalAlign: 'top' }}>
                            <Controller
                              control={control}
                              name={`configuredServices.${index}.percentage`}
                              render={({ field: f, fieldState: { error } }) => (
                                <Box>
                                  <TextField
                                    {...f}
                                    type="number"
                                    size="small"
                                    value={f.value || ""}
                                    placeholder="%"
                                    disabled={isMutating}
                                    error={!!error}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        height: '28px',
                                        fontSize: '0.75rem',
                                      },
                                      '& .MuiInputBase-input': {
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        textAlign: 'center',
                                      },
                                    }}
                                  />
                                  {error && (
                                    <FormHelperText error sx={{ fontSize: '0.625rem', m: 0, mt: 0.5 }}>
                                      {error.message}
                                    </FormHelperText>
                                  )}
                                </Box>
                              )}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 0.5, verticalAlign: 'top' }}>
                            <Controller
                              control={control}
                              name={`configuredServices.${index}.fixed`}
                              render={({ field: f, fieldState: { error } }) => (
                                <Box>
                                  <TextField
                                    {...f}
                                    type="number"
                                    size="small"
                                    value={f.value || ""}
                                    placeholder="ج.س"
                                    disabled={isMutating}
                                    error={!!error}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        height: '28px',
                                        fontSize: '0.75rem',
                                      },
                                      '& .MuiInputBase-input': {
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        textAlign: 'center',
                                      },
                                    }}
                                  />
                                  {error && (
                                    <FormHelperText error sx={{ fontSize: '0.625rem', m: 0, mt: 0.5 }}>
                                      {error.message}
                                    </FormHelperText>
                                  )}
                                </Box>
                              )}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.5, verticalAlign: 'top' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleSaveRow(index)}
                                disabled={isMutating}
                                sx={{ width: 28, height: 28 }}
                              >
                                {(addMutation.isPending && isNewRow) ||
                                (updateMutation.isPending &&
                                  updateMutation.variables?.service_id ===
                                    fieldItem.service_id) ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <Save size={16} style={{ color: '#22c55e' }} />
                                )}
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (fieldItem.doctor_service_id) {
                                    // Pass service_id (not doctor_service_id) to match backend route model binding
                                    deleteMutation.mutate(
                                      parseInt(fieldItem.service_id)
                                    );
                                  } else {
                                    handleCancelAddNew(index);
                                  }
                                }}
                                disabled={
                                  deleteMutation.isPending &&
                                  deleteMutation.variables ===
                                    parseInt(fieldItem.service_id)
                                }
                                sx={{ width: 28, height: 28, color: 'error.main' }}
                              >
                                {deleteMutation.isPending &&
                                deleteMutation.variables ===
                                  parseInt(fieldItem.service_id) ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
              {!isAddingNew && (
                <Box sx={{ p: 2, pt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddNewField}
                    disabled={isMutating}
                    startIcon={<PlusCircle size={14} />}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    إضافة تكوين خدمة
                  </Button>
                </Box>
              )}
            </Box>
          )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={() => onOpenChange(false)}
          disabled={isMutating}
          variant="outlined"
        >
          تم
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default ManageDoctorServicesDialog;
