// src/pages/settings/ServiceGroupsPage.tsx
// Or if you prefer: src/pages/settings/service-groups/ServiceGroupsListPage.tsx

import React, { useState, useEffect } from "react"; // Added useEffect
// Removed i18n for visible labels where applicable
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Added CardDescription, CardHeader, CardTitle
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
  Loader2,
  Edit,
  Trash2,
  MoreHorizontal,
  PlusCircle,
  Search,
  Layers,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { ServiceGroup } from "@/types/services";
import type { PaginatedResponse } from "@/types/common";
import {
  getServiceGroupsPaginated,
  deleteServiceGroup,
} from "@/services/serviceGroupService";
import ManageServiceGroupDialog from "@/components/settings/service_groups/ManageServiceGroupDialog"; // Adjust path if needed
import { useDebounce } from "@/hooks/useDebounce"; // Import useDebounce

const ServiceGroupsPage: React.FC = () => {
  // const { t, i18n } = useTranslation(["settings", "common"]);
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search term

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [editingServiceGroup, setEditingServiceGroup] =
    useState<ServiceGroup | null>(null);
  const [serviceGroupIdToDelete, setServiceGroupIdToDelete] = useState<
    number | null
  >(null);

  // Reset page to 1 when debouncedSearchTerm changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const queryKey = [
    "serviceGroupsPaginated",
    currentPage,
    debouncedSearchTerm,
  ] as const;
  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<ServiceGroup>, Error>({
    queryKey,
    queryFn: () => getServiceGroupsPaginated(currentPage, debouncedSearchTerm),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServiceGroup,
    onSuccess: () => {
      toast.success('تم حذف المجموعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ["serviceGroupsPaginated"] });
      queryClient.invalidateQueries({ queryKey: ["allServiceGroupsList"] }); // For dropdowns in other forms
      setServiceGroupIdToDelete(null);
      // If current page becomes empty after deletion, try to go to previous page
      if (paginatedData?.data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', {
        description: err.response?.data?.message || err.message,
      });
      setServiceGroupIdToDelete(null);
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingServiceGroup(null);
    setIsManageDialogOpen(true);
  };

  const handleOpenEditDialog = (group: ServiceGroup) => {
    setEditingServiceGroup(group);
    setIsManageDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    // Optionally refetch the current page if a create/update happened
    // queryClient.invalidateQueries({ queryKey });
    // For create, it might be better to go to page 1 or last page to see new item
    // For simplicity, current invalidation in mutation should suffice.
  };

  const serviceGroups = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  if (isLoading && !isFetching && currentPage === 1 && !debouncedSearchTerm) {
    // Show loader on initial full load
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-destructive">فشل الجلب</CardTitle>
        </CardHeader>
        <CardContent>
          <p>حدث خطأ أثناء جلب البيانات: {error.message}</p>
          <Button
            onClick={() => queryClient.refetchQueries({ queryKey })}
            className="mt-4"
          >
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-1 md:p-0">
      
      {/* Remove padding for page, add to container if needed */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Layers className="h-7 w-7 text-primary hidden sm:block" />
          <div>
            <h1 className="text-2xl font-bold">مجموعات الخدمات</h1>
            <p className="text-sm text-muted-foreground">إدارة مجموعات الخدمات</p>
          </div>
        </div>
        <div className="flex sm:flex-row flex-col w-full sm:w-auto gap-2 self-stretch sm:self-center">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-60">
            <Input
              type="search"
              aria-label={'ابحث باسم المجموعة'}
              placeholder={'ابحث'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10 rtl:pr-10 h-9"
            />
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {/* Add permission check: can('manage service_groups') */}
          <Button onClick={handleOpenCreateDialog} size="sm" className="h-9">
            <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            إضافة مجموعة
          </Button>
        </div>
      </div>
      {isFetching && (
        <div className="text-xs text-muted-foreground text-center py-1">جاري تحديث القائمة...</div>
      )}
      {!isLoading && serviceGroups.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="flex flex-col items-center">
            <Layers className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold mb-1">{debouncedSearchTerm ? 'لا توجد نتائج' : 'لا توجد مجموعات'}</h3>
            <p className="text-sm text-muted-foreground mb-4">{debouncedSearchTerm ? 'جرّب كلمات أخرى' : 'أضف أول مجموعة للبدء'}</p>
            {!debouncedSearchTerm && (
              <Button onClick={handleOpenCreateDialog} size="sm">
                <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                إضافة مجموعة
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          
          {/* Add overflow-hidden if table has rounded corners */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">المعرف</TableHead>
                <TableHead className="text-center">الإسم</TableHead>
                {/* Default LTR align */}
                <TableHead className="text-center hidden sm:table-cell w-[150px]">عدد الخدمات</TableHead>
                <TableHead className="text-center w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceGroups.map((group) => (
                <TableRow key={group.id} className="hover:bg-muted/50 text-center">
                  <TableCell className="font-medium text-center">
                    {group.id}
                  </TableCell>
                  <TableCell className="text-center">
                    {group.name}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {group.services_count ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 data-[state=open]:bg-muted"
                        >
                          <span className="sr-only">فتح القائمة</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Add permission check: can('manage service_groups') */}
                        <DropdownMenuItem
                          onClick={() => handleOpenEditDialog(group)}
                          className="cursor-pointer"
                        >
                          <Edit className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setServiceGroupIdToDelete(group.id)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                          حذف
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
        <div className="flex items-center justify-center pt-4 gap-2">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
            size="sm"
            variant="outline"
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {meta.current_page} من {meta.last_page}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage === meta.last_page || isFetching}
            size="sm"
            variant="outline"
          >
            التالي
          </Button>
        </div>
      )}
      <ManageServiceGroupDialog
        isOpen={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        serviceGroup={editingServiceGroup}
        onSuccess={handleDialogSuccess}
      />
      <AlertDialog
        open={!!serviceGroupIdToDelete}
        onOpenChange={(open) => !open && setServiceGroupIdToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المجموعة '{serviceGroups.find((g) => g.id === serviceGroupIdToDelete)?.name || ''}'؟ هذا الإجراء لا يمكن التراجع عنه.
              <br />
              <span className="font-semibold text-destructive">سيتم حذف جميع الخدمات المرتبطة إن وُجدت.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                serviceGroupIdToDelete &&
                deleteMutation.mutate(serviceGroupIdToDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default ServiceGroupsPage;
