// src/components/lab/workstation/ShiftFinderDialog.tsx (New File)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar'; // shadcn Calendar
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardDescription, CardTitle as UICardTitle } from '@/components/ui/card';
import { Loader2, CalendarCheck2 } from 'lucide-react';

import type { Shift } from '@/types/shifts';
import { getShiftsList } from '@/services/shiftService'; // Your existing service
import { Badge } from '@/components/ui/badge';

interface ShiftFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftSelected: (shift: Shift) => void;
}

const ShiftFinderDialog: React.FC<ShiftFinderDialogProps> = ({
  isOpen, onOpenChange, onShiftSelected
}) => {
  const { t, i18n } = useTranslation(['labResults', 'common', 'shifts']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const shiftsQueryKey = ['shiftsByDateForFinder', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null] as const;

  const { data: shiftsOnDate, isLoading, error, isFetching } = useQuery<Shift[], Error>({
    queryKey: shiftsQueryKey,
    queryFn: () => {
      if (!selectedDate) return Promise.resolve([]);
      return getShiftsList({ per_page: 0 ,date_from: format(selectedDate, 'yyyy-MM-dd'),date_to: format(selectedDate, 'yyyy-MM-dd')}); // Fetch all shifts (you may need to add date filtering in the service)
    },
    enabled: isOpen && !!selectedDate,
  });

  const handleSelectShiftAndClose = (shift: Shift) => {
    onShiftSelected(shift);
    onOpenChange(false);
  };
  
  useEffect(() => {
    if (!isOpen) {
        // Optionally reset selectedDate when dialog closes, or keep it for next open
        // setSelectedDate(new Date()); 
    }
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-primary"/>
            {t('shifts:shiftFinder.dialogTitle')}
          </DialogTitle>
          <DialogDescription>{t('shifts:shiftFinder.dialogDescription')}</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 py-2 flex-grow overflow-hidden">
            <div className="md:w-1/3 flex justify-center md:justify-start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={dateLocale}
                    dir={i18n.dir()}
                    className="rounded-md border"
                />
            </div>
            <div className="md:w-2/3 flex-grow flex flex-col overflow-hidden border rounded-md p-1 bg-muted/30">
                <h4 className="text-sm font-medium px-2 py-1.5 border-b">
                    {selectedDate ? 
                        t('shifts:shiftFinder.shiftsOnDate', { date: format(selectedDate, 'PPP', {locale: dateLocale}) })
                        : t('shifts:shiftFinder.selectDatePrompt')
                    }
                </h4>
                <ScrollArea className="h-[500px] flex-grow">
                    <div className="p-2 space-y-2">
                        {(isLoading || isFetching) && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                        {error && <div className="text-destructive p-2 text-center text-xs">{t('common:error.fetchFailed')}: {error.message}</div>}
                        {!isLoading && !isFetching && !error && (!shiftsOnDate || shiftsOnDate.length === 0) && (
                            <p className="text-center text-sm text-muted-foreground py-6">
                                {selectedDate ? t('shifts:shiftFinder.noShiftsFoundOnDate') : t('shifts:shiftFinder.selectDatePrompt')}
                            </p>
                        )}
                        {shiftsOnDate?.map(shift => (
                            <Card 
                                key={shift.id} 
                                className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleSelectShiftAndClose(shift)}
                            >
                                <UICardTitle className="text-xs font-semibold flex justify-between items-center">
                                   <span>{shift.name || `${t('common:shift')} #${shift.id}`}</span>
                                   <Badge variant={shift.is_closed ? "destructive" : "success"} className="text-[9px] px-1.5 py-0.5">
                                        {shift.is_closed ? t('shifts:status.closed') : t('shifts:status.open')}
                                   </Badge>
                                </UICardTitle>
                                <CardDescription className="text-[10px] mt-0.5">
                                    {t('common:openedAt')}: {format(parseISO(shift.created_at), 'p', {locale: dateLocale})}
                                    {shift.user_opened && ` ${t('common:by')} ${shift.user_opened.name}`}
                                    {shift.is_closed && shift.closed_at && 
                                        ` | ${t('common:closedAt')}: ${format(parseISO(shift.closed_at), 'p', {locale: dateLocale})}`
                                    }
                                </CardDescription>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ShiftFinderDialog;