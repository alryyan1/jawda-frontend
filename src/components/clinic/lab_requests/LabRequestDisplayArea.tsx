// src/components/clinic/lab_requests/LabRequestDisplayArea.tsx
import React from "react"; // Removed useMemo as summary is gone
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import type { LabRequest } from "@/types/visits";
import type { Shift } from "@/types/shifts";
import type { Patient } from "@/types/patients";
import RequestedLabTestsTable from "../RequestedLabTestsTable"; // Adjusted path
import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner"; // For toasts if needed for local actions

type DirectPayItemMutationType = UseMutationResult<
  LabRequest,
  Error,
  { labRequestId: number; is_bankak: boolean; shift_id: number },
  unknown
>;
type RemoveAllPendingMutationType = UseMutationResult<
  { message: string; deleted_count: number },
  Error,
  void,
  unknown
>;

interface LabRequestDisplayAreaProps {
  visitId: number;
  patientId: number;
  currentPatient: Patient | null;
  requestedTests: LabRequest[];
  isLoadingRequestedTests: boolean;
  isFetchingRequestedTests: boolean;
  currentClinicShift: Shift | null;
  onAddMoreTests: () => void; // This button is now in LabRequestComponent for toggling grid
  directPayItemMutation: DirectPayItemMutationType;
  removeAllPendingMutation: RemoveAllPendingMutationType;
  onOpenBatchPaymentDialog: () => void;
  cancelLabRequestMutation: UseMutationResult<
    void,
    Error,
    number,
    unknown
  >;
  unpayLabRequestMutation: UseMutationResult<
    void,
    Error,
    number,
    unknown
  >;
}

const LabRequestDisplayArea: React.FC<LabRequestDisplayAreaProps> = ({
  visitId,
  currentPatient,
  requestedTests,
  isLoadingRequestedTests,
  isFetchingRequestedTests,
  currentClinicShift,
  directPayItemMutation,
  cancelLabRequestMutation,
  unpayLabRequestMutation,
}) => {
  const { t } = useTranslation(["labTests", "common", "payments"]);
  const isCompanyPatient = !!currentPatient?.company_id;

  // calculateItemBalance and other handlers that use mutations are passed down
  const calculateItemBalance = (lr: LabRequest): number => {
    const price = Number(lr.price) || 0;
    const itemSubTotal = price; // Lab tests typically have count 1
    const discountAmount =
      (itemSubTotal * (Number(lr.discount_per) || 0)) / 100;
    const enduranceAmount = Number(lr.endurance) || 0;
    // Endurance applies for company patients
    const netPrice =
      itemSubTotal -
      discountAmount -
      (isCompanyPatient ? enduranceAmount : 0);
    return netPrice - (Number(lr.amount_paid) || 0);
  };

  const handleDirectPayIndividualItem = (labReq: LabRequest) => {
    if (!currentClinicShift?.id) {
      toast.error(t("payments:error.noActiveShiftForPayment"));
      return;
    }
    const isBankakForThisPayment = !!labReq.is_bankak;
    const balance = calculateItemBalance(labReq);

    if (balance <= 0.09) {
      // Using a small epsilon for float comparisons
      toast.info(t("payments:itemAlreadyPaidOrNoBalance"));
      return;
    }
    if (
      window.confirm(
        t("payments:confirmDirectPayLabItem", {
          amount: balance.toFixed(1),
          testName: labReq.main_test?.main_test_name,
        })
      )
    ) {
      directPayItemMutation.mutate({
        labRequestId: labReq.id,
        is_bankak: isBankakForThisPayment,
        shift_id: currentClinicShift.id,
      });
    }
  };

  const handleCancelIndividualItem = (labReq: LabRequest) => {
    cancelLabRequestMutation.mutate(labReq.id);
  };

  const handleUnpayIndividualItem = (labReq: LabRequest) => {
    unpayLabRequestMutation.mutate(labReq.id);
  };

  if (isLoadingRequestedTests && requestedTests.length === 0) {
    return (
      <div className="py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // The div that applies max-w-[700px] is now in LabRequestComponent
    // This component assumes its parent controls its width.
    <div className="h-full flex flex-col">
      {" "}
      {/* Ensure this can flex to fill height */}
      <RequestedLabTestsTable
        visitId={visitId}
        patientId={0} // Not used in the component
        currentPatient={currentPatient}
        requestedTests={requestedTests}
        isLoading={isLoadingRequestedTests}
        isFetchingList={isFetchingRequestedTests}
        currentClinicShift={currentClinicShift}
        onAddMoreTests={() => {
          /* This button is now in parent */
        }}
        onPayIndividual={handleDirectPayIndividualItem}
        onCancelIndividual={handleCancelIndividualItem}
        onUnpayIndividual={handleUnpayIndividualItem}
      />
      {/* Summary Card is removed and is now LabFinancialSummary in the parent component */}
    </div>
  );
};
export default LabRequestDisplayArea;
