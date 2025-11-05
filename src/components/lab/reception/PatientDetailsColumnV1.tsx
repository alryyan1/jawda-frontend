import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import PatientCompanyDetails from "./PatientCompanyDetails";
import PatientInfoDialog from "@/components/clinic/PatientInfoDialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, FileText, Edit } from "lucide-react";
import { getLabRequestsForVisit } from "@/services/labRequestService";
import { realtimeUrlFromConstants } from "@/pages/constants";
// import { showJsonDialog } from "@/lib/showJsonDialog";
import LabReportPdfPreviewDialog from "@/components/common/LabReportPdfPreviewDialog";
import { hasPatientResultUrl } from "@/services/firebaseStorageService";
import { useAuthorization } from "@/hooks/useAuthorization";

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
  const [isPatientInfoDialogOpen, setIsPatientInfoDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);

  // PDF Preview state
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");
  const [pdfFileName, setPdfFileName] = useState("document.pdf");
  const { can } = useAuthorization();
  // Lab shift summary moved to LabUserShiftSummary component

  const payAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/doctor-visits/${activeVisitId}/pay-all-lab-requests`);
      return response.data;
    },
    onSuccess: async () => {
      // toast.success("تمت معالجة جميع المدفوعات بنجاح");
      onPrintReceipt();
      
      // Send print order to Zebra printer
      try {
        if (activeVisitId) {
          const printResponse = await apiClient.post(`/visits/${activeVisitId}/print-barcode`);
          fetch("http://127.0.0.1:5000/", {
            method: "POST",
            headers: {
              "Content-Type": "APPLICATION/JSON",
            },

            body: JSON.stringify(visit),
          }).then(() => {});
          if (printResponse.data.status) {
            console.log('Zebra print order sent successfully');
          } else {
            console.error('Zebra print order failed:', printResponse.data.message);
          }
        }
      } catch (error) {
        console.error('Failed to send print order to Zebra:', error);
        // Don't show error to user as payment was successful
      }
      
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
          const realtimeUrl = 'http://localhost:4002';
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

  // PDF helpers
  const generateAndShowPdf = useCallback(async (
    title: string,
    fileNamePrefix: string,
    fetchFunction: () => Promise<Blob>
  ) => {
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfPreviewTitle(title);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await fetchFunction();
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      const patientNameSanitized = visit?.patient?.name?.replace(/[^A-Za-z0-9-_]/g, "_") || "patient";
      setPdfFileName(`${fileNamePrefix}_${activeVisitId}_${patientNameSanitized}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("حدث خطأ أثناء إنشاء ملف PDF", {
        description: errorMessage,
      });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [visit?.patient?.name, activeVisitId]);

  const handleViewReportPreview = useCallback(() => {
    if (!activeVisitId) return;
    generateAndShowPdf(
      "معاينة تقرير المختبر",
      "LabReport",
      () => apiClient.get(`/visits/${activeVisitId}/lab-report/pdf`, { responseType: "blob" }).then(res => res.data)
    );
  }, [activeVisitId, generateAndShowPdf]);

  const handlePdfDialogOpenChange = useCallback((open: boolean) => {
    setIsPdfPreviewOpen(open);
    if (!open && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  // Placeholder data for demonstration
  const patientName = visit?.patient?.name 
  const doctorName = visit?.doctor?.name 
  const phone = visit?.patient?.phone 
  const date = visit?.created_at ? visit.created_at.slice(0, 10) : "";
  const serial = visit?.id?.toString() 
  const registeredBy = visit?.patient?.user?.username
  const paymentMethod = "cash"
  const total = visit?.total_lab_amount
  const received = visit?.total_lab_paid
  const balance = visit?.total_lab_balance
  const age = getAge(visit!)

  // alert(JSON.stringify(visit,null,2))
  // showJsonDialog(visit, { title: 'Visit JSON' });  
  return (
    <div className="flex flex-col h-full w-full  justify-between p-2">
      <div>
 <div className="flex flex-col h-full w-full items-center justify-start ">
      {/* Patient Name */}
      <div className="w-full text-center font-bold text-xl border-b border-gray-300 pb-1 mb-1">
        {patientName}
      </div>
      
      {/* Patient Info + SMS Buttons */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 ">
        {visit && can('تعديل بيانات') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPatientInfoDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Edit className="h-4 w-4" />
            تعديل البيانات
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
      <table className="w-full text-base mb-1 ">
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="text-right text-gray-700">الطبيب</td>
            <td className="text-left font-medium">{doctorName}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="text-right text-gray-700">الهاتف</td>
            <td className="text-left font-medium">{phone}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="text-right text-gray-700">التاريخ</td>
            <td className="text-left font-medium">{date}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="text-right text-gray-700">الكود</td>
            <td className="text-left font-medium">{serial}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="text-right text-gray-700">سُجل بواسطة</td>
            <td className="text-left font-medium">{registeredBy}</td>
          </tr>
       
          <tr className="border-b border-gray-200">
            <td className="text-right text-gray-700">طريقة الدفع</td>
            <td className="text-left font-medium">{paymentMethod}</td>
          </tr>
          <tr className="border-b border-gray-200">
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
        <div className="w-full bg-yellow-50 rounded border border-yellow-200 p-2  text-sm text-yellow-800">
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
        <Button
          className={`w-full bg-blue-600 text-white py-2 rounded-lg font-bold mt-2 hover:bg-blue-700 transition flex items-center justify-center ${balance === 0 && visit?.company ? "cursor-not-allowed" : !can('سداد فحص') ? "cursor-not-allowed" : ""}`}
          onClick={() => payAllMutation.mutate()}
          disabled={!can('سداد فحص')}
          // disabled={payAllMutation.isPending || balance === 0}
        >
          {payAllMutation.isPending ? (
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          ) : null}
          {"دفع الكل"}
        </Button>
      )}
      {/* Preview Lab Report Button (visible only if results are authenticated) */}
      {visit?.patient && visit.patient.result_auth && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 flex items-center justify-center gap-2"
          onClick={handleViewReportPreview}
          disabled={!activeVisitId || isGeneratingPdf}
          title={"معاينة التقرير"}
        >
          <FileText className="h-4 w-4" />
          معاينة التقرير
          {hasPatientResultUrl(visit.patient) && (
            <span className="ml-1 text-green-500 text-xs">☁️</span>
          )}
        </Button>
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
                    const response = await apiClient.post('/sms/send', {
                      messages: [
                        { to: phone.startsWith('249') ? phone : `249${phone.replace(/^0/, '')}`, message: smsMessage }
                      ]
                    });
                    
                    // Check if the response indicates success
                    if (response.data && response.data.success) {
                      toast.success("تم إرسال الرسالة بنجاح");
                      setIsSmsDialogOpen(false);
                    } else {
                      // Extract error message from response
                      const errorMessage = response.data?.error || response.data?.message || "فشل إرسال الرسالة";
                      toast.error(`فشل إرسال الرسالة: ${errorMessage}`);
                    }
                  } catch (error: any) {
                    // Handle network errors or other exceptions
                    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "فشل إرسال الرسالة";
                    toast.error(`فشل إرسال الرسالة: ${errorMessage}`);
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
      {/* Lab Report PDF Preview Dialog */}
      <LabReportPdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={handlePdfDialogOpenChange}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={pdfPreviewTitle}
        fileName={pdfFileName}
      />
    </div>
      </div>
      
    </div>
   
  );
});

PatientDetailsColumnV1.displayName = 'PatientDetailsColumnV1';

export default PatientDetailsColumnV1; 