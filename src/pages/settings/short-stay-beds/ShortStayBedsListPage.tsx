import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShortStayBeds,
  deleteShortStayBed,
  createShortStayBed,
  updateShortStayBed,
} from "@/services/shortStayBedService";
import type { ShortStayBed, ShortStayBedFormData } from "@/types/admissions";
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Edit, Trash2, Plus, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function ShortStayBedsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<ShortStayBed | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bedToEdit, setBedToEdit] = useState<ShortStayBed | null>(null);
  const [newBed, setNewBed] = useState<ShortStayBedFormData>({
    bed_number: "",
    price_12h: "",
    price_24h: "",
    status: "active",
    notes: "",
  });
  const [editBed, setEditBed] = useState<ShortStayBedFormData>({
    bed_number: "",
    price_12h: "",
    price_24h: "",
    status: "active",
    notes: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["shortStayBeds", page, searchTerm, statusFilter],
    queryFn: () =>
      getShortStayBeds(page, {
        search: searchTerm,
        status: statusFilter || undefined,
      }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShortStayBed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortStayBeds"] });
      toast.success("تم حذف السرير بنجاح");
      setDeleteDialogOpen(false);
      setBedToDelete(null);
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الحذف", { description: errorMessage });
    },
  });

  const createMutation = useMutation({
    mutationFn: createShortStayBed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortStayBeds"] });
      toast.success("تم إضافة السرير بنجاح");
      setAddDialogOpen(false);
      setNewBed({
        bed_number: "",
        price_12h: "",
        price_24h: "",
        status: "active",
        notes: "",
      });
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الإضافة", { description: errorMessage });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ShortStayBedFormData> }) =>
      updateShortStayBed(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortStayBeds"] });
      toast.success("تم تحديث السرير بنجاح");
      setEditDialogOpen(false);
      setBedToEdit(null);
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل التحديث", { description: errorMessage });
    },
  });

  const handleAddClick = () => {
    setNewBed({
      bed_number: "",
      price_12h: "",
      price_24h: "",
      status: "active",
      notes: "",
    });
    setAddDialogOpen(true);
  };

  const handleAddConfirm = () => {
    if (!newBed.bed_number.trim()) {
      toast.error("رقم السرير مطلوب");
      return;
    }
    if (!newBed.price_12h || parseFloat(newBed.price_12h) < 0) {
      toast.error("سعر 12 ساعة مطلوب ويجب أن يكون أكبر من أو يساوي 0");
      return;
    }
    if (!newBed.price_24h || parseFloat(newBed.price_24h) < 0) {
      toast.error("سعر 24 ساعة مطلوب ويجب أن يكون أكبر من أو يساوي 0");
      return;
    }
    createMutation.mutate(newBed);
  };

  const handleAddCancel = () => {
    setAddDialogOpen(false);
    setNewBed({
      bed_number: "",
      price_12h: "",
      price_24h: "",
      status: "active",
      notes: "",
    });
  };

  const handleEditClick = (bed: ShortStayBed) => {
    setBedToEdit(bed);
    setEditBed({
      bed_number: bed.bed_number,
      price_12h: String(bed.price_12h),
      price_24h: String(bed.price_24h),
      status: bed.status,
      notes: bed.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditConfirm = () => {
    if (!editBed.bed_number.trim()) {
      toast.error("رقم السرير مطلوب");
      return;
    }
    if (!editBed.price_12h || parseFloat(editBed.price_12h) < 0) {
      toast.error("سعر 12 ساعة مطلوب ويجب أن يكون أكبر من أو يساوي 0");
      return;
    }
    if (!editBed.price_24h || parseFloat(editBed.price_24h) < 0) {
      toast.error("سعر 24 ساعة مطلوب ويجب أن يكون أكبر من أو يساوي 0");
      return;
    }
    if (!bedToEdit) return;
    updateMutation.mutate({ id: bedToEdit.id, data: editBed });
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setBedToEdit(null);
  };

  const handleDeleteClick = (bed: ShortStayBed) => {
    setBedToDelete(bed);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!bedToDelete) return;
    deleteMutation.mutate(bedToDelete.id);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setBedToDelete(null);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">حدث خطأ أثناء تحميل البيانات</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={600}>
          إدارة أسرة الإقامة القصيرة
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleAddClick}
        >
          إضافة سرير جديد
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 3,
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            <TextField
              fullWidth
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={statusFilter}
                label="الحالة"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="inactive">غير نشط</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>رقم السرير</TableCell>
                    <TableCell align="right">سعر 12 ساعة</TableCell>
                    <TableCell align="right">سعر 24 ساعة</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                    <TableCell>ملاحظات</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          لا توجد أسرة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((bed) => (
                      <TableRow key={bed.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>
                            {bed.bed_number}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {bed.price_12h.toLocaleString()} ريال
                        </TableCell>
                        <TableCell align="right">
                          {bed.price_24h.toLocaleString()} ريال
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={bed.status === "active" ? "نشط" : "غير نشط"}
                            color={bed.status === "active" ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {bed.notes || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(bed)}
                            color="primary"
                          >
                            <Edit size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(bed)}
                            color="error"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {data && data.meta && data.meta.last_page > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 1,
                mt: 3,
              }}
            >
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                السابق
              </Button>
              <Typography sx={{ alignSelf: "center", px: 2 }}>
                صفحة {page} من {data.meta.last_page}
              </Typography>
              <Button
                disabled={page === data.meta.last_page}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleAddCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة سرير إقامة قصيرة جديد</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddConfirm();
          }}
        >
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <TextField
                label="رقم السرير"
                required
                fullWidth
                value={newBed.bed_number}
                onChange={(e) =>
                  setNewBed({ ...newBed, bed_number: e.target.value })
                }
              />

              <TextField
                label="سعر 12 ساعة"
                required
                fullWidth
                type="number"
                value={newBed.price_12h}
                onChange={(e) =>
                  setNewBed({ ...newBed, price_12h: e.target.value })
                }
                inputProps={{ min: 0, step: "0.01" }}
              />

              <TextField
                label="سعر 24 ساعة"
                required
                fullWidth
                type="number"
                value={newBed.price_24h}
                onChange={(e) =>
                  setNewBed({ ...newBed, price_24h: e.target.value })
                }
                inputProps={{ min: 0, step: "0.01" }}
              />

              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={newBed.status}
                  label="الحالة"
                  onChange={(e) =>
                    setNewBed({
                      ...newBed,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                >
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="ملاحظات"
                fullWidth
                multiline
                rows={3}
                value={newBed.notes}
                onChange={(e) =>
                  setNewBed({ ...newBed, notes: e.target.value })
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddCancel}>إلغاء</Button>
            <Button
              type="submit"
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
        </form>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل سرير إقامة قصيرة</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEditConfirm();
          }}
        >
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <TextField
                label="رقم السرير"
                required
                fullWidth
                value={editBed.bed_number}
                onChange={(e) =>
                  setEditBed({ ...editBed, bed_number: e.target.value })
                }
              />

              <TextField
                label="سعر 12 ساعة"
                required
                fullWidth
                type="number"
                value={editBed.price_12h}
                onChange={(e) =>
                  setEditBed({ ...editBed, price_12h: e.target.value })
                }
                inputProps={{ min: 0, step: "0.01" }}
              />

              <TextField
                label="سعر 24 ساعة"
                required
                fullWidth
                type="number"
                value={editBed.price_24h}
                onChange={(e) =>
                  setEditBed({ ...editBed, price_24h: e.target.value })
                }
                inputProps={{ min: 0, step: "0.01" }}
              />

              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={editBed.status}
                  label="الحالة"
                  onChange={(e) =>
                    setEditBed({
                      ...editBed,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                >
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="ملاحظات"
                fullWidth
                multiline
                rows={3}
                value={editBed.notes}
                onChange={(e) =>
                  setEditBed({ ...editBed, notes: e.target.value })
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditCancel}>إلغاء</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                "حفظ"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف سرير الإقامة القصيرة "{bedToDelete?.bed_number}"؟
            لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>إلغاء</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "حذف"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
