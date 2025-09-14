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
  const dateLocale = "ar".startsWith('ar') ? arSA : enUS;

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
          <DialogTitle>تاريخ الزيارات</DialogTitle>
          {visitHistory.length > 0 && (
            <DialogDescription>
              للمريض: {visitHistory[0]?.patient?.name || ''}
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
              فشل في جلب البيانات: {error.message}
            </p>
          ) : visitHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              لا يوجد تاريخ زيارات
            </p>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">التاريخ</TableHead>
                  <TableHead className="text-center">الطبيب</TableHead>
                  <TableHead>السبب أو الخدمات</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitHistory.map((visit: DoctorVisit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-center">
                      {visit.visit_date ? format(visit.visit_date, 'P', {locale: dateLocale}) : '-'} <br/>
                      <span className="text-muted-foreground text-[10px]">
                        {visit.visit_time ? format(visit.visit_time, 'p', { locale: dateLocale }) : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {visit.doctor?.name || "غير محدد"}
                    </TableCell>
                    <TableCell>
                      {visit.reason_for_visit || visit.requested_services?.map((rs: { service?: { name: string } }) => rs.service?.name).join(', ') || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {visit.status === 'open' ? 'مفتوحة' : visit.status === 'in_progress' ? 'قيد التنفيذ' : visit.status === 'completed' ? 'مكتملة' : visit.status === 'cancelled' ? 'ملغية' : visit.status === 'no_show' ? 'لم يحضر' : visit.status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">إغلاق</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientVisitHistoryDialog;