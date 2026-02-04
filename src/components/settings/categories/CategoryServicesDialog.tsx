import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import type { Category, CategoryService, CategoryServiceFormData, AssignServicesPayload } from "@/types/categories";
import {
  getCategory,
  assignServicesToCategory,
  updateCategoryService,
  removeServiceFromCategory,
} from "@/services/categoryService";
import { getServices } from "@/services/serviceService";

interface CategoryServicesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onSuccess?: () => void;
}

const CategoryServicesDialog: React.FC<CategoryServicesDialogProps> = ({
  isOpen,
  onOpenChange,
  category,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState<CategoryServiceFormData>({
    service_id: 0,
    percentage: null,
    fixed: null,
  });
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ percentage?: string | null; fixed?: string | null }>({});

  const { data: categoryData, isLoading } = useQuery({
    queryKey: ["category", category.id],
    queryFn: () => getCategory(category.id),
    enabled: isOpen && !!category.id,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services", "all"],
    queryFn: () => getServices(1, { per_page: 1000, activate: true }),
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (payload: AssignServicesPayload) =>
      assignServicesToCategory(category.id, payload),
    onSuccess: () => {
      toast.success("تم إضافة الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["category", category.id] });
      queryClient.invalidateQueries({ queryKey: ["categoriesPaginated"] });
      setIsAddingService(false);
      setNewService({ service_id: 0, percentage: null, fixed: null });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل إضافة الخدمة");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: { percentage?: number | null; fixed?: number | null } }) =>
      updateCategoryService(category.id, serviceId, data),
    onSuccess: () => {
      toast.success("تم تحديث الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["category", category.id] });
      queryClient.invalidateQueries({ queryKey: ["categoriesPaginated"] });
      setEditingServiceId(null);
      setEditForm({});
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل تحديث الخدمة");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (serviceId: number) =>
      removeServiceFromCategory(category.id, serviceId),
    onSuccess: () => {
      toast.success("تم حذف الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["category", category.id] });
      queryClient.invalidateQueries({ queryKey: ["categoriesPaginated"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل حذف الخدمة");
    },
  });

  const handleAddService = () => {
    if (!newService.service_id) {
      toast.error("يرجى اختيار خدمة");
      return;
    }
    if (!newService.percentage && !newService.fixed) {
      toast.error("يرجى إدخال نسبة مئوية أو مبلغ ثابت");
      return;
    }

    assignMutation.mutate({
      services: [
        {
          service_id: newService.service_id,
          percentage: newService.percentage || null,
          fixed: newService.fixed || null,
        },
      ],
    });
  };

  const handleStartEdit = (service: CategoryService) => {
    setEditingServiceId(service.id);
    setEditForm({
      percentage: service.percentage?.toString() || "",
      fixed: service.fixed?.toString() || "",
    });
  };

  const handleSaveEdit = (serviceId: number) => {
    if (!editForm.percentage && !editForm.fixed) {
      toast.error("يرجى إدخال نسبة مئوية أو مبلغ ثابت");
      return;
    }

    updateMutation.mutate({
      serviceId,
      data: {
        percentage: editForm.percentage ? parseFloat(editForm.percentage) : null,
        fixed: editForm.fixed ? parseFloat(editForm.fixed) : null,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setEditForm({});
  };

  const categoryServices = categoryData?.services || [];
  const allServices = servicesData?.data || [];
  const assignedServiceIds = categoryServices.map((s) => s.id);
  const availableServices = allServices.filter(
    (s) => !assignedServiceIds.includes(s.id)
  );

  return (
    <Dialog
      open={isOpen}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: "90vh" },
      }}
    >
      <DialogTitle>إدارة خدمات الفئة: {category.name}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {!isAddingService ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsAddingService(true)}
              sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
            >
              إضافة خدمة
            </Button>
          ) : (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">إضافة خدمة جديدة</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsAddingService(false);
                    setNewService({ service_id: 0, percentage: null, fixed: null });
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Autocomplete
                  options={availableServices}
                  getOptionLabel={(option) => option.name}
                  value={availableServices.find((s) => s.id === newService.service_id) || null}
                  onChange={(_, newValue) => {
                    setNewService({
                      ...newService,
                      service_id: newValue ? newValue.id : 0,
                    });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="الخدمة" placeholder="ابحث واختر خدمة..." />
                  )}
                  noOptionsText="لا توجد خدمات متاحة"
                  fullWidth
                />
                <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                  <TextField
                    fullWidth
                    label="النسبة المئوية (%)"
                    type="number"
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    value={newService.percentage || ""}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        percentage: e.target.value || null,
                        fixed: e.target.value ? null : newService.fixed,
                      })
                    }
                    placeholder="0.00"
                  />
                  <TextField
                    fullWidth
                    label="المبلغ الثابت"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={newService.fixed || ""}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        fixed: e.target.value || null,
                        percentage: e.target.value ? null : newService.percentage,
                      })
                    }
                    placeholder="0.00"
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={handleAddService}
                  disabled={assignMutation.isPending}
                  fullWidth
                  startIcon={assignMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
                >
                  {assignMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                </Button>
              </Box>
            </Paper>
          )}

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : categoryServices.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                لا توجد خدمات في هذه الفئة
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الخدمة</TableCell>
                    <TableCell align="center">النسبة المئوية</TableCell>
                    <TableCell align="center">المبلغ الثابت</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>{service.name}</TableCell>
                      <TableCell align="center">
                        {editingServiceId === service.id ? (
                          <TextField
                            type="number"
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                            value={editForm.percentage || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                percentage: e.target.value || "",
                                fixed: e.target.value ? "" : editForm.fixed,
                              })
                            }
                            placeholder="0.00"
                            size="small"
                            sx={{ width: 100 }}
                          />
                        ) : (
                          service.percentage ? `${service.percentage}%` : "-"
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingServiceId === service.id ? (
                          <TextField
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={editForm.fixed || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                fixed: e.target.value || "",
                                percentage: e.target.value ? "" : editForm.percentage,
                              })
                            }
                            placeholder="0.00"
                            size="small"
                            sx={{ width: 100 }}
                          />
                        ) : (
                          service.fixed ? service.fixed.toLocaleString() : "-"
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingServiceId === service.id ? (
                          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleSaveEdit(service.id)}
                              disabled={updateMutation.isPending}
                            >
                              حفظ
                            </Button>
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                            <IconButton
                              size="small"
                              onClick={() => handleStartEdit(service)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (window.confirm("هل أنت متأكد من حذف هذه الخدمة؟")) {
                                  removeMutation.mutate(service.id);
                                }
                              }}
                              disabled={removeMutation.isPending}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryServicesDialog;
