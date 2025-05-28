// src/components/clinic/LabRequestComponent.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { LabRequest } from '@/types/visits';
import type { Patient } from '@/types/patients';

import { 
    addLabTestsToVisit, 
    getLabRequestsForVisit,
    clearPendingLabRequestsForVisit,
    recordDirectLabRequestPayment,
} from '@/services/labRequestService';

import { getPatientById } from '@/services/patientService';
import { useAuth } from '@/contexts/AuthContext';

// Import the child components
import LabTestSelectionArea from './lab_requests/LabTestSelectionArea';
import LabRequestDisplayArea from './lab_requests/LabRequestDisplayArea';
import BatchLabPaymentDialog from './BatchLabPaymentDialog';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface LabRequestComponentProps {
  patientId: number;
  visitId: number;
}

const LabRequestComponent: React.FC<LabRequestComponentProps> = ({ patientId, visitId }) => {
  const { t } = useTranslation(['labTests', 'clinic', 'common', 'payments']);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  const [showFullSelectionUI, setShowFullSelectionUI] = useState(false);
  const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false);

  // Query Keys
  const requestedTestsQueryKey = ['labRequestsForVisit', visitId] as const;
  const patientDetailsQueryKey = ['patientDetailsForLabDisplay', patientId] as const;
  const availableTestsForSelectionQueryKey = ['availableLabTestsForVisit', visitId] as const;

  // Fetch Patient Data
  const { data: currentPatient, isLoading: isLoadingPatient } = useQuery<Patient | null, Error>({
    queryKey: patientDetailsQueryKey,
    queryFn: async () => {
      try {
        const patient = await getPatientById(patientId);
        return patient || null;
      } catch (error) {
        console.error('Failed to fetch patient:', error);
        return null;
      }
    },
    enabled: !!patientId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
  
  // Fetch Requested Tests
  const { 
    data: requestedTests = [], 
    isLoading: isLoadingRequestedTestsInitial, 
    isFetching: isFetchingRequestedTests,
    error: requestedTestsError,
  } = useQuery<LabRequest[], Error>({
    queryKey: requestedTestsQueryKey,
    queryFn: () => getLabRequestsForVisit(visitId),
    enabled: !!visitId,
  });

  useEffect(() => {
    if (requestedTests && requestedTests.length === 0 && !showFullSelectionUI) {
      setShowFullSelectionUI(true);
    }
  }, [requestedTests, showFullSelectionUI]);

  const addTestsMutation = useMutation({
    mutationFn: (payload: { main_test_ids: number[]; comment?: string }) => 
        addLabTestsToVisit({ visitId, ...payload }),
    onSuccess: (newlyAddedLabRequests) => {
      toast.success(t('labTests:request.addedSuccessMultiple', { count: newlyAddedLabRequests.length }));
      queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
      queryClient.invalidateQueries({ queryKey: availableTestsForSelectionQueryKey });
      setShowFullSelectionUI(false); 
    },
    onError: (error: ApiError) => {
        let errorMessage = t('common:error.requestFailed');
        if (error.response?.data?.message) errorMessage = error.response.data.message;
        toast.error(errorMessage);
    }
  });

  const removeAllPendingMutation = useMutation({
    mutationFn: () => clearPendingLabRequestsForVisit(visitId),
    onSuccess: (data) => {
        toast.success(data.message || t('labTests:request.allPendingRemovedSuccess'));
        queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
        queryClient.invalidateQueries({ queryKey: availableTestsForSelectionQueryKey });
        if (data.deleted_count > 0 && (requestedTests.length - data.deleted_count === 0)) {
            setShowFullSelectionUI(true);
        }
    },
    onError: (error: ApiError) => toast.error(error.response?.data?.message || t('common:error.requestFailed'))
  });
  
  const directPayItemMutation = useMutation({
    mutationFn: (params: { labRequestId: number; is_bankak: boolean; shift_id: number }) =>
        recordDirectLabRequestPayment(params.labRequestId, { is_bankak: params.is_bankak, shift_id: params.shift_id }),
    onSuccess: (updatedLabRequest) => {
        toast.success(t('payments:paymentSuccess'));
        queryClient.setQueryData(requestedTestsQueryKey, (oldData: LabRequest[] | undefined) => 
            oldData?.map(lr => lr.id === updatedLabRequest.id ? updatedLabRequest : lr) || []
        );
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (error: ApiError) => toast.error(error.response?.data?.message || t('payments:paymentError'))
  });

  // --- Render Logic ---
  if ((isLoadingRequestedTestsInitial && !requestedTests.length) || (patientId && isLoadingPatient && !currentPatient)) {
    return <div className="py-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (requestedTestsError || (patientId && !currentPatient && !isLoadingPatient)) {
    return <div className="p-4 text-center text-sm text-destructive">{t('common:error.loadFailed')} {requestedTestsError?.message || "Patient data unavailable"}</div>;
  }

  const shouldShowSelectionGrid = showFullSelectionUI || (requestedTests.length === 0 && !addTestsMutation.isPending && !isLoadingRequestedTestsInitial);

  return (
    <div className="space-y-4">
      {shouldShowSelectionGrid ? (
        <LabTestSelectionArea
          visitId={visitId}
          existingRequestCount={requestedTests.length}
          addTestsMutation={addTestsMutation as UseMutationResult<LabRequest[], Error, { main_test_ids: number[]; comment?: string | undefined; }, unknown>}
          onSwitchToDisplayMode={() => setShowFullSelectionUI(false)}
        />
      ) : (
        <LabRequestDisplayArea
          visitId={visitId}
          patientId={patientId}
          currentPatient={currentPatient || null}
          requestedTests={requestedTests}
          isLoadingRequestedTests={isLoadingRequestedTestsInitial}
          isFetchingRequestedTests={isFetchingRequestedTests}
          currentClinicShift={currentClinicShift}
          onAddMoreTests={() => setShowFullSelectionUI(true)}
          directPayItemMutation={directPayItemMutation as UseMutationResult<LabRequest, Error, { labRequestId: number; is_bankak: boolean; shift_id: number; }, unknown>}
          removeAllPendingMutation={removeAllPendingMutation as UseMutationResult<{ message: string; deleted_count: number; }, Error, void, unknown>}
          onOpenBatchPaymentDialog={() => setShowBatchPaymentDialog(true)}
        />
      )}

      {currentClinicShift && requestedTests && currentPatient && (
        <BatchLabPaymentDialog
            isOpen={showBatchPaymentDialog}
            onOpenChange={setShowBatchPaymentDialog}
            visitId={visitId}
            requestedTests={requestedTests}
            currentPatient={currentPatient}
            currentClinicShift={currentClinicShift}
            onBatchPaymentSuccess={(updatedVisitData) => { 
                queryClient.setQueryData(requestedTestsQueryKey, updatedVisitData.lab_requests || []);
                queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
                setShowBatchPaymentDialog(false);
            }}
        />
      )}
    </div>
  );
};

export default LabRequestComponent;