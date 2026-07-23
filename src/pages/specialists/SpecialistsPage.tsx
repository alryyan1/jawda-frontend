// src/pages/specialists/SpecialistsPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Edit, Loader2, PlusCircle, Search, Trash2 } from "lucide-react";

import { getSpecialistsPaginated, deleteSpecialist } from "@/services/specialistService";
import ManageSpecialistDialog from "@/components/specialists/ManageSpecialistDialog";
import type { Specialist } from "@/types/doctors";
import type { PaginatedResponse } from "@/types/common";

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const SpecialistsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [specialistToEdit, setSpecialistToEdit] = useState<Specialist | null>(null);
  const [specialistToDelete, setSpecialistToDelete] = useState<Specialist | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const queryKey = ["specialists", currentPage, debouncedSearchTerm] as const;
  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<Specialist>, Error>({
    queryKey,
    queryFn: () => getSpecialistsPaginated(currentPage, { search: debouncedSearchTerm }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (specialistId: number) => deleteSpecialist(specialistId),
    onSuccess: () => {
      toast.success("تم حذف الاختصاص بنجاح");
      queryClient.invalidateQueries({ queryKey: ["specialists"] });
      queryClient.invalidateQueries({ queryKey: ["specialistsList"] });
      setSpecialistToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error("فشل حذف الاختصاص", {
        description:
          err.response?.data?.message || err.message || "حدث خطأ غير متوقع",
      });
      setSpecialistToDelete(null);
    },
  });

  const handleOpenDialog = (specialist: Specialist | null = null) => {
    setSpecialistToEdit(specialist);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["specialists"] });
    queryClient.invalidateQueries({ queryKey: ["specialistsList"] });
  };

  const ActionsMenu = ({ specialist }: { specialist: Specialist }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    return (
      <>
        <Button
          size="small"
          variant="outlined"
          onClick={(event) => setAnchorEl(event.currentTarget as HTMLElement)}
        >
          <Edit className="ml-2 h-4 w-4" />
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleOpenDialog(specialist);
            }}
          >
            <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> تعديل
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              setSpecialistToDelete(specialist);
            }}
          >
            <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> حذف
          </MenuItem>
        </Menu>
      </>
    );
  };

  if (isLoading && !isFetching && currentPage === 1 && !debouncedSearchTerm) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground" style={{ direction: "rtl" }}>
        <Loader2 className="h-7 w-7 animate-spin" />
        جاري تحميل الاختصاصات...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" style={{ direction: "rtl" }}>
        حدث خطأ أثناء جلب البيانات: {error.message}
      </div>
    );
  }

  const specialists = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div style={{ direction: "rtl" }} className="mx-auto max-w-4xl space-y-4 py-2">
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              الاختصاصات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إدارة اختصاصات الأطباء مع البحث السريع.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Button
              onClick={() => handleOpenDialog()}
              size="small"
              variant="contained"
              startIcon={<PlusCircle size={16} />}
            >
              إضافة اختصاص
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "stretch", lg: "center" }}>
          <TextField
            id="search-specialist"
            type="search"
            size="small"
            label="البحث بالاسم"
            placeholder="ابحث"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
            slotProps={{
              input: {
                startAdornment: <Search className="ml-2 h-4 w-4 text-muted-foreground" />,
              },
            }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Chip label={`إجمالي ${meta?.total ?? specialists.length}`} color="default" variant="outlined" />
        </Stack>
      </Card>

      {isFetching && (
        <Box className="text-sm text-muted-foreground" sx={{ px: 0.5 }}>
          جاري تحديث القائمة...
        </Box>
      )}

      {specialists.length === 0 && !isLoading && !isFetching ? (
        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            {debouncedSearchTerm ? "لا توجد نتائج" : "لا توجد اختصاصات"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {debouncedSearchTerm ? "جرّب كلمات أخرى." : "أضف أول اختصاص للبدء."}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button variant="contained" size="small" startIcon={<PlusCircle size={16} />} onClick={() => handleOpenDialog()}>
              إضافة اختصاص
            </Button>
            {debouncedSearchTerm && (
              <Button variant="outlined" size="small" onClick={() => setSearchTerm("")}>
                مسح البحث
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>المعرف</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الاسم</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>عدد الأطباء</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {specialists.map((specialist) => (
                  <TableRow key={specialist.id} hover>
                    <TableCell align="center">{specialist.id}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {specialist.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{specialist.doctors_count ?? 0}</TableCell>
                    <TableCell align="center">
                      <ActionsMenu specialist={specialist} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ py: 1 }}>
          <Pagination
            count={meta.last_page}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            disabled={isFetching}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Stack>
      )}

      <ManageSpecialistDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        specialistToEdit={specialistToEdit}
        onSuccess={handleSuccess}
      />

      <Dialog open={!!specialistToDelete} onClose={() => setSpecialistToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف الاختصاص “{specialistToDelete?.name || ""}”؟ لا يمكن التراجع عن هذا الإجراء.
          <Typography variant="body2" color="error" fontWeight={600} sx={{ mt: 1 }}>
            لا يمكن حذف اختصاص مرتبط بأطباء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setSpecialistToDelete(null)}>
            إلغاء
          </Button>
          <Button
            color="error"
            onClick={() => specialistToDelete && deleteMutation.mutate(specialistToDelete.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
export default SpecialistsPage;
