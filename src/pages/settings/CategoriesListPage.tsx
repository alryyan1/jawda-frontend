import React, { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Stack,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
} from "@mui/icons-material";

import type { Category } from "@/types/categories";
import type { PaginatedResponse } from "@/types/common";
import {
  getCategoriesPaginated,
  deleteCategory,
} from "@/services/categoryService";
import CategoryFormDialog from "@/components/settings/categories/CategoryFormDialog";
import CategoryServicesDialog from "@/components/settings/categories/CategoryServicesDialog";
import CategoryDoctorsDialog from "@/components/settings/categories/CategoryDoctorsDialog";
import { useDebounce } from "@/hooks/useDebounce";

const CategoriesListPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [isDoctorsDialogOpen, setIsDoctorsDialogOpen] = useState(false);
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const queryKey = [
    "categoriesPaginated",
    currentPage,
    debouncedSearchTerm,
  ] as const;
  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<Category>, Error>({
    queryKey,
    queryFn: () => getCategoriesPaginated(currentPage, debouncedSearchTerm),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("تم حذف الفئة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["categoriesPaginated"] });
      setCategoryIdToDelete(null);
      if (paginatedData?.data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    onError: (err: any) => {
      toast.error("فشل الحذف", {
        description: err.response?.data?.message || err.message,
      });
      setCategoryIdToDelete(null);
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingCategory(null);
    setIsFormDialogOpen(true);
  };

  const handleRowClick = (category: Category) => {
    setSelectedCategory(category);
    setIsActionsDialogOpen(true);
  };

  const handleOpenEditDialog = (category: Category) => {
    setEditingCategory(category);
    setIsFormDialogOpen(true);
    setIsActionsDialogOpen(false);
  };

  const handleOpenServicesDialog = (category: Category) => {
    setEditingCategory(category);
    setIsServicesDialogOpen(true);
    setIsActionsDialogOpen(false);
  };

  const handleOpenDoctorsDialog = (category: Category) => {
    setEditingCategory(category);
    setIsDoctorsDialogOpen(true);
    setIsActionsDialogOpen(false);
  };

  const handleDialogSuccess = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryIdToDelete(category.id);
    setIsActionsDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (categoryIdToDelete) {
      deleteMutation.mutate(categoryIdToDelete);
    }
  };

  const categories = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  if (isLoading && !isFetching && currentPage === 1 && !debouncedSearchTerm) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري تحميل البيانات...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 4, m: 2 }}>
        <Typography color="error" gutterBottom>
          فشل الجلب
        </Typography>
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          حدث خطأ أثناء جلب البيانات: {error.message}
        </Typography>
        <Button
          variant="contained"
          onClick={() => queryClient.refetchQueries({ queryKey })}
        >
          إعادة المحاولة
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FolderIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Box>
            <Typography variant="h4" component="h1">
              فئات الأطباء
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إدارة فئات الأطباء والخدمات
            </Typography>
          </Box>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <TextField
            placeholder="ابحث"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ width: { xs: "100%", sm: 300 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{ whiteSpace: "nowrap" }}
          >
            إضافة فئة
          </Button>
        </Stack>
      </Box>

      {isFetching && (
        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            جاري تحديث القائمة...
          </Typography>
        </Box>
      )}

      {!isLoading && categories.length === 0 ? (
        <Paper
          sx={{
            p: 8,
            textAlign: "center",
            border: "2px dashed",
            borderColor: "divider",
          }}
        >
          <FolderIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {debouncedSearchTerm ? "لا توجد نتائج" : "لا توجد فئات"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {debouncedSearchTerm ? "جرّب كلمات أخرى" : "أضف أول فئة للبدء"}
          </Typography>
          {!debouncedSearchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              إضافة فئة
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: 80 }}>المعرف</TableCell>
                <TableCell align="center">الإسم</TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  الوصف
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" }, width: 120 }}>
                  عدد الخدمات
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" }, width: 120 }}>
                  عدد الأطباء
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  hover
                  onClick={() => handleRowClick(category)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">{category.id}</TableCell>
                  <TableCell align="center">{category.name}</TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {category.description || "-"}
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {category.services_count ?? 0}
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {category.doctors_count ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
            size="small"
          >
            السابق
          </Button>
          <Typography variant="body2" color="text.secondary">
            صفحة {meta.current_page} من {meta.last_page}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={currentPage === meta.last_page || isFetching}
            size="small"
          >
            التالي
          </Button>
        </Box>
      )}

      {/* Dialogs */}
      <CategoryFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        category={editingCategory}
        onSuccess={handleDialogSuccess}
      />
      {editingCategory && (
        <>
          <CategoryServicesDialog
            isOpen={isServicesDialogOpen}
            onOpenChange={setIsServicesDialogOpen}
            category={editingCategory}
            onSuccess={handleDialogSuccess}
          />
          <CategoryDoctorsDialog
            isOpen={isDoctorsDialogOpen}
            onOpenChange={setIsDoctorsDialogOpen}
            category={editingCategory}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}

      {/* Actions Dialog */}
      <Dialog
        open={isActionsDialogOpen}
        onClose={() => setIsActionsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          إجراءات الفئة: {selectedCategory?.name}
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => selectedCategory && handleOpenEditDialog(selectedCategory)}>
                <ListItemIcon>
                  <EditIcon />
                </ListItemIcon>
                <ListItemText primary="تعديل" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => selectedCategory && handleOpenServicesDialog(selectedCategory)}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="إدارة الخدمات" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => selectedCategory && handleOpenDoctorsDialog(selectedCategory)}>
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="إدارة الأطباء" />
              </ListItemButton>
            </ListItem>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => selectedCategory && handleDeleteClick(selectedCategory)}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon sx={{ color: "error.main" }}>
                  <DeleteIcon />
                </ListItemIcon>
                <ListItemText primary="حذف" />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsActionsDialogOpen(false)} variant="outlined">
            إلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!categoryIdToDelete}
        onClose={() => setCategoryIdToDelete(null)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف الفئة '{categories.find((c) => c.id === categoryIdToDelete)?.name || ""}'؟ هذا الإجراء لا يمكن التراجع عنه.
            <br />
            <Typography component="span" sx={{ fontWeight: "bold", color: "error.main" }}>
              لا يمكن حذف الفئة إذا كانت مرتبطة بأطباء.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryIdToDelete(null)}>إلغاء</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoriesListPage;
