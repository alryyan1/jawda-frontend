import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBeds, deleteBed } from "@/services/bedService";
import { getRooms } from "@/services/roomService";
import type { Bed } from "@/types/admissions";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function BedsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roomFilter, setRoomFilter] = useState<number | "">("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<Bed | null>(null);

  const { data: rooms } = useQuery({
    queryKey: ['roomsList'],
    queryFn: () => getRooms(1, { per_page: 1000 }).then(res => res.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['beds', page, searchTerm, roomFilter],
    queryFn: () => getBeds(page, { 
      search: searchTerm, 
      room_id: roomFilter || undefined 
    }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      toast.success('تم حذف السرير بنجاح');
      setDeleteDialogOpen(false);
      setBedToDelete(null);
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', { 
        description: err.response?.data?.message || err.message 
      });
    },
  });

  const handleDeleteClick = (bed: Bed) => {
    setBedToDelete(bed);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (bedToDelete) {
      deleteMutation.mutate(bedToDelete.id);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleRoomFilterChange = (value: number | "") => {
    setRoomFilter(value);
    setPage(1);
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case 'available': return 'success';
      case 'occupied': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'available': return 'متاح';
      case 'occupied': return 'مشغول';
      case 'maintenance': return 'صيانة';
      default: return status;
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
      <Card>
        <CardContent>
          <Typography variant="body2" color="error" sx={{ py: 2 }}>
            حدث خطأ أثناء جلب الأسرّة
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={Link}
              to="/admissions"
              variant="outlined"
              size="small"
              startIcon={<ArrowRight />}
            >
              رجوع
            </Button>
            <Typography variant="h5">إدارة الأسرّة</Typography>
          </Box>
          <Button
            component={Link}
            to="/settings/beds/new"
            variant="contained"
            startIcon={<Plus />}
          >
            إضافة سرير جديد
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>الغرفة</InputLabel>
            <Select
              value={roomFilter}
              label="الغرفة"
              onChange={(e) => handleRoomFilterChange(e.target.value as number | "")}
            >
              <MenuItem value="">الكل</MenuItem>
              {rooms?.map((room) => {
                const roomTypeLabel = room.room_type === 'normal' ? 'عادي' : room.room_type === 'vip' ? 'VIP' : '';
                const roomTypeDisplay = roomTypeLabel ? ` (${roomTypeLabel})` : '';
                return (
                  <MenuItem key={room.id} value={room.id}>
                    {room.room_number}{roomTypeDisplay} - {room.ward?.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>رقم السرير</TableCell>
                <TableCell>الغرفة</TableCell>
                <TableCell>القسم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      لا توجد أسرّة
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((bed) => {
                  const roomTypeLabel = bed.room?.room_type === 'normal' ? 'عادي' : bed.room?.room_type === 'vip' ? 'VIP' : '';
                  const roomDisplay = bed.room?.room_number 
                    ? `${bed.room.room_number}${roomTypeLabel ? ` (${roomTypeLabel})` : ''}`
                    : '-';
                  return (
                    <TableRow key={bed.id}>
                      <TableCell>{bed.bed_number}</TableCell>
                      <TableCell>{roomDisplay}</TableCell>
                      <TableCell>{bed.room?.ward?.name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(bed.status)}
                          color={getStatusColor(bed.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          component={Link}
                          to={`/settings/beds/${bed.id}/edit`}
                          size="small"
                          color="primary"
                        >
                          <Edit size={16} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteClick(bed)}
                          size="small"
                          color="error"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
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

      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف السرير "{bedToDelete?.bed_number}"؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteMutation.isPending}
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
