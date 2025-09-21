import { forwardRef, useImperativeHandle, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import PatientCompanyDetails from "./PatientCompanyDetails";
import PatientInfoDialog from "@/components/clinic/PatientInfoDialog";
import { Button } from "@/components/ui/button";
import { User, DollarSign, Landmark, Coins, TrendingUp, Loader2 } from "lucide-react";
import { getLabRequestsForVisit } from "@/services/labRequestService";
import { realtimeUrlFromConstants } from "@/pages/constants";
import { fetchCurrentUserLabIncomeSummary, type LabUserShiftIncomeSummary } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { formatNumber } from "@/lib/utils";

interface PatientDetailsColumnV1Props {
  activeVisitId: number | null;
  visit?: DoctorVisit;
  onPrintReceipt: () => void;
}

export interface PatientDetailsColumnV1Ref {
  triggerPayment: () => void;
}

const PatientDetailsColumnV1 = forwardRef<PatientDetailsColumnV1Ref, PatientDetailsColumnV1Props>(({
  activeVisitId,
  visit,
  onPrintReceipt,
}, ref) => {
  const queryClient = useQueryClient();
  const { user, currentClinicShift } = useAuth();
  const [isPatientInfoDialogOpen, setIsPatientInfoDialogOpen] = useState(false);

  // Fetch lab shift summary
  const { data: labShiftSummary, isLoading: isLoadingSummary } = useQuery<LabUserShiftIncomeSummary>({
    queryKey: ['labUserShiftIncomeSummary', user?.id, currentClinicShift?.id],
    queryFn: () => fetchCurrentUserLabIncomeSummary(currentClinicShift!.id),
    enabled: !!currentClinicShift && !!user,
    // refetchInterval: 30000, // Refetch every 30 seconds
  });

  const payAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/doctor-visits/${activeVisitId}/pay-all-lab-requests`);
      return response.data;
    },
    onSuccess: async () => {
      toast.success("تمت معالجة جميع المدفوعات بنجاح");
      onPrintReceipt();
      
      // Emit lab-payment event
      try {
        if (visit && visit.patient) {
          // Fetch lab requests for this visit
          const labRequests = await getLabRequestsForVisit(activeVisitId!);
          
          // Emit the lab-payment event
          const realtimeUrl = realtimeUrlFromConstants || 'http://localhost:4001';
          await fetch(`${realtimeUrl}/emit/lab-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': import.meta.env.VITE_SERVER_AUTH_TOKEN || 'changeme'
            },
            body: JSON.stringify({
              visit: visit,
              patient: visit.patient,
              labRequests: labRequests
            })
          });
          
          console.log('Lab payment event emitted successfully');
        }
      } catch (error) {
        console.error('Failed to emit lab-payment event:', error);
        // Don't show error to user as payment was successful
      }

      // Emit print lab receipt event
      try {
        if (visit && visit.patient) {
          const realtimeUrl = realtimeUrlFromConstants || 'http://localhost:4001';
          await fetch(`${realtimeUrl}/emit/print-lab-receipt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': import.meta.env.VITE_SERVER_AUTH_TOKEN || 'changeme'
            },
            body: JSON.stringify({
              visit_id: visit.id,
              patient_id: visit.patient.id,
              lab_request_ids: visit.lab_requests?.map(req => req.id) || []
            })
          });
          
          console.log('Print lab receipt event emitted successfully');
        }
      } catch (error) {
        console.error('Failed to emit print lab receipt event:', error);
        // Don't show error to user as payment was successful
      }
      
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الدفع");
    },
  });

  // Expose the payment function via ref
  useImperativeHandle(ref, () => ({
    triggerPayment: () => {
      if (activeVisitId && balance !== 0 && !payAllMutation.isPending) {
        payAllMutation.mutate();
      }
    },
  }));

  // Placeholder data for demonstration
  const patientName = visit?.patient?.name 
  const doctorName = visit?.doctor?.name 
  const phone = visit?.patient?.phone 
  const date = visit?.created_at ? visit.created_at.slice(0, 10) : "";
  const serial = visit?.id?.toString() 
  const registeredBy = visit?.created_by_user?.name
  const paymentMethod = "cash"
  const total = visit?.total_amount
  const received = visit?.total_paid
  const balance = visit?.balance_due

  return (
    <div className="flex flex-col h-full w-full p-2 justify-between">
      <div>
 <div className="flex flex-col h-full w-full items-center justify-start p-2">
      {/* Patient Name */}
      <div className="w-full text-center font-bold text-base border-b border-gray-300 pb-1 mb-2">
        {patientName}
      </div>
      
      {/* Patient Info Button */}
      {visit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPatientInfoDialogOpen(true)}
          className="w-full mb-2 flex items-center justify-center gap-2"
        >
          <User className="h-4 w-4" />
          تفاصيل المريض
        </Button>
      )}
      {/* Details Table */}
      <table className="w-full text-sm mb-2">
        <tbody>
          <tr>
            <td className="text-right text-gray-700">الطبيب</td>
            <td className="text-left font-medium">{doctorName}</td>
          </tr>
          <tr>
            <td className="text-right text-gray-700">الهاتف</td>
            <td className="text-left font-medium">{phone}</td>
          </tr>
          <tr>
            <td className="text-right text-gray-700">التاريخ</td>
            <td className="text-left font-medium">{date}</td>
          </tr>
          <tr>
            <td className="text-right text-gray-700">المسلسل</td>
            <td className="text-left font-medium">{serial}</td>
          </tr>
          <tr>
            <td className="text-right text-gray-700">سُجل بواسطة</td>
            <td className="text-left font-medium">{registeredBy}</td>
          </tr>
       
          <tr>
            <td className="text-right text-gray-700">طريقة الدفع</td>
            <td className="text-left font-medium">{paymentMethod}</td>
          </tr>
        </tbody>
      </table>

      {/* Patient Company Details */}
      {visit?.patient && (
        <PatientCompanyDetails patient={visit.patient} />
      )}

      {/* Operations Title */}
      <div className="w-full text-center text-gray-700 font-semibold border-b border-gray-200 pb-1 mb-2">
        العمليات
      </div>
      {/* Icon Row */}
      <div className="w-full flex justify-start mb-2">
        <span className="inline-block bg-gray-100 p-2 rounded">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </span>
      </div>
      {/* Financial Summary */}
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center mb-2">
        <div className="flex w-full">
          <div className="flex-1 text-center p-2 border-l border-gray-200">
            <div className="text-xs text-gray-500">TOTAL</div>
            <div className="text-lg font-bold">{total?.toLocaleString()}</div>
          </div>
          <div className="flex-1 text-center p-2 border-l border-gray-200">
            <div className="text-xs text-gray-500">Paid</div>
            <div className="text-lg text-green-600 font-bold">{received?.toLocaleString()}</div>
          </div>
          <div className="flex-1 text-center p-2">
            <div className="text-xs text-gray-500">Balance</div>
            <div className="text-lg font-bold text-red-600">{balance?.toLocaleString()}</div>
          </div>
          
        </div>
      </div>

    
      {/* Pay Button */}
      {activeVisitId && (
        <button
          className={`w-full bg-blue-600 text-white py-2 rounded-lg font-bold mt-2 hover:bg-blue-700 transition flex items-center justify-center ${balance === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => payAllMutation.mutate()}
          disabled={payAllMutation.isPending || balance === 0}
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
        {/* Lab Shift Summary */}
    
      {/* Patient Info Dialog */}
      {visit && (
        <PatientInfoDialog
          isOpen={isPatientInfoDialogOpen}
          onOpenChange={setIsPatientInfoDialogOpen}
          visit={visit}
        />
      )}
    </div>
      </div>
      <div className="flex items-center justify-center">
        <div>
         {currentClinicShift && (
        <div className="w-60 mt-2  bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-2">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800"> حسابات المستخدم</span>
              </div>
              {isLoadingSummary && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>
            
            {labShiftSummary ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-gray-600">كاش</span>
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    {formatNumber(labShiftSummary.total_cash)} 
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Landmark className="h-3 w-3 text-purple-600" />
                    <span className="text-xs text-gray-600">بنكك</span>
                  </div>
                  <span className="text-sm font-medium text-purple-700">
                    {formatNumber(labShiftSummary.total_bank)}
                  </span>
                </div>
                
                <div className="border-t border-blue-200 pt-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-800">الإجمالي</span>
                    </div>
                    <span className="text-sm font-bold text-blue-800">
                      {formatNumber(labShiftSummary.total_lab_income)} 
                    </span>
                  </div>
                </div>
              </div>
            ) : !isLoadingSummary ? (
              <div className="text-center py-2">
                <span className="text-xs text-gray-500">لا توجد بيانات</span>
              </div>
            ) : null}
          </div>
        </div>
      )}   
        </div>

      </div>
    </div>
   
  );
});

PatientDetailsColumnV1.displayName = 'PatientDetailsColumnV1';

export default PatientDetailsColumnV1; 