// src/components/clinic/ManageServiceDepositsDialog.tsx
import React, { useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2, Save, Info } from "lucide-react";

import type {
  RequestedService,
  RequestedServiceDeposit,
  RequestedServiceDepositFormData,
} from "@/types/services";

import { useAuth } from "@/contexts/AuthContext";
import { 
  createRequestedServiceDeposit, 
  updateRequestedServiceDeposit,
  deleteRequestedServiceDeposit, 
  getDepositsForRequestedService 
} from "@/services/requestedServiceDepositService";

// Form interfaces
interface DepositItemFormValues {
  amount: string;
  is_bank: boolean;
  user_name?: string;
  created_at_formatted?: string;
}

interface ManageDepositsFormValues {
  deposits: DepositItemFormValues[];
}

interface ManageServiceDepositsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestedService: RequestedService;
  onAllDepositsUpdated?: () => void; // Callback after any CUD operation
}

interface ApiError {
  response?: { data?: { message?: string } };
}

const ManageServiceDepositsDialog: React.FC<ManageServiceDepositsDialogProps> = ({
  isOpen,
  onOpenChange,
  requestedService,
  onAllDepositsUpdated,
}) => {
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();
  
  const dateLocale = useMemo(() => 
    "ar".startsWith("ar") ? arSA : enUS,
    ["ar"]
  );

  const depositsQueryKey = useMemo(() => 
    ["depositsForRequestedService", requestedService.id] as const,
    [requestedService.id]
  );

  const requestedServicesQueryKey = useMemo(() => 
    ["requestedServicesForVisit", requestedService.doctorvisits_id] as const,
    [requestedService.doctorvisits_id]
  );

  // Initialize form with empty deposits
  const defaultValues = useMemo(() => ({ deposits: [] }), []);
  
  const form = useForm<ManageDepositsFormValues>({
    defaultValues: { deposits: [] },
  });

  const { control, reset, getValues } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "deposits",
    keyName: "fieldId",
  });

  // Query for deposits
  const { data: existingDeposits = [], isLoading: isLoadingDeposits } = useQuery<RequestedServiceDeposit[], Error>({
    queryKey: depositsQueryKey,
    queryFn: () => getDepositsForRequestedService(requestedService.id),
    enabled: isOpen && !!requestedService.id,
    gcTime: 0,
    refetchOnWindowFocus: false,
    // Prevent automatic refetching
    staleTime: Infinity,
    // Only refetch when explicitly invalidated
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Format deposits for form
  const formattedDeposits = useMemo(() => {
    if (!Array.isArray(existingDeposits)) return [];
    return existingDeposits.map(dep => ({
      id: dep.id,
      amount: String(dep.amount),
      is_bank: dep.is_bank,
      user_name: dep.user?.name || "غير معروف",
      created_at_formatted: dep.created_at
        ? format(new Date(dep.created_at), "Pp", { locale: dateLocale })
        : "-",
    }));
  }, [existingDeposits, dateLocale]);

  // Handle form reset when dialog opens/closes or deposits change
  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (formattedDeposits.length > 0) {
      reset({
        deposits: formattedDeposits
      });
    }
  }, [isOpen, formattedDeposits, reset, defaultValues]);

  // Memoize the query invalidation function
  const handleQueryInvalidation = useCallback(() => {
    if (!isOpen) return;
    
    // Use a timeout to prevent immediate state updates
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: depositsQueryKey });
      queryClient.invalidateQueries({ queryKey: requestedServicesQueryKey });
      if (onAllDepositsUpdated) onAllDepositsUpdated();
    }, 0);
  }, [queryClient, depositsQueryKey, requestedServicesQueryKey, onAllDepositsUpdated, isOpen]);

  // Mutations
  const createMutation = useMutation<RequestedServiceDeposit, ApiError, Omit<RequestedServiceDepositFormData, "id">>({
    mutationFn: (data) => createRequestedServiceDeposit(requestedService.id, data),
    onSuccess: () => {
      toast.success("تم إضافة الدفعة بنجاح");
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || "فشل إنشاء الدفعة"),
  });

  const updateMutation = useMutation<RequestedServiceDeposit, ApiError, RequestedServiceDepositFormData>({
    mutationFn: (data) => updateRequestedServiceDeposit(data.id!, data),
    onSuccess: () => {
      toast.success("تم تحديث الدفعة بنجاح");
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || "فشل تحديث الدفعة"),
  });

  const deleteMutation = useMutation<void, ApiError, number>({
    mutationFn: (depositId) => deleteRequestedServiceDeposit(depositId),
    onSuccess: () => {
      toast.success("تم حذف الدفعة بنجاح");
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || "فشل في الحذف"),
  });

  const handleSaveRow = useCallback((index: number) => {
    if (!isOpen) return;

    form.trigger(`deposits.${index}`).then((isValid) => {
      if (!isValid) {
        toast.error("تحقق من وجود أخطاء في الصف");
        return;
      }

      const rowData = getValues(`deposits.${index}`);
      
      if (!currentClinicShift?.id && !rowData.id) {
        toast.error("لا توجد وردية نشطة للدفع");
        return;
      }

      const payload: RequestedServiceDepositFormData = {
        id: rowData.id || undefined,
        amount: rowData.amount,
        is_bank: rowData.is_bank,
      };

      if (rowData.id) {
        updateMutation.mutate(payload);
      } else {
        createMutation.mutate(payload as Omit<RequestedServiceDepositFormData, "id">);
      }
    });
  }, [getValues, currentClinicShift?.id, updateMutation, createMutation, form, isOpen]);

  const addNewDepositField = useCallback(() => {
    if (!isOpen) return;

    append({
      amount: "0.00",
      is_bank: false,
      user_name: "إدخال جديد",
      created_at_formatted: format(new Date(), "Pp", { locale: dateLocale }),
    });
  }, [append, dateLocale, isOpen]);

  const handleDelete = useCallback((fieldItem: { id?: number | null }, index: number) => {
    if (!isOpen) return;

    if (fieldItem.id) {
      deleteMutation.mutate(Number(fieldItem.id));
    } else {
      remove(index);
    }
  }, [deleteMutation, remove, isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {"إدارة دفعات الخدمة"}
          </DialogTitle>
          <DialogDescription>
            {"أضف وعدّل واحذف دفعات الخدمة"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDeposits ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex-grow flex flex-col overflow-hidden"
            >
              <ScrollArea
                style={{ direction: true }}
                className="flex-grow pr-1 -mr-2"
              >
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info size={24} className="mx-auto mb-2" />
                    {"لا توجد دفعات"}
                  </div>
                )}
                {fields.length > 0 && (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px] text-center">
                          {"المبلغ"}
                        </TableHead>
                        <TableHead className="w-[100px] text-center">
                          {"طريقة الدفع"}
                        </TableHead>
                        <TableHead className="hidden sm:table-cell text-center">
                          {"المستخدم"}
                        </TableHead>
                        <TableHead className="hidden sm:table-cell text-center">
                          {"التاريخ والوقت"}
                        </TableHead>
                        <TableHead className="w-[80px] text-center">
                          {"إجراءات"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((fieldItem, index) => (
                        <TableRow key={fieldItem.fieldId}>
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`deposits.${index}.amount`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  {...f}
                                  step="0.01"
                                  className="h-7 text-xs text-center"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`deposits.${index}.is_bank`}
                              render={({ field: f }) => (
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={f.value}
                                    onCheckedChange={f.onChange}
                                    id={`is_bank_${index}`}
                                  />
                                  <label
                                    htmlFor={`is_bank_${index}`}
                                    className="text-xs ltr:ml-2 rtl:mr-2"
                                  >
                                    {f.value
                                      ? "تحويل بنكي"
                                      : "نقدي"}
                                  </label>
                                </div>
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1 hidden sm:table-cell text-center">
                            {fieldItem.user_name}
                          </TableCell>
                          <TableCell className="py-1 hidden sm:table-cell text-center">
                            {fieldItem.created_at_formatted}
                          </TableCell>
                          <TableCell className="py-1 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleSaveRow(index)}
                              disabled={
                                createMutation.isPending ||
                                updateMutation.isPending
                              }
                            >
                              {createMutation.isPending ||
                              updateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(fieldItem, index)}
                              disabled={
                                deleteMutation.isPending &&
                                deleteMutation.variables ===
                                  Number(fieldItem.id)
                              }
                            >
                              {deleteMutation.isPending &&
                              deleteMutation.variables ===
                                Number(fieldItem.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
              <div className="pt-2 flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewDepositField}
                  className="text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />{" "}
                  {"إضافة دفعة"}
                </Button>
              </div>
              <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {"إغلاق"}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default ManageServiceDepositsDialog;
