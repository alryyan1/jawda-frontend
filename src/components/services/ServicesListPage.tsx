// src/components/services/ServicesListPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  getServices,
  deleteService,
  activateAllServices,
  updateService,
  restoreService,
  getTrashedServices,
} from "@/services/serviceService";
import { getServiceGroupsList } from "@/services/serviceGroupService";
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
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArchiveRestore,
  Edit,
  FilterX,
  Loader2,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Service } from "@/types/services";
import { useDebounce } from "@/hooks/useDebounce";
import {
  downloadServicesListExcel,
  downloadServicesListPdf,
} from "@/services/reportService";
import AddServiceDialog from "./AddServiceDialog";

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface ServiceFilters {
  search: string;
  service_group_id: string;
}

export default function ServicesListPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ServiceFilters>({
    search: "",
    service_group_id: "all",
  });
  const debouncedSearchTerm = useDebounce(filters.search, 400);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [trashedDialogOpen, setTrashedDialogOpen] = useState(false);
  const [localPrices, setLocalPrices] = useState<Record<number, string>>({});
  const priceRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: serviceGroupsData, isLoading: isLoadingServiceGroups } = useQuery({
    queryKey: ["serviceGroupsListForFilter"],
    queryFn: getServiceGroupsList,
  });
  const serviceGroups = serviceGroupsData?.data || [];

  const servicesQueryKey = [
    "services",
    currentPage,
    debouncedSearchTerm,
    filters.service_group_id,
  ] as const;

  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: servicesQueryKey,
    queryFn: () =>
      getServices(currentPage, {
        search: debouncedSearchTerm || undefined,
        service_group_id:
          filters.service_group_id === "all"
            ? undefined
            : filters.service_group_id,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.service_group_id]);

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) => deleteService(serviceId),
    onSuccess: () => {
      toast.success("تم حذف الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error("فشل حذف الخدمة", {
        description:
          err.message || err.response?.data?.message || "حدث خطأ غير متوقع",
      });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
  });

  const {
    data: trashedData,
    isLoading: isLoadingTrashed,
  } = useQuery({
    queryKey: ["trashedServices"],
    queryFn: getTrashedServices,
    enabled: trashedDialogOpen,
  });
  const trashedServices = trashedData?.data || [];

  const restoreMutation = useMutation({
    mutationFn: (serviceId: number) => restoreService(serviceId),
    onSuccess: () => {
      toast.success("تم استرجاع الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["trashedServices"] });
    },
    onError: (err: ApiError) => {
      toast.error("فشل استرجاع الخدمة", {
        description:
          err.message || err.response?.data?.message || "حدث خطأ غير متوقع",
      });
    },
  });

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await downloadServicesListPdf(filters);
      const objectUrl = URL.createObjectURL(blob);
      const newWindow = window.open(objectUrl, "_blank");
      if (!newWindow) {
        toast.error("فشل التصدير", {
          description: "تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.",
        });
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : error && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : "Export failed";
      toast.error("فشل التصدير", {
        description: errorMessage,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("جارٍ بدء التصدير...");
    try {
      const blob = await downloadServicesListExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `services_list_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("تم التصدير بنجاح");
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : error && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : "Export failed";
      toast.error("فشل التصدير", {
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const activateAllMutation = useMutation({
    mutationFn: () => activateAllServices(),
    onSuccess: (res) => {
      toast.success(res.message || "تم تفعيل كل الخدمات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (err: ApiError) => {
      toast.error("فشل تفعيل جميع الخدمات", {
        description: err.message || err.response?.data?.message,
      });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) =>
      updateService(id, { price: String(price) as any }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
    onError: () => toast.error("فشل تحديث السعر"),
  });

  const commitPrice = (service: { id: number; price: string | number }) => {
    const raw = localPrices[service.id];
    if (raw === undefined) return;
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed !== Number(service.price)) {
      updatePriceMutation.mutate({ id: service.id, price: parsed });
    }
  };

  const toggleFieldMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: number; field: "activate" | "variable" | "has_cost"; value: boolean }) =>
      updateService(id, { [field]: value } as any),
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData({ queryKey: ["services"] }, (oldData: any) => {
        if (!oldData?.data) {
          return oldData;
        }

        return {
          ...oldData,
          data: oldData.data.map((service: Service) =>
            service.id === variables.id
              ? { ...service, [variables.field]: variables.value }
              : service,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: () => toast.error("فشل تحديث الحقل"),
  });

  const openDeleteDialog = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteMutation.mutate(serviceToDelete.id);
    }
  };

  const handleFilterChange = (name: keyof ServiceFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ search: "", service_group_id: "all" });
    setCurrentPage(1);
  };

  const ActionsMenu: React.FC<{ service: Service }> = ({ service }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    return (
      <>
        <Button
          size="small"
          variant="outlined"
          onClick={(event) => setAnchorEl(event.currentTarget as HTMLElement)}
        >
         {/* // Edit button icon  */}
          <Edit className="ml-2 h-4 w-4" />

        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <MenuItem component={Link as any} to={`/settings/services/${service.id}/edit`}>
            <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> تعديل
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              openDeleteDialog(service);
            }}
          >
            <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> حذف
          </MenuItem>
        </Menu>
      </>
    );
  };

  if (isLoading && !isFetching && currentPage === 1) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground" style={{ direction: "rtl" }}>
        <Loader2 className="h-7 w-7 animate-spin" />
        جاري تحميل الخدمات...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" style={{ direction: "rtl" }}>
        حدث خطأ أثناء جلب الخدمات: {(error as any).message}
      </div>
    );
  }

  const services = paginatedData?.data || [];
  const meta = paginatedData?.meta;
  const activeCount = services.filter((service) => service.activate).length;
  const variableCount = services.filter((service) => service.variable).length;
  const hasCostCount = services.filter((service) => service.has_cost).length;

  return (
    <div style={{ direction: "rtl" }} className="mx-auto max-w-7xl space-y-4 py-2">
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              الخدمات
            </Typography>
            {/* <Typography variant="body2" color="text.secondary">
              إدارة الخدمات بسرعة مع البحث السريع والتحديثات المباشرة.
            </Typography> */}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button onClick={handleExportPdf} disabled={isExportingPdf} size="small" variant="outlined">
              تصدير PDF
            </Button>
            <Button onClick={handleExport} disabled={isExporting} size="small" variant="outlined">
              تصدير Excel
            </Button>
            <Button
              onClick={() => activateAllMutation.mutate()}
              disabled={activateAllMutation.isPending}
              size="small"
              variant="outlined"
              color="success"
            >
              {activateAllMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تفعيل الكل
            </Button>
            <AddServiceDialog />
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "stretch", lg: "center" }}>
          <TextField
            id="search-service"
            type="search"
            size="small"
            label="البحث بالاسم"
            placeholder="ابحث"
            value={filters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
            slotProps={{
              input: {
                startAdornment: <Search className="ml-2 h-4 w-4 text-muted-foreground" />,
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="service-group-filter-label">المجموعة</InputLabel>
            <Select
              labelId="service-group-filter-label"
              value={filters.service_group_id}
              label="المجموعة"
              onChange={(event) => handleFilterChange("service_group_id", String(event.target.value))}
              disabled={isLoadingServiceGroups}
            >
              <MenuItem value="all">كل المجموعات</MenuItem>
              {isLoadingServiceGroups && <MenuItem value="loading" disabled>جاري التحميل...</MenuItem>}
              {serviceGroups.map((group) => (
                <MenuItem key={group.id} value={String(group.id)}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            onClick={handleResetFilters}
            disabled={filters.search === "" && filters.service_group_id === "all"}
            startIcon={<FilterX size={16} />}
          >
            مسح المرشحات
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="success"
            onClick={() => setTrashedDialogOpen(true)}
            startIcon={<ArchiveRestore size={16} />}
          >
            الخدمات المحذوفة
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Chip label={`إجمالي ${meta?.total ?? services.length}`} color="default" variant="outlined" />
          <Chip label={`نشطة ${activeCount}`} color="success" variant="outlined" />
          <Chip label={`متغيرة ${variableCount}`} color="info" variant="outlined" />
          <Chip label={`لها تكلفة ${hasCostCount}`} color="warning" variant="outlined" />
        </Stack>
      </Card>

      {isFetching && (
        <Box className="text-sm text-muted-foreground" sx={{ px: 0.5 }}>
          جاري تحديث القائمة...
        </Box>
      )}

      {services.length === 0 && !isLoading && !isFetching ? (
        <Card sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            لا توجد خدمات للعرض
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            جرّب تغيير المرشحات أو إضافة خدمة جديدة لبدء الاستخدام.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button variant="contained" size="small" startIcon={<PlusCircle size={16} />}>
              إضافة خدمة
            </Button>
            <Button variant="outlined" size="small" onClick={handleResetFilters}>
              إعادة تعيين
            </Button>
          </Stack>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>المعرف</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الخدمة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>السعر</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>نشط</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>السعر متغير</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>له تكلفة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service, index) => (
                  <TableRow key={service.id} hover>
                    <TableCell align="center">{service.id}</TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {service.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {service.service_group?.name || service.service_group_name || "بدون مجموعة"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ minWidth: 140 }}>
                      <TextField
                        size="small"
                        type="number"
                        onFocus={(event) => event.target.select()}
                        value={localPrices[service.id] ?? String(Math.round(Number(service.price)))}
                        onChange={(event) => setLocalPrices((prev) => ({ ...prev, [service.id]: event.target.value }))}
                        onBlur={() => commitPrice(service)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitPrice(service);
                            const nextService = services[index + 1];
                            if (nextService) priceRefs.current[nextService.id]?.focus();
                          } else if (event.key === "Escape") {
                            setLocalPrices((prev) => {
                              const next = { ...prev };
                              delete next[service.id];
                              return next;
                            });
                          }
                        }}
                        slotProps={{
                          input: {
                            inputRef: (element) => {
                              priceRefs.current[service.id] = element;
                            },
                            sx: { textAlign: "center" },
                          },
                        }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={service.activate ? "إيقاف التفعيل" : "تفعيل الخدمة"}>
                        <span>
                          <Switch
                            checked={Boolean(service.activate)}
                            onChange={() => toggleFieldMutation.mutate({ id: service.id, field: "activate", value: !service.activate })}
                            disabled={toggleFieldMutation.isPending}
                            color="success"
                            size="small"
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={service.variable ? "إلغاء التغيير المتغير" : "جعله متغيرًا"}>
                        <span>
                          <Switch
                            checked={Boolean(service.variable)}
                            onChange={() => toggleFieldMutation.mutate({ id: service.id, field: "variable", value: !service.variable })}
                            disabled={toggleFieldMutation.isPending}
                            color="info"
                            size="small"
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={service.has_cost ? "إزالة التكلفة" : "تعيين تكلفة"}>
                        <span>
                          <Switch
                            checked={Boolean(service.has_cost)}
                            onChange={() => toggleFieldMutation.mutate({ id: service.id, field: "has_cost", value: !service.has_cost })}
                            disabled={toggleFieldMutation.isPending}
                            color="warning"
                            size="small"
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <ActionsMenu service={service} />
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
          هل أنت متأكد من حذف الخدمة “{serviceToDelete?.name || ""}”؟ لا يمكن التراجع عن هذا الإجراء.
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteDialogOpen(false)}>
            إلغاء
          </Button>
          <Button color="error" onClick={confirmDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={trashedDialogOpen} onClose={() => setTrashedDialogOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>الخدمات المحذوفة</DialogTitle>
        <DialogContent dividers>
          {isLoadingTrashed ? (
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ py: 3 }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <Typography variant="body2">جاري تحميل الخدمات المحذوفة...</Typography>
            </Stack>
          ) : trashedServices.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              لا توجد خدمات محذوفة
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right">الخدمة</TableCell>
                    <TableCell align="right">المجموعة</TableCell>
                    <TableCell align="center">تاريخ الحذف</TableCell>
                    <TableCell align="center">استرجاع</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trashedServices.map((service) => (
                    <TableRow key={service.id} hover>
                      <TableCell align="right">{service.name}</TableCell>
                      <TableCell align="right">{service.service_group_name || "-"}</TableCell>
                      <TableCell align="center">
                        {service.deleted_at ? new Date(service.deleted_at).toLocaleDateString("ar-EG") : "-"}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => restoreMutation.mutate(service.id)}
                          disabled={restoreMutation.isPending}
                          startIcon={<ArchiveRestore size={14} />}
                        >
                          استرجاع
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setTrashedDialogOpen(false)}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
