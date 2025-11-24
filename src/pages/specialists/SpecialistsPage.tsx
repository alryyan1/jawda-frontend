// src/pages/specialists/SpecialistsPage.tsx (New File)
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Edit, Trash2, MoreHorizontal, Stethoscope, PlusCircle, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getSpecialistsPaginated, deleteSpecialist } from '@/services/specialistService';
import ManageSpecialistDialog from '@/components/specialists/ManageSpecialistDialog';
import type { Specialist, SubSpecialist } from '@/types/doctors';
import type { PaginatedResponse } from '@/types/common';
import { getSubSpecialists } from '@/services/subSpecialistService';
import ManageSubSpecialistsDialog from '@/components/specialists/ManageSubSpecialistsDialog';

const SpecialistsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [specialistToEdit, setSpecialistToEdit] = useState<Specialist | null>(null);
  const [specialistToDelete, setSpecialistToDelete] = useState<Specialist | null>(null);
  const [specialistForSubSpecialists, setSpecialistForSubSpecialists] = useState<Specialist | null>(null);
  const [isSubSpecialistsDialogOpen, setIsSubSpecialistsDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1); // Reset page on new search
  }, [debouncedSearchTerm]);

  const queryKey = ['specialists', currentPage, debouncedSearchTerm] as const;
  const { data: paginatedData, isLoading, isFetching } = useQuery<PaginatedResponse<Specialist>, Error>({
    queryKey,
    queryFn: () => getSpecialistsPaginated(currentPage, { search: debouncedSearchTerm }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSpecialist,
    onSuccess: () => {
      toast.success("تم حذف الاختصاص بنجاح!");
      setSpecialistToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['specialists'] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "فشل حذف الاختصاص.");
      setSpecialistToDelete(null);
    },
  });

  const handleOpenDialog = (specialist: Specialist | null = null) => {
    setSpecialistToEdit(specialist);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['specialists'] });
    queryClient.invalidateQueries({ queryKey: ['specialistsList'] }); // Invalidate simple list too
  };

  const handleOpenSubSpecialistsDialog = (specialist: Specialist) => {
    setSpecialistForSubSpecialists(specialist);
    setIsSubSpecialistsDialogOpen(true);
  };

  const specialists = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <>
      <div className="container mx-auto py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
              <Stethoscope className="h-7 w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">إدارة الاختصاصات</h1>
          </div>
          <div className="flex sm:flex-row flex-col w-full sm:w-auto gap-2">
              <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                  <Input
                    type="search"
                    placeholder="ابحث بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-10 rtl:pr-10 h-9"
                  />
                  <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button onClick={() => handleOpenDialog()} size="sm" className="h-9">
                  <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة اختصاص
              </Button>
          </div>
        </div>
        
        {isLoading && !isFetching && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        {isFetching && <div className="text-sm text-center py-1 text-muted-foreground">جاري تحديث القائمة...</div>}

        {!isLoading && specialists.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">لا توجد نتائج</p>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">م</TableHead>
                  <TableHead className="text-center">الاسم</TableHead>
                  <TableHead className="text-center">عدد الأطباء</TableHead>
                  <TableHead className="text-center">الاختصاصات الفرعية</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialists.map((spec) => {
                  return (
                    <TableRow key={spec.id}>
                      <TableCell className="font-medium text-center">{spec.id}</TableCell>
                      <TableCell className="text-center">{spec.name}</TableCell>
                      <TableCell className="text-center">{spec.doctors_count}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSubSpecialistsDialog(spec)}
                          className="h-8"
                        >
                          إدارة الاختصاصات الفرعية
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(spec)}><Edit className="ltr:mr-2 rtl:ml-2 h-4 w-4" />تعديل</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSpecialistToDelete(spec)} className="text-destructive focus:text-destructive"><Trash2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-center mt-6 gap-2">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching} size="sm" variant="outline">السابق</Button>
            <span className="text-sm text-muted-foreground">{`صفحة ${currentPage} من ${meta.last_page}`}</span>
            <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching} size="sm" variant="outline">التالي</Button>
          </div>
        )}
      </div>

      <ManageSpecialistDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        specialistToEdit={specialistToEdit}
        onSuccess={handleSuccess}
      />

      <ManageSubSpecialistsDialog
        isOpen={isSubSpecialistsDialogOpen}
        onOpenChange={setIsSubSpecialistsDialogOpen}
        specialist={specialistForSubSpecialists}
      />

      <AlertDialog open={!!specialistToDelete} onOpenChange={(open) => !open && setSpecialistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {`هل أنت متأكد من حذف الاختصاص '${specialistToDelete?.name}'؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => specialistToDelete && deleteMutation.mutate(specialistToDelete.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default SpecialistsPage;