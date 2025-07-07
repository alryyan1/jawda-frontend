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
  recordDirectLabRequestPayment
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
}

const LabRequestsColumn: React.FC<LabRequestsColumnProps> = ({
  activeVisitId,
  visit,
  isLoading,
}) => {
  const { t } = useTranslation(["labReception", "common", "clinic", "labTests", "payments"]);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  // State for dialogs
  const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfFileName, setPdfFileName] = useState('document.pdf');

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
      queryClient.invalidateQueries({
        queryKey: ["dashboardSummary"] });
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

  const generateAndShowPdf = async (
    title: string,
    fileNamePrefix: string,
    fetchFunction: () => Promise<Blob>
  ) => {
    if (!activeVisitId) return;
    
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfPreviewTitle(title);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await fetchFunction();
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      const patientNameSanitized = visit?.patient?.name.replace(/[^A-Za-z0-9\-_]/g, '_') || 'patient';
      setPdfFileName(`${fileNamePrefix}_${activeVisitId}_${patientNameSanitized}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error: unknown) {
      console.error(`Error generating ${title}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(t('common:error.generatePdfFailed'), {
        description: errorMessage,
      });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!activeVisitId) return;
    generateAndShowPdf(
      t('common:printReceiptDialogTitle', { visitId: activeVisitId }),
      'LabReceipt',
      () => apiClient.get(`/visits/${activeVisitId}/lab-thermal-receipt/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  const calculateDiscountedAmount = (price: number, discountPer: number) => {
    return price - (price * discountPer / 100);
  };

  const generateDiscountOptions = () => {
    const options = [];
    for (let i = 0; i <= 100; i += 10) {
      options.push(
        <SelectItem key={i} value={i.toString()}>
          {i}%
        </SelectItem>
      );
    }
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
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrintReceipt}
            variant="outline"
            size="sm"
            disabled={isGeneratingPdf ||  visit?.lab_requests?.length === 0  }
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PrinterIcon className="h-4 w-4 mr-2" />
            )}
            {t('common:printReceipt')}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRemoveAllPending}
            variant="destructive"
            size="sm"
            disabled={removeAllPendingMutation.isPending || (visit?.lab_requests?.length ?? 0) === 0}
          >
            {removeAllPendingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {t("labRequestsColumn.removeAllPending", "Remove All Pending")}
          </Button>
          
          <Button
            onClick={() => setShowBatchPaymentDialog(true)}
            variant="outline"
            size="sm"
            disabled={(visit?.lab_requests?.length ?? 0) === 0}
          >
            <Banknote className="h-4 w-4 mr-2" />
            {t("labRequestsColumn.batchPayment", "Batch Payment")}
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
                  <TableHead className="w-[200px]">{t("labRequestsColumn.testName", "Test Name")}</TableHead>
                  <TableHead className="w-[100px]">{t("labRequestsColumn.price", "Price")}</TableHead>
                  <TableHead className="w-[120px]">{t("labRequestsColumn.discount", "Discount")}</TableHead>
                  <TableHead className="w-[100px]">{t("labRequestsColumn.amount", "Amount")}</TableHead>
                  <TableHead className="w-[100px]">{t("labRequestsColumn.paid", "Paid")}</TableHead>
                  <TableHead className="w-[80px]">{t("labRequestsColumn.bankak", "Bank")}</TableHead>
                  <TableHead className="w-[100px]">{t("labRequestsColumn.payment", "Payment")}</TableHead>
                  <TableHead className="w-[80px]">{t("labRequestsColumn.actions", "Actions")}</TableHead>
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
                          <span className="text-sm font-semibold">
                            {request.main_test?.main_test_name || "Unknown Test"}
                          </span>
                          <span className="text-xs text-slate-500">
                            ID: {request.id}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-medium">${request.price.toFixed(2)}</span>
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={request.discount_per.toString()}
                          onValueChange={(value) => handleDiscountChange(request.id, value)}
                          disabled={updateDiscountMutation.isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {generateDiscountOptions()}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
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
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">${request.amount_paid.toFixed(2)}</span>
                          {request.is_paid ? (
                            <Badge variant="default" className="text-xs w-fit">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs w-fit">
                              ${remainingAmount.toFixed(2)} due
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={request.is_bankak}
                            onCheckedChange={(checked) => 
                              handleToggleBankak(request.id, checked as boolean)
                            }
                            disabled={toggleBankakMutation.isPending}
                          />
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {!request.is_paid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDirectPayItem(request.id, false)}
                              disabled={directPayItemMutation.isPending}
                              className="w-full text-xs"
                            >
                              {directPayItemMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Cash"
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteRequest(request.id)}
                              className="text-red-600"
                              disabled={deleteRequestMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("labRequestsColumn.delete", "Delete")}
                            </DropdownMenuItem>
                            
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
        isLoading={isGeneratingPdf && !pdfUrl}
        title={pdfPreviewTitle}
        fileName={pdfFileName}
      />
    </div>
  );
};

export default LabRequestsColumn; 