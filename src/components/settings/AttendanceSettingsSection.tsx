// src/components/settings/AttendanceSettingsSection.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form'; // If embedding in a larger form
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'; // If using RHF <Form>
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api'; // Assuming your apiClient is set up

interface AttendanceSettingsData {
  number_of_shifts_per_day: number;
}

const attendanceSettingsSchema = z.object({
  number_of_shifts_per_day: z.number().min(1).max(3),
});

// Props if this is part of a larger settings form
interface AttendanceSettingsSectionProps {
  control: any; // RHF control object from parent form
  // Or manage its own form if standalone
}


const AttendanceSettingsSection: React.FC</*AttendanceSettingsSectionProps*/> = (/*{ control }*/) => {
  const { t, i18n } = useTranslation(['settings', 'attendance', 'common']);
  const queryClient = useQueryClient();

  // If standalone, manage its own form and API calls
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery<AttendanceSettingsData>({
    queryKey: ['attendanceGlobalSettings'],
    queryFn: async () => (await apiClient.get('/attendance-settings')).data.data,
  });

  const form = useForm<{ number_of_shifts_per_day: string }>({ // Use string for Select value
    resolver: zodResolver(z.object({ number_of_shifts_per_day: z.string().min(1).max(1) })),
    defaultValues: { number_of_shifts_per_day: '2' },
  });

  React.useEffect(() => {
    if (currentSettings) {
      form.reset({ number_of_shifts_per_day: String(currentSettings.number_of_shifts_per_day) });
    }
  }, [currentSettings, form]);

  const mutation = useMutation({
    mutationFn: (data: { number_of_shifts_per_day: number }) =>
      apiClient.put('/attendance-settings', data),
    onSuccess: (response) => {
      toast.success(t('attendance:settings.updateSuccess'));
      queryClient.setQueryData(['attendanceGlobalSettings'], response.data.data);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common:error.saveFailed')),
  });

  const onSubmit = (data: { number_of_shifts_per_day: string }) => {
    mutation.mutate({ number_of_shifts_per_day: parseInt(data.number_of_shifts_per_day) });
  };


  if (isLoadingSettings) return <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin"/></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('attendance:settings.globalTitle')}</CardTitle>
        <CardDescription>{t('attendance:settings.globalDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="number_of_shifts_per_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('attendance:settings.numberOfShiftsLabel')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  dir={i18n.dir()}
                  disabled={mutation.isPending}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3].map(num => (
                      <SelectItem key={num} value={String(num)}>
                        {t('attendance:settings.shiftsCount', { count: num })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/>}
                {t('common:saveChanges')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
export default AttendanceSettingsSection;