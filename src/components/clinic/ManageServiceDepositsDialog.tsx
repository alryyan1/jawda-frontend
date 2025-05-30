// src/components/clinic/ManageServiceDepositsDialog.tsx
import React, { useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
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

// Zod schema for a single deposit item in the form
const depositItemSchema = z.object({
  id: z.number().optional().nullable(),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number.",
    }),
  is_bank: z.boolean(),
  user_name: z.string().optional(),
  created_at_formatted: z.string().optional(),
});

const manageDepositsSchema = z.object({
  deposits: z.array(depositItemSchema),
});
type ManageDepositsFormValues = z.infer<typeof manageDepositsSchema>;

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
  const { t, i18n } = useTranslation(["payments", "common", "services"]);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();
  
  const dateLocale = useMemo(() => 
    i18n.language.startsWith("ar") ? arSA : enUS,
    [i18n.language]
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
    resolver: zodResolver(manageDepositsSchema),
    defaultValues,
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
      user_name: dep.user?.name || t("common:unknown"),
      created_at_formatted: dep.created_at
        ? format(new Date(dep.created_at), "Pp", { locale: dateLocale })
        : "-",
    }));
  }, [existingDeposits, t, dateLocale]);

  // Handle form reset when dialog opens/closes or deposits change
  useEffect(() => {
    if (!isOpen) {
      reset(defaultValues);
      return;
    }

    if (formattedDeposits.length > 0) {
      reset({ deposits: formattedDeposits });
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
      toast.success(t("payments:depositAddedSuccess"));
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("common:error.createFailed")),
  });

  const updateMutation = useMutation<RequestedServiceDeposit, ApiError, RequestedServiceDepositFormData>({
    mutationFn: (data) => updateRequestedServiceDeposit(data.id!, data),
    onSuccess: () => {
      toast.success(t("payments:depositUpdatedSuccess"));
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("common:error.updateFailed")),
  });

  const deleteMutation = useMutation<void, ApiError, number>({
    mutationFn: (depositId) => deleteRequestedServiceDeposit(depositId),
    onSuccess: () => {
      toast.success(t("payments:depositDeletedSuccess"));
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("common:error.deleteFailed")),
  });

  const handleSaveRow = useCallback((index: number) => {
    if (!isOpen) return;

    form.trigger(`deposits.${index}`).then((isValid) => {
      if (!isValid) {
        toast.error(t("common:validation.checkErrorsInRow"));
        return;
      }

      const rowData = getValues(`deposits.${index}`);
      
      if (!currentClinicShift?.id && !rowData.id) {
        toast.error(t("payments:error.noActiveShiftForPayment"));
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
  }, [getValues, currentClinicShift?.id, t, updateMutation, createMutation, form, isOpen]);

  const addNewDepositField = useCallback(() => {
    if (!isOpen) return;

    append({
      amount: "0.00",
      is_bank: false,
      user_name: t("common:newEntry"),
      created_at_formatted: format(new Date(), "Pp", { locale: dateLocale }),
    });
  }, [append, t, dateLocale, isOpen]);

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
            {t("payments:manageDepositsDialog.title", {
              serviceName: requestedService.service?.name || "Service",
            })}
          </DialogTitle>
          <DialogDescription>
            {t("payments:manageDepositsDialog.description", {
              totalPaid: Number(requestedService.amount_paid).toFixed(2),
            })}
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
                style={{ direction: i18n.dir() }}
                className="flex-grow pr-1 -mr-2"
              >
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info size={24} className="mx-auto mb-2" />
                    {t("payments:manageDepositsDialog.noDeposits")}
                  </div>
                )}
                {fields.length > 0 && (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px] text-center">
                          {t("payments:table.amount")}
                        </TableHead>
                        <TableHead className="w-[100px] text-center">
                          {t("payments:table.method")}
                        </TableHead>
                        <TableHead className="hidden sm:table-cell text-center">
                          {t("payments:table.user")}
                        </TableHead>
                        <TableHead className="hidden sm:table-cell text-center">
                          {t("payments:table.dateTime")}
                        </TableHead>
                        <TableHead className="w-[80px] text-center">
                          {t("common:actions.openMenu")}
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
                                      ? t("payments:bankShort")
                                      : t("payments:cashShort")}
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
                  {t("payments:manageDepositsDialog.addDepositButton")}
                </Button>
              </div>
              <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("common:close")}
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
