// src/components/reports/PatientFinancialBreakdownDialog.tsx
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { PatientVisitFinancialBreakdown } from '@/types/reports';
// i18n removed; using direct Arabic strings

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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {"تفصيل مالي لزيارات المرضى"}
            {doctorName && <span className="text-base font-normal text-muted-foreground"> - {`للدكتور ${doctorName}`}</span>}
            {shiftId && <span className="text-base font-normal text-muted-foreground"> {`(رقم الوردية: ${shiftId})`}</span>}
          </DialogTitle>
          <DialogDescription>
            {"توضح هذه القائمة مدفوعات المرضى وحصة الطبيب لكل زيارة."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea  style={{direction:'rtl'}} className="flex-grow mt-2 pr-2 h-[400px] "> {/* pr-2 for scrollbar space */}
          {patientsBreakdown && patientsBreakdown.length > 0 ? (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] hidden sm:table-cell">{"رقم المريض"}</TableHead>
                  <TableHead>{"اسم المريض"}</TableHead>
                  <TableHead className="text-center">{"نوع المريض"}</TableHead>
                  <TableHead className="text-right">{"إجمالي ما دفعه المريض"}</TableHead>
                  <TableHead className="text-right">{"حصة الطبيب من الزيارة"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientsBreakdown.map(p => (
                  <TableRow key={`${p.visit_id}-${p.patient_id}`}> {/* More unique key */}
                    <TableCell className="hidden sm:table-cell">{p.patient_id}</TableCell>
                    <TableCell className="font-medium">{p.patient_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.is_insurance_patient ? "secondary" : "outline"}>
                        {p.is_insurance_patient ? "تأمين" : "نقدي"}
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
              {"لا توجد بيانات مالية للمرضى."}
            </p>
          )}
        </ScrollArea>

        <DialogFooter className="mt-auto pt-6">
          <DialogClose asChild>
            <Button type="button">{"إغلاق"}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientFinancialBreakdownDialog;