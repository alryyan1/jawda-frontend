// src/pages/parties/PartiesListPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getParties, createParty, updateParty, deleteParty } from "@/services/partyService";
import type { Party } from "@/types/parties";
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
  CircularProgress,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Handshake, Plus, Search, DollarSign, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PartiesListPage() {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["parties", currentPage, searchQuery],
    queryFn: () => getParties(currentPage, searchQuery ? { search: searchQuery } : {}),
    placeholderData: keepPreviousData,
  });

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [nameInput, setNameInput] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; name: string }) =>
      data.id ? updateParty(data.id, { name: data.name }) : createParty({ name: data.name }),
    onSuccess: () => {
      toast.success(editingParty ? "تم تحديث الجهة بنجاح" : "تم إضافة الجهة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      handleCloseFormDialog();
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error("فشل الحفظ", { description: err.response?.data?.message || err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteParty,
    onSuccess: () => {
      toast.success("تم حذف الجهة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error("فشل الحذف", { description: err.response?.data?.message || err.message });
    },
  });

  const handleOpenAddDialog = () => {
    setEditingParty(null);
    setNameInput("");
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (party: Party) => {
    setEditingParty(party);
    setNameInput(party.name);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setEditingParty(null);
    setNameInput("");
  };

  const handleSave = () => {
    if (!nameInput.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    saveMutation.mutate({ id: editingParty?.id, name: nameInput.trim() });
  };

  const handleDelete = (party: Party) => {
    if (window.confirm(`هل تريد حذف الجهة "${party.name}"؟`)) {
      deleteMutation.mutate(party.id);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  if (isLoading && !isFetching)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          جاري تحميل الجهات...
        </Typography>
      </Box>
    );
  if (error)
    return (
      <Typography variant="body1" color="error" sx={{ p: 2 }}>
        حدث خطأ أثناء جلب الجهات: {error.message}
      </Typography>
    );

  const parties = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto max-w-5xl">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold">الجهات</h1>
        <Button variant="contained" size="small" startIcon={<Plus className="h-3.5 w-3.5" />} onClick={handleOpenAddDialog}>
          إضافة جهة
        </Button>
      </div>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="البحث عن جهة..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="h-4 w-4" />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 320 }}
        />
      </Box>

      {isFetching && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          جاري تحديث القائمة...
        </Typography>
      )}

      {parties.length === 0 && !isLoading ? (
        <Card sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
          <CardContent>
            <Handshake className="mx-auto h-8 w-8" style={{ opacity: 0.5, marginBottom: 8 }} />
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              لا توجد جهات للعرض.
            </Typography>
            <Button variant="contained" size="small" startIcon={<Plus className="h-3.5 w-3.5" />} onClick={handleOpenAddDialog}>
              إضافة جهة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50, py: 0.75, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                      المعرف
                    </TableCell>
                    <TableCell sx={{ py: 0.75, textAlign: 'center' }}>الإسم</TableCell>
                    <TableCell sx={{ py: 0.75, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                      عدد الخدمات
                    </TableCell>
                    <TableCell sx={{ py: 0.75, textAlign: 'center' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parties.map((party) => (
                    <TableRow key={party.id} hover>
                      <TableCell sx={{ py: 0.5, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                        {party.id}
                      </TableCell>
                      <TableCell sx={{ py: 0.5, fontWeight: 'medium', textAlign: 'center' }}>{party.name}</TableCell>
                      <TableCell sx={{ py: 0.5, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                        {party.services_count ?? "-"}
                      </TableCell>
                      <TableCell sx={{ py: 0.5, textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Button
                            component={Link}
                            to={`/settings/parties/${party.id}/service-costs`}
                            size="small"
                            variant="outlined"
                            startIcon={<DollarSign className="h-3.5 w-3.5" />}
                            sx={{ py: 0.25 }}
                          >
                            أسعار الخدمات
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleOpenEditDialog(party)} sx={{ minWidth: 32, px: 0.75, py: 0.25 }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(party)} sx={{ minWidth: 32, px: 0.75, py: 0.25 }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Dialog open={formDialogOpen} onClose={handleCloseFormDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ py: 1.5 }}>{editingParty ? "تعديل جهة" : "إضافة جهة"}</DialogTitle>
        <DialogContent sx={{ pb: 1.5 }}>
          <TextField
            autoFocus
            fullWidth
            label="اسم الجهة"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            size="small"
            sx={{ mt: 1 }}
            disabled={saveMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseFormDialog} disabled={saveMutation.isPending} size="small">إلغاء</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isFetching}
            size="small"
            variant="outlined"
          >
            السابق
          </Button>
          <Typography variant="caption" color="text.secondary">
            صفحة {meta.current_page} من {meta.last_page}
          </Typography>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={currentPage >= meta.last_page || isFetching}
            size="small"
            variant="outlined"
          >
            التالي
          </Button>
        </Box>
      )}
    </div>
  );
}
