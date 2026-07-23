// src/components/lab/reception/LabRequestsColumn.tsx
import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog as ActionsDialog,
  DialogContent as ActionsDialogContent,
  DialogHeader as ActionsDialogHeader,
  DialogTitle as ActionsDialogTitle,
  DialogFooter as ActionsDialogFooter,
} from "@/components/ui/dialog";

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
import { unpayLabRequest, recordDirectLabRequestPayment, updateAllLabRequestsBankak } from "@/services/labRequestService";
import { updatePatient } from "@/services/patientService";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import DiscountCommentDialog from "./DiscountCommentDialog";

type LabRequestItem = NonNullable<DoctorVisit["lab_requests"]>[number];

interface LabRequestsColumnProps {
  activeVisitId: number | null;
  visit?: DoctorVisit;
  isLoading?: boolean;
  onPrintReceipt: () => void;
}

/* ------------------------------- Helpers --------------------------------- */

const formatCurrency = (amount: number): string =>
  amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calculateDiscountedAmount = (price: number, discountPer: number): number =>
  price - (price * discountPer) / 100;

const DISCOUNT_VALUES = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100];

/* ----------------------------- View states -------------------------------- */

const ColumnLoadingState: React.FC = () => (
  <div className="flex h-full items-center justify-center" role="status">
    <div className="space-y-3 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">جاري التحميل...</p>
    </div>
  </div>
);

const NoVisitState: React.FC = () => (
  <div className="flex h-full items-center justify-center text-muted-foreground">
    <div className="space-y-4 text-center">
      <Activity className="mx-auto h-16 w-16 opacity-30" />
      <div className="space-y-2">
        <p className="text-lg font-medium">اختر مريضاً</p>
        <p className="mx-auto max-w-xs text-sm leading-relaxed">اختر مريضاً من القائمة لعرض طلباته</p>
      </div>
    </div>
  </div>
);

const NoRequestsState: React.FC = () => (
  <div className="flex h-full items-center justify-center">
    <div className="space-y-4 text-center">
      <FileText className="mx-auto h-16 w-16 text-muted-foreground/30" />
      <p className="text-lg font-medium text-muted-foreground">لا توجد تحاليل مطلوبة</p>
    </div>
  </div>
);

/* -------------------------------- Column ---------------------------------- */

const LabRequestsColumn: React.FC<LabRequestsColumnProps> = ({ activeVisitId, visit, isLoading, onPrintReceipt }) => {
  const queryClient = useQueryClient();
  const { currentClinicShift, user } = useAuth();
  const { can } = useAuthorization();

  const [showDiscountCommentDialog, setShowDiscountCommentDialog] = useState(false);
  const [selectedLabRequestForComment, setSelectedLabRequestForComment] = useState<number | null>(null);
  const [isSavingPatientDiscountComment, setIsSavingPatientDiscountComment] = useState(false);
  const [rowActionsDialogOpen, setRowActionsDialogOpen] = useState(false);
  const [selectedRequestForRowDialog, setSelectedRequestForRowDialog] = useState<LabRequestItem | null>(null);

  const invalidateVisitQueries = useCallback(
    (options?: { includeDashboard?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["activeVisitForLabRequests", activeVisitId] });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit", activeVisitId] });
      queryClient.invalidateQueries({ queryKey: ["labRequestsForVisit", activeVisitId] });
      if (options?.includeDashboard) {
        queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      }
    },
    [queryClient, activeVisitId]
  );

  const mutationErrorToast = (fallback: string) => (error: Error) => {
    const apiError = error as { response?: { data?: { message?: string } } };
    toast.error(apiError.response?.data?.message || fallback);
  };

  /* ------------------------------ Mutations ------------------------------- */

  const updateDiscountMutation = useMutation({
    mutationFn: async ({ requestId, discount }: { requestId: number; discount: number }) => {
      const response = await apiClient.patch(`/labrequests/${requestId}/discount`, { discount_per: discount });
      return response.data;
    },
    onSuccess: () => {
      toast.success("تم تحديث الخصم بنجاح");
      invalidateVisitQueries();
    },
    onError: mutationErrorToast("فشل التحديث"),
  });

  const toggleBankakMutation = useMutation({
    mutationFn: async ({ requestId, isBankak }: { requestId: number; isBankak: boolean }) => {
      const response = await apiClient.patch(`/labrequests/${requestId}/toggle-bankak`, { is_bankak: isBankak });
      return response.data;
    },
    onSuccess: () => {
      toast.success("تم تحديث طريقة الدفع بنجاح");
      invalidateVisitQueries();
    },
    onError: mutationErrorToast("فشل التحديث"),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiClient.delete(`/labrequests/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("تم حذف طلب المختبر بنجاح");
      invalidateVisitQueries();
    },
    onError: mutationErrorToast("فشل الحذف"),
  });

  const unpayLabRequestMutation = useMutation({
    mutationFn: (labRequestId: number) => unpayLabRequest(labRequestId),
    onSuccess: () => {
      toast.success("تم إلغاء الدفع بنجاح");
      invalidateVisitQueries();
    },
    onError: mutationErrorToast("فشل الطلب"),
  });

  const directPayItemMutation = useMutation({
    mutationFn: (params: { labRequestId: number; is_bankak: boolean; shift_id: number }) =>
      recordDirectLabRequestPayment(params.labRequestId, { is_bankak: params.is_bankak }),
    onSuccess: () => {
      toast.success("تم تسجيل الدفع بنجاح");
      invalidateVisitQueries({ includeDashboard: true });
    },
    onError: mutationErrorToast("فشل الدفع"),
  });

  const updateAllBankakMutation = useMutation({
    mutationFn: (isBankak: boolean) => updateAllLabRequestsBankak(activeVisitId!, isBankak),
    onSuccess: () => {
      toast.success("تم تعيين جميع الطلبات بنكك");
      invalidateVisitQueries();
    },
    onError: mutationErrorToast("فشل الطلب"),
  });

  /* ------------------------------ Handlers -------------------------------- */

  const handleDiscountChange = (requestId: number, discount: string) => {
    const discountValue = parseInt(discount);
    updateDiscountMutation.mutate({ requestId, discount: discountValue });

    if (discountValue > 0 && !visit?.patient?.discount_comment) {
      setSelectedLabRequestForComment(requestId);
      setShowDiscountCommentDialog(true);
    }
  };

  const handleToggleBankak = (requestId: number, isBankak: boolean) => {
    toggleBankakMutation.mutate({ requestId, isBankak });
  };

  const handleDeleteRequest = (requestId: number) => {
    deleteRequestMutation.mutate(requestId);
  };

  const handleUnpayLabRequest = (requestId: number) => {
    unpayLabRequestMutation.mutate(requestId);
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
    updateAllBankakMutation.mutate(true);
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

  /**
   * Prints barcode labels: primary path via the local print server, with an
   * iframe-print of the backend PDF as fallback.
   */
  const printBarcodePdf = async () => {
    if (!activeVisitId) {
      toast.error("يرجى اختيار زيارة أولاً");
      return;
    }

    try {
      toast.info("جاري إنشاء الباركود...");

      const BARCODE_LABEL_DIMENSIONS_KEY = "barcodeLabelDimensions";
      let dimensions = { width: 50, height: 25 };
      try {
        const stored = localStorage.getItem(BARCODE_LABEL_DIMENSIONS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.width && parsed.height) {
            dimensions = { width: Number(parsed.width), height: Number(parsed.height) };
          }
        }
      } catch (error) {
        console.error("Error reading stored dimensions:", error);
      }

      const printServerUrl = "http://localhost:4002";
      fetch(`${printServerUrl}/emit/print-barcode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": import.meta.env.VITE_SERVER_AUTH_TOKEN || "changeme",
        },
        body: JSON.stringify({
          visit_id: activeVisitId,
          width: dimensions.width,
          height: dimensions.height,
        }),
      })
        .then(async (response) => {
          const result = await response.json();
          if (response.ok) {
            toast.success("تم إرسال طلب الطباعة بنجاح");
          } else {
            console.error("Print server error:", result);
            toast.error(result.error || "فشل في إرسال طلب الطباعة");
          }
        })
        .catch((error) => {
          console.error("Error calling print server:", error);
          toast.error("فشل في الاتصال بخادم الطباعة");
        });

      try {
        const response = await apiClient.get(`/visits/${activeVisitId}/lab-barcode/pdf`, {
          responseType: "blob",
          params: { width: dimensions.width, height: dimensions.height },
        });

        const blob = new Blob([response.data], { type: "application/pdf" });
        const fileURL = URL.createObjectURL(blob);

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = fileURL;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(fileURL);
          }, 1000);
        };
      } catch (error) {
        console.error("Error opening PDF in iframe:", error);
        // Print server may still have succeeded — stay silent here
      }
    } catch (error: unknown) {
      console.error("Error printing barcode PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "فشل في إنشاء باركود PDF";
      toast.error(errorMessage);
    }
  };

  /* -------------------------------- Render -------------------------------- */

  if (isLoading) return <ColumnLoadingState />;
  if (!activeVisitId) return <NoVisitState />;

  const labRequests = visit?.lab_requests ?? [];
  const isCompanyPatient = Boolean(visit?.patient?.company);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-2 border-b border-border bg-muted/40 p-1.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Button onClick={onPrintReceipt} variant="outline" size="sm" disabled={labRequests.length === 0}>
            <PrinterIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">طباعة الإيصال</span>
          </Button>
          <Button
            onClick={printBarcodePdf}
            variant="outline"
            size="sm"
            disabled={labRequests.length === 0}
            title="طباعة الباركود PDF"
          >
            <span className="hidden sm:inline">طباعة الباركود</span>
          </Button>
        </div>

        <Button
          onClick={handleUpdateAllBankak}
          variant="outline"
          size="sm"
          disabled={updateAllBankakMutation.isPending || labRequests.length === 0}
        >
          {updateAllBankakMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <span className="hidden sm:inline">بنكك</span>
        </Button>
      </div>

      {/* Requests table */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {labRequests.length === 0 ? (
          <NoRequestsState />
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="min-w-[150px]">اسم الفحص</TableHead>
                  <TableHead className="hidden min-w-[80px] sm:table-cell">السعر</TableHead>
                  {!isCompanyPatient && <TableHead className="hidden min-w-[100px] md:table-cell">الخصم</TableHead>}
                  {!isCompanyPatient && <TableHead className="min-w-[80px]">المبلغ</TableHead>}
                  {isCompanyPatient && <TableHead className="min-w-[100px] text-red-600">التحمل</TableHead>}
                  <TableHead className="hidden min-w-[60px] xl:table-cell">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labRequests.map((request) => {
                  const discountedAmount = calculateDiscountedAmount(request.price, request.discount_per);
                  const remainingAmount = discountedAmount - request.amount_paid;

                  return (
                    <TableRow
                      key={request.id}
                      className={`cursor-pointer xl:cursor-default ${
                        request.is_bankak ? "bg-green-50 dark:bg-green-900/20" : ""
                      } ${request.amount_paid > 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                      onClick={() => {
                        // Small screens use a dedicated actions dialog instead of inline buttons
                        if (window.innerWidth < 1280) {
                          setSelectedRequestForRowDialog(request);
                          setRowActionsDialogOpen(true);
                        }
                      }}
                    >
                      {/* Test name + inline metadata */}
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {request.main_test?.main_test_name || "Unknown Test"}
                            </span>
                            {isCompanyPatient && (
                              <Badge variant={!request.approve ? "success" : "destructive"} className="ml-1">
                                {!request.approve ? " " : "يحتاج موافقة"}
                              </Badge>
                            )}
                            {request.comment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                onClick={() => handleOpenCommentDialog(request.id)}
                                title="عرض الملاحظة"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ID: {request.id}
                            {request.user_deposited && (
                              <span className="ml-2 text-xs text-blue-500"> {request.deposit_user_name}</span>
                            )}
                          </span>

                          {/* Mobile-only financial summary */}
                          <div className="mt-2 space-y-1 sm:hidden">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">السعر:</span>
                              <span className="font-medium">${formatCurrency(request.price)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">المبلغ:</span>
                              <span className="font-medium">${formatCurrency(discountedAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">المدفوع:</span>
                              <span className={`font-medium ${request.is_paid ? "text-green-600" : "text-red-600"}`}>
                                ${formatCurrency(request.amount_paid)}
                              </span>
                            </div>
                            {!request.is_paid && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">المتبقي:</span>
                                <span className="font-medium text-red-600">${formatCurrency(remainingAmount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <span className="font-medium">${formatCurrency(request.price)}</span>
                      </TableCell>

                      {!isCompanyPatient && (
                        <TableCell className="hidden md:table-cell">
                          <Select
                            value={request.discount_per.toString()}
                            onValueChange={(value) => handleDiscountChange(request.id, value)}
                            disabled={updateDiscountMutation.isPending || request.is_paid || !can("تخفيض فحص")}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISCOUNT_VALUES.map((value) => (
                                <SelectItem key={value} value={value.toString()}>
                                  {value}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}

                      {!isCompanyPatient && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">${formatCurrency(discountedAmount)}</span>
                            {request.discount_per > 0 && (
                              <span className="text-xs text-green-600">-{request.discount_per}%</span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {isCompanyPatient && (
                        <TableCell>
                          <span className="font-medium text-red-600">${formatCurrency(request.endurance || 0)}</span>
                        </TableCell>
                      )}

                      {/* Inline actions — desktop (≥ xl) only */}
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          {request.is_paid && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />}

                          {!request.is_paid ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 border-2 border-green-200 p-0 text-green-600 hover:bg-green-50 hover:text-green-800"
                              onClick={() => handleDirectPayItem(request.id, false)}
                              disabled={directPayItemMutation.isPending || !can("سداد فحص")}
                              title="دفع نقدي"
                            >
                              {directPayItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "دفع"}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-800"
                              onClick={() => handleUnpayLabRequest(request.id)}
                              disabled={
                                unpayLabRequestMutation.isPending ||
                                visit?.patient?.result_print_date != null ||
                                !can("الغاء سداد فحص") ||
                                visit?.result_auth == true
                              }
                              title="إلغاء السداد"
                            >
                              {unpayLabRequestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          {request.amount_paid > 0 && (
                            <div className="flex items-center gap-1" title={request.is_bankak ? "إلغاء بنكك" : "تعيين بنكك"}>
                              {toggleBankakMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              ) : (
                                <Checkbox
                                  checked={!!request.is_bankak}
                                  onCheckedChange={(checked) => handleToggleBankak(request.id, !!checked)}
                                  disabled={
                                    toggleBankakMutation.isPending || !request.is_paid || user?.id != request.user_deposited
                                  }
                                  className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                                />
                              )}
                              <span className="text-xs text-muted-foreground">بنكك</span>
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                            onClick={() => handleDeleteRequest(request.id)}
                            disabled={
                              deleteRequestMutation.isPending ||
                              visit?.patient?.result_print_date != null ||
                              !can("حذف فحص مضاف") ||
                              visit?.result_auth == true ||
                              (user?.id != request.user_deposited && request.user_deposited != null)
                            }
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

      {/* Discount comment dialog */}
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

      {/* Row actions dialog — small screens */}
      {selectedRequestForRowDialog && (
        <ActionsDialog open={rowActionsDialogOpen} onOpenChange={setRowActionsDialogOpen}>
          <ActionsDialogContent>
            <ActionsDialogHeader>
              <ActionsDialogTitle>إجراءات الطلب #{selectedRequestForRowDialog.id}</ActionsDialogTitle>
            </ActionsDialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الحالة</span>
                {selectedRequestForRowDialog.is_paid ? (
                  <Badge variant="default" className="w-fit text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> مدفوع
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="w-fit text-xs">
                    {formatCurrency(
                      calculateDiscountedAmount(selectedRequestForRowDialog.price, selectedRequestForRowDialog.discount_per) -
                        selectedRequestForRowDialog.amount_paid
                    )}{" "}
                    مستحق
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">بنكك</span>
                <Checkbox
                  checked={!!selectedRequestForRowDialog.is_bankak}
                  onCheckedChange={() =>
                    handleToggleBankak(selectedRequestForRowDialog.id, !selectedRequestForRowDialog.is_bankak)
                  }
                  disabled={toggleBankakMutation.isPending}
                />
              </div>

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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Banknote className="mr-2 h-4 w-4" />
                  )}
                  دفع نقدي
                </Button>
              )}

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
                  <AlertCircle className="mr-2 h-4 w-4" /> إلغاء الدفع
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteRequest(selectedRequestForRowDialog.id);
                  setRowActionsDialogOpen(false);
                }}
                disabled={
                  deleteRequestMutation.isPending ||
                  visit?.patient?.result_print_date != null ||
                  !can("حذف فحص مضاف")
                }
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" /> حذف
              </Button>
            </div>
            <ActionsDialogFooter>
              <Button variant="outline" onClick={() => setRowActionsDialogOpen(false)}>
                إغلاق
              </Button>
            </ActionsDialogFooter>
          </ActionsDialogContent>
        </ActionsDialog>
      )}
    </div>
  );
};

export default LabRequestsColumn;
