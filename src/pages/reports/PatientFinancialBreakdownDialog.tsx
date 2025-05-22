// src/components/reports/PatientFinancialBreakdownDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { PatientVisitFinancialBreakdown } from '@/types/reports';
import i18n from '@/i18n';

interface PatientFinancialBreakdownDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientsBreakdown: PatientVisitFinancialBreakdown[];
  doctorName?: string; // Optional, for context in the title
  shiftId?: number;    // Optional, for context
}

const PatientFinancialBreakdownDialog: React.FC<PatientFinancialBreakdownDialogProps> = ({
  isOpen, onOpenChange, patientsBreakdown, doctorName, shiftId
}) => {
  const { t } = useTranslation(['reports', 'common']);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('reports:patientFinancialBreakdownDialog.title')}
            {doctorName && <span className="text-base font-normal text-muted-foreground"> - {t('reports:doctorShiftFinancialSummary.forDoctor', { doctorName })}</span>}
            {shiftId && <span className="text-base font-normal text-muted-foreground"> ({t('reports:doctorShiftFinancialSummary.shiftIdShort', { id: shiftId })})</span>}
          </DialogTitle>
          <DialogDescription>
            {t('reports:patientFinancialBreakdownDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea  style={{direction:i18n.dir()}} className="flex-grow mt-2 pr-2 h-[400px] "> {/* pr-2 for scrollbar space */}
          {patientsBreakdown && patientsBreakdown.length > 0 ? (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] hidden sm:table-cell">{t('reports:patientFinancialBreakdownDialog.patientId')}</TableHead>
                  <TableHead>{t('reports:patientFinancialBreakdownDialog.patientName')}</TableHead>
                  <TableHead className="text-center">{t('reports:patientFinancialBreakdownDialog.patientType')}</TableHead>
                  <TableHead className="text-right">{t('reports:patientFinancialBreakdownDialog.totalPaidByPatient')}</TableHead>
                  <TableHead className="text-right">{t('reports:patientFinancialBreakdownDialog.doctorShareFromPatient')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientsBreakdown.map(p => (
                  <TableRow key={`${p.visit_id}-${p.patient_id}`}> {/* More unique key */}
                    <TableCell className="hidden sm:table-cell">{p.patient_id}</TableCell>
                    <TableCell className="font-medium">{p.patient_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.is_insurance_patient ? "secondary" : "outline"}>
                        {p.is_insurance_patient ? t('reports:doctorShiftFinancialSummary.insurance') : t('reports:doctorShiftFinancialSummary.cash')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(p.total_paid_for_visit).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{Number(p.doctor_share_from_visit).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('reports:doctorShiftFinancialSummary.noFinancialDataForPatients')}
            </p>
          )}
        </ScrollArea>

        <DialogFooter className="mt-auto pt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientFinancialBreakdownDialog;