// src/components/doctors/ManageDoctorServicesDialog.tsx
import React, { useState, useEffect, useRef } from "react";
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
  Divider,
} from "@mui/material";
import { DarkThemeAutocomplete } from "@/components/ui/mui-autocomplete";
import { PlusCircle, Trash2, Save, FolderInput } from "lucide-react";

import type {
  DoctorStripped,
  DoctorService,
  DoctorServiceFormData,
} from "@/types/doctors";
import type { Service as ServiceType, ServiceGroup } from "@/types/services";
import {
  getConfiguredServicesForDoctor,
  getAvailableServicesForDoctorConfig,
  addServiceConfigurationForDoctor,
  updateServiceConfigurationForDoctor,
  removeServiceConfigurationFromDoctor,
  removeAllServiceConfigurationsFromDoctor,
  importServicesByGroup,
} from "@/services/doctorService";
import { getAllServiceGroupsList } from "@/services/serviceGroupService";

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
  const [searchQuery, setSearchQuery] = useState("");
  const fixedInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const initializedForDoctorRef = useRef<number | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null);
  const [groupPercentage, setGroupPercentage] = useState("");
  const [groupFixed, setGroupFixed] = useState("");

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

  const { data: serviceGroups = [], isLoading: isLoadingGroups } =
    useQuery<ServiceGroup[], Error>({
      queryKey: ["serviceGroupsList"],
      queryFn: getAllServiceGroupsList,
      enabled: isOpen,
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

  // Initialize form only once per dialog open — never on background refetches
  useEffect(() => {
    if (!isOpen) {
      initializedForDoctorRef.current = null;
      setIsAddingNew(false);
      return;
    }
    if (initializedForDoctorRef.current === doctor.id) return;
    if (isLoadingConfigured || isLoadingAvailable) return;

    const formatted = configuredServicesList.map((cs) => ({
      doctor_service_id: cs.doctor_service_id,
      service_id: String(cs.service_id),
      service_name: cs.service_name,
      percentage: cs.percentage !== null ? String(cs.percentage) : "",
      fixed: cs.fixed !== null ? String(cs.fixed) : "",
    }));
    reset({ configuredServices: formatted });
    setIsAddingNew(false);
    initializedForDoctorRef.current = doctor.id;
  }, [isOpen, doctor.id, configuredServicesList, isLoadingConfigured, isLoadingAvailable, reset]);

  const handleServiceSelectionForNewRow = (
    index: number,
    service: ServiceType | null
  ) => {
    if (service) {
      setValue(`configuredServices.${index}.service_id`, String(service.id));
      setValue(`configuredServices.${index}.service_name`, service.name);
      setTimeout(() => fixedInputRefs.current[index]?.focus(), 50);
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
    onSuccess: (result) => {
      toast.success("تمت إضافة تكوين الخدمة بنجاح!");
      // Stamp the new row's doctor_service_id directly — no refetch, no reset
      const newIdx = getValues("configuredServices").length - 1;
      setValue(`configuredServices.${newIdx}.doctor_service_id`, result.doctor_service_id);
      setIsAddingNew(false);
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || "فشل في إنشاء التكوين"),
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
      // Form already has the correct values — no invalidation, no reset, no focus loss
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || "فشل في تحديث التكوين"),
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) =>
      removeServiceConfigurationFromDoctor(doctor.id, serviceId),
    onSuccess: (_, serviceId) => {
      toast.success("تم الحذف بنجاح!");
      // Remove the row directly from the form — no refetch, no reset
      const idx = getValues("configuredServices").findIndex(
        (f) => parseInt(f.service_id) === serviceId
      );
      if (idx !== -1) remove(idx);
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || "فشل في الحذف"),
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

  const deleteAllMutation = useMutation({
    mutationFn: () => removeAllServiceConfigurationsFromDoctor(doctor.id),
    onSuccess: () => {
      toast.success("تم حذف جميع خدمات الطبيب بنجاح!");
      queryClient.invalidateQueries({ queryKey: configuredServicesQueryKey });
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
      reset({ configuredServices: [] });
      setIsAddingNew(false);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || "فشل في حذف الخدمات"),
  });

  const importGroupMutation = useMutation({
    mutationFn: () =>
      importServicesByGroup(doctor.id, {
        service_group_id: selectedGroup!.id,
        percentage: groupPercentage || undefined,
        fixed: groupFixed || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`تمت إضافة ${data.count} خدمة بنجاح!`);
      // Allow the form to re-initialize from server data after bulk import
      initializedForDoctorRef.current = null;
      queryClient.invalidateQueries({ queryKey: configuredServicesQueryKey });
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
      setSelectedGroup(null);
      setGroupPercentage("");
      setGroupFixed("");
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || "فشل في استيراد الخدمات"),
  });

  const isMutating =
    addMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    deleteAllMutation.isPending ||
    importGroupMutation.isPending;

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
            <Box sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Search */}
              <TextField
                size="small"
                fullWidth
                placeholder="بحث عن خدمة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': { height: '32px', fontSize: '0.8rem' },
                  '& .MuiInputBase-input': { padding: '4px 8px', fontSize: '0.8rem' },
                }}
              />
              {/* Import by group */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DarkThemeAutocomplete
                  options={serviceGroups}
                  getOptionLabel={(o) => o.name}
                  value={selectedGroup}
                  onChange={(_, v) => setSelectedGroup(v)}
                  loading={isLoadingGroups}
                  size="small"
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="استيراد مجموعة خدمات..."
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': { height: '32px', fontSize: '0.8rem' },
                        '& .MuiInputBase-input': { padding: '4px 8px !important', fontSize: '0.8rem' },
                      }}
                    />
                  )}
                  isOptionEqualToValue={(o, v) => o.id === v?.id}
                />
                <TextField
                  size="small"
                  type="number"
                  placeholder="نسبة %"
                  value={groupPercentage}
                  onChange={(e) => setGroupPercentage(e.target.value)}
                  disabled={!selectedGroup || importGroupMutation.isPending}
                  sx={{
                    width: 80,
                    '& .MuiOutlinedInput-root': { height: '32px', fontSize: '0.8rem' },
                    '& .MuiInputBase-input': { padding: '4px 8px', fontSize: '0.8rem', textAlign: 'center' },
                  }}
                />
                <TextField
                  size="small"
                  type="number"
                  placeholder="ثابت"
                  value={groupFixed}
                  onChange={(e) => setGroupFixed(e.target.value)}
                  disabled={!selectedGroup || importGroupMutation.isPending}
                  sx={{
                    width: 80,
                    '& .MuiOutlinedInput-root': { height: '32px', fontSize: '0.8rem' },
                    '& .MuiInputBase-input': { padding: '4px 8px', fontSize: '0.8rem', textAlign: 'center' },
                  }}
                />
                <Button
                  size="small"
                  variant="contained"
                  disabled={!selectedGroup || importGroupMutation.isPending}
                  onClick={() => importGroupMutation.mutate()}
                  startIcon={importGroupMutation.isPending ? <CircularProgress size={12} /> : <FolderInput size={14} />}
                  sx={{ whiteSpace: 'nowrap', height: 32, fontSize: '0.75rem' }}
                >
                  استيراد
                </Button>
              </Box>
              <Divider />
            </Box>
            <Box sx={{ overflow: 'auto', flex: 1, p: 2, pt: 0 }}>
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
                      if (
                        !isNewRow &&
                        searchQuery.trim() &&
                        !fieldItem.service_name
                          ?.toLowerCase()
                          .includes(searchQuery.trim().toLowerCase())
                      ) {
                        return null;
                      }
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
                                    error={!!error}
                                    slotProps={{ input: { onFocus: (e) => e.target.select() } }}
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
                                    error={!!error}
                                    inputRef={(el) => { fixedInputRefs.current[index] = el; }}
                                    slotProps={{ input: { onFocus: (e) => e.target.select() } }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveRow(index);
                                        fixedInputRefs.current[index + 1]?.focus();
                                      }
                                    }}
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
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          disabled={isMutating || fields.length === 0}
          onClick={() => {
            if (window.confirm("هل أنت متأكد من حذف جميع خدمات هذا الطبيب؟")) {
              deleteAllMutation.mutate();
            }
          }}
          startIcon={deleteAllMutation.isPending ? <CircularProgress size={14} /> : <Trash2 size={14} />}
        >
          حذف الكل
        </Button>
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
