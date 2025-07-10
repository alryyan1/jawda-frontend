import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  Activity,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Banknote,
  PrinterIcon,
} from "lucide-react";

// Services & Types
import { 
  clearPendingLabRequestsForVisit,
  unpayLabRequest,
  recordDirectLabRequestPayment,
  updateAllLabRequestsBankak
} from "@/services/labRequestService";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import BatchLabPaymentDialog from "@/components/clinic/BatchLabPaymentDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

interface LabRequestsColumnProps {
  activeVisitId: number | null;
  visit?: DoctorVisit;
  isLoading?: boolean;
  onPrintReceipt: () => void;
}

const LabRequestsColumn: React.FC<LabRequestsColumnProps> = ({
  activeVisitId,
  visit,
  isLoading,
  onPrintReceipt,
}) => {
  const { t } = useTranslation(["labReception", "common", "clinic", "labTests", "payments"]);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  // State for dialogs
  const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Update discount mutation
  const updateDiscountMutation = useMutation({
    mutationFn: async ({ requestId, discount }: { requestId: number; discount: number }) => {
      const response = await apiClient.patch(`/labrequests/${requestId}/discount`, { 
        discount_per: discount 
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(t("labRequestsColumn.discountUpdated", "Discount updated successfully"));
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.updateFailed")
      );
    },
  });

  // Toggle bankak mutation
  const toggleBankakMutation = useMutation({
    mutationFn: async ({ requestId, isBankak }: { requestId: number; isBankak: boolean }) => {
      const response = await apiClient.patch(`/labrequests/${requestId}/toggle-bankak`, { 
        is_bankak: isBankak 
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(t("labRequestsColumn.bankakUpdated", "Payment method updated successfully"));
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.updateFailed")
      );
    },
  });

  // Delete lab request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiClient.delete(`/labrequests/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t("labRequestsColumn.requestDeletedSuccessfully", "Lab request deleted successfully"));
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.deleteFailed")
      );
    },
  });

  // Remove all pending lab requests mutation
  const removeAllPendingMutation = useMutation({
    mutationFn: () => clearPendingLabRequestsForVisit(activeVisitId!),
    onSuccess: (result) => {
      toast.success(
        t("labTests:request.removedAllSuccess", {
          count: result.deleted_count,
        })
      );
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.requestFailed")
      );
    },
  });

  // Unpay lab request mutation
  const unpayLabRequestMutation = useMutation({
    mutationFn: (labRequestId: number) => unpayLabRequest(labRequestId),
    onSuccess: () => {
      toast.success(t("labTests:request.unpaidSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.requestFailed")
      );
    },
  });

  // Direct pay item mutation
  const directPayItemMutation = useMutation({
    mutationFn: (params: {
      labRequestId: number;
      is_bankak: boolean;
      shift_id: number;
    }) =>
      recordDirectLabRequestPayment(params.labRequestId, {
        is_bankak: params.is_bankak,
      }),
    onSuccess: () => {
      toast.success(t("payments:paymentRecordedSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("payments:error.paymentFailed")
      );
    },
  });

  // Update all lab requests bankak mutation
  const updateAllBankakMutation = useMutation({
    mutationFn: (isBankak: boolean) => updateAllLabRequestsBankak(activeVisitId!, isBankak),
    onSuccess: () => {
      toast.success(t("labRequestsColumn.bankakUpdatedAll", "All lab requests marked as Bankak"));
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.requestFailed")
      );
    },
  });

  const handleDiscountChange = (requestId: number, discount: string) => {
    updateDiscountMutation.mutate({ requestId, discount: parseInt(discount) });
  };

  const handleToggleBankak = (requestId: number, isBankak: boolean) => {
    toggleBankakMutation.mutate({ requestId, isBankak });
  };

  const handleDeleteRequest = (requestId: number) => {
    if (window.confirm(t("labRequestsColumn.confirmDeleteRequest", "Are you sure you want to delete this lab request?"))) {
      deleteRequestMutation.mutate(requestId);
    }
  };

  const handleRemoveAllPending = () => {
    if (window.confirm(t("labRequestsColumn.confirmRemoveAllPending", "Are you sure you want to remove all pending lab requests?"))) {
      removeAllPendingMutation.mutate();
    }
  };

  const handleUnpayLabRequest = (requestId: number) => {
    if (window.confirm(t("labRequestsColumn.confirmUnpayLabRequest", "Are you sure you want to unpay this lab request?"))) {
      unpayLabRequestMutation.mutate(requestId);
    }
  };

  const handleDirectPayItem = (requestId: number, isBankak: boolean) => {
    if (!currentClinicShift) {
      toast.error(t("common:error.noActiveShift"));
      return;
    }
    directPayItemMutation.mutate({
      labRequestId: requestId,
      is_bankak: isBankak,
      shift_id: currentClinicShift.id,
    });
  };

  const handleUpdateAllBankak = () => {
    if (window.confirm(t("labRequestsColumn.confirmUpdateAllBankak", "Are you sure you want to mark all lab requests as Bankak?"))) {
      updateAllBankakMutation.mutate(true);
    }
  };

  const calculateDiscountedAmount = (price: number, discountPer: number) => {
    return price - (price * discountPer / 100);
  };

  const generateDiscountOptions = () => {
    const options: React.ReactNode[] = [];
    // Only specific discount values: 10%, 20%, 30%, 40%, 50%, 100%
    const discountValues = [0,10, 20, 30, 40, 50, 100];
    
    discountValues.forEach(value => {
      options.push(
        <SelectItem key={value} value={value.toString()}>
          {value}%
        </SelectItem>
      );
    });
    return options;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("common:loading")}...
          </p>
        </div>
      </div>
    );
  }

  // No active visit state
  if (!activeVisitId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <div className="text-center space-y-4">
          <Activity className="h-16 w-16 mx-auto opacity-30" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {t("selectPatient", "Select a patient")}
            </p>
            <p className="text-sm max-w-xs mx-auto leading-relaxed">
              {t("selectPatientDesc", "Choose a patient from the queue to view their lab requests")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Print Receipt and Remove All Pending buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Button
            onClick={onPrintReceipt}
            variant="outline"
            size="sm"
            disabled={visit?.lab_requests?.length === 0}
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('common:printReceipt')}</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRemoveAllPending}

            //add red border
            className="  hover:bg-red-600 hover:text-white !border-red-200 !border-2"
            size="sm"
            disabled={removeAllPendingMutation.isPending || (visit?.lab_requests?.length ?? 0) === 0}
          >
            {removeAllPendingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">{t("labRequestsColumn.removeAllTests", "Remove All Tests")}</span>
          </Button>
          
          <Button
            onClick={handleUpdateAllBankak}
            variant="outline"
            size="sm"
            disabled={updateAllBankakMutation.isPending || (visit?.lab_requests?.length ?? 0) === 0}
          >
            {updateAllBankakMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Banknote className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">{t("labRequestsColumn.markAllAsBankak", "Mark All as Bankak")}</span>
          </Button>
        </div>
      </div>

      {/* Lab Requests Table */}
      <div className="flex-1 overflow-hidden">
        {visit?.lab_requests?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                  {t("labRequestsColumn.noLabRequests", "No lab requests found")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  {t("labRequestsColumn.addTestsToStart", "Add tests to get started")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">{t("labRequestsColumn.testName", "Test Name")}</TableHead>
                  <TableHead className="min-w-[80px] hidden sm:table-cell">{t("labRequestsColumn.price", "Price")}</TableHead>
                  {!visit?.patient?.company && (
                    <TableHead className="min-w-[100px] hidden md:table-cell">{t("labRequestsColumn.discount", "Discount")}</TableHead>
                  )}
                  {!visit?.patient?.company && (
                    <TableHead className="min-w-[80px]">{t("labRequestsColumn.amount", "Amount")}</TableHead>
                  )}
                  {visit?.patient?.company && (
                    <TableHead className="min-w-[100px] text-red-600">{t("labRequestsColumn.payableAmount", "التحمل")}</TableHead>
                  )}
                  {visit?.patient?.company && (
                    <TableHead className="min-w-[100px]">{t("labRequestsColumn.needApprove", "Need Approve")}</TableHead>
                  )}
                  <TableHead className="min-w-[60px]">{t("labRequestsColumn.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(visit?.lab_requests ?? []).map((request) => {
                  const discountedAmount = calculateDiscountedAmount(request.price, request.discount_per);
                  const remainingAmount = discountedAmount - request.amount_paid;
                  
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {request.main_test?.main_test_name || "Unknown Test"}
                            </span>
                            {/* Green checkmark if fully paid */}
                            {request.is_paid && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            ID: {request.id}
                          </span>
                          {/* Bank badge if is_bankak */}
                          {request.is_bankak && (
                            <Badge
                              className={`mt-1 w-fit ${request.is_paid ? "bg-green-600 text-white" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}
                            >
                              {t("labRequestsColumn.bankak", "Bank")}
                            </Badge>
                          )}
                          {/* Mobile-only info */}
                          <div className="sm:hidden space-y-1 mt-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Price:</span>
                              <span className="font-medium">${request.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Amount:</span>
                              <span className="font-medium">${discountedAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Paid:</span>
                              <span className={`font-medium ${request.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                                ${request.amount_paid.toFixed(2)}
                              </span>
                            </div>
                            {!request.is_paid && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Due:</span>
                                <span className="font-medium text-red-600">${remainingAmount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-medium">${request.price.toFixed(2)}</span>
                      </TableCell>
                      
                      {!visit?.patient?.company && (
                        <TableCell className="hidden md:table-cell">
                          <Select
                            value={request.discount_per.toString()}
                            onValueChange={(value) => handleDiscountChange(request.id, value)}
                            disabled={updateDiscountMutation.isPending || request.is_paid}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {generateDiscountOptions()}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      
                      {!visit?.patient?.company && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">${discountedAmount.toFixed(2)}</span>
                            {request.discount_per > 0 && (
                              <span className="text-xs text-green-600">
                                -{request.discount_per}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      
                      {visit?.patient?.company && (
                        <TableCell>
                          <span className="font-medium text-red-600">
                            ${((request.price || 0) - (request.endurance || 0)).toFixed(2)}
                          </span>
                        </TableCell>
                      )}
                      
                      {visit?.patient?.company && (
                        <TableCell>
                          <Badge variant={request.approve ? "success" : "destructive"}>
                            {request.approve ? t("labRequestsColumn.approved", "Approved") : t("labRequestsColumn.pendingApproval", "Pending Approval")}
                          </Badge>
                        </TableCell>
                      )}
                      
                      {/* Combined Actions Dropdown */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Paid Status */}
                            <DropdownMenuItem disabled>
                              {request.is_paid ? (
                                <Badge variant="default" className="text-xs w-fit mr-2">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t('labRequestsColumn.paid', 'Paid')}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs w-fit mr-2">
                                  ${remainingAmount.toFixed(2)} {t('labRequestsColumn.due', 'due')}
                                </Badge>
                              )}
                              <span>${request.amount_paid.toFixed(2)}</span>
                            </DropdownMenuItem>
                            {/* Bankak Toggle */}
                            <DropdownMenuItem
                              onClick={() => handleToggleBankak(request.id, !request.is_bankak)}
                              disabled={toggleBankakMutation.isPending}
                            >
                              <Checkbox
                                checked={request.is_bankak}
                                disabled={toggleBankakMutation.isPending}
                                className="mr-2"
                              />
                              {request.is_bankak ? t("labRequestsColumn.unmarkBankak", "Unmark Bankak") : t("labRequestsColumn.markBankak", "Mark Bankak")}
                            </DropdownMenuItem>
                            {/* Payment Button */}
                            {!request.is_paid && (
                              <DropdownMenuItem
                                onClick={() => handleDirectPayItem(request.id, false)}
                                disabled={directPayItemMutation.isPending}
                              >
                                {directPayItemMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Banknote className="h-4 w-4 mr-2" />
                                )}
                                {t("labRequestsColumn.payCash", "Pay Cash")}
                              </DropdownMenuItem>
                            )}
                            {/* Unpay Option */}
                            {request.is_paid && (
                              <DropdownMenuItem
                                onClick={() => handleUnpayLabRequest(request.id)}
                                className="text-yellow-600"
                                disabled={unpayLabRequestMutation.isPending}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {t("labRequestsColumn.unpayLabRequest", "Unpay Request")}
                              </DropdownMenuItem>
                            )}
                            {/* Delete Option */}
                            <DropdownMenuItem
                              onClick={() => handleDeleteRequest(request.id)}
                              className="text-red-600"
                              disabled={deleteRequestMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("labRequestsColumn.delete", "Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Batch Payment Dialog */}
      {currentClinicShift && (visit?.lab_requests?.length ?? 0) > 0 && visit?.patient && (
        <BatchLabPaymentDialog
          isOpen={showBatchPaymentDialog}
          onOpenChange={setShowBatchPaymentDialog}
          visitId={activeVisitId}
          requestedTests={visit?.lab_requests ?? []}
          currentPatient={visit.patient}
          currentClinicShift={currentClinicShift}
          onBatchPaymentSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["activeVisitForLabRequests", activeVisitId],
            });
            queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
            setShowBatchPaymentDialog(false);
          }}
        />
      )}

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
      widthClass="w-[300px]"
        isOpen={isPdfPreviewOpen}
        onOpenChange={(open) => {
          setIsPdfPreviewOpen(open);
          if (!open && pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
        pdfUrl={pdfUrl}
        isLoading={false}
        title={""}
        fileName={""}
      />
    </div>
  );
};

export default LabRequestsColumn; 