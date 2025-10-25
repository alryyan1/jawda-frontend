// src/pages/services/ServicesListPage.tsx
import React, { useState, useCallback, useEffect } from "react"; // Added useEffect
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getServices, deleteService, activateAllServices } from "@/services/serviceService";
import { getServiceGroupsList } from "@/services/serviceGroupService"; // IMPORT
import { Button, Card, CardContent, CardHeader, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Menu } from "@mui/material";
import {
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings2,
  Search,
  Filter as FilterIcon,
  SlidersHorizontal,
} from "lucide-react"; // Added Search, FilterIcon
import { toast } from "sonner";
// Replaced Shadcn AlertDialog with MUI Dialog
import type { Service } from "@/types/services";
import ManageServiceCostsDialog from "./ManageServiceCostsDialog";
import { useDebounce } from "@/hooks/useDebounce"; // IMPORT
import { downloadServicesListExcel, downloadServicesListPdf, downloadServicesWithCostsExcel } from "@/services/reportService";
import BatchUpdatePricesDialog from "./BatchUpdatePricesDialog";

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
  service_group_id: string; // Keep as string for 'all' option
}

export default function ServicesListPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // Filters State
  const [filters, setFilters] = useState<ServiceFilters>({
    search: "",
    service_group_id: "all",
  });
  const debouncedSearchTerm = useDebounce(filters.search, 500);
  const [isExporting, setIsExporting] = useState(false); // State for export button loader
  const [isExportingCosts, setIsExportingCosts] = useState(false); // NEW state for new button

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false); // State for PDF loader
  const [manageCostsState, setManageCostsState] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({
    isOpen: false,
    service: null,
  });

  // Fetch Service Groups for Filter Dropdown
  const { data: serviceGroupsData, isLoading: isLoadingServiceGroups } =
    useQuery({
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
        search: debouncedSearchTerm,
        service_group_id:
          filters.service_group_id === "all"
            ? undefined
            : filters.service_group_id,
      }),
    placeholderData: keepPreviousData,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.service_group_id]);

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) => deleteService(serviceId),
    onSuccess: () => {
      toast.success('تم حذف الخدمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error('فشل حذف الخدمة', {
        description: err.message || err.response?.data?.message || 'حدث خطأ غير متوقع',
      });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
  });

  // --- PDF EXPORT HANDLER - OPENS IN NEW TAB ---
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    
    try {
      const blob = await downloadServicesListPdf(filters); // Pass current filters
      const objectUrl = URL.createObjectURL(blob);
      
      // Open PDF in new tab
      const newWindow = window.open(objectUrl, '_blank');
      if (!newWindow) {
        toast.error('فشل التصدير', {
          description: 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.',
        });
      }
      
      // Clean up the object URL after a delay to ensure the new tab has loaded it
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
      
    } catch (error: unknown) {
      console.error("PDF Export failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { message?: string } })?.data?.message 
        : error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Export failed';
      toast.error('فشل التصدير', {
        description: errorMessage,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };
  // Handler for the export button
  const handleExport = async () => {
    setIsExporting(true);
    toast.info('جارٍ بدء التصدير...');
    try {
      const blob = await downloadServicesListExcel(filters); // Pass current filters
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `services_list_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('تم التصدير بنجاح');
    } catch (error: unknown) {
      console.error("Export failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { message?: string } })?.data?.message 
        : error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Export failed';
      toast.error('فشل التصدير', {
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };
  // --- NEW HANDLER FOR COST DETAILS EXPORT ---
  const handleExportWithCosts = async () => {
    setIsExportingCosts(true);
    toast.info('جارٍ بدء التصدير...');
    try {
      const blob = await downloadServicesWithCostsExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `services_with_cost_details_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('تم التصدير بنجاح');
    } catch (error: unknown) {
      console.error("Export with costs failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { message?: string } })?.data?.message 
        : error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Export failed';
      toast.error('فشل التصدير', {
        description: errorMessage,
      });
    } finally {
      setIsExportingCosts(false);
    }
  };
  // Activate all services
  const activateAllMutation = useMutation({
    mutationFn: () => activateAllServices(),
    onSuccess: (res) => {
      toast.success(res.message || 'تم تفعيل كل الخدمات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err: ApiError) => {
      toast.error('فشل تفعيل جميع الخدمات', { description: err.message || err.response?.data?.message });
    }
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

  const handleManageCosts = useCallback((service: Service) => {
    setManageCostsState({ isOpen: true, service });
  }, []);

  const handleManageCostsDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setManageCostsState((prev) => ({ ...prev, isOpen: false }));
        setTimeout(() => {
          setManageCostsState({ isOpen: false, service: null });
        }, 300);
      }, 0);
    }
  }, []);

  const handleCostsUpdated = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [
        "services",
        currentPage,
        debouncedSearchTerm,
        filters.service_group_id,
      ],
    });
  }, [queryClient, currentPage, debouncedSearchTerm, filters.service_group_id]);

  // Local component for row actions menu (MUI)
  const ActionsMenu: React.FC<{ serviceId: number; onEditLink: string; onManageCosts: () => void; onDelete: () => void; isDeleting: boolean; }> = ({ onEditLink, onManageCosts, onDelete, isDeleting }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    return (
      <>
        <Button size="small" variant="outlined" onClick={(e) => setAnchorEl(e.currentTarget as HTMLElement)}>القائمة</Button>
        <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
          <MenuItem component={Link as any} to={onEditLink}><Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> تعديل</MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); onManageCosts(); }}><Settings2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> إدارة التكلفة</MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); onDelete(); }} disabled={isDeleting} sx={{ color: 'error.main' }}>
            {isDeleting ? <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />}
            حذف
          </MenuItem>
        </Menu>
      </>
    );
  };

  const handleFilterChange = (name: keyof ServiceFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading && !isFetching && currentPage === 1)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        جاري تحميل الخدمات...
      </div>
    );
  if (error)
    return (
      <p className="text-destructive p-4">
        حدث خطأ أثناء جلب الخدمات: {(error as any).message}
      </p>
    );

  const services = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <>
      {/* Row actions menu component using MUI */}
      
      <div style={{ direction: 'rtl' }} className="container mx-auto py-1 sm:py-1 lg:py-1">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">
            الخدمات
          </h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportPdf} disabled={isExportingPdf} size="small" variant="outlined">
              تصدير PDF
            </Button> 
          </div>
          <Button onClick={handleExport} disabled={isExporting} size="small" variant="outlined">
            تصدير
          </Button>
          <Button onClick={handleExportWithCosts} disabled={isExportingCosts} size="small" variant="outlined">
            تصدير مع التكلفة
          </Button>
          <Button onClick={() => activateAllMutation.mutate()} disabled={activateAllMutation.isPending} size="small" variant="outlined" color="success">
            {activateAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin rtl:ml-2 ltr:mr-2" /> : null}
            تفعيل كل الخدمات
          </Button>
          <Button component={Link as any} to="/settings/services/new" size="small" variant="contained">إضافة خدمة</Button>
            {/* --- NEW BATCH UPDATE BUTTON & DIALOG --- */}
            <BatchUpdatePricesDialog>
            <Button variant="outlined" size="small" className="h-9">
              <SlidersHorizontal className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              تحديث جماعي للأسعار
            </Button>
          </BatchUpdatePricesDialog>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <Typography variant="h6" className="flex items-center gap-2">
              <FilterIcon className="h-5 w-5 text-muted-foreground" />
              الفلاتر
            </Typography>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
              <div>
                <TextField
                  id="search-service"
                  type="search"
                  size="small"
                  label="البحث بالاسم"
                  placeholder="ابحث"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <Search className="h-4 w-4 text-muted-foreground" /> as any,
                  }}
                />
              </div>
              <div>
                <FormControl fullWidth size="small">
                  <InputLabel id="service-group-filter-label">المجموعة</InputLabel>
                  <Select
                    labelId="service-group-filter-label"
                    id="service-group-filter"
                    value={filters.service_group_id}
                    label="المجموعة"
                    onChange={(e) => handleFilterChange("service_group_id", String(e.target.value))}
                    disabled={isLoadingServiceGroups}
                  >
                    <MenuItem value="all">كل المجموعات</MenuItem>
                    {isLoadingServiceGroups && (
                      <MenuItem value="loading" disabled>
                        جاري التحميل...
                      </MenuItem>
                    )}
                    {serviceGroups.map((sg) => (
                      <MenuItem key={sg.id} value={String(sg.id)}>
                        {sg.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              {/* Add more filters here if needed e.g. status filter */}
            </div>
          </CardContent>
        </Card>

        {isFetching && (
          <div className="text-sm text-muted-foreground mb-2">
            جاري تحديث القائمة...
          </div>
        )}

        {services.length === 0 && !isLoading && !isFetching ? (
          <div className="text-center py-10 text-muted-foreground">
            لا توجد خدمات للعرض
          </div>
        ) : (
          <Card>
            <TableContainer component={Paper}>
            <Table size="small">
              {/* TableHead and TableBody */}
              <TableHead>
                <TableRow>
                  <TableCell className="w-[50px] text-center font-semibold">
                    المعرف
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    الإسم
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center font-semibold">
                    المجموعة
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    السعر
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center font-semibold">
                    نشط
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center font-semibold">
                    متغير
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    الإجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow
                    key={service.id}
                    className="hover:bg-muted transition-colors"
                  >
                    <TableCell className="text-center align-middle">
                      {service.id}
                    </TableCell>
                    <TableCell className="font-medium text-center align-middle">
                      {service.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center align-middle">
                      {service.service_group?.name ||
                        service.service_group_name ||
                        "N/A"}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      {Number(service.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center align-middle">
                      {service.activate ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center align-middle">
                      {service.variable ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      {/* MUI Menu for actions */}
                      <ActionsMenu
                        serviceId={service.id}
                        onEditLink={`/settings/services/${service.id}/edit`}
                        onManageCosts={() => handleManageCosts(service)}
                        onDelete={() => openDeleteDialog(service)}
                        isDeleting={deleteMutation.isPending && serviceToDelete?.id === service.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          </Card>
        )}
        {/* Pagination ... */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              size="small"
              variant="outlined"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isFetching}
            >
              السابق
            </Button>
            <span className="mx-2 text-sm">
              صفحة {currentPage} من {meta.last_page}
            </span>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))
              }
              disabled={currentPage === meta.last_page || isFetching}
            >
              التالي
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog ... */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف الخدمة '{serviceToDelete?.name || ''}'؟ لا يمكن التراجع عن هذا الإجراء.
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button color="error" onClick={confirmDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Service Costs Dialog ... */}
      {manageCostsState.service && (
        <ManageServiceCostsDialog
          key={`costs-dialog-${manageCostsState.service.id}`}
          isOpen={manageCostsState.isOpen}
          onOpenChange={handleManageCostsDialogClose}
          service={manageCostsState.service}
          onCostsUpdated={handleCostsUpdated}
        />
      )}
    </>
  );
}
