import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getServices, deleteService } from '@/services/serviceService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
// Shadcn AlertDialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ServicesListPage() {
  const { t, i18n } = useTranslation(['services', 'common']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // For AlertDialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['services', currentPage],
    queryFn: () => getServices(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast.success(t('services:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (err: any) => {
      toast.error(t('services:deleteError'), { description: err.message || t('common:error.generic') });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
  });

  const openDeleteDialog = (id: number) => {
    setServiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete !== null) {
      deleteMutation.mutate(serviceToDelete);
    }
  };

  if (isLoading && !isFetching) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('services:loadingServices')}</div>;
  if (error) return <p className="text-destructive p-4">{t('services:errorFetchingServices', { message: error.message })}</p>;

  const services = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('services:pageTitle')}</h1>
        <Button asChild size="sm"><Link to="/services/new">{t('services:addServiceButton')}</Link></Button>
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
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild></DropdownMenuItem>
                          <Link to={`/services/${service.id}/edit`} className="flex items-center w-full">
                            <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> {t('common:edit')}
                          </Link>
                      
                        <DropdownMenuSeparator />
                        <AlertDialog open={deleteDialogOpen && serviceToDelete === service.id} onOpenChange={setDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={e => {
                                e.preventDefault();
                                openDeleteDialog(service.id);
                              }}
                              className="text-destructive focus:text-destructive flex items-center w-full"
                              disabled={deleteMutation.isPending && deleteMutation.variables === service.id}
                            >
                              {deleteMutation.isPending && deleteMutation.variables === service.id ? <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />}
                              {t('common:delete')}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('services:deleteConfirmTitle', { name: service.name })}</AlertDialogTitle>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
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
  );
}