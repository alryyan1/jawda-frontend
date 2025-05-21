// src/pages/doctors/DoctorsListPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getDoctors, deleteDoctor } from '../../services/doctorService';
import { Doctor, PaginatedDoctorsResponse } from '../../types/doctors'; // Assuming Doctor includes specialist_name
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, Eye, Loader2, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from '@/components/ui/card';
import i18n from '@/i18n';


export default function DoctorsListPage() {
  const { t } = useTranslation(['doctors', 'common']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({ // v5 syntax
    queryKey: ['doctors', currentPage], 
    queryFn: () => getDoctors(currentPage),
    placeholderData: keepPreviousData, // v5 syntax for keepPreviousData
  });

  const deleteMutation = useMutation({ // v5 syntax
    mutationFn: deleteDoctor,
    onSuccess: () => {
      toast.success(t('doctors:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['doctors'] }); // v5 syntax for invalidate
    },
    onError: (err: any) => {
        toast.error(t('doctors:deleteError'), { description: err.message || t('common:error.generic')});
    }
  });

  const handleDelete = (id: number) => {
    // Use shadcn dialog for confirmation later if desired
    if (window.confirm(t('doctors:deleteConfirmText'))) {
      deleteMutation.mutate(id);
    }
  };

  const getInitials = (name?: string | null) => { /* ... same getInitials function ... */
    if (!name) return "DR";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
     if (names[0]) {
        return names[0][0].toUpperCase();
    }
    return 'DR';
  };
  
  const getImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '/storage/') || '/storage/';
    return `${baseUrl}${imagePath}`;
  };


  if (isLoading && !isFetching) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('doctors:loadingDoctors')}</div>;
  if (error) return <p className="text-destructive p-4">{t('doctors:errorFetchingDoctors', { message: error.message })}</p>;

  const doctors = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('doctors:pageTitle')}</h1>
        <Button asChild size="sm">
          <Link to="/doctors/new">{t('doctors:addDoctorButton')}</Link>
        </Button>
      </div>

      {isFetching && <div className="text-sm text-muted-foreground mb-2">{t('common:updatingList')}</div>}
      
      {doctors.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground">{t('doctors:noDoctorsFound')}</div>
      ) : (
        <Card>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px] text-center">{t('doctors:table.image')}</TableHead>
                    <TableHead className='text-center'>{t('doctors:table.name')}</TableHead>
                    <TableHead className="hidden md:table-cell text-center">{t('doctors:table.phone')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">{t('doctors:table.specialist')}</TableHead>
                    <TableHead className="text-center">{t('doctors:table.actions')}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {doctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                    <TableCell>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={getImageUrl(doctor.image)} alt={doctor.name} />
                            <AvatarFallback>{getInitials(doctor.name)}</AvatarFallback>
                        </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-center">{doctor.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">{doctor.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center">{doctor.specialist?.name || doctor.specialist_name || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                        <DropdownMenu dir={i18n.dir()}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t('common:actions.openMenu')}</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                            <Link to={`/doctors/${doctor.id}/edit`} className="flex items-center w-full">
                                <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> {t('common:edit')}
                            </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                            onClick={() => handleDelete(doctor.id)}
                            className="text-destructive focus:text-destructive flex items-center w-full"
                            disabled={deleteMutation.isPending && deleteMutation.variables === doctor.id}
                            >
                            {deleteMutation.isPending && deleteMutation.variables === doctor.id 
                                ? <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin"/> 
                                : <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                            }
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

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1 || isFetching}
            size="sm"
            variant="outline"
          >
            {t('common:pagination.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common:pagination.pageInfo', { current: meta.current_page, total: meta.last_page })}
          </span>
          <Button 
            onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} 
            disabled={currentPage === meta.last_page || isFetching}
            size="sm"
            variant="outline"
          >
            {t('common:pagination.next')}
          </Button>
        </div>
      )}
    </div>
  );
}