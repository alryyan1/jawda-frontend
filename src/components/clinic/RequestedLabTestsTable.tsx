import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Trash2,
  DollarSign,
  PlusCircle,
  Edit,
} from "lucide-react";

import type { LabRequest } from "@/types/visits";
import type { Patient } from "@/types/patients";
import type { Shift } from "@/types/shifts";
import {
  cancelLabRequest,
  updateLabRequestDetails,
  recordDirectLabRequestPayment,
} from "@/services/labRequestService";
import { getPatientById } from "@/services/patientService";

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface RequestedLabTestsTableProps {
  visitId: number;
  patientId: number;
  requestedTests: LabRequest[];
  isLoading: boolean;
  isFetchingList: boolean;
  currentClinicShift: Shift | null;
  onAddMoreTests: () => void;
  onPayIndividual: (labRequest: LabRequest) => void;
}

// For managing local edit state of a row's editable fields
interface RowEditData {
  discount_per?: number;
  endurance?: number;
  is_bankak?: boolean;
}

const RequestedLabTestsTable: React.FC<RequestedLabTestsTableProps> = ({
  visitId,
  patientId,
  requestedTests,
  isLoading,
  isFetchingList,
  currentClinicShift,
  onAddMoreTests,
  onPayIndividual,
}) => {
  const { t, i18n } = useTranslation(["labTests", "common", "payments"]);
  const queryClient = useQueryClient();

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editableRowData, setEditableRowData] = useState<RowEditData>({});

  // Fetch patient details to check for company_id for conditional endurance column
  const { data: currentPatient } = useQuery<Patient, Error>({
    queryKey: ["patientDetailsForLabTable", patientId],
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId,
  });
  const isCompanyPatient = !!currentPatient?.company_id;

  const requestedTestsQueryKey = ["labRequestsForVisit", visitId] as const;
  const availableTestsQueryKey = [
    "availableLabTestsForVisit",
    visitId,
  ] as const;

  // --- Mutations ---
  const updateDetailsMutation = useMutation({
    mutationFn: (params: {
      labRequestId: number;
      data: Partial<
        Pick<LabRequest, "discount_per" | "endurance" | "is_bankak">
      >;
    }) => updateLabRequestDetails(params.labRequestId, params.data),
    onSuccess: (updatedLabRequest) => {
      toast.success(t("common:detailsUpdatedSuccess"));
      queryClient.setQueryData(
        requestedTestsQueryKey,
        (oldData: LabRequest[] | undefined) =>
          oldData?.map((lr) =>
            lr.id === updatedLabRequest.id ? updatedLabRequest : lr
          ) || []
      );
      setEditingRowId(null);
    },
    onError: (error: ApiError) =>
      toast.error(
        error.response?.data?.message || t("common:error.updateFailed")
      ),
  });

  const directPayMutation = useMutation({
    mutationFn: (params: {
      labRequestId: number;
      is_bankak: boolean;
    }) =>
      recordDirectLabRequestPayment(params.labRequestId, {
        is_bankak: params.is_bankak,
      }),
    onSuccess: (updatedLabRequest) => {
      toast.success(t("payments:paymentSuccess"));
      queryClient.setQueryData(
        requestedTestsQueryKey,
        (oldData: LabRequest[] | undefined) =>
          oldData?.map((lr) =>
            lr.id === updatedLabRequest.id ? updatedLabRequest : lr
          ) || []
      );
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    },
    onError: (error: ApiError) =>
      toast.error(error.response?.data?.message || t("payments:paymentError")),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: cancelLabRequest,
    onSuccess: (data, labRequestId) => {
      toast.success(t("labTests:request.cancelledSuccess"));
      queryClient.setQueryData(
        requestedTestsQueryKey,
        (oldData: LabRequest[] | undefined) =>
          oldData?.filter((lr) => lr.id !== labRequestId) || []
      );
      queryClient.invalidateQueries({ queryKey: availableTestsQueryKey });
    },
    onError: (error: ApiError) =>
      toast.error(
        error.response?.data?.message || t("common:error.requestFailed")
      ),
  });

  // --- Event Handlers ---
  const handleStartEdit = (lr: LabRequest) => {
    setEditingRowId(lr.id);
    setEditableRowData({
      discount_per: lr.discount_per || 0,
      endurance: lr.endurance || 0,
      is_bankak: lr.is_bankak || false,
    });
  };
  const handleCancelEdit = () => setEditingRowId(null);

  const handleSaveEdit = (labRequestId: number) => {
    // Ensure numeric parsing if your service layer doesn't handle string numbers
    const payload: Partial<
      Pick<LabRequest, "discount_per" | "endurance" | "is_bankak">
    > = {
      discount_per: Number(editableRowData.discount_per ?? 0),
      is_bankak: !!editableRowData.is_bankak,
    };
    if (isCompanyPatient && editableRowData.endurance !== undefined) {
      payload.endurance = Number(editableRowData.endurance ?? 0);
    }
    updateDetailsMutation.mutate({ labRequestId, data: payload });
  };

  const handleDirectPay = (lr: LabRequest) => {
    // if (!currentClinicShift?.id) {
    //   toast.error(t("payments:error.noActiveShiftForPayment"));
    //   return;
    // }
    const isBankakForThisPayment =
      editingRowId === lr.id ? !!editableRowData.is_bankak : !!lr.is_bankak;

    const balance = calculateItemBalance(lr);
    if (
      window.confirm(
        t("payments:confirmDirectPayLab", {
          amount: balance.toFixed(1),
          testName: lr.main_test?.main_test_name,
        })
      )
    ) {
      directPayMutation.mutate({
        labRequestId: lr.id,
        is_bankak: isBankakForThisPayment,
      });
      onPayIndividual(lr);
    }
  };

  const handleCancelRequest = (lr: LabRequest) => {
    if (
      window.confirm(
        t("labTests:request.cancelConfirmForItem", {
          itemName: lr.main_test?.main_test_name || t("common:test"),
        })
      )
    ) {
      cancelRequestMutation.mutate(lr.id);
    }
  };

  const calculateItemBalance = (
    lr: LabRequest,
    overrideData?: RowEditData
  ): number => {
    const price = Number(lr.price) || 0;
    const itemSubTotal = price;

    const discountPerToUse =
      overrideData && overrideData.discount_per !== undefined
        ? overrideData.discount_per
        : Number(lr.discount_per) || 0;
    const discountAmount = (itemSubTotal * discountPerToUse) / 100;

    let enduranceToUse =
      overrideData && overrideData.endurance !== undefined
        ? overrideData.endurance
        : Number(lr.endurance) || 0;

    if (!isCompanyPatient) enduranceToUse = 0;

    const netPrice = itemSubTotal - discountAmount - enduranceToUse;
    return netPrice - (Number(lr.amount_paid) || 0);
  };

  const discountOptions = Array.from({ length: 11 }, (_, i) => i * 10); // 0% to 100%

  if (isLoading && requestedTests.length === 0) {
    return (
      <div className="py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-semibold">
          {t("labTests:request.currentRequestsTitle")}
        </h3>
        <Button
          onClick={onAddMoreTests}
          variant="outline"
          size="sm"
          className="h-8"
        >
          <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />{" "}
          {t("labTests:request.addMoreTestsButton")}
        </Button>
      </div>

      {isFetchingList && (
        <div className="text-xs text-muted-foreground p-1 text-center">
          <Loader2 className="inline h-3 w-3 animate-spin" />{" "}
          {t("common:updatingList")}
        </div>
      )}
      {!isLoading && requestedTests.length === 0 && !isFetchingList && (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("labTests:request.noRequestsYet")}
        </p>
      )}

      {requestedTests.length > 0 && (
        <Card>
          <ScrollArea className="h-auto max-h-[300px] sm:max-h-[400px] border rounded-md">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">
                    {t("labTests:table.testName")}
                  </TableHead>
                  <TableHead className="text-center w-[60px]">
                    {t("labTests:table.price")}
                  </TableHead>
                  <TableHead className="text-center w-[100px]">
                    {t("labTests:table.discountPercentageShort")}
                  </TableHead>
                  {isCompanyPatient && (
                    <TableHead className="text-center w-[90px]">
                      {t("labTests:table.endurance")}
                    </TableHead>
                  )}
                  <TableHead className="text-center w-[80px]">
                    {t("labTests:table.netPriceShort")}
                  </TableHead>
                  <TableHead className="text-center w-[80px]">
                    {t("labTests:table.amountPaid")}
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell w-[90px]">
                    {t("labTests:table.statusPayment")}
                  </TableHead>
                  <TableHead className="text-center w-[80px]">
                    {t("labTests:table.paymentMethodShort")}
                  </TableHead>
                  <TableHead className="text-right w-[100px]">
                    {t("common:actions.openMenu")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedTests.map((lr) => {
                  const isEditingThisRow = editingRowId === lr.id;
                  const currentDataForCalc = isEditingThisRow
                    ? editableRowData
                    : lr;

                  const price = Number(lr.price) || 0;
                  const itemSubTotal = price;

                  const discountPerDisplay = Number(
                    currentDataForCalc.discount_per ?? lr.discount_per ?? 0
                  );
                  const discountAmount =
                    (itemSubTotal * discountPerDisplay) / 100;

                  let enduranceDisplay = Number(
                    currentDataForCalc.endurance ?? lr.endurance ?? 0
                  );
                  if (!isCompanyPatient) enduranceDisplay = 0;

                  const netPrice =
                    itemSubTotal - discountAmount - enduranceDisplay;
                  const amountPaid = Number(lr.amount_paid) || 0;
                  const balance = netPrice - amountPaid;
                  const canBeCancelled = !lr.is_paid;

                  return (
                    <TableRow
                      key={lr.id}
                      className={
                        isEditingThisRow ? "bg-muted dark:bg-muted/20" : ""
                      }
                    >
                      <TableCell className="py-1.5 font-medium">
                        {lr.main_test?.main_test_name || "..."}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        {price.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        {isEditingThisRow ? (
                          <Select
                            value={String(editableRowData.discount_per ?? 0)}
                            onValueChange={(val) =>
                              setEditableRowData((d) => ({
                                ...d,
                                discount_per: parseInt(val),
                              }))
                            }
                            dir={i18n.dir()}
                          >
                            <SelectTrigger className="h-7 text-xs px-1 w-20 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {discountOptions.map((opt) => (
                                <SelectItem key={opt} value={String(opt)}>
                                  {opt}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          `${discountPerDisplay}%`
                        )}
                      </TableCell>
                      {isCompanyPatient && (
                        <TableCell className="text-center py-1.5">
                          {isEditingThisRow ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editableRowData.endurance ?? ""}
                              onChange={(e) =>
                                setEditableRowData((d) => ({
                                  ...d,
                                  endurance: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="h-7 w-20 mx-auto text-xs px-1"
                            />
                          ) : (
                            enduranceDisplay.toFixed(1)
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center py-1.5 font-semibold">
                        {netPrice.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-green-600">
                        {amountPaid.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell py-1.5">
                        {lr.is_paid ? (
                          <span className="text-green-600">
                            {t("payments:paid")}
                          </span>
                        ) : (
                          <span className="text-amber-600">
                            {t("payments:pending")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        {isEditingThisRow ? (
                          <Checkbox
                            checked={!!editableRowData.is_bankak}
                            onCheckedChange={(checked) =>
                              setEditableRowData((d) => ({
                                ...d,
                                is_bankak: !!checked,
                              }))
                            }
                          />
                        ) : lr.is_bankak ? (
                          t("payments:bankShort")
                        ) : (
                          t("payments:cashShort")
                        )}
                      </TableCell>
                      <TableCell className="text-right py-1.5">
                        <div className="flex gap-1 justify-end">
                        
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                onClick={() => handleDirectPay(lr)}
                                title={t("common:pay")}
                                disabled={
                                  directPayMutation.isPending &&
                                  directPayMutation.variables
                                    ?.labRequestId === lr.id
                                }
                              >
                                {directPayMutation.isPending &&
                                directPayMutation.variables?.labRequestId ===
                                  lr.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <DollarSign className="h-4 w-4" />
                                )}
                              </Button>
                            
                          {isEditingThisRow ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveEdit(lr.id)}
                                className="h-7 w-7"
                                disabled={updateDetailsMutation.isPending}
                              >
                                {updateDetailsMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-7 w-7"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleStartEdit(lr)}
                                className="h-7 w-7"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {canBeCancelled && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleCancelRequest(lr)}
                                  disabled={
                                    cancelRequestMutation.isPending &&
                                    cancelRequestMutation.variables === lr.id
                                  }
                                  title={t("common:cancelRequest")}
                                >
                                  {cancelRequestMutation.isPending &&
                                  cancelRequestMutation.variables === lr.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default RequestedLabTestsTable;
