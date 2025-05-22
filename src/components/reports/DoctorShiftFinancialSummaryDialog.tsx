import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale'; // For localized date formatting

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter, // Added DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Calendar, DollarSign, Eye, Printer } from 'lucide-react'; // Added Eye, Printer

import type { DoctorShiftReportItem, DoctorShiftFinancialSummary } from '@/types/reports';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { getDoctorShiftFinancialSummary } from '@/services/reportService';
import PatientFinancialBreakdownDialog from '@/pages/reports/PatientFinancialBreakdownDialog';

interface DoctorShiftFinancialSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctorShift: DoctorShiftReportItem | null; // The basic shift info to trigger data fetch
}

// Helper component for displaying detail rows consistently
const DetailRow: React.FC<{ label: string; value?: string | number | null; isCurrency?: boolean; unit?: string; valueClassName?: string }> = 
({ label, value, isCurrency, unit, valueClassName }) => (
 <div className="flex justify-between items-center py-1.5">
    <span className="text-sm text-muted-foreground">{label}:</span>
    <span className={`text-sm font-medium ${valueClassName || ''}`}>
        {value === null || value === undefined ? '-' : (isCurrency ? Number(value).toFixed(2) : value)}
        {unit && <span className="text-xs text-muted-foreground ltr:ml-1 rtl:mr-1">{unit}</span>}
    </span>
 </div>
);

const DoctorShiftFinancialSummaryDialog: React.FC<DoctorShiftFinancialSummaryDialogProps> = ({
  isOpen, onOpenChange, doctorShift,
}) => {
  const { t, i18n } = useTranslation(['reports', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;
  const [showPatientBreakdownDialog, setShowPatientBreakdownDialog] = useState(false);

  const { data: summary, isLoading, error, isFetching } = useQuery<DoctorShiftFinancialSummary, Error>({
    queryKey: ['doctorShiftFinancialSummary', doctorShift?.id],
    queryFn: () => {
      if (!doctorShift?.id) {
        // This should ideally not happen if enabled is set correctly, but good practice
        return Promise.reject(new Error("Doctor Shift ID is required."));
      }
      return getDoctorShiftFinancialSummary(doctorShift.id);
    },
    enabled: !!doctorShift && isOpen, // Fetch only when dialog is open and shift is selected
  });

  
  // Ensure that when the main dialog closes, the child dialog also closes
  const handleMainDialogOpenChange = (open: boolean) => {
    if (!open) {
        setShowPatientBreakdownDialog(false);
    }
    onOpenChange(open);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleMainDialogOpenChange}>
        <DialogContent className="max-w-md lg:max-w-lg max-h-[90vh] flex flex-col p-0 sm:p-0"> {/* Removed default padding for full control */}
          <DialogHeader className="p-4 sm:p-6 border-b">
            <DialogTitle className="text-xl">
              {t('reports:doctorShiftFinancialSummary.dialogTitle', { doctorName: doctorShift?.doctor_name || '...' })}
            </DialogTitle>
            {doctorShift && (
                <DialogDescription>
                    {t('reports:doctorShiftFinancialSummary.shiftId')}: {doctorShift.id} | {doctorShift.formatted_start_time ? format(doctorShift.formatted_start_time, 'P', {locale: dateLocale}) : ''}
                </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea style={{direction:i18n.dir()}} className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-5">
              {isLoading || (isFetching && !summary) ? (
                <div className="flex-grow flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-muted-foreground">{t('common:loadingData')}</p>
                </div>
              ) : error ? (
                <div className="flex-grow flex flex-col items-center justify-center text-destructive p-4 py-10">
                  <p>{t('common:error.fetchFailed', { entity: t('reports:doctorShiftFinancialSummary.summaryEntityName', "Summary") })}</p>
                  <p className="text-xs mt-1">{error.message}</p>
                </div>
              ) : summary ? (
                <>
                  {/* Shift Stats Card */}
                  <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-md font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground"/>{t('reports:doctorShiftFinancialSummary.shiftDetails')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <DetailRow label={t('reports:doctorShiftsReport.table.startTime')} value={summary.start_time ? format(parseISO(summary.start_time), 'yyyy-MM-dd', { locale: dateLocale }) : '-'} />
                      <DetailRow label={t('reports:doctorShiftsReport.table.endTime')} value={summary.end_time ? format(parseISO(summary.end_time), 'yyyy-MM-dd', { locale: dateLocale }) : '-'} />
                      <DetailRow label={t('reports:doctorShiftsReport.table.status')} value={t(`common:statusEnum.${summary.status.toLowerCase()}`, summary.status)} />
                      <DetailRow label={t('reports:doctorShiftFinancialSummary.totalPatients')} value={summary.total_patients} />
                    </CardContent>
                  </Card>

                  {/* Doctor's Entitlement Summary Card */}
                  <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-md font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground"/>{t('reports:doctorShiftFinancialSummary.entitlementSummary')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <DetailRow label={t('reports:doctorShiftFinancialSummary.fixedShare')} value={summary.doctor_fixed_share_for_shift} isCurrency unit={t('common:currency')} />
                      <DetailRow label={t('reports:doctorShiftFinancialSummary.cashPatientsShare')} value={summary.doctor_cash_share_total} isCurrency unit={t('common:currency')} />
                      <DetailRow label={t('reports:doctorShiftFinancialSummary.insurancePatientsShare')} value={summary.doctor_insurance_share_total} isCurrency unit={t('common:currency')} />
                      <Separator className="my-2.5" />
                      <div className="flex justify-between items-center pt-1">
                          <span className="text-md font-semibold">{t('reports:doctorShiftFinancialSummary.totalDoctorShare')}:</span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-500">
                              {Number(summary.total_doctor_share).toFixed(2)} {t('common:currency')}
                          </span>
                      </div>
                    </CardContent>
                    {summary.patients_breakdown && summary.patients_breakdown.length > 0 && (
                        <CardFooter className="pt-3">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => setShowPatientBreakdownDialog(true)}
                            >
                                <Eye className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>
                                {t('reports:doctorShiftFinancialSummary.viewPatientsBreakdownButton')}
                            </Button>
                        </CardFooter>
                    )}
                  </Card>
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                    {t('reports:doctorShiftFinancialSummary.noSummaryData')}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 border-t mt-auto">
            {summary && !isLoading && ( // Show print only if data is loaded
                <Button type="button" variant="secondary" onClick={() => window.print()} disabled> {/* TODO: Implement proper print */}
                    <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('common:print')}
                </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline">{t('common:close')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render the new PatientFinancialBreakdownDialog, controlled by its own state */}
      {summary && doctorShift && ( // Ensure summary and doctorShift are available before rendering
        <PatientFinancialBreakdownDialog
            isOpen={showPatientBreakdownDialog}
            onOpenChange={setShowPatientBreakdownDialog}
            patientsBreakdown={summary.patients_breakdown || []} // Pass empty array if undefined
            doctorName={doctorShift.doctor_name}
            shiftId={doctorShift.id}
        />
      )}
    </>
  );
};
export default DoctorShiftFinancialSummaryDialog;