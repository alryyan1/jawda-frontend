import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWards, deleteWard, createWard } from "@/services/wardService";
import type { Ward, WardFormData } from "@/types/admissions";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Edit, Trash2, Plus, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function WardsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wardToDelete, setWardToDelete] = useState<Ward | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWard, setNewWard] = useState<WardFormData>({
    name: "",
    description: "",
    status: true,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["wards", page, searchTerm],
    queryFn: () => getWards(page, { search: searchTerm }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      toast.success("تم حذف القسم بنجاح");
      setDeleteDialogOpen(false);
      setWardToDelete(null);
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الحذف", { description: errorMessage });
    },
  });

  const createMutation = useMutation({
    mutationFn: createWard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      toast.success("تم إضافة القسم بنجاح");
      setAddDialogOpen(false);
      setNewWard({ name: "", description: "", status: true });
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الإضافة", { description: errorMessage });
    },
  });

  const handleDeleteClick = (ward: Ward) => {
    setWardToDelete(ward);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (wardToDelete) {
      deleteMutation.mutate(wardToDelete.id);
    }
  };

  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddConfirm = () => {
    if (!newWard.name.trim()) {
      toast.error("الرجاء إدخال اسم القسم");
      return;
    }
    createMutation.mutate(newWard);
  };

  const handleAddCancel = () => {
    setAddDialogOpen(false);
    setNewWard({ name: "", description: "", status: true });
  };

  if (isLoading && !data) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 2 }}>
        حدث خطأ أثناء جلب الأقسام
      </Typography>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              component={Link}
              to="/admissions"
              variant="outlined"
              size="small"
              startIcon={<ArrowRight />}
            >
              رجوع
            </Button>
            <Typography variant="h5">إدارة الأقسام</Typography>
          </Box>
          <Button
            onClick={handleAddClick}
            variant="contained"
            startIcon={<Plus />}
          >
            إضافة قسم جديد
          </Button>
        </Box>

        <TextField
          fullWidth
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>الوصف</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>عدد الغرف</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map((ward) => (
                <TableRow key={ward.id}>
                  <TableCell>{ward.name}</TableCell>
                  <TableCell>{ward.description || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={ward.status ? "نشط" : "غير نشط"}
                      color={ward.status ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{ward.rooms_count || 0}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      component={Link}
                      to={`/settings/wards/${ward.id}/edit`}
                      size="small"
                      color="primary"
                    >
                      <Edit size={16} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClick(ward)}
                      size="small"
                      color="error"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {data && data.meta.last_page > 1 && (
          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2 }}
          >
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              السابق
            </Button>
            <Typography sx={{ alignSelf: "center" }}>
              صفحة {page} من {data.meta.last_page}
            </Typography>
            <Button
              disabled={page === data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </Box>
        )}
      </CardContent>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف القسم "{wardToDelete?.name}"؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={handleAddCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة قسم جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="اسم القسم"
              required
              fullWidth
              value={newWard.name}
              onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
              autoFocus
            />
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={3}
              value={newWard.description || ""}
              onChange={(e) =>
                setNewWard({ ...newWard, description: e.target.value })
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newWard.status}
                  onChange={(e) =>
                    setNewWard({ ...newWard, status: e.target.checked })
                  }
                />
              }
              label="نشط"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddCancel}>إلغاء</Button>
          <Button
            onClick={handleAddConfirm}
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "إضافة"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
