import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDoctorVisitById, recordServicePayment } from "@/services/visitService";
import { getRequestedServicesForVisit } from "@/services/visitService";
import type { RequestedService } from "@/types/services";
import PatientCompanyDetails from "../lab/reception/PatientCompanyDetails";
import PdfPreviewDialog from "../common/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientDetailsColumnClinicProps {
  visitId: number | null;
  onPrintReceipt?: () => void;
  currentClinicShiftId?: number | null;
  activeTab?: 'services' | 'lab';
}

const PatientDetailsColumnClinic: React.FC<PatientDetailsColumnClinicProps> = ({
  visitId,
  onPrintReceipt,
  currentClinicShiftId,
  activeTab = 'services',
}) => {
  const queryClient = useQueryClient();
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

  // Pay all unpaid services mutation
  const payAllMutation = useMutation({
    mutationFn: async () => {
      if (!visitId || !currentClinicShiftId) {
        throw new Error("Missing visit ID or clinic shift ID");
      }

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
    },
    onSuccess: () => {
      toast.success("تم معالجة جميع المدفوعات بنجاح");
      if (onPrintReceipt) {
        onPrintReceipt();
      }
      queryClient.invalidateQueries({
        queryKey: ["requestedServicesForVisit", visitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", visitId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في المعالجة");
    },
  });

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

  // Calculate item balance (same logic as RequestedServicesTable)
  const calculateItemBalance = (rs: RequestedService) => {
    const price = Number(rs.price) || 0;
    const count = Number(rs.count) || 1;
    const itemDiscountPer = Number(rs.discount_per) || 0;
    const itemFixedDiscount = Number(rs.discount) || 0;
    const itemEndurance = Number(rs.endurance) || 0;

    const subTotal = price * count;
    const discountAmountFromPercentage = (subTotal * itemDiscountPer) / 100;
    const totalItemDiscount = discountAmountFromPercentage + itemFixedDiscount;
    const netPrice = subTotal - totalItemDiscount - itemEndurance;
    const amountPaid = Number(rs.amount_paid) || 0;
    
    return netPrice - amountPaid;
  };

  const handleViewPdf = () => {
    if (pdfUrl) {
      setIsPdfDialogOpen(true);
    } else {
      setIsGeneratingPdf(true);
      generatePdfMutation.mutate();
    }
  };

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
    totalBalance = requestedServices.reduce((sum, service) => {
      return sum + calculateItemBalance(service);
    }, 0);
  }

  const patientName = visit.patient?.name;
  const doctorName = visit.doctor?.name;
  const phone = visit.patient?.phone;
  const date = visit.created_at ? visit.created_at.slice(0, 10) : "";
  const serial = visit.id?.toString();
  const registeredBy = visit.created_by_user?.name;

  return (
    <>
      <div className="flex flex-col h-full w-full items-center justify-start p-4 bg-background">
        {/* Patient Name */}
        <div className="w-full text-center font-bold text-lg border-b border-border pb-2 mb-4 text-foreground">
          {patientName}
        </div>

        {/* Details Table */}
        <table className="w-full text-sm mb-4 text-foreground">
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
              <td className="text-right text-muted-foreground py-1">رقم الزيارة</td>
              <td className="text-left font-medium px-2">{serial}</td>
            </tr>
            <tr>
              <td className="text-right text-muted-foreground py-1">مسجل بواسطة</td>
              <td className="text-left font-medium px-2">{registeredBy}</td>
            </tr>
          </tbody>
        </table>

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
          {/* Pay All Button */}
          {totalBalance > 0.009 && currentClinicShiftId && (
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

          {/* View PDF Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewPdf}
            disabled={isGeneratingPdf || generatePdfMutation.isPending}
          >
            {(isGeneratingPdf || generatePdfMutation.isPending) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            عرض الإيصال
          </Button>
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
};

export default PatientDetailsColumnClinic; 