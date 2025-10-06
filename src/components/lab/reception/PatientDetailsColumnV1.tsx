import { forwardRef, useImperativeHandle, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import PatientCompanyDetails from "./PatientCompanyDetails";
import PatientInfoDialog from "@/components/clinic/PatientInfoDialog";
import { Button } from "@/components/ui/button";
import { User, Loader2, Mail } from "lucide-react";
import { getLabRequestsForVisit } from "@/services/labRequestService";
import { realtimeUrlFromConstants } from "@/pages/constants";
import { useAuth } from "@/contexts/AuthContext";
import LabUserShiftSummary from "./LabUserShiftSummary";
// import { showJsonDialog } from "@/lib/showJsonDialog";

interface PatientDetailsColumnV1Props {
  activeVisitId: number | null;
  visit?: DoctorVisit;
  onPrintReceipt: () => void;
}

export interface PatientDetailsColumnV1Ref {
  triggerPayment: () => void;
}
const getAge = (visit: DoctorVisit) => {
  const age_year = visit?.patient?.age_year || 0
  const age_month = visit?.patient?.age_month || 0
  const age_day = visit?.patient?.age_day || 0

  return `${age_year} سنة ${age_month} شهر ${age_day} يوم`
}

const PatientDetailsColumnV1 = forwardRef<PatientDetailsColumnV1Ref, PatientDetailsColumnV1Props>(({
  activeVisitId,
  visit,
  onPrintReceipt,
}, ref) => {
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();
  const [isPatientInfoDialogOpen, setIsPatientInfoDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Lab shift summary moved to LabUserShiftSummary component

  const payAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/doctor-visits/${activeVisitId}/pay-all-lab-requests`);
      return response.data;
    },
    onSuccess: async () => {
      // toast.success("تمت معالجة جميع المدفوعات بنجاح");
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
  const registeredBy = visit?.patient?.user?.username
  const paymentMethod = "cash"
  const total = visit?.total_amount
  const received = visit?.total_paid
  const balance = visit?.balance_due
  const age = getAge(visit!)

  // alert(JSON.stringify(visit,null,2))
  // showJsonDialog(visit, { title: 'Visit JSON' });  
  return (
    <div className="flex flex-col h-full w-full p-2 justify-between">
      <div>
 <div className="flex flex-col h-full w-full items-center justify-start p-2">
      {/* Patient Name */}
      <div className="w-full text-center font-bold text-xl border-b border-gray-300 pb-1 mb-2">
        {patientName}
      </div>
      
      {/* Patient Info + SMS Buttons */}
      <div className="w-full grid grid-cols-2 gap-2 mb-2">
        {visit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPatientInfoDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2"
          >
            <User className="h-4 w-4" />
            تفاصيل المريض
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!phone) {
              toast.error("رقم الهاتف غير متوفر");
              return;
            }
            const defaultMsg = `مرحباً ${patientName || ''}`.trim() + (patientName ? "، " : " ") + "نتمنى لك صحة جيدة.";
            setSmsMessage(defaultMsg);
            setIsSmsDialogOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2"
          disabled={!phone}
          title={!phone ? "لا يوجد رقم هاتف" : "إرسال رسالة SMS"}
        >
          <Mail className="h-4 w-4" />
          SMS
        </Button>
      </div>
      {/* Details Table */}
      <table className="w-full text-base mb-2">
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
          <tr>
            <td className="text-right text-gray-700">العمر</td>
            <td className="text-left font-medium">{age}</td>
          </tr>
          <tr>
       
          </tr>
        </tbody>
      </table>

      {/* Patient Company Details */}
      {visit?.patient && (
        <PatientCompanyDetails patient={visit.patient} />
      )}

      {/* Patient Discount Comment (if any) */}
      {visit?.patient?.discount_comment && (
        <div className="w-full bg-yellow-50 rounded border border-yellow-200 p-2 mb-2 text-sm text-yellow-800">
          <div className="font-semibold mb-1">تعليق الخصم</div>
          <div className="whitespace-pre-wrap">{visit.patient.discount_comment}</div>
        </div>
      )}

   
      {/* Financial Summary */}
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center mb-2">
        <div className="flex w-full">
          <div className="flex-1 text-center p-2 border-l border-gray-200">
            <div className="text-sm text-gray-500">TOTAL</div>
            <div className="text-xl font-bold">{total?.toLocaleString()}</div>
          </div>
          <div className="flex-1 text-center p-2 border-l border-gray-200">
            <div className="text-sm text-gray-500">Paid</div>
            <div className="text-xl text-green-600 font-bold">{received?.toLocaleString()}</div>
          </div>
          <div className="flex-1 text-center p-2">
            <div className="text-sm text-gray-500">Balance</div>
            <div className="text-xl font-bold text-red-600">{balance?.toLocaleString()}</div>
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

      {/* SMS Dialog */}
      {isSmsDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[92%] max-w-md bg-white rounded-md shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="font-semibold">إرسال رسالة SMS</span>
              </div>
              <button
                onClick={() => setIsSmsDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-600 mb-2">إلى: {phone || 'غير متوفر'}</div>
            <textarea
              className="w-full border rounded-md p-2 min-h-[120px] mb-3"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="اكتب نص الرسالة هنا"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSmsDialogOpen(false)}
                disabled={isSendingSms}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!phone) {
                    toast.error("رقم الهاتف غير متوفر");
                    return;
                  }
                  if (!smsMessage.trim()) {
                    toast.error("الرسالة مطلوبة");
                    return;
                  }
                  try {
                    setIsSendingSms(true);
                    await apiClient.post('/sms/send', {
                      messages: [
                        { to: phone.startsWith('249') ? phone : `249${phone.replace(/^0/, '')}`, message: smsMessage }
                      ]
                    });
                    toast.success("تم إرسال الرسالة بنجاح");
                    setIsSmsDialogOpen(false);
                  } catch {
                    toast.error("فشل إرسال الرسالة");
                  } finally {
                    setIsSendingSms(false);
                  }
                }}
                disabled={isSendingSms}
              >
                {isSendingSms ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </span>
                ) : (
                  'إرسال'
                )}
              </Button>
            </div>
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