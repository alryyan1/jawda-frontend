// src/components/clinic/lab_requests/RequestedLabTestsTable.tsx
import React, { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// MUI replacements
import {
  Box,
  // Button,
  Checkbox,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import {
  AttachMoney as AttachMoneyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  PanTool as PanToolIcon,
} from "@mui/icons-material";

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
      toast.success("تم تحديث التفاصيل بنجاح");
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
        error.response?.data?.message || "فشل في التحديث"
      ),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: cancelLabRequest,
    onSuccess: (_, labRequestId) => {
      toast.success("تم إلغاء الطلب بنجاح");
      queryClient.setQueryData(
        requestedTestsQueryKey,
        (oldData: LabRequest[] | undefined) =>
          oldData?.filter((lr) => lr.id !== labRequestId) || []
      );
    },
    onError: (error: ApiError) =>
      toast.error(
        error.response?.data?.message || "فشل في الطلب"
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
        "هل أنت متأكد من إلغاء هذا الطلب؟"
      )
    ) {
      cancelRequestMutation.mutate(lr.id);
    }
  };

  const discountOptions = Array.from({ length: 11 }, (_, i) => i * 10); // 0% to 100%

  if (isLoading && requestedTests.length === 0) {
    return (
      <Box className="py-10 text-center h-full flex items-center justify-center">
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    // The div now uses flex-col and h-full to adapt to parent's height.
    // The table is wrapped in a ScrollArea that will take the available space.
    <div className="space-y-2 h-full flex flex-col">
      {isFetchingList && (
        <div className="text-xs text-muted-foreground p-1 text-center">
          <CircularProgress size={14} className="inline" />{" "}
          {"جاري تحديث القائمة..."}
        </div>
      )}
      {!isLoading && requestedTests.length === 0 && !isFetchingList && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center py-6">
            {"لا توجد طلبات بعد"}
          </p>
        </div>
      )}

      {requestedTests.length > 0 && (
        <TableContainer component={Paper} className="h-[400px] border rounded-md flex-grow" sx={{ direction: "rtl" }}>
          <Table size="small" className="text-xs min-w-[650px]">
            <TableHead>
              <TableRow>
                <TableCell align="center" className="min-w-[120px]">
                  {"اسم الفحص"}
                </TableCell>
                <TableCell align="center" className="w-[60px]">
                  {"السعر"}
                </TableCell>
                <TableCell align="center" className="w-[100px]">
                  {"الخصم %"}
                </TableCell>
                {isCompanyPatient && (
                  <TableCell align="center" className="w-[90px]">
                    {"التعاون"}
                  </TableCell>
                )}
                <TableCell align="center" className="w-[80px]">
                  {"المدفوع"}
                </TableCell>
                <TableCell align="center" className="w-[80px]">
                  {"طريقة الدفع"}
                </TableCell>
                <TableCell align="right" className="w-[100px]">
                  {"فتح القائمة"}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requestedTests.map((lr) => {
                const isEditingThisRow = editingRowId === lr.id;
                const currentDataForCalc = isEditingThisRow
                  ? editableRowData
                  : {};

                const price = Number(lr.price) || 0;

                const discountPerDisplay = Number(
                  currentDataForCalc.discount_per ?? lr.discount_per ?? 0
                );
                let enduranceDisplay = Number(
                  currentDataForCalc.endurance ?? lr.endurance ?? 0
                );
                if (!isCompanyPatient) enduranceDisplay = 0;
                const amountPaid = Number(lr.amount_paid) || 0;

                return (
                  <TableRow key={lr.id} className={isEditingThisRow ? "bg-muted/10" : ""}>
                    <TableCell align="center" className="py-1.5 font-medium">
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
                    <TableCell align="center" className="py-1.5">
                      {price.toFixed(1)}
                    </TableCell>
                    <TableCell align="center" className="py-1.5">
                      {isEditingThisRow ? (
                        <Select
                          value={String(editableRowData.discount_per ?? 0)}
                          onChange={(e) =>
                            setEditableRowData((d) => ({
                              ...d,
                              discount_per: parseInt(e.target.value as string),
                            }))
                          }
                          size="small"
                          sx={{ minWidth: 80 }}
                        >
                          {discountOptions.map((opt) => (
                            <MenuItem key={opt} value={String(opt)}>
                              {opt}%
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        `${discountPerDisplay}%`
                      )}
                    </TableCell>
                    {isCompanyPatient && (
                      <TableCell align="center" className="py-1.5">
                        {isEditingThisRow ? (
                          <TextField
                            type="number"
                            inputProps={{ step: "0.01" }}
                            value={editableRowData.endurance ?? ""}
                            onChange={(e) =>
                              setEditableRowData((d) => ({
                                ...d,
                                endurance: parseFloat(e.target.value) || 0,
                              }))
                            }
                            size="small"
                            className="w-20 mx-auto"
                          />
                        ) : (
                          enduranceDisplay.toFixed(1)
                        )}
                      </TableCell>
                    )}
                    <TableCell align="center" className="py-1.5 text-green-600">
                      {amountPaid.toFixed(1)}
                    </TableCell>
                    <TableCell align="center" className="py-1.5">
                      {isEditingThisRow ? (
                        <Checkbox
                          checked={!!editableRowData.is_bankak}
                          onChange={(_, checked) =>
                            setEditableRowData((d) => ({
                              ...d,
                              is_bankak: !!checked,
                            }))
                          }
                          inputProps={{ "aria-label": "طريقة الدفع بنكاك" }}
                        />
                      ) : lr.is_bankak ? (
                        "بنكاك"
                      ) : (
                        "نقدي"
                      )}
                    </TableCell>
                    <TableCell align="right" className="py-1.5">
                      <div className="flex gap-0.5 justify-end">
                        {isEditingThisRow ? (
                          <>
                            <IconButton
                              onClick={() => handleSaveEdit(lr.id)}
                              className="h-7 w-7"
                              size="small"
                              disabled={
                                updateDetailsMutation.isPending &&
                                updateDetailsMutation.variables
                                  ?.labRequestId === lr.id
                              }
                            >
                              {updateDetailsMutation.isPending &&
                              updateDetailsMutation.variables?.labRequestId ===
                                lr.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <SaveIcon as={undefined} />
                              )}
                            </IconButton>
                            <IconButton
                              onClick={() => handleCancelRequest(lr)}
                              className="h-7 w-7"
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            {!lr.is_paid ? (
                              <IconButton
                                onClick={() => onPayIndividual(lr)}
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                title={"دفع"}
                                size="small"
                              >
                                <AttachMoneyIcon as={undefined} />
                              </IconButton>
                            ) : (
                             <div className="flex gap-0.5">
                               <IconButton
                                onClick={() => onCancelIndividual(lr)}
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                title={"إزالة"}
                                size="small"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                onClick={() => onUnpayIndividual(lr)}
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                title={"إلغاء الدفع"}
                                size="small"
                              >
                                <PanToolIcon as={undefined} />
                              </IconButton>
                             </div>
                            )}
                            <IconButton
                              onClick={() => handleStartEdit(lr)}
                              className="h-7 w-7"
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                         
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};
export default RequestedLabTestsTable;
