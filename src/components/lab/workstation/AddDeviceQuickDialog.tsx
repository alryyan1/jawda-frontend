// src/components/lab/workstation/AddDeviceQuickDialog.tsx (New File)
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import apiClient from '@/services/api'; // Your API client

// Define Device type locally since it's not exported from labTests
interface Device {
  id: number;
  name: string;
}

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Service function to create a device
const createDevice = async (data: { name: string }): Promise<Device> => {
    const response = await apiClient.post('/devices', data); // Assuming POST /api/devices endpoint
    return response.data.data; // Assuming Laravel Resource response
};

interface AddDeviceQuickDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceAdded: (newDevice: Device) => void; // Callback with the newly added device
}

const deviceSchema = (t: (key: string, options?: Record<string, unknown>) => string) => z.object({
  name: z.string().min(1, { message: t('common:validation.required') }).max(255, { message: t('common:validation.maxLength', { count: 255 }) }),
});

type DeviceFormValues = z.infer<ReturnType<typeof deviceSchema>>;

const AddDeviceQuickDialog: React.FC<AddDeviceQuickDialogProps> = ({
  isOpen, onOpenChange, onDeviceAdded
}) => {
  const { t } = useTranslation(['labResults', 'common']); // Assuming a 'lab' namespace or use 'labTests'
  const queryClient = useQueryClient();

  const formSchema = deviceSchema(t);
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const addDeviceMutation = useMutation({
    mutationFn: createDevice,
    onSuccess: (newDevice) => {
      toast.success(t('labResults:devices.addedSuccess', { deviceName: newDevice.name }));
      queryClient.invalidateQueries({ queryKey: ['labDevicesListForDialog'] }); // Invalidate the list in the parent dialog
      onDeviceAdded(newDevice); // Callback to parent
      form.reset();
      onOpenChange(false); // Close this quick add dialog
    },
    onError: (error: Error) => {
      toast.error((error as any)?.response?.data?.message || t('lab:devices.addError'));
    },
  });

  const onSubmit = (data: DeviceFormValues) => {
    addDeviceMutation.mutate(data);
  };

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs"> {/* Smaller dialog for quick add */}
        <DialogHeader>
          <DialogTitle>{t('labResults:devices.quickAddTitle')}</DialogTitle>
          <DialogDescription>{t('labResults:devices.quickAddDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labResults:devices.deviceNameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={addDeviceMutation.isPending} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={addDeviceMutation.isPending}>
                  {t('common:cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={addDeviceMutation.isPending}>
                {addDeviceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                {t('common:add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceQuickDialog;