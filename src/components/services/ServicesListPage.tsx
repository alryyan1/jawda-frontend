// src/pages/services/ServicesListPage.tsx
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getServices, deleteService } from '@/services/serviceService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, Loader2, CheckCircle2, XCircle, Settings2 } from 'lucide-react'; // Added Settings2 for costs
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import type { Service } from '@/types/services'; // Ensure Service type is imported
import ManageServiceCostsDialog from './ManageServiceCostsDialog';

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function ServicesListPage() {
  const { t, i18n } = useTranslation(['services', 'common']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null); // Store full service object for name

  // NEW STATE for managing Service Costs Dialog
  const [manageCostsState, setManageCostsState] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({
    isOpen: false,
    service: null
  });

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['services', currentPage],
    queryFn: () => getServices(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) => deleteService(serviceId),
    onSuccess: () => {
      toast.success(t('services:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error(t('services:deleteError'), { description: err.message || err.response?.data?.message || t('common:error.generic') });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
  });

  const openDeleteDialog = (service: Service) => { // Pass full service object
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteMutation.mutate(serviceToDelete.id);
    }
  };

  // NEW: Handler to open manage costs dialog
  const handleManageCosts = useCallback((service: Service) => {
    setManageCostsState({
      isOpen: true,
      service
    });
  }, []);

  // NEW: Handler for dialog close
  const handleManageCostsDialogClose = useCallback((open: boolean) => {
    if (!open) {
      // Use setTimeout to prevent state update during render
      setTimeout(() => {
        setManageCostsState(prev => ({
          ...prev,
          isOpen: false
        }));
        // Clear the service after dialog animation completes
        setTimeout(() => {
          setManageCostsState({
            isOpen: false,
            service: null
          });
        }, 300);
      }, 0);
    }
  }, []);

  const handleCostsUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['services', currentPage] });
  }, [queryClient, currentPage]);

  if (isLoading && !isFetching) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('services:loadingServices')}</div>;
  if (error) return <p className="text-destructive p-4">{t('services:errorFetchingServices', { message: error.message })}</p>;

  const services = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <>
      <div style={{direction: i18n.dir()}} className="container mx-auto py-4 sm:py-6 lg:py-8">
        {/* ... (header and other UI elements remain the same) ... */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('services:pageTitle')}</h1>
          <Button asChild size="sm"><Link to="/settings/services/new">{t('services:addServiceButton')}</Link></Button> {/* Corrected Link */}
        </div>
        {isFetching && <div className="text-sm text-muted-foreground mb-2">{t('common:updatingList')}</div>}
        
        {services.length === 0 && !isLoading ? (
          <div className="text-center py-10 text-muted-foreground">{t('services:noServicesFound')}</div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">{t('services:table.id')}</TableHead>
                  <TableHead className="text-center">{t('services:table.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">{t('services:table.group')}</TableHead>
                  <TableHead className="text-center">{t('services:table.price')}</TableHead>
                  <TableHead className="hidden md:table-cell text-center">{t('services:table.active')}</TableHead>
                  <TableHead className="hidden md:table-cell text-center">{t('services:table.variable')}</TableHead>
                  <TableHead className="text-center">{t('services:table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} className="hover:bg-muted transition-colors">
                    <TableCell className="text-center align-middle">{service.id}</TableCell>
                    <TableCell className="font-medium text-center align-middle">{service.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center align-middle">{service.service_group?.name || service.service_group_name || 'N/A'}</TableCell>
                    <TableCell className="text-center align-middle">{Number(service.price).toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell text-center align-middle">
                      {service.activate ? 
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center align-middle">
                      {service.variable ? 
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <DropdownMenu dir={i18n.dir()}>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/settings/services/${service.id}/edit`} className="flex items-center w-full"> {/* Corrected Link */}
                              <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> {t('common:edit')}
                            </Link>
                          </DropdownMenuItem>
                           {/* NEW: Manage Costs Item */}
                           <DropdownMenuItem onClick={() => handleManageCosts(service)} className="flex items-center w-full">
                            <Settings2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> {t('services:manageCosts')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={e => {
                              e.preventDefault();
                              openDeleteDialog(service); // Pass full service object
                            }}
                            className="text-destructive focus:text-destructive flex items-center w-full"
                            // disabled={deleteMutation.isPending && deleteMutation.variables === service.id} // This check needs adjustment if serviceToDelete is an object
                            disabled={deleteMutation.isPending && serviceToDelete?.id === service.id}
                          >
                            {deleteMutation.isPending && serviceToDelete?.id === service.id ? <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />}
                            {t('common:delete')}
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
        {/* Pagination */}
        {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
            <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                {t('common:previous')}
            </Button>
            <span className="mx-2 text-sm">
                {t('common:page')} {currentPage} {t('common:of')} {meta.last_page}
            </span>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))}
                disabled={currentPage === meta.last_page}
            >
                {t('common:next')}
            </Button>
            </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('services:deleteConfirmTitle', { name: serviceToDelete?.name || '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('services:deleteConfirmText')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t('common:cancel')}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('common:delete')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Service Costs Dialog */}
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