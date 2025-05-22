// src/components/schedules/DoctorScheduleForm.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { DoctorStripped } from '@/types/doctors';
import type { DoctorScheduleEntry, TimeSlot } from '@/types/schedules';
import { getDoctorSchedules, saveDoctorWeeklySchedule } from '@/services/sheduleService';

interface DoctorScheduleFormProps {
  selectedDoctor: DoctorStripped;
}

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]; // 0:Sun, 1:Mon ...
const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening'];

const DoctorScheduleForm: React.FC<DoctorScheduleFormProps> = ({ selectedDoctor }) => {
  const { t } = useTranslation(['schedules', 'common']);
  const queryClient = useQueryClient();
  
  // Local state for managing the schedule being edited
  const [editableSchedule, setEditableSchedule] = useState<Record<number, Record<TimeSlot, boolean>>>(() => {
     const initial: Record<number, Record<TimeSlot, boolean>> = {};
     DAYS_OF_WEEK.forEach(day => {
         initial[day] = { morning: false, afternoon: false, evening: false, full_day: false };
     });
     return initial;
  });

  const scheduleQueryKey = ['doctorSchedule', selectedDoctor.id];

  const { isLoading, isFetching, error, data: schedules } = useQuery<DoctorScheduleEntry[]>({
    queryKey: scheduleQueryKey,
    queryFn: () => getDoctorSchedules(selectedDoctor.id),
    enabled: !!selectedDoctor
  });

  // Update schedule when data is fetched
  React.useEffect(() => {
    if (schedules) {
      const newEditableSchedule = { ...editableSchedule };
      DAYS_OF_WEEK.forEach(day => {
        newEditableSchedule[day] = { morning: false, afternoon: false, evening: false, full_day: false };
      });
      schedules.forEach((entry) => {
        if (newEditableSchedule[entry.day_of_week]) {
          newEditableSchedule[entry.day_of_week][entry.time_slot] = true;
        }
      });
      setEditableSchedule(newEditableSchedule);
    }
  }, [schedules]);

  const mutation = useMutation<DoctorScheduleEntry[], Error, DoctorScheduleEntry[]>({
    mutationFn: (schedulesToSave) => saveDoctorWeeklySchedule(selectedDoctor.id, schedulesToSave),
    onSuccess: () => {
      toast.success(t('schedules:scheduleSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('schedules:scheduleSaveError'));
    }
  });

  const handleCheckboxChange = (day: number, slot: TimeSlot, checked: boolean) => {
    setEditableSchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[day]) {
        newSchedule[day] = { morning: false, afternoon: false, evening: false, full_day: false };
      }
      newSchedule[day][slot] = checked;
      return newSchedule;
    });
  };

  const handleSubmitSchedule = () => {
    const schedulesToSave: DoctorScheduleEntry[] = [];
    Object.entries(editableSchedule).forEach(([dayStr, slots]) => {
      const day = parseInt(dayStr);
      Object.entries(slots).forEach(([slotStr, isSelected]) => {
        if (isSelected && slotStr !== 'full_day') { // Exclude 'full_day' helper
          schedulesToSave.push({
            doctor_id: selectedDoctor.id,
            day_of_week: day,
            time_slot: slotStr as TimeSlot,
          });
        }
      });
    });
    mutation.mutate(schedulesToSave);
  };

  if (isLoading) return <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;
  if (error) return <div className="p-4 text-destructive">{t('common:error.fetchFailed', {entity: t('schedules:schedulesTitle')})}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('schedules:editScheduleFor', { doctorName: selectedDoctor.name })}</CardTitle>
        <CardDescription>{t('schedules:editScheduleDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] text-center">{t('schedules:day')}</TableHead>
                {TIME_SLOTS.map(slot => (
                  <TableHead key={slot} className="text-center">{t(`schedules:timeSlots.${slot}`)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {DAYS_OF_WEEK.map(day => (
                <TableRow key={day}>
                  <TableCell className="font-medium text-center">{t(`schedules:days.${day}`)}</TableCell>
                  {TIME_SLOTS.map(slot => (
                    <TableCell key={slot} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={editableSchedule[day]?.[slot] || false}
                          onCheckedChange={(checked) => handleCheckboxChange(day, slot, !!checked)}
                          disabled={mutation.isPending}
                          id={`schedule-${day}-${slot}`}
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmitSchedule} disabled={mutation.isPending || isFetching}>
            {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
            {t('schedules:saveScheduleButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
export default DoctorScheduleForm;