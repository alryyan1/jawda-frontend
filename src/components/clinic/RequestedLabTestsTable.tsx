// src/components/clinic/lab_requests/RequestedLabTestsTable.tsx
import React, { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Edit,
  Save,
  Trash,
  Hand,
} from "lucide-react";

import type { LabRequest } from "@/types/visits";
import type { Patient } from "@/types/patients";
import type { Shift } from "@/types/shifts";
import {
  cancelLabRequest,
  updateLabRequestDetails,
} from "@/services/labRequestService";

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface RequestedLabTestsTableProps {
  visitId: number;
  patientId: number; // Still needed for context or display if required
  currentPatient: Patient | null; // Pass the full patient object
  requestedTests: LabRequest[];
  isLoading: boolean;
  isFetchingList: boolean;
  currentClinicShift: Shift | null;
  onAddMoreTests: () => void; // Kept if parent still wants to control a button near this table
  onPayIndividual: (labRequest: LabRequest) => void; // Callback to trigger payment in parent
  onCancelIndividual: (labRequest: LabRequest) => void; // Callback to trigger cancellation in parent
  onUnpayIndividual: (labRequest: LabRequest) => void; // Callback to trigger unpayment in parent
}

interface RowEditData {
  discount_per?: number;
  endurance?: number;
  is_bankak?: boolean;
}

const RequestedLabTestsTable: React.FC<RequestedLabTestsTableProps> = ({
  visitId,
  currentPatient,
  requestedTests,
  isLoading,
  isFetchingList,
  onPayIndividual,
  onCancelIndividual,
  onUnpayIndividual,
}) => {
  const queryClient = useQueryClient();

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editableRowData, setEditableRowData] = useState<RowEditData>({});

  const isCompanyPatient = !!currentPatient?.company_id;

  const requestedTestsQueryKey = ["labRequestsForVisit", visitId] as const;

  const updateDetailsMutation = useMutation({
    mutationFn: (params: {
      labRequestId: number;
      data: Partial<
        Pick<LabRequest, "discount_per" | "endurance" | "is_bankak">
      >;
    }) => updateLabRequestDetails(params.labRequestId, params.data),
    onSuccess: (updatedLabRequest) => {
      toast.success("detailsUpdatedSuccess");
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
        error.response?.data?.message || "error.updateFailed"
      ),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: cancelLabRequest,
    onSuccess: (_, labRequestId) => {
      toast.success("request.cancelledSuccess");
      queryClient.setQueryData(
        requestedTestsQueryKey,
        (oldData: LabRequest[] | undefined) =>
          oldData?.filter((lr) => lr.id !== labRequestId) || []
      );
    },
    onError: (error: ApiError) =>
      toast.error(
        error.response?.data?.message || "error.requestFailed"
      ),
  });

  const handleStartEdit = (lr: LabRequest) => {
    setEditingRowId(lr.id);
    setEditableRowData({
      discount_per: lr.discount_per || 0,
      endurance: lr.endurance || 0,
      is_bankak: lr.is_bankak || false,
    });
  };

  const handleSaveEdit = (labRequestId: number) => {
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

  const handleCancelRequest = (lr: LabRequest) => {
    if (
      window.confirm(
        "request.cancelConfirmForItem"
      )
    ) {
      cancelRequestMutation.mutate(lr.id);
    }
  };

  const discountOptions = Array.from({ length: 11 }, (_, i) => i * 10); // 0% to 100%

  if (isLoading && requestedTests.length === 0) {
    return (
      <div className="py-10 text-center h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // The div now uses flex-col and h-full to adapt to parent's height.
    // The table is wrapped in a ScrollArea that will take the available space.
    <div className="space-y-2 h-full flex flex-col">
      {isFetchingList && (
        <div className="text-xs text-muted-foreground p-1 text-center">
          <Loader2 className="inline h-3 w-3 animate-spin" />{" "}
          {"جاري تحديث القائمة..."}
        </div>
      )}
      {!isLoading && requestedTests.length === 0 && !isFetchingList && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center py-6">
            {"request.noRequestsYet"}
          </p>
        </div>
      )}

      {requestedTests.length > 0 && (
        // ScrollArea directly wraps the Table container, and `flex-grow` allows it to expand.
        <ScrollArea
          className="h-[400px] border rounded-md flex-grow"
          style={{ direction: "rtl" }}
        >
          <Table className="text-xs min-w-[650px]">
            {" "}
            {/* min-w to ensure table content isn't too squished before scroll */}
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px] text-center">
                  {"table.testName"}
                </TableHead>
                <TableHead className="text-center w-[60px]">
                  {"table.price"}
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  {"table.discountPercentageShort"}
                </TableHead>
                {isCompanyPatient && (
                  <TableHead className="text-center w-[90px]">
                    {"table.endurance"}
                  </TableHead>
                )}
                <TableHead className="text-center w-[80px]">
                  {"table.netPriceShort"}
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  {"table.amountPaid"}
                </TableHead>
                <TableHead className="text-center hidden md:table-cell w-[90px]">
                  {"table.statusPayment"}
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  {"table.paymentMethodShort"}
                </TableHead>
                <TableHead className="text-right w-[100px]">
                  {"فتح القائمة"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestedTests.map((lr) => {
                const isEditingThisRow = editingRowId === lr.id;
                const currentDataForCalc = isEditingThisRow
                  ? editableRowData
                  : {};

                const price = Number(lr.price) || 0;
                const itemSubTotal = price; // Lab tests typically have count 1

                const discountPerDisplay = Number(
                  currentDataForCalc.discount_per ?? lr.discount_per ?? 0
                );
                const discountAmount =
                  (itemSubTotal * discountPerDisplay) / 100;

                let enduranceDisplay = Number(
                  currentDataForCalc.endurance ?? lr.endurance ?? 0
                );
                if (!isCompanyPatient) enduranceDisplay = 0;

                const netPrice = itemSubTotal - discountAmount - enduranceDisplay;
                const amountPaid = Number(lr.amount_paid) || 0;
                // const balance = netPrice - amountPaid;
                // const canBeCancelled = !lr.is_paid; // Simple cancellation logic for now

                return (
                  <TableRow
                    key={lr.id}
                    className={
                      isEditingThisRow ? "bg-muted/10" : ""
                    }
                  >
                    <TableCell className="py-1.5 font-medium text-center">
                      {lr.main_test?.main_test_name || "جاري التحميل..."}
                      {lr.comment && (
                        <p
                          className="text-[10px] text-muted-foreground italic truncate"
                          title={lr.comment}
                        >
                          ({lr.comment})
                        </p>
                      )}
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
                          dir="rtl"
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
                        <span className="text-green-600 font-medium">
                          {"status.paid"}
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          {"status.pending"}
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
                          aria-label={"paymentMethodBankak"}
                        />
                      ) : lr.is_bankak ? (
                        "bankShort"
                      ) : (
                        "cashShort"
                      )}
                    </TableCell>
                    <TableCell className="text-right py-1.5">
                      <div className="flex gap-0.5 justify-end">
                        {isEditingThisRow ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEdit(lr.id)}
                              className="h-7 w-7"
                              disabled={
                                updateDetailsMutation.isPending &&
                                updateDetailsMutation.variables
                                  ?.labRequestId === lr.id
                              }
                            >
                              {updateDetailsMutation.isPending &&
                              updateDetailsMutation.variables?.labRequestId ===
                                lr.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCancelRequest(lr)}
                              className="h-7 w-7"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {!lr.is_paid ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onPayIndividual(lr)}
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                title={"pay"}
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            ) : (
                             <div className="flex gap-0.5">
                               <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onCancelIndividual(lr)}
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                title={"remove"}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onUnpayIndividual(lr)}
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                title={"unpay"}
                              >
                                <Hand className="h-4 w-4" />
                              </Button>
                             </div>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEdit(lr)}
                              className="h-7 w-7"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                         
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
      )}
    </div>
  );
};
export default RequestedLabTestsTable;
