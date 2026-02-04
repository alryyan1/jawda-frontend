import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  TextField,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import type { Category } from "@/types/categories";
import {
  getCategory,
  assignDoctorToCategory,
  removeDoctorFromCategory,
} from "@/services/categoryService";
import { getDoctorsList } from "@/services/doctorService";
import type { DoctorStripped } from "@/types/doctors";

interface CategoryDoctorsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onSuccess?: () => void;
}

const CategoryDoctorsDialog: React.FC<CategoryDoctorsDialogProps> = ({
  isOpen,
  onOpenChange,
  category,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorStripped | null>(null);

  const { data: categoryData, isLoading } = useQuery({
    queryKey: ["category", category.id],
    queryFn: () => getCategory(category.id),
    enabled: isOpen && !!category.id,
  });

  const { data: allDoctors, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList(),
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (doctorId: number) =>
      assignDoctorToCategory(category.id, doctorId),
    onSuccess: () => {
      toast.success("تم تعيين الطبيب للفئة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["category", category.id] });
      queryClient.invalidateQueries({ queryKey: ["categoriesPaginated"] });
      queryClient.invalidateQueries({ queryKey: ["doctorsList"] });
      setIsAddingDoctor(false);
      setSelectedDoctor(null);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل تعيين الطبيب");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (doctorId: number) =>
      removeDoctorFromCategory(category.id, doctorId),
    onSuccess: () => {
      toast.success("تم إزالة الطبيب من الفئة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["category", category.id] });
      queryClient.invalidateQueries({ queryKey: ["categoriesPaginated"] });
      queryClient.invalidateQueries({ queryKey: ["doctorsList"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل إزالة الطبيب");
    },
  });

  const handleAddDoctor = () => {
    if (!selectedDoctor) {
      toast.error("يرجى اختيار طبيب");
      return;
    }

    assignMutation.mutate(selectedDoctor.id);
  };

  const categoryDoctors = categoryData?.doctors || [];
  const assignedDoctorIds = categoryDoctors.map((d) => d.id);
  const availableDoctors = allDoctors?.filter(
    (d) => !assignedDoctorIds.includes(d.id)
  ) || [];

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
      <DialogTitle>إدارة أطباء الفئة: {category.name}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {!isAddingDoctor ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsAddingDoctor(true)}
              sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
            >
              إضافة طبيب
            </Button>
          ) : (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">إضافة طبيب جديد</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsAddingDoctor(false);
                    setSelectedDoctor(null);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {isLoadingDoctors ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Autocomplete
                    options={availableDoctors}
                    getOptionLabel={(option) =>
                      `${option.name}${option.specialist_name ? ` (${option.specialist_name})` : ""}`
                    }
                    value={selectedDoctor}
                    onChange={(_, newValue) => setSelectedDoctor(newValue)}
                    noOptionsText="لا توجد أطباء متاحة"
                    renderInput={(params) => (
                      <TextField {...params} label="الطبيب" placeholder="ابحث واختر طبيب..." />
                    )}
                    fullWidth
                  />
                )}
                <Button
                  variant="contained"
                  onClick={handleAddDoctor}
                  disabled={assignMutation.isPending || !selectedDoctor}
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
          ) : categoryDoctors.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                لا توجد أطباء في هذه الفئة
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الطبيب</TableCell>
                    <TableCell align="center">التخصص</TableCell>
                    <TableCell align="center" sx={{ width: 100 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell>{doctor.name}</TableCell>
                      <TableCell align="center">
                        {doctor.specialist?.name || "-"}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من إزالة ${doctor.name} من هذه الفئة؟`)) {
                              removeMutation.mutate(doctor.id);
                            }
                          }}
                          disabled={removeMutation.isPending}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
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

export default CategoryDoctorsDialog;
