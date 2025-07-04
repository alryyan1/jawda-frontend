// src/pages/services/ServicesListPage.tsx
import React, { useState, useCallback, useEffect } from "react"; // Added useEffect
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getServices, deleteService } from "@/services/serviceService";
import { getServiceGroupsList } from "@/services/serviceGroupService"; // IMPORT
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardHeader, CardTitle for filter card
import { Input } from "@/components/ui/input"; // IMPORT
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // IMPORT
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
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
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import type { Service } from "@/types/services";
import ManageServiceCostsDialog from "./ManageServiceCostsDialog";
import { useDebounce } from "@/hooks/useDebounce"; // IMPORT
import { Label } from "../ui/label";
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
  const { t, i18n } = useTranslation(["services", "common"]);
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
      toast.success(t("services:deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error(t("services:deleteError"), {
        description:
          err.message ||
          err.response?.data?.message ||
          t("common:error.generic"),
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
        toast.error(t('common:export.failed'), {
          description: 'Popup blocked. Please allow popups for this site.',
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
      toast.error(t('common:export.failed'), {
        description: errorMessage,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };
  // Handler for the export button
  const handleExport = async () => {
    setIsExporting(true);
    toast.info(t('common:export.starting'));
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
      toast.success(t('common:export.success'));
    } catch (error: unknown) {
      console.error("Export failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { message?: string } })?.data?.message 
        : error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Export failed';
      toast.error(t('common:export.failed'), {
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };
  // --- NEW HANDLER FOR COST DETAILS EXPORT ---
  const handleExportWithCosts = async () => {
    setIsExportingCosts(true);
    toast.info(t('common:export.starting'));
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
      toast.success(t('common:export.success'));
    } catch (error: unknown) {
      console.error("Export with costs failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { message?: string } })?.data?.message 
        : error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Export failed';
      toast.error(t('common:export.failed'), {
        description: errorMessage,
      });
    } finally {
      setIsExportingCosts(false);
    }
  };
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

  const handleFilterChange = (name: keyof ServiceFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading && !isFetching && currentPage === 1)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        {t("services:loadingServices")}
      </div>
    );
  if (error)
    return (
      <p className="text-destructive p-4">
        {t("services:errorFetchingServices", { message: error.message })}
      </p>
    );

  const services = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <>
      <div
        style={{ direction: i18n.dir() }}
        className="container mx-auto py-4 sm:py-6 lg:py-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("services:pageTitle")}
          </h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportPdf} disabled={isExportingPdf} size="sm">
              {t("common:exportPdf")}
            </Button> 
          </div>
          <Button onClick={handleExport} disabled={isExporting} size="sm">
            {t("common:export")}
          </Button>
          <Button onClick={handleExportWithCosts} disabled={isExportingCosts} size="sm">
            {t("common:exportWithCosts")}
          </Button>
          <Button asChild size="sm">
            <Link to="/settings/services/new">
              {t("services:addServiceButton")}
            </Link>
          </Button>
            {/* --- NEW BATCH UPDATE BUTTON & DIALOG --- */}
            <BatchUpdatePricesDialog>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
            >
              <SlidersHorizontal className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t('actions.batchUpdatePrices')}
            </Button>
          </BatchUpdatePricesDialog>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FilterIcon className="h-5 w-5 text-muted-foreground" />
              {t("common:filters")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="search-service" className="text-xs">
                  {t("common:searchByName")}
                </Label>
                <div className="relative">
                  <Input
                    id="search-service"
                    type="search"
                    placeholder={t("common:searchPlaceholder")}
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="ps-10 rtl:pr-10 h-9"
                  />
                  <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label htmlFor="service-group-filter" className="text-xs">
                  {t("services:table.group")}
                </Label>
                <Select
                  value={filters.service_group_id}
                  onValueChange={(value) =>
                    handleFilterChange("service_group_id", value)
                  }
                  dir={i18n.dir()}
                  disabled={isLoadingServiceGroups}
                >
                  <SelectTrigger id="service-group-filter" className="h-9">
                    <SelectValue placeholder={t("services:form.selectGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common:allGroups")}</SelectItem>
                    {isLoadingServiceGroups && (
                      <SelectItem value="loading" disabled>
                        {t("common:loading")}
                      </SelectItem>
                    )}
                    {serviceGroups.map((sg) => (
                      <SelectItem key={sg.id} value={String(sg.id)}>
                        {sg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Add more filters here if needed e.g. status filter */}
            </div>
          </CardContent>
        </Card>

        {isFetching && (
          <div className="text-sm text-muted-foreground mb-2">
            {t("common:updatingList")}
          </div>
        )}

        {services.length === 0 && !isLoading && !isFetching ? (
          <div className="text-center py-10 text-muted-foreground">
            {t("services:noServicesFound")}
          </div>
        ) : (
          <Card>
            <Table>
              {/* TableHeader and TableBody remain the same */}
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    {t("services:table.id")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("services:table.name")}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center">
                    {t("services:table.group")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("services:table.price")}
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    {t("services:table.active")}
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    {t("services:table.variable")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("services:table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
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
                      <DropdownMenu dir={i18n.dir()}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              to={`/settings/services/${service.id}/edit`}
                              className="flex items-center w-full"
                            >
                              <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                              {t("common:edit")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleManageCosts(service)}
                            className="flex items-center w-full"
                          >
                            <Settings2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />{" "}
                            {t("services:manageCosts")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              openDeleteDialog(service);
                            }}
                            className="text-destructive focus:text-destructive flex items-center w-full"
                            disabled={
                              deleteMutation.isPending &&
                              serviceToDelete?.id === service.id
                            }
                          >
                            {deleteMutation.isPending &&
                            serviceToDelete?.id === service.id ? (
                              <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                            )}
                            {t("common:delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        {/* Pagination ... */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isFetching}
            >
              {t("common:previous")}
            </Button>
            <span className="mx-2 text-sm">
              {t("common:page")} {currentPage} {t("common:of")} {meta.last_page}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))
              }
              disabled={currentPage === meta.last_page || isFetching}
            >
              {t("common:next")}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog ... */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("services:deleteConfirmTitle", {
                name: serviceToDelete?.name || "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("services:deleteConfirmText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {t("common:cancel")}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t("common:delete")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
