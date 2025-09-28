import { useState, forwardRef, useImperativeHandle } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDoctorVisitById, recordServicePayment } from "@/services/visitService";
import { getRequestedServicesForVisit } from "@/services/visitService";
import type { RequestedService } from "@/types/services";
import PatientCompanyDetails from "../lab/reception/PatientCompanyDetails";
import PdfPreviewDialog from "../common/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, FileText, Coins, Landmark, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCurrentUserShiftIncomeSummary } from "@/services/userService";
import { formatNumber } from "@/lib/utils";
import { ItemRow } from "../lab/workstation/PatientDetailsLabEntry";
import { 
  CheckCircle2, 
  Phone, 
  CalendarDays, 
  User, 
  UserCircle2, 
  Clock,
  Shield,
  Printer,
  CreditCard,
  Copy
} from "lucide-react";
export interface PatientDetailsColumnClinicProps {
  visitId: number | null;
  onPrintReceipt?: () => void;
  currentClinicShiftId?: number | null;
  activeTab?: 'services' | 'lab';
}

export interface PatientDetailsColumnClinicRef {
  triggerPayAll: () => void;
}

const PatientDetailsColumnClinic = forwardRef<PatientDetailsColumnClinicRef, PatientDetailsColumnClinicProps>(({ 
  visitId,
  onPrintReceipt,
  currentClinicShiftId,
  activeTab = 'services',
}, ref) => {
  const queryClient = useQueryClient();
  const { user, currentClinicShift } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch visit data
  const { data: visit, isLoading: isLoadingVisit } = useQuery({
    queryKey: ["doctorVisit", visitId],
    queryFn: () => getDoctorVisitById(visitId!),
    enabled: !!visitId,
  });

  // Fetch requested services
  const { data: requestedServices = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["requestedServicesForVisit", visitId],
    queryFn: () => getRequestedServicesForVisit(visitId!),
    enabled: !!visitId,
  });

  // Fetch lab requests for lab totals when needed
  const { data: labRequests = [], isLoading: isLoadingLab } = useQuery({
    queryKey: ["labRequestsForVisit", visitId],
    queryFn: async () => {
      const { getLabRequestsForVisit } = await import("@/services/labRequestService");
      return getLabRequestsForVisit(visitId!);
    },
    enabled: !!visitId,
  });

  // Services income summary for current user/shift (cash/bank/total)
  const { data: servicesShiftSummary, isLoading: isLoadingServicesSummary } = useQuery({
    queryKey: ["userShiftIncomeSummary", user?.id, currentClinicShift?.id],
    queryFn: () => fetchCurrentUserShiftIncomeSummary(currentClinicShift!.id),
    enabled: !!currentClinicShift && !!user && activeTab === 'services',
  });

  // Pay all unpaid services/lab requests mutation
  const payAllMutation = useMutation({
    mutationFn: async () => {
      if (!visitId || !currentClinicShiftId) {
        throw new Error("Missing visit ID or clinic shift ID");
      }

      if (activeTab === 'lab') {
        // Handle lab requests payment
        const { default: apiClient } = await import("@/services/api");
        const response = await apiClient.post(`/doctor-visits/${visitId}/pay-all-lab-requests`);
        return response.data;
      } else {
        // Handle services payment
        // Find all unpaid services
        const unpaidServices = requestedServices.filter(service => {
          const balance = calculateItemBalance(service);
          return balance > 0.009; // Services with remaining balance
        });

        if (unpaidServices.length === 0) {
          throw new Error("لا توجد خدمات غير مدفوعة");
        }

        // Process payments for all unpaid services
        const paymentPromises = unpaidServices.map(service => {
          const balance = calculateItemBalance(service);
          return recordServicePayment({
            requested_service_id: service.id,
            amount: balance,
            is_bank: false,
            shift_id: currentClinicShiftId
          });
        });

        await Promise.all(paymentPromises);
        return unpaidServices;
      }
    },
    onSuccess: () => {
      toast.success("تم معالجة جميع المدفوعات بنجاح");
      if (onPrintReceipt) {
        onPrintReceipt();
      }
      
      // Invalidate relevant queries based on active tab
      if (activeTab === 'lab') {
        queryClient.invalidateQueries({
          queryKey: ["labRequestsForVisit", visitId],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ["requestedServicesForVisit", visitId],
        });
      }
      
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", visitId],
      });
      
      // Refresh Income Summary (cash/bank/total)
      if (user?.id && currentClinicShift?.id) {
        const key = ["userShiftIncomeSummary", user.id, currentClinicShift.id] as const;
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.refetchQueries({ queryKey: key, type: 'active' });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في المعالجة");
    },
  });

  // Expose imperative handle to parent
  useImperativeHandle(ref, () => ({
    triggerPayAll: () => {
      if (!payAllMutation.isPending) {
        payAllMutation.mutate();
      }
    }
  }), [payAllMutation]);

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      if (!visitId) throw new Error("No visit ID provided");
      
      // This would typically call your PDF generation API
      // For now, using a placeholder endpoint
      const response = await fetch(`/api/doctor-visits/${visitId}/receipt.pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    onSuccess: (url) => {
      setPdfUrl(url);
      setIsPdfDialogOpen(true);
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إنشاء ملف PDF");
    },
    onSettled: () => {
      setIsGeneratingPdf(false);
    },
  });

  // Calculate item balance
  const calculateItemBalance = (rs: RequestedService) => {
    const price = Number(rs.price) || 0;
    const count = Number(rs.count) || 1;
    const itemDiscountPer = Number(rs.discount_per) || 0;
    const itemFixedDiscount = Number(rs.discount) || 0;
    const itemEndurance = Number(rs.endurance) || 0;

    const subTotal = price * count;
    const discountAmountFromPercentage = (subTotal * itemDiscountPer) / 100;
    const totalItemDiscount = discountAmountFromPercentage + itemFixedDiscount;
    const isCompanyPatient = Boolean(visit?.patient?.company_id || visit?.patient?.company);
    const netPrice = subTotal - totalItemDiscount - (isCompanyPatient ? 0 : itemEndurance);
    const amountPaid = Number(rs.amount_paid) || 0;
    if (isCompanyPatient) {
      const remaining = itemEndurance - amountPaid;
      return remaining > 0 ? remaining : 0;
    }
    return netPrice - amountPaid;
  };

  // const handleViewPdf = () => {
  //   if (pdfUrl) {
  //     setIsPdfDialogOpen(true);
  //   } else {
  //     setIsGeneratingPdf(true);
  //     generatePdfMutation.mutate();
  //   }
  // };

  if (!visitId) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-4 text-muted-foreground">
        <FileText className="h-12 w-12 mb-2" />
        <p>اختر مريضاً لعرض التفاصيل</p>
      </div>
    );
  }

  if (isLoadingVisit || isLoadingServices || isLoadingLab) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-4 text-muted-foreground">
        <FileText className="h-12 w-12 mb-2" />
        <p>الزيارة غير موجودة</p>
      </div>
    );
  }

  // Calculate totals depending on active tab
  let total = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  if (activeTab === 'lab') {
    total = labRequests.reduce((sum, lr) => {
      const price = Number(lr.price) || 0;
      const count = Number(lr.count) || 1;
      const discountPer = Number(lr.discount_per) || 0;
      const endurance = Number(lr.endurance) || 0;
      const subTotal = price * count;
      const discountAmount = (subTotal * discountPer) / 100;
      const net = subTotal - discountAmount - endurance;
      return sum + net;
    }, 0);
    totalPaid = labRequests.reduce((sum, lr) => sum + (Number(lr.amount_paid) || 0), 0);
    totalBalance = total - totalPaid;
  } else {
    total = requestedServices.reduce((sum, service) => {
      const price = Number(service.price) || 0;
      const count = Number(service.count) || 1;
      return sum + (price * count);
    }, 0);
    totalPaid = requestedServices.reduce((sum, service) => {
      return sum + (Number(service.amount_paid) || 0);
    }, 0);
    // For company patients, remaining balance is sum of (endurance - amount_paid)
    const isCompanyPatient = Boolean(visit.patient?.company_id || visit.patient?.company);
    totalBalance = isCompanyPatient
      ? requestedServices.reduce((sum, service) => {
          const endurance = Number(service.endurance) || 0;
          const paid = Number(service.amount_paid) || 0;
          const remaining = endurance - paid;
          return sum + (remaining > 0 ? remaining : 0);
        }, 0)
      : requestedServices.reduce((sum, service) => sum + calculateItemBalance(service), 0);
  }

  const patientName = visit.patient?.name;
  const doctorName = visit.doctor?.name;
  const phone = visit.patient?.phone;
  const date = visit.created_at ? visit.created_at.slice(0, 10) : "";
  const serial = visit.id?.toString();
  const registeredBy = visit.created_by_user?.name;

  // Function to copy serial number to clipboard
  const handleCopySerial = async () => {
    if (serial) {
      try {
        await navigator.clipboard.writeText(serial);
        toast.success("تم نسخ المتسلسل");
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = serial;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success("تم نسخ المتسلسل");
      }
    }
  };

  return (
    <>
      <div className="flex flex-col h-full w-full items-center justify-start p-1 bg-background">
        <div className="flex flex-col h-full w-full justify-start p-1 bg-background">
            {/* Patient Name */}
        <div className="w-full text-center font-bold text-lg border-b border-border pb-1 mb-1 text-foreground">
          {patientName}
        </div>
 {/* TODO: Add icons */}
 <div className="patient-details">
        {/* Custom Serial Row with Copy Button */}
        <div className="flex items-center py-1 px-0.5 rounded hover:bg-muted/50 transition-colors">
          <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mr-1.5">
            <FileText size={12} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <span className="font-bold text-sm mr-2">المتسلسل</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-foreground truncate max-w-[60%]" title={serial}>
                {serial ?? "-"}
              </span>
              <button
                onClick={handleCopySerial}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="نسخ المتسلسل"
              >
                <Copy size={14} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
        </div>
        <div className="h-px bg-border my-1" />
        
        <ItemRow label="الطبيب" value={doctorName} />
        <ItemRow label="الهاتف" value={phone} icon={Phone}/>
        <ItemRow label="التاريخ" value={date} icon={CalendarDays}/>
        <ItemRow label="بواسطة" value={registeredBy} />
</div>
        
        {/* Details Table */}
        {/* <table className="w-full text-sm mb-4 text-foreground">
          <tbody>
            <tr>
              <td className="text-right text-muted-foreground py-1">الطبيب</td>
              <td className="text-left font-medium px-2">{doctorName}</td>
            </tr>
            <tr>
              <td className="text-right text-muted-foreground py-1">الهاتف</td>
              <td className="text-left font-medium px-2">{phone}</td>
            </tr>
            <tr>
              <td className="text-right text-muted-foreground py-1">التاريخ</td>
              <td className="text-left font-medium px-2">{date}</td>
            </tr>
            <tr>
              <td className="text-right text-muted-foreground py-1">المتسلسل </td>
              <td className="text-left font-medium px-2">{serial}</td>
            </tr>
            <tr>
              <td className="text-right text-muted-foreground py-1"> بواسطة</td>
              <td className="text-left font-medium px-2">{registeredBy}</td>
            </tr>
          </tbody>
        </table> */}

        {/* Patient Company Details */}
        {visit.patient && (
          <div className="w-full mb-4">
            <PatientCompanyDetails patient={visit.patient} />
          </div>
        )}


        {/* Financial Summary (switches based on activeTab) */}
        <div className="w-full bg-muted/30 rounded-lg border border-border flex flex-col items-center mb-4">
          <div className="flex w-full">
            <div className="flex-1 text-center p-3 border-r border-border">
              <div className="text-xs text-muted-foreground">{activeTab === 'lab' ? 'إجمالي المختبر' : 'المجموع'}</div>
              <div className="text-lg font-bold text-foreground">{total.toLocaleString()}</div>
            </div>
            <div className="flex-1 text-center p-3 border-r border-border">
              <div className="text-xs text-muted-foreground">{activeTab === 'lab' ? 'المدفوع للمختبر' : 'المدفوع'}</div>
              <div className="text-lg text-green-600 font-bold">{totalPaid.toLocaleString()}</div>
            </div>
            <div className="flex-1 text-center p-3">
              <div className="text-xs text-muted-foreground">{activeTab === 'lab' ? 'المتبقي للمختبر' : 'المتبقي'}</div>
              <div className={cn(
                "text-lg font-bold",
                totalBalance > 0.009 ? "text-red-600" : "text-green-600"
              )}>
                {totalBalance.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

     

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          {/* Pay All Button - Services Tab */}
          {activeTab === 'services' && totalBalance > 0.009 && currentClinicShiftId && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => payAllMutation.mutate()}
              disabled={payAllMutation.isPending}
            >
              {payAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              دفع الكل
            </Button>
          )}

          {/* Lab Payment Button - Lab Tab */}
          {activeTab === 'lab' && totalBalance > 0.009 && currentClinicShiftId && (
            <button
              className={`w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center ${totalBalance === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => payAllMutation.mutate()}
              disabled={payAllMutation.isPending || totalBalance === 0}
            >
              {payAllMutation.isPending ? (
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : null}
              {"دفع الكل"}
            </button>
          )}

        </div>
        </div>
        <div>
                  {/* Services Income Summary (Total paid split into Cash / Bank)
           {activeTab === 'services' && currentClinicShift && (
          <div className="w-60 mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-4">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">حسابات الخدمات</span>
                </div>
                {isLoadingServicesSummary && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>

              {servicesShiftSummary ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Coins className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-gray-600">كاش</span>
                    </div>
                    <span className="text-sm font-medium text-green-700">
                      {formatNumber(servicesShiftSummary.service_income.cash)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Landmark className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-gray-600">بنكك</span>
                    </div>
                    <span className="text-sm font-medium text-purple-700">
                      {formatNumber(servicesShiftSummary.service_income.bank)}
                    </span>
                  </div>

                  <div className="border-t border-blue-200 pt-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-800">الإجمالي المدفوع</span>
                      </div>
                      <span className="text-sm font-bold text-blue-800">
                        {formatNumber(servicesShiftSummary.service_income.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : !isLoadingServicesSummary ? (
                <div className="text-center py-2">
                  <span className="text-xs text-gray-500">لا توجد بيانات</span>
                </div>
              ) : null}
            </div>
          </div>
        )} */}
        </div>
      
   
      </div>

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        isOpen={isPdfDialogOpen}
        onOpenChange={setIsPdfDialogOpen}
        pdfUrl={pdfUrl}
        title="معاينة الإيصال"
        fileName={`receipt-${visitId}.pdf`}
        isLoading={isGeneratingPdf || generatePdfMutation.isPending}
      />
    </>
  );
});

PatientDetailsColumnClinic.displayName = 'PatientDetailsColumnClinic';

export default PatientDetailsColumnClinic;