// src/components/lab/reception/PatientInfoAndFinancials.tsx (New File)
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, UserCircle, Wallet, AlertTriangle } from 'lucide-react';

import type { Patient } from '@/types/patients';
import type { DoctorVisit } from '@/types/visits';
import { getDoctorVisitById } from '@/services/visitService'; // We fetch the full visit to get all data
import LabFinancialSummary from '@/components/clinic/lab_requests/LabFinancialSummary'; // Reuse the financial summary logic
import { useAuth } from '@/contexts/AuthContext';
import PatientInfoCard from './PatientInfoCard'; // We will create this sub-component

interface PatientInfoAndFinancialsProps {
  activeVisitId: number | null;
}

const PatientInfoAndFinancials: React.FC<PatientInfoAndFinancialsProps> = ({ activeVisitId }) => {
  const { t } = useTranslation(['labReception', 'common']);
  const { currentClinicShift } = useAuth();

  // Fetch the full visit details for the active patient
  const { data: visit, isLoading, error } = useQuery<DoctorVisit, Error>({
    queryKey: ['activeVisitDetailsForInfoPanel', activeVisitId],
    queryFn: () => {
        if (!activeVisitId) throw new Error("No active visit selected");
        return getDoctorVisitById(activeVisitId);
    },
    enabled: !!activeVisitId,
  });

  if (!activeVisitId) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-muted-foreground text-center">
        <Wallet className="h-16 w-16 mb-4 opacity-20" />
        <h3 className="font-semibold">{t('infoPanel.selectPatientTitle', "Select a Patient")}</h3>
        <p className="text-sm">{t('infoPanel.selectPatientDescription', "Select a patient from the queue or register a new one to see their details and financial summary.")}</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
        <p className="font-semibold">{t('common:error.loadFailed')}</p>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  if (!visit || !visit.patient) {
     return <div className="p-4 text-center text-muted-foreground">{t('common:noDataAvailable')}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-3 border-b flex-shrink-0">
        <h2 className="text-md font-semibold">{t('infoPanel.title', "Details & Summary")}</h2>
      </header>
      <ScrollArea className="flex-grow p-3 space-y-3">
        {/* Patient Info Card Component */}
        <PatientInfoCard patient={visit.patient as Patient} />
        
        {/* Financial Summary Component */}
        <LabFinancialSummary
          requestedTests={visit.labRequests || []}
          currentPatient={visit.patient as Patient}
          currentClinicShift={currentClinicShift}
          onOpenBatchPaymentDialog={() => { /* This might open a dialog managed by LabReceptionPage */ }}
          isCompanyPatient={!!visit.patient.company_id}
        />
      </ScrollArea>
    </div>
  );
};

export default PatientInfoAndFinancials;