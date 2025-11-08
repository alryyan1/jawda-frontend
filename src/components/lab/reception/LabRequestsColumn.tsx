import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Utility function to format currency with thousands separator
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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

// Icons
import {
  Activity,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Banknote,
  PrinterIcon,
  MessageSquare,
  XCircle,
} from "lucide-react";

// Services & Types
import { 
  clearPendingLabRequestsForVisit,
  unpayLabRequest,
  recordDirectLabRequestPayment,
  updateAllLabRequestsBankak,
} from "@/services/labRequestService";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import BatchLabPaymentDialog from "@/components/clinic/BatchLabPaymentDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import DiscountCommentDialog from "./DiscountCommentDialog";
import { updatePatient } from "@/services/patientService";
import {
  Dialog as ActionsDialog,
  DialogContent as ActionsDialogContent,
  DialogHeader as ActionsDialogHeader,
  DialogTitle as ActionsDialogTitle,
  DialogFooter as ActionsDialogFooter,
} from "@/components/ui/dialog";
import { useAuthorization } from "@/hooks/useAuthorization";
import { usePdfPreviewVisibility } from "@/contexts/PdfPreviewVisibilityContext";

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
  const queryClient = useQueryClient();
  const { currentClinicShift , user  } = useAuth();
  const { can } = useAuthorization();
  const { isVisible: isPdfPreviewVisible } = usePdfPreviewVisibility();

  // State for dialogs
  const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showDiscountCommentDialog, setShowDiscountCommentDialog] = useState(false);
  const [selectedLabRequestForComment, setSelectedLabRequestForComment] = useState<number | null>(null);
  const [isSavingPatientDiscountComment, setIsSavingPatientDiscountComment] = useState(false);
  const [rowActionsDialogOpen, setRowActionsDialogOpen] = useState(false);
  const [selectedRequestForRowDialog, setSelectedRequestForRowDialog] = useState<NonNullable<DoctorVisit['lab_requests']>[number] | null>(null);

  // Update discount mutation
  const updateDiscountMutation = useMutation({
    mutationFn: async ({ requestId, discount }: { requestId: number; discount: number }) => {
      const response = await apiClient.patch(`/labrequests/${requestId}/discount`, { 
        discount_per: discount 
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("تم تحديث الخصم بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل التحديث");
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
      toast.success("تم تحديث طريقة الدفع بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل التحديث");
    },
  });

  // Delete lab request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiClient.delete(`/labrequests/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("تم حذف طلب المختبر بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الحذف");
    },
  });

  // Remove all pending lab requests mutation
  const removeAllPendingMutation = useMutation({
    mutationFn: () => clearPendingLabRequestsForVisit(activeVisitId!),
    onSuccess: (result) => {
      toast.success(`تم حذف ${result.deleted_count} فحص قيد الانتظار`);
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الطلب");
    },
  });

  // Unpay lab request mutation
  const unpayLabRequestMutation = useMutation({
    mutationFn: (labRequestId: number) => unpayLabRequest(labRequestId),
    onSuccess: () => {
      toast.success("تم إلغاء الدفع بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الطلب");
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
      toast.success("تم تسجيل الدفع بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الدفع");
    },
  });

  // Update all lab requests bankak mutation
  const updateAllBankakMutation = useMutation({
    mutationFn: (isBankak: boolean) => updateAllLabRequestsBankak(activeVisitId!, isBankak),
    onSuccess: () => {
      toast.success("تم تعيين جميع الطلبات بنكك");
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labRequestsForVisit", activeVisitId],
      });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الطلب");
    },
  });

  // Removed lab request comment mutation; comment saved at patient level instead

  const handleDiscountChange = (requestId: number, discount: string) => {
    const discountValue = parseInt(discount);
    updateDiscountMutation.mutate({ requestId, discount: discountValue });
    
    // If discount is greater than 0, open comment dialog
    if (discountValue > 0 && !visit?.patient?.discount_comment) {
      setSelectedLabRequestForComment(requestId);
      setShowDiscountCommentDialog(true);
    }
  };

  const handleToggleBankak = (requestId: number, isBankak: boolean) => {
    toggleBankakMutation.mutate({ requestId, isBankak });
  };

  const handleDeleteRequest = (requestId: number) => {
    // if (window.confirm("هل أنت متأكد من حذف طلب المختبر؟")) {
      deleteRequestMutation.mutate(requestId);
    
  };

  const handleRemoveAllPending = () => {
    if (window.confirm("هل أنت متأكد من إزالة جميع الطلبات المعلقة؟")) {
      removeAllPendingMutation.mutate();
    }
  };

  const handleUnpayLabRequest = (requestId: number) => {
    // if (window.confirm("هل أنت متأكد من إلغاء دفع هذا الطلب؟")) {
      unpayLabRequestMutation.mutate(requestId);
    // }
  };

  const handleDirectPayItem = (requestId: number, isBankak: boolean) => {
    if (!currentClinicShift) {
      toast.error("لا توجد وردية فعّالة");
      return;
    }
    directPayItemMutation.mutate({
      labRequestId: requestId,
      is_bankak: isBankak,
      shift_id: currentClinicShift.id,
    });
  };

  const handleUpdateAllBankak = () => {
    // if (window.confirm("هل تريد تعيين كل الطلبات بنكك")) {
      updateAllBankakMutation.mutate(true);
    // }
  };

  const handleOpenCommentDialog = (requestId: number) => {
    setSelectedLabRequestForComment(requestId);
    setShowDiscountCommentDialog(true);
  };

  const handleSaveComment = async (comment: string) => {
    if (!visit?.patient?.id) return;
    try {
      setIsSavingPatientDiscountComment(true);
      await updatePatient(visit.patient.id, { discount_comment: comment });
      toast.success("تم حفظ تعليق الخصم للمريض");
      queryClient.invalidateQueries({ queryKey: ["doctorVisit", activeVisitId] });
    } catch {
      toast.error("فشل حفظ تعليق الخصم للمريض");
    } finally {
      setIsSavingPatientDiscountComment(false);
    }
  };

  // Print barcode to Zebra printer
  const printToZebra = async () => {
    if (!activeVisitId) {
      toast.error("يرجى اختيار زيارة أولاً");
      return;
    }
    
    try {
      const response = await apiClient.post(`/visits/${activeVisitId}/print-barcode`);
      fetch("http://127.0.0.1:5000/", {
        method: "POST",
        headers: {
          "Content-Type": "APPLICATION/JSON",
        },

        body: JSON.stringify(visit),
      }).then(() => {});
      if (response.data.status) {
        toast.success("تم طباعة الباركود بنجاح");
      } else {
        toast.error(response.data.message || "فشل في طباعة الباركود");
      }
    } catch (error: unknown) {
      console.error('Error printing barcode:', error);
      const errorMessage = error instanceof Error ? error.message : "فشل في طباعة الباركود";
      toast.error(errorMessage);
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
            {"جاري التحميل"}...
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
              {"اختر مريضاً"}
            </p>
            <p className="text-sm max-w-xs mx-auto leading-relaxed">
              {"اختر مريضاً من  لعرض طلباته"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log(can('تخفيض فحص'),'can')
  return (
    <div className="h-full flex flex-col">
      {/* Header with Print Receipt and Remove All Pending buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Button
            onClick={onPrintReceipt}
            variant="outline"
            size="sm"
            disabled={visit?.lab_requests?.length === 0}
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">طباعة الإيصال</span>
          </Button>
          <Button
            onClick={printToZebra}
            variant="outline"
            size="sm"
            disabled={visit?.lab_requests?.length === 0}
            title="طباعة الباركود على طابعة Zebra"
          >
            {/* <Barcode className="h-4 w-4 mr-2" /> */}
            <span className="hidden sm:inline">طباعة الباركود</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* <Button
            onClick={handleRemoveAllPending}

            //add red border
            className="  hover:bg-red-600 hover:text-white !border-red-200 !border-2"
            size="sm"
            disabled={removeAllPendingMutation.isPending || (visit?.lab_requests?.length ?? 0) === 0 || visit?.patient?.result_print_date != null}
          >
            {removeAllPendingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">حذف  التحاليل </span>
          </Button> */}
          
          <Button
            onClick={handleUpdateAllBankak}
            variant="outline"
            size="sm"
            disabled={updateAllBankakMutation.isPending || (visit?.lab_requests?.length ?? 0) === 0}
          >
            {updateAllBankakMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              ''
            )}
            <span className="hidden sm:inline"> بنكك </span>
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
                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">لا توجد  تحاليل مطلوبة</p>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">اسم الفحص</TableHead>
                  <TableHead className="min-w-[80px] hidden sm:table-cell">السعر</TableHead>
                  {!visit?.patient?.company && (
                    <TableHead className="min-w-[100px] hidden md:table-cell">الخصم</TableHead>
                  )}
                  {!visit?.patient?.company && (
                    <TableHead className="min-w-[80px]">المبلغ</TableHead>
                  )}
                  {visit?.patient?.company && (
                    <TableHead className="min-w-[100px] text-red-600">التحمل</TableHead>
                  )}
                  {/* Removed separate approval column; approval shown as badge near test name */}
                  <TableHead className="min-w-[60px] hidden xl:table-cell">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(visit?.lab_requests ?? []).map((request) => {
                  const discountedAmount = calculateDiscountedAmount(request.price, request.discount_per);
                  const remainingAmount = discountedAmount - request.amount_paid;
                  
                  return (
  <TableRow
                      key={request.id}
                      className={`xl:cursor-default cursor-pointer ${request.is_bankak ? 'bg-green-50 dark:bg-green-900/20' : ''} ${request.amount_paid > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                      onClick={() => {
                        // Open dialog only on small screens (< 1280px)
                        if (window.innerWidth < 1280) {
                          setSelectedRequestForRowDialog(request);
                          setRowActionsDialogOpen(true);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {request.main_test?.main_test_name || "Unknown Test"}
                            </span>
                            {/* Approval status inline badge for company patients */}
                            {visit?.patient?.company && (
                              <Badge variant={!request.approve ? "success" : "destructive"} className="ml-1">
                                {!request.approve  ? " " : "يحتاج موافقة"}
                              </Badge>
                            )}
                            {/* Comment icon if comment exists */}
                          {request.comment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                onClick={() => handleOpenCommentDialog(request.id)}
                              title={"عرض الملاحظة"}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            ID: {request.id}
                            {request.is_bankak && (
                              <span className="ml-2 text-xs text-gray-500">bankak</span>
                            )}
                          </span>
                          {/* Mobile-only info */}
                          <div className="sm:hidden space-y-1 mt-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">السعر:</span>
                              <span className="font-medium">${formatCurrency(request.price)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">المبلغ:</span>
                              <span className="font-medium">${formatCurrency(discountedAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">المدفوع:</span>
                              <span className={`font-medium ${request.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                                ${formatCurrency(request.amount_paid)}
                              </span>
                            </div>
                            {!request.is_paid && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">المتبقي:</span>
                                <span className="font-medium text-red-600">${formatCurrency(remainingAmount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-medium">${formatCurrency(request.price)}</span>
                      </TableCell>
                      
                      {!visit?.patient?.company && (
                        <TableCell className="hidden md:table-cell">
                          <Select
                            value={request.discount_per.toString()}
                            onValueChange={(value) => handleDiscountChange(request.id, value)}
                            disabled={updateDiscountMutation.isPending || request.is_paid  || !can('تخفيض فحص')}
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
                            <span className="font-medium">${formatCurrency(discountedAmount)}</span>
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
                            ${formatCurrency(request.endurance || 0)}
                          </span>
                        </TableCell>
                      )}
                      
                      {/* Removed separate approval cell; handled near test name */}
                      
                      {/* Action Buttons - hidden on < 1280px */}
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          {/* Green checkmark if fully paid */}
                          {request.is_paid && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          )}
                          
                          {/* Payment/Unpay Button */}
                          {!request.is_paid ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 border-2 border-green-200 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                              onClick={() => handleDirectPayItem(request.id, false)}
                              disabled={directPayItemMutation.isPending || !can('سداد فحص')}
                              title="دفع نقدي"
                            >
                              {directPayItemMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'دفع'
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                              onClick={() => handleUnpayLabRequest(request.id)}
                              disabled={unpayLabRequestMutation.isPending || visit?.patient?.result_print_date != null || !can('الغاء سداد فحص')}
                              title="إلغاء السداد"
                            >
                              {unpayLabRequestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Bankak Toggle Button */}
                        {request.amount_paid > 0 &&  <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-12 p-0 border-2 border-blue-200 ${
                              request.is_bankak 
                                ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50" 
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            }`}
                            onClick={() => handleToggleBankak(request.id, !request.is_bankak)}
                            disabled={toggleBankakMutation.isPending || !request.is_paid}
                            title={request.is_bankak ? "إلغاء بنكك" : "تعيين بنكك"}
                          >
                            {toggleBankakMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'بنكك'
                            )}
                          </Button> }

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDeleteRequest(request.id)}
                            disabled={deleteRequestMutation.isPending || visit?.patient?.result_print_date != null || !can('حذف فحص مضاف')}
                            title="حذف"
                          >
                            {deleteRequestMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
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
      {isPdfPreviewVisible && (
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
      )}

      {/* Discount Comment Dialog */}
      {selectedLabRequestForComment && (
        <DiscountCommentDialog
          isOpen={showDiscountCommentDialog}
          onOpenChange={setShowDiscountCommentDialog}
          currentComment={visit?.patient?.discount_comment}
          onSave={handleSaveComment}
          isSaving={isSavingPatientDiscountComment}
          labRequestId={selectedLabRequestForComment}
        />
      )}

      {/* Row Actions Dialog for small screens */}
      {selectedRequestForRowDialog && (
        <ActionsDialog  open={rowActionsDialogOpen} onOpenChange={setRowActionsDialogOpen}>
          <ActionsDialogContent>
            <ActionsDialogHeader>
              <ActionsDialogTitle>إجراءات الطلب #{selectedRequestForRowDialog.id}</ActionsDialogTitle>
            </ActionsDialogHeader>
            <div className="space-y-3">
              {/* Paid Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">الحالة</span>
                {selectedRequestForRowDialog.is_paid ? (
                  <Badge variant="default" className="text-xs w-fit">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> مدفوع
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs w-fit">
                    { formatCurrency(calculateDiscountedAmount(selectedRequestForRowDialog.price, selectedRequestForRowDialog.discount_per) - selectedRequestForRowDialog.amount_paid) } مستحق
                  </Badge>
                )}
              </div>

              {/* Bankak Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm">بنكك</span>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!selectedRequestForRowDialog.is_bankak}
                    onCheckedChange={() => handleToggleBankak(selectedRequestForRowDialog.id, !selectedRequestForRowDialog.is_bankak)}
                    disabled={toggleBankakMutation.isPending}
                  />
                </div>
              </div>

              {/* Payment Button */}
              {!selectedRequestForRowDialog.is_paid && (
                <Button
                  onClick={() => {
                    handleDirectPayItem(selectedRequestForRowDialog.id, false);
                    setRowActionsDialogOpen(false);
                  }}
                  disabled={directPayItemMutation.isPending}
                  className="w-full"
                >
                  {directPayItemMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Banknote className="h-4 w-4 mr-2" />
                  )}
                  دفع نقدي
                </Button>
              )}

              {/* Unpay Option */}
              {selectedRequestForRowDialog.is_paid && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleUnpayLabRequest(selectedRequestForRowDialog.id);
                    setRowActionsDialogOpen(false);
                  }}
                  disabled={unpayLabRequestMutation.isPending || visit?.patient?.result_print_date != null}
                  className="w-full text-yellow-700"
                >
                  <AlertCircle className="h-4 w-4 mr-2" /> إلغاء الدفع
                </Button>
              )}

              {/* Delete Option */}
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteRequest(selectedRequestForRowDialog.id);
                  setRowActionsDialogOpen(false);
                }}
                disabled={deleteRequestMutation.isPending || visit?.patient?.result_print_date != null || !can('حذف فحص مضاف')}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" /> حذف
              </Button>
            </div>
            <ActionsDialogFooter>
              <Button variant="outline" onClick={() => setRowActionsDialogOpen(false)}>إغلاق</Button>
            </ActionsDialogFooter>
          </ActionsDialogContent>
        </ActionsDialog>
      )}
    </div>
  );
};

export default LabRequestsColumn; 