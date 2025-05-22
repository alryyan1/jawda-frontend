// src/components/patients/ViewVisitServicesDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { RequestedServiceSummary, PatientVisitSummary } from '@/types/visits';

interface ViewVisitServicesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visit: PatientVisitSummary | null; // Pass the summary visit object
}

const ViewVisitServicesDialog: React.FC<ViewVisitServicesDialogProps> = ({ isOpen, onOpenChange, visit }) => {
  const { t } = useTranslation(['todaysPatients', 'common']);

  if (!visit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('todaysPatients:servicesDialogTitle', { visitId: visit.id })}</DialogTitle>
          <DialogDescription>
            {t('todaysPatients:table.patientName')}: {visit.patient.name} - {t('todaysPatients:table.doctorName')}: {visit.doctor?.name || t('common:unassigned')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4">
          {visit.requested_services_summary && visit.requested_services_summary.length > 0 ? (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('todaysPatients:servicesDialog.serviceName')}</TableHead>
                  <TableHead className="text-center">{t('todaysPatients:servicesDialog.price')}</TableHead>
                  <TableHead className="text-center">{t('todaysPatients:servicesDialog.count')}</TableHead>
                  <TableHead className="text-center">{t('todaysPatients:servicesDialog.paid')}</TableHead>
                  <TableHead className="text-center">{t('todaysPatients:servicesDialog.performed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visit.requested_services_summary.map(rs => (
                  <TableRow key={rs.id}>
                    <TableCell>{rs.service_name}</TableCell>
                    <TableCell className="text-center">{Number(rs.price).toFixed(2)}</TableCell>
                    <TableCell className="text-center">{rs.count}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rs.is_paid ? 'default' : 'outline'}>
                        {rs.is_paid ? t('todaysPatients:servicesDialog.paid') : t('todaysPatients:servicesDialog.notPaid')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge variant={rs.done ? 'default' : 'secondary'}>
                         {rs.done ? t('todaysPatients:servicesDialog.performed') : t('todaysPatients:servicesDialog.pending')}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">{t('services:noServicesRequestedYet')}</p>
          )}
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ViewVisitServicesDialog;