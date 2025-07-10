import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import apiClient from "@/services/api";
import type { DoctorVisit } from "@/types/visits";
import PatientCompanyDetails from "./PatientCompanyDetails";

interface PatientDetailsColumnV1Props {
  activeVisitId: number | null;
  visit?: DoctorVisit;
  onPrintReceipt: () => void;
}

const PatientDetailsColumnV1: React.FC<PatientDetailsColumnV1Props> = ({
  activeVisitId,
  visit,
  onPrintReceipt,
}) => {
  const { t } = useTranslation(["labReception", "common"]);
  const queryClient = useQueryClient();

  const payAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/doctor-visits/${activeVisitId}/pay-all-lab-requests`);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t("labRequestsColumn.allPaymentsProcessed", "All payments processed successfully"));
      onPrintReceipt();
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
        apiError.response?.data?.message || t("common:error.paymentFailed")
      );
    },
  });

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
    <div className="flex flex-col h-full w-full items-center justify-start p-2">
      {/* Patient Name */}
      <div className="w-full text-center font-bold text-base border-b border-gray-300 pb-1 mb-2">
        {patientName}
      </div>
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
        operations
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
          {t("labRequestsColumn.payAll", "Pay All")}
        </button>
      )}
    </div>
  );
};

export default PatientDetailsColumnV1; 