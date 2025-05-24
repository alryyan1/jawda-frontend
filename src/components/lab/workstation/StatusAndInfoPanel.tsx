// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserCircle, Phone, CalendarDays, VenusMars, MapPin, Building, IdCard, FileText, Printer, ShieldCheck, AlertTriangle, Info, CheckCircle2, XCircle, ClipboardList, Settings2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Patient } from '@/types/patients';
import { getPatientById } from '@/services/patientService';
import type { LabRequest } from '@/types/visits';
// import { getLabRequestById } from '@/services/labRequestService'; // If you need to refetch full lab request

interface StatusAndInfoPanelProps {
  patientId: number | null;
  visitId: number | null; // For context, though patientId might be primary key for patient info
  selectedLabRequest: LabRequest | null; // The currently selected LabRequest object for result entry
}

const DetailRowDisplay: React.FC<{ label: string; value?: string | number | React.ReactNode | null; icon?: React.ElementType; className?: string }> = 
({ label, value, icon: Icon, className }) => (
    <div className={cn("grid grid-cols-[auto_1fr] items-start gap-x-2 py-1", className)}>
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /> : <div className="w-3.5"/>}
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}:</p>
            <div className="text-sm font-medium truncate" title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}>
                {value === null || value === undefined || value === '' ? '-' : value}
            </div>
        </div>
    </div>
);

const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({ patientId, visitId, selectedLabRequest }) => {
  const { t, i18n } = useTranslation(['labResults', 'common', 'patients', 'labTests']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const { data: patient, isLoading: isLoadingPatient, error: patientError } = useQuery<Patient, Error>({
    queryKey: ['patientDetailsForInfoPanel', patientId],
    queryFn: () => {
      if (!patientId) throw new Error("Patient ID is required for info panel.");
      return getPatientById(patientId); // Assuming this returns the full Patient object
    },
    enabled: !!patientId,
  });
  
  // const { data: detailedLabRequest, isLoading: isLoadingDetailedLR } = useQuery<LabRequest, Error>({
  //   queryKey: ['detailedLabRequestForInfoPanel', selectedLabRequest?.id],
  //   queryFn: () => getLabRequestById(selectedLabRequest!.id),
  //   enabled: !!selectedLabRequest?.id, // Fetch if a lab request is selected
  // });
  // For now, using the selectedLabRequest passed as prop, assuming it has enough info.
  // If not, the query above can be enabled.

  const currentLabRequestToDisplay = selectedLabRequest; // Or detailedLabRequest if fetched

  const getAgeString = (p?: Patient | null) => { /* ... same as before ... */ };

  if (!patientId) { // No patient selected in the queue yet
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
        <Info size={32} className="mb-3 opacity-40"/>
        <p className="text-sm">{t('labResults:noInfoToShow')}</p>
      </div>
    );
  }

  if (isLoadingPatient) {
    return <div className="h-full flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (patientError) {
    return <div className="p-4 text-center text-destructive">
             <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
             <p>{t('common:error.fetchFailed', {entity: t('patients:entityName')})}</p>
             <p className="text-xs mt-1">{patientError.message}</p>
           </div>;
  }
  
  if (!patient) {
    return <div className="h-full flex items-center justify-center p-6 text-muted-foreground">{t('labResults:patientDataNotAvailable')}</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Patient Info Card */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary"/> {t('labResults:statusInfo.patientInfoTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-0.5">
            <DetailRowDisplay label={t('patients:fields.name')} value={patient.name} />
            <DetailRowDisplay label={t('common:phone')} value={patient.phone} />
            <DetailRowDisplay label={t('common:gender')} value={t(`common:genderEnum.${patient.gender}`)} />
            <DetailRowDisplay label={t('common:age')} value={getAgeString(patient)} />
            {patient.company && <DetailRowDisplay label={t('patients:fields.company')} value={patient.company.name} icon={Building}/>}
            {patient.insurance_no && <DetailRowDisplay label={t('patients:fields.insuranceNo')} value={patient.insurance_no}/>}
            <DetailRowDisplay label={t('patients:fields.address')} value={patient.address} />
          </CardContent>
        </Card>

        {/* Lab Request Status Card (if a specific lab request is selected for result entry) */}
        {currentLabRequestToDisplay && (
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary"/> 
                {t('labResults:statusInfo.requestStatusTitle')}: {currentLabRequestToDisplay.main_test?.main_test_name || t('common:test')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-0.5">
              <DetailRowDisplay 
                label={t('labResults:statusInfo.paymentStatus')} 
                value={currentLabRequestToDisplay.is_paid ? 
                    <Badge variant="success" className="text-xs">{t('payments:status.paid')}</Badge> : 
                    <Badge variant="warning" className="text-xs">{t('payments:status.unpaid')}</Badge>} 
              />
              <DetailRowDisplay 
                label={t('labResults:statusInfo.sampleStatus')} 
                value={currentLabRequestToDisplay.no_sample ? 
                    <Badge variant="destructive" className="text-xs">{t('labResults:statusInfo.sampleNotCollected')}</Badge> : 
                    (currentLabRequestToDisplay.sample_id ? 
                        <Badge variant="info" className="text-xs">{t('labResults:statusInfo.sampleCollectedWithId', {id: currentLabRequestToDisplay.sample_id})}</Badge> :
                        <Badge variant="outline" className="text-xs">{t('labResults:statusInfo.samplePending')}</Badge>
                    )}
              />
              <DetailRowDisplay 
                label={t('labResults:statusInfo.approvalStatus')} 
                value={currentLabRequestToDisplay.approve ? 
                    <Badge variant="success" className="text-xs">{t('labResults:statusInfo.approved')}</Badge> : 
                    <Badge variant="warning" className="text-xs">{t('labResults:statusInfo.pendingApproval')}</Badge>} 
              />
              <DetailRowDisplay label={t('common:price')} value={Number(currentLabRequestToDisplay.price).toFixed(1)} />
              <DetailRowDisplay label={t('payments:amountPaid')} value={Number(currentLabRequestToDisplay.amount_paid).toFixed(1)} />
              {/* Add more: valid, hidden, created_at, requested_by etc. */}
            </CardContent>
          </Card>
        )}

        {/* Actions Card */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary"/>{t('labResults:statusInfo.actionsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled> {/* TODO: Implement */}
              <Printer className="ltr:mr-2 rtl:ml-2 h-4 w-4"/> {t('labResults:statusInfo.printSampleLabels')}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled> {/* TODO: Implement */}
              <FileText className="ltr:mr-2 rtl:ml-2 h-4 w-4"/> {t('labResults:statusInfo.viewReportPreview')}
            </Button>
            {/* More actions related to the visit or selected lab request */}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
export default StatusAndInfoPanel;