import { useState, forwardRef, useImperativeHandle } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDoctorVisitById, recordServicePayment } from "@/services/visitService";
import { getRequestedServicesForVisit } from "@/services/visitService";
import type { RequestedService } from "@/types/services";
import PatientCompanyDetails from "../lab/reception/PatientCompanyDetails";
import PdfPreviewDialog from "../common/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, FileText, Printer, Phone, CalendarDays, Copy, Stethoscope, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import realtimeService from "@/services/realtimeService";
import { useAuthorization } from "@/hooks/useAuthorization";
import apiClient from "@/services/api";
import { Divider } from "@mui/material";

export interface PatientDetailsColumnClinicProps {
  visitId: number | null;
  onPrintReceipt?: () => void;
  currentClinicShiftId?: number | null;
  activeTab?: 'services' | 'lab';
}

export interface PatientDetailsColumnClinicRef {
  triggerPayAll: () => void;
}

const InfoCell = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-center gap-1 min-w-0 py-0.5">
    <span className="text-muted-foreground shrink-0">{icon}</span>
    <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
    <span className="text-xs font-medium truncate text-foreground">{value ?? "-"}</span>
  </div>
);

const StatCell = ({ label, value, className }: { label: string; value: number; className?: string }) => (
  <div className="flex flex-col items-center py-2">
    <span className="text-[10px] text-muted-foreground mb-0.5">{label}</span>
    <span className={cn("text-sm font-bold tabular-nums", className)}>{value.toLocaleString()}</span>
  </div>
);

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
  const { can } = useAuthorization();

  const { data: visit, isLoading: isLoadingVisit } = useQuery({
    queryKey: ["doctorVisit", visitId],
    queryFn: () => getDoctorVisitById(visitId!),
    enabled: !!visitId,
  });

  const { data: requestedServices = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["requestedServicesForVisit", visitId],
    queryFn: () => getRequestedServicesForVisit(visitId!),
    enabled: !!visitId,
  });

  const { isLoading: isLoadingLab } = useQuery({
    queryKey: ["labRequestsForVisit", visitId],
    queryFn: async () => {
      const { getLabRequestsForVisit } = await import("@/services/labRequestService");
      return getLabRequestsForVisit(visitId!);
    },
    enabled: !!visitId,
  });

  const payAllMutation = useMutation({
    mutationFn: async () => {
      if (!visitId || !currentClinicShiftId) {
        throw new Error("Missing visit ID or clinic shift ID");
      }

      if (activeTab === 'lab') {
        const { default: apiClient } = await import("@/services/api");
        const response = await apiClient.post(`/doctor-visits/${visitId}/pay-all-lab-requests`);
        return response.data;
      } else {
        const unpaidServices = requestedServices.filter(service => calculateItemBalance(service) > 0.009);
        if (unpaidServices.length === 0) throw new Error("لا توجد خدمات غير مدفوعة");
        await Promise.all(
          unpaidServices.map(service =>
            recordServicePayment({
              requested_service_id: service.id,
              amount: calculateItemBalance(service),
              is_bank: false,
              shift_id: currentClinicShiftId,
            })
          )
        );
        return unpaidServices;
      }
    },
    onSuccess: async () => {
      toast.success("تم معالجة جميع المدفوعات بنجاح");

      if (activeTab === 'services' && visitId) {
        realtimeService.printServicesReceipt(visitId, visit?.patient_id)
          .then(result => {
            if (result.success) toast.success('تم طباعة إيصال الخدمات بنجاح');
            else toast.error(result.error || 'فشل في طباعة إيصال الخدمات');
          })
          .catch(() => toast.error('حدث خطأ أثناء طباعة إيصال الخدمات'));
      }

      if (activeTab === 'lab' && onPrintReceipt) onPrintReceipt();

      queryClient.invalidateQueries({
        queryKey: activeTab === 'lab' ? ["labRequestsForVisit", visitId] : ["requestedServicesForVisit", visitId],
      });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit", visitId] });

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

  useImperativeHandle(ref, () => ({
    triggerPayAll: () => { if (!payAllMutation.isPending) payAllMutation.mutate(); }
  }), [payAllMutation]);

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      if (!visitId) throw new Error("No visit ID provided");
      const response = await apiClient.get(`/visits/${visitId}/clinic-invoice/pdf`, {
        responseType: "blob",
        headers: { "X-Suppress-Error-Toast": "1" },
      } as { responseType: "blob"; headers?: Record<string, string> });
      return URL.createObjectURL(response.data as Blob);
    },
    onSuccess: (url) => { setPdfUrl(url); setIsPdfDialogOpen(true); },
    onError: (error: unknown) => {
      const data = (error as { response?: { data?: Blob | { message?: string } } })?.response?.data;
      if (data instanceof Blob) {
        data.text().then(text => {
          try { toast.error((JSON.parse(text) as { message?: string }).message || "فشل في إنشاء ملف PDF"); }
          catch { toast.error("فشل في إنشاء ملف PDF"); }
        }).catch(() => toast.error("فشل في إنشاء ملف PDF"));
      } else {
        toast.error((data as { message?: string })?.message || "فشل في إنشاء ملف PDF");
      }
    },
  });

  const calculateItemBalance = (rs: RequestedService) => {
    const price = Number(rs.price) || 0;
    const count = Number(rs.count) || 1;
    const itemDiscountPer = Number(rs.discount_per) || 0;
    const itemFixedDiscount = Number(rs.discount) || 0;
    const itemEndurance = Number(rs.endurance) || 0;
    const subTotal = price * count;
    const totalItemDiscount = (subTotal * itemDiscountPer) / 100 + itemFixedDiscount;
    const isCompanyPatient = Boolean(visit?.patient?.company_id || visit?.patient?.company);
    const amountPaid = Number(rs.amount_paid) || 0;
    if (isCompanyPatient) {
      const remaining = itemEndurance - amountPaid;
      return remaining > 0 ? remaining : 0;
    }
    return subTotal - totalItemDiscount - itemEndurance - amountPaid;
  };

  if (!visitId) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-2 p-4 text-muted-foreground">
        <FileText className="h-10 w-10 opacity-40" />
        <p className="text-sm">اختر مريضاً لعرض التفاصيل</p>
      </div>
    );
  }

  if (isLoadingVisit || isLoadingServices || isLoadingLab) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-2 p-4">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-2 p-4 text-muted-foreground">
        <FileText className="h-10 w-10 opacity-40" />
        <p className="text-sm">الزيارة غير موجودة</p>
      </div>
    );
  }

  let total = 0, totalPaid = 0, totalBalance = 0;
  if (activeTab === 'lab') {
    total = visit.total_lab_amount!;
    totalPaid = visit.total_lab_paid!;
    totalBalance = visit.total_lab_balance!;
  } else {
    const isCompanyPatient = Boolean(visit.patient?.company_id || visit.patient?.company);
    total = requestedServices.reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.count) || 1), 0);
    totalPaid = requestedServices.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
    totalBalance = isCompanyPatient
      ? requestedServices.reduce((s, r) => {
          const rem = (Number(r.endurance) || 0) - (Number(r.amount_paid) || 0);
          return s + (rem > 0 ? rem : 0);
        }, 0)
      : requestedServices.reduce((s, r) => s + calculateItemBalance(r), 0);
  }

  const patientName = visit.patient?.name;
  const serial = visit.id?.toString();

  const handleCopySerial = async () => {
    if (!serial) return;
    await navigator.clipboard.writeText(serial).catch(() => null);
    toast.success("تم نسخ المتسلسل");
  };

  const isPaying = payAllMutation.isPending;

  return (
    <>
      <div className="flex flex-col h-full w-full p-2 gap-2 bg-background overflow-y-auto">

        {/* Patient Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <User size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate text-foreground">{patientName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-muted-foreground">#{serial}</span>
              <button onClick={handleCopySerial} className="p-0.5 hover:bg-muted rounded transition-colors" title="نسخ المتسلسل">
                <Copy size={11} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-x-3 border-b border-border pb-2">
          <InfoCell icon={<Stethoscope size={11} />} label="الطبيب" value={visit.doctor?.name} />
          <Divider/>
          <InfoCell icon={<Phone size={11} />} label="الهاتف" value={visit.patient?.phone} />
          <Divider/>

          <InfoCell icon={<CalendarDays size={11} />} label="التاريخ" value={visit.created_at?.slice(0, 10)} />
          <Divider/>
          <InfoCell icon={<User size={11} />} label="بواسطة" value={visit.created_by_user?.name} />
          <Divider/>  
          <InfoCell icon={<CalendarDays size={11} />} label="العمر" value={[
            visit.patient?.age_year ? `${visit.patient.age_year}س` : null,
            visit.patient?.age_month ? `${visit.patient.age_month}ش` : null,
            visit.patient?.age_day ? `${visit.patient.age_day}ي` : null,
          ].filter(Boolean).join(' ') || null} />
          
       
        </div>

        {/* Company Details */}
        {visit.patient && <PatientCompanyDetails patient={visit.patient} />}

        {/* Financial Summary */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border overflow-hidden">
          <StatCell label="المجموع" value={total} className="text-foreground" />
          <StatCell label="المدفوع" value={totalPaid} className="text-green-600" />
          <StatCell
            label="المتبقي"
            value={totalBalance}
            className={totalBalance > 0.009 ? "text-red-600" : "text-green-600"}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 mt-auto pt-1">
          {activeTab === 'services' && totalBalance > 0.009 && currentClinicShiftId && (
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
              onClick={() => payAllMutation.mutate()}
              disabled={isPaying || !can('سداد خدمه')}
            >
              {isPaying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
              دفع الكل
            </Button>
          )}

          {activeTab === 'lab' && totalBalance > 0.009 && currentClinicShiftId && (
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
              onClick={() => payAllMutation.mutate()}
              disabled={isPaying || !can('سداد فحص')}
            >
              {isPaying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
              دفع الكل
            </Button>
          )}

          {activeTab === 'services' && requestedServices.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={() => generatePdfMutation.mutate()}
              disabled={generatePdfMutation.isPending}
            >
              {generatePdfMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Printer className="h-3.5 w-3.5 mr-1.5" />}
              عرض الفاتورة
            </Button>
          )}
        </div>
      </div>

      <PdfPreviewDialog
        isOpen={isPdfDialogOpen}
        onOpenChange={setIsPdfDialogOpen}
        pdfUrl={pdfUrl}
        title="معاينة الفاتورة"
        fileName={`clinic-invoice-${visitId}.pdf`}
        isLoading={generatePdfMutation.isPending}
      />
    </>
  );
});

PatientDetailsColumnClinic.displayName = 'PatientDetailsColumnClinic';

export default PatientDetailsColumnClinic;
