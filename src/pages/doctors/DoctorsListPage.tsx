// src/pages/doctors/DoctorsListPage.tsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getDoctors, deleteDoctor, updateDoctor } from "../../services/doctorService";
import { API_BASE_URL } from "../../services/api";
import type { Doctor } from "../../types/doctors";
import { toast } from "sonner";
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
import {
  ClipboardList,
  Edit,
  FileText,
  Loader2,
  Search,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import ManageDoctorServicesDialog from "@/components/doctors/ManageDoctorServicesDialog";
import EditDoctorDialog from "@/components/doctors/EditDoctorDialog";

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function DoctorsListPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [servicesDialogDoctor, setServicesDialogDoctor] = useState<Doctor | null>(null);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [localPhones, setLocalPhones] = useState<Record<number, string>>({});
  const phoneRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["doctors", currentPage, debouncedSearch],
    queryFn: () => getDoctors(currentPage, { search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (doctorId: number) => deleteDoctor(doctorId),
    onSuccess: () => {
      toast.success("تم حذف الطبيب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setDeleteDialogOpen(false);
      setDoctorToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error("فشل حذف الطبيب", {
        description:
          err.response?.data?.message || err.message || "حدث خطأ غير متوقع",
      });
      setDeleteDialogOpen(false);
      setDoctorToDelete(null);
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: ({ id, phone }: { id: number; phone: string }) =>
      updateDoctor(id, { phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (err: ApiError) => {
      toast.error("فشل تحديث رقم الهاتف", {
        description:
          err.response?.data?.message || err.message || "حدث خطأ غير متوقع",
      });
    },
  });

  const commitPhone = (doctor: Doctor) => {
    const raw = localPhones[doctor.id];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    if (trimmed && trimmed !== doctor.phone) {
      updatePhoneMutation.mutate({ id: doctor.id, phone: trimmed });
    }
  };

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const url = `${API_BASE_URL}/reports/doctors-list/pdf${params.toString() ? `?${params.toString()}` : ""}`;
      const newWindow = window.open(url, "_blank");
      if (!newWindow) {
        toast.error("فشل التصدير", {
          description: "تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleManageDoctorServices = (doctor: Doctor) => {
    setServicesDialogDoctor(doctor);
    setIsServicesDialogOpen(true);
  };

  const handleServicesDialogOpenChange = (open: boolean) => {
    setIsServicesDialogOpen(open);
    if (!open) {
      setTimeout(() => setServicesDialogDoctor(null), 300);
    }
  };

  const ActionsMenu = ({ doctor }: { doctor: Doctor }) => {
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
              setEditingDoctorId(doctor.id);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> تعديل
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleManageDoctorServices(doctor);
            }}
          >
            <ClipboardList className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> إدارة الخدمات
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              setDoctorToDelete(doctor);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> حذف
          </MenuItem>
        </Menu>
      </>
    );
  };

  if (isLoading && !isFetching && currentPage === 1 && !debouncedSearch) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground" style={{ direction: "rtl" }}>
        <Loader2 className="h-7 w-7 animate-spin" />
        جاري تحميل الأطباء...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" style={{ direction: "rtl" }}>
        حدث خطأ أثناء جلب الأطباء: {(error as Error).message}
      </div>
    );
  }

  const doctors = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div style={{ direction: "rtl" }} className="mx-auto max-w-7xl space-y-4 py-2">
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              الأطباء
            </Typography>
            
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Button
              onClick={handleExportPdf}
              disabled={isExporting}
              size="small"
              variant="outlined"
              startIcon={<FileText size={16} />}
            >
              تصدير PDF
            </Button>
            <Button
              component={Link as any}
              to="/doctors/new"
              size="small"
              variant="contained"
              startIcon={<UserPlus size={16} />}
            >
              إضافة طبيب
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "stretch", lg: "center" }}>
          <TextField
            id="search-doctor"
            type="search"
            size="small"
            label="البحث بالاسم أو الهاتف"
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

        {/* <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Chip label={`إجمالي ${meta?.total ?? doctors.length}`} color="default" variant="outlined" />
        </Stack> */}
      </Card>

      {isFetching && (
        <Box className="text-sm text-muted-foreground" sx={{ px: 0.5 }}>
          جاري تحديث القائمة...
        </Box>
      )}

      {doctors.length === 0 && !isLoading && !isFetching ? (
        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            {debouncedSearch ? "لا توجد نتائج" : "لا يوجد أطباء"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {debouncedSearch ? "جرّب كلمات أخرى." : "أضف أول طبيب للبدء."}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              component={Link as any}
              to="/doctors/new"
              variant="contained"
              size="small"
              startIcon={<UserPlus size={16} />}
            >
              إضافة طبيب
            </Button>
            {debouncedSearch && (
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
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الهاتف</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الاختصاص</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الأجر الثابت</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>نسبة النقد</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>نسبة الشركة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doctors.map((doctor, index) => (
                  <TableRow key={doctor.id} hover>
                    <TableCell align="center">{doctor.id}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {doctor.name}
                        </Typography>
                        {doctor.is_default && <Star size={14} fill="gold" color="gold" />}
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ minWidth: 160 }}>
                      <TextField
                        size="small"
                        onFocus={(event) => event.target.select()}
                        value={localPhones[doctor.id] ?? doctor.phone}
                        onChange={(event) => setLocalPhones((prev) => ({ ...prev, [doctor.id]: event.target.value }))}
                        onBlur={() => commitPhone(doctor)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitPhone(doctor);
                            const nextDoctor = doctors[index + 1];
                            if (nextDoctor) phoneRefs.current[nextDoctor.id]?.focus();
                          } else if (event.key === "Escape") {
                            setLocalPhones((prev) => {
                              const next = { ...prev };
                              delete next[doctor.id];
                              return next;
                            });
                          }
                        }}
                        slotProps={{
                          input: {
                            inputRef: (element) => {
                              phoneRefs.current[doctor.id] = element;
                            },
                            sx: { textAlign: "center" },
                          },
                        }}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {doctor.specialist?.name || doctor.specialist_name || "—"}
                    </TableCell>
                    <TableCell align="center" sx={{ color: "success.main", fontWeight: 600 }}>
                      {Number(doctor.static_wage) ? Number(doctor.static_wage).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell align="center">
                      {Number(doctor.cash_percentage) ? `${doctor.cash_percentage}%` : "—"}
                    </TableCell>
                    <TableCell align="center">
                      {Number(doctor.company_percentage) ? `${doctor.company_percentage}%` : "—"}
                    </TableCell>
                    <TableCell align="center">
                      <ActionsMenu doctor={doctor} />
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف الطبيب “{doctorToDelete?.name || ""}”؟ لا يمكن التراجع عن هذا الإجراء.
          <Typography variant="body2" color="error" fontWeight={600} sx={{ mt: 1 }}>
            لا يمكن حذف طبيب مرتبط بمرضى أو زيارات.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            color="error"
            onClick={() => doctorToDelete && deleteMutation.mutate(doctorToDelete.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {servicesDialogDoctor && (
        <ManageDoctorServicesDialog
          isOpen={isServicesDialogOpen}
          onOpenChange={handleServicesDialogOpenChange}
          doctor={servicesDialogDoctor}
          onConfigurationUpdated={() => {}}
        />
      )}

      <EditDoctorDialog
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setTimeout(() => setEditingDoctorId(null), 300);
          }
        }}
        doctorId={editingDoctorId}
      />
    </div>
  );
}
