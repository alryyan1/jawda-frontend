// src/components/clinic/PatientVisitHistoryDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { DoctorVisit } from '@/types/visits';
import { getPatientVisitHistory } from '@/services/patientService';
import type { PaginatedResponse } from '@/types/common';

interface PatientVisitHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
}

const PatientVisitHistoryDialog: React.FC<PatientVisitHistoryDialogProps> = ({
  isOpen, onOpenChange, patientId
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const { data: response, isLoading, error } = useQuery<PaginatedResponse<DoctorVisit>, Error>({
    queryKey: ['patientVisitHistory', patientId],
    queryFn: () => getPatientVisitHistory(patientId),
    enabled: isOpen && !!patientId,
  });

  const visitHistory = response?.data || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('clinic:visit.historyDialog.title')}</DialogTitle>
          {visitHistory.length > 0 && (
            <DialogDescription>
              {t('clinic:visit.historyDialog.forPatient', { 
                name: visitHistory[0]?.patient?.name || '' 
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-grow mt-2 pr-2 -mr-2">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-4">
              {t('common:error.fetchFailed')}: {error.message}
            </p>
          ) : visitHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              {t('clinic:visit.historyDialog.noHistory')}
            </p>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{t('common:date')}</TableHead>
                  <TableHead className="text-center">{t('common:doctor')}</TableHead>
                  <TableHead>{t('clinic:visit.historyDialog.reasonOrServices')}</TableHead>
                  <TableHead className="text-center">{t('common:status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitHistory.map((visit: DoctorVisit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-center">
                      {visit.visit_date ? format(parseISO(visit.visit_date), 'P', {locale: dateLocale}) : '-'} <br/>
                      <span className="text-muted-foreground text-[10px]">
                        {visit.visit_time ? format(parseISO(`2000-01-01T${visit.visit_time}`), 'p', { locale: dateLocale }) : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {visit.doctor?.name || t('common:unassigned')}
                    </TableCell>
                    <TableCell>
                      {visit.reason_for_visit || visit.requested_services?.map((rs: { service?: { name: string } }) => rs.service?.name).join(', ') || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {t(`clinic:workspace.status.${visit.status}`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientVisitHistoryDialog;