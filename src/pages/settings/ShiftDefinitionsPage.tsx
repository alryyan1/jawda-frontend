// src/pages/settings/attendance/ShiftDefinitionsPage.tsx
import React, { useState } from "react";
// Removed i18n for visible labels in this page where feasible
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  Clock3,
  CheckCircle,
  XCircle,
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
import { Badge } from "@/components/ui/badge"; // For active status

import type { ShiftDefinition } from "@/types/attendance";
import ManageShiftDefinitionDialog from "@/components/settings/attendance/ManageShiftDefinitionDialog";
import { getActiveShiftDefinitionsList } from "@/services/shiftDefinitionService";

// 

const deleteShiftDefinition = async (id: number): Promise<void> => {
  // Mock implementation
  console.log('Deleting shift definition:', id);
  return Promise.resolve();
};

const ShiftDefinitionsPage: React.FC = () => {
  // const { t, i18n } = useTranslation(["attendance", "settings", "common"]);
  const queryClient = useQueryClient();

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [editingShiftDef, setEditingShiftDef] =
    useState<ShiftDefinition | null>(null);
  const [shiftDefIdToDelete, setShiftDefIdToDelete] = useState<number | null>(
    null
  );

  const queryKey = ["shiftDefinitions"] as const; // Fetch all, usually not too many
  const {
    data: shiftDefinitions = [],
    isLoading,
    error,
    isFetching,
  } = useQuery<ShiftDefinition[], Error>({
    queryKey,
    queryFn: () => getActiveShiftDefinitionsList(), // Fetch all (active and inactive)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteShiftDefinition(id),
    onSuccess: () => {
      toast.success('تم حذف المناوبة بنجاح');
      queryClient.invalidateQueries({ queryKey });
      setShiftDefIdToDelete(null);
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'فشل الحذف';
      toast.error(errorMessage);
      setShiftDefIdToDelete(null);
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingShiftDef(null);
    setIsManageDialogOpen(true);
  };

  const handleOpenEditDialog = (shiftDef: ShiftDefinition) => {
    setEditingShiftDef(shiftDef);
    setIsManageDialogOpen(true);
  };

  if (isLoading && !isFetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-destructive p-4">فشل جلب البيانات: {error.message}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Clock3 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">تعريفات المناوبات</h1>
            <p className="text-sm text-muted-foreground">إدارة تعريفات المناوبات في النظام</p>
          </div>
        </div>
        {/* Add permission check: can('manage attendance_settings') */}
        <Button onClick={handleOpenCreateDialog} size="sm" className="h-9">
          <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          إضافة مناوبة
        </Button>
      </div>

      {isFetching && (
        <div className="text-xs text-muted-foreground text-center mb-2">
          جاري تحديث القائمة...
        </div>
      )}

      {!isLoading && shiftDefinitions.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="flex flex-col items-center">
            <Clock3 className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold mb-1">لا توجد تعريفات</h3>
            <p className="text-sm text-muted-foreground mb-4">أضف أول تعريف مناوبة لبدء الاستخدام</p>
            <Button onClick={handleOpenCreateDialog} size="sm">
              <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              إضافة مناوبة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-center">
                  الرمز
                </TableHead>
                <TableHead className="text-center">
                  الإسم
                </TableHead>
                <TableHead className="text-center w-[120px]">
                  وقت البدء
                </TableHead>
                <TableHead className="text-center w-[120px]">
                  وقت الانتهاء
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  المدة (س)
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  الحالة
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftDefinitions.map((def) => (
                <TableRow key={def.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-center">
                    {def.shift_label}
                  </TableCell>
                  <TableCell
                    className="text-center"
                  >
                    {def.name}
                  </TableCell>
                  <TableCell className="text-center">
                    {def.start_time}
                  </TableCell>
                  <TableCell className="text-center">{def.end_time}</TableCell>
                  <TableCell className="text-center">
                    {def.duration_hours?.toFixed(1) ?? "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={def.is_active ? "success" : "outline"}
                      className="text-xs"
                    >
                      {def.is_active ? (
                        <CheckCircle className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                      ) : (
                        <XCircle className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                      )}
                      {def.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenEditDialog(def)}
                        >
                          <Edit className="ltr:mr-2 rtl:ml-2 h-4 w-4" />{" "}
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShiftDefIdToDelete(def.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />{" "}
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
      {/* No pagination for this list as it's usually short */}

      <ManageShiftDefinitionDialog
        isOpen={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        shiftDefinition={editingShiftDef}
        onSuccess={() => queryClient.invalidateQueries({ queryKey })}
      />

      <AlertDialog
        open={!!shiftDefIdToDelete}
        onOpenChange={(open) => !open && setShiftDefIdToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المناوبة '{shiftDefinitions.find((g) => g.id === shiftDefIdToDelete)?.name || ''}'؟ هذا الإجراء لا يمكن التراجع عنه.
              <br />
              <span className="font-semibold text-destructive">سيتم حذف جميع البيانات المرتبطة بهذه المناوبة.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                shiftDefIdToDelete && deleteMutation.mutate(shiftDefIdToDelete)
              }
              className="bg-destructive hover:bg-destructive/90"
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
export default ShiftDefinitionsPage;
