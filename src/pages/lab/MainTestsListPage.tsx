// src/pages/lab/MainTestsListPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Edit, Trash2, MoreHorizontal, FlaskConical, CheckCircle2, XCircle, Search } from 'lucide-react';

import { getMainTests, deleteMainTest } from '@/services/mainTestService';
// import { useAuthorization } from '@/hooks/useAuthorization';

interface MainTestWithContainer {
  id: number;
  main_test_name: string;
  container_name?: string;
  container?: {
    container_name: string;
  };
  price?: string | number;
  available: boolean;
}

export default function MainTestsListPage() {
  const queryClient = useQueryClient();
  // const { can } = useAuthorization();
  const canCreateTests = true; // Placeholder: can('create lab_tests');
  const canEditTests = true;   // Placeholder: can('edit lab_tests');
  const canDeleteTests = true; // Placeholder: can('delete lab_tests');

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['mainTests', currentPage, debouncedSearchTerm],
    queryFn: () => getMainTests(currentPage, { search: debouncedSearchTerm }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMainTest,
    onSuccess: () => {
      toast.success('تم حذف الاختبار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mainTests'] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('خطأ في حذف الاختبار', { description: err.response?.data?.message || err.message });
    },
  });

  const handleDelete = (testId: number, testName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الاختبار "${testName}"؟`)) {
      deleteMutation.mutate(testId);
    }
  };

  if (isLoading && !isFetching && currentPage === 1) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> جاري تحميل الاختبارات...</div>;
  if (error) return <p className="text-destructive p-4">خطأ في تحميل قائمة الاختبارات: {(error as Error).message}</p>;

  const tests = (paginatedData?.data || []) as MainTestWithContainer[];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">قائمة الاختبارات الرئيسية</h1>
        </div>
        <div className="flex sm:flex-row flex-col w-full sm:w-auto gap-2">
            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                <Input
                type="search"
                placeholder="البحث في الاختبارات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10 rtl:pr-10 h-9"
                />
                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {canCreateTests && (
                <Button asChild size="sm" className="h-9"><Link to="/settings/laboratory/new">إضافة اختبار</Link></Button>
            )}
        </div>
      </div>
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">جاري تحديث القائمة...</div>}
      
      {!isLoading && tests.length === 0 ? (
        <Card className="text-center py-10 text-muted-foreground">
            <CardContent>
                <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>{searchTerm ? 'لم يتم العثور على نتائج' : 'لا توجد اختبارات'}</p>
                {canCreateTests && !searchTerm && (
                    <Button asChild size="sm" className="mt-4"><Link to="/settings/laboratory/new">إضافة اختبار</Link></Button>
                )}
            </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">المعرف</TableHead>
                <TableHead className="text-center">اسم الاختبار</TableHead>
                <TableHead className="hidden sm:table-cell text-center">الوعاء</TableHead>
                <TableHead className="text-center hidden md:table-cell">السعر</TableHead>
                <TableHead className="text-center">متاح</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium text-center">{test.id}</TableCell>
                  <TableCell className="font-medium text-center">{test.main_test_name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center">{test.container?.container_name || test.container_name || '-'}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{test.price ? Number(test.price).toFixed(2) : '-'}</TableCell>
                  <TableCell className="text-center">
                    {test.available ? 
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" aria-label="نشط" /> : 
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" aria-label="غير نشط" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu dir="rtl">
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditTests && <DropdownMenuItem asChild><Link to={`/settings/laboratory/${test.id}/edit`} className="flex items-center w-full"><Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" /> تعديل</Link></DropdownMenuItem>}
                        {canDeleteTests && (
                            <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(test.id, test.main_test_name)} className="text-destructive focus:text-destructive" disabled={deleteMutation.isPending && deleteMutation.variables === test.id}>
                                <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                                حذف
                            </DropdownMenuItem>
                            </>
                        )}
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
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
          >
            السابق
          </Button>
          <span className="mx-4 self-center">
            صفحة {currentPage} من {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))}
            disabled={currentPage === meta.last_page || isLoading}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}