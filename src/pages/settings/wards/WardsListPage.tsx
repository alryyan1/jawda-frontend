import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWards, deleteWard } from "@/services/wardService";
import type { Ward } from "@/types/admissions";
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
} from "@mui/material";
import {
  Edit,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function WardsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wardToDelete, setWardToDelete] = useState<Ward | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wards', page, searchTerm],
    queryFn: () => getWards(page, { search: searchTerm }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards'] });
      toast.success('تم حذف القسم بنجاح');
      setDeleteDialogOpen(false);
      setWardToDelete(null);
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', { description: err.response?.data?.message || err.message });
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

  if (isLoading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">إدارة الأقسام</Typography>
          <Button
            component={Link}
            to="/settings/wards/new"
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
                  <TableCell>{ward.description || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={ward.status ? 'نشط' : 'غير نشط'}
                      color={ward.status ? 'success' : 'default'}
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
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
            <Button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              السابق
            </Button>
            <Typography sx={{ alignSelf: 'center' }}>
              صفحة {page} من {data.meta.last_page}
            </Typography>
            <Button
              disabled={page === data.meta.last_page}
              onClick={() => setPage(p => p + 1)}
            >
              التالي
            </Button>
          </Box>
        )}
      </CardContent>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف القسم "{wardToDelete?.name}"؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

