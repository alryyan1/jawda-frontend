// src/components/schedules/DoctorScheduleForm.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// MUI
import { Box, Card, CardContent, CardHeader, Typography, Button, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Alert } from '@mui/material';

import type { DoctorStripped } from '@/types/doctors';
import type { DoctorScheduleEntry, TimeSlot } from '@/types/schedules';
import { getDoctorSchedules, saveDoctorWeeklySchedule } from '@/services/sheduleService';

interface DoctorScheduleFormProps {
  selectedDoctor: DoctorStripped;
}

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]; // 0:Sun, 1:Mon ...
const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening'];
const SLOT_NAMES_AR: Record<TimeSlot, string> = {
  morning: 'صباحاً',
  afternoon: 'عصراً',
  evening: 'مساءً',
};

const DoctorScheduleForm: React.FC<DoctorScheduleFormProps> = ({ selectedDoctor }) => {
  const queryClient = useQueryClient();
  
  // Local state for managing the schedule being edited
  const [editableSchedule, setEditableSchedule] = useState<Record<number, Record<TimeSlot, boolean>>>(() => {
    const initial: Record<number, Record<TimeSlot, boolean>> = {} as any;
    DAYS_OF_WEEK.forEach(day => {
      initial[day] = { morning: false, afternoon: false, evening: false } as Record<TimeSlot, boolean>;
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
      const newEditableSchedule: Record<number, Record<TimeSlot, boolean>> = {} as any;
      DAYS_OF_WEEK.forEach(day => {
        newEditableSchedule[day] = { morning: false, afternoon: false, evening: false } as Record<TimeSlot, boolean>;
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
      toast.success('تم حفظ الجدول بنجاح');
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل حفظ الجدول');
    }
  });

  const handleCheckboxChange = (day: number, slot: TimeSlot, checked: boolean) => {
    setEditableSchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[day]) {
        newSchedule[day] = { morning: false, afternoon: false, evening: false } as Record<TimeSlot, boolean>;
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
        if (isSelected) {
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

  if (isLoading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ p: 2 }}>فشل جلب الجداول</Alert>;

  return (
    <Card>
      <CardHeader title={`تعديل جدول: ${selectedDoctor.name}`} />
      <CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 700 }}>اليوم</TableCell>
                {TIME_SLOTS.map(slot => (
                  <TableCell key={slot} align="center" sx={{ fontWeight: 700 }}>{SLOT_NAMES_AR[slot]}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {DAYS_OF_WEEK.map(day => (
                <TableRow key={day} hover>
                  <TableCell align="center" sx={{ fontWeight: 500 }}>{DAY_NAMES_AR[day]}</TableCell>
                  {TIME_SLOTS.map(slot => (
                    <TableCell key={slot} align="center">
                      <Checkbox
                        checked={editableSchedule[day]?.[slot] || false}
                        onChange={(e) => handleCheckboxChange(day, slot, e.target.checked)}
                        disabled={mutation.isPending}
                        inputProps={{ 'aria-label': `schedule-${day}-${slot}` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSubmitSchedule} disabled={mutation.isPending || isFetching}>
            {mutation.isPending && <CircularProgress size={16} sx={{ mr: 1 }} />}
            حفظ الجدول
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
export default DoctorScheduleForm;