import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

import { updateUserPassword } from '@/services/userService';

interface ChangePasswordDialogProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}

const passwordFormSchema = () => z.object({
  current_password: z.string().min(1, { 
    message: 'كلمة المرور الحالية مطلوبة.'
  }),
  password: z.string().min(8, { 
    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
  }),
  password_confirmation: z.string()
}).refine((data) => data.password === data.password_confirmation, {
  message: 'كلمتا المرور غير متطابقتين.',
  path: ["password_confirmation"],
});

type PasswordFormValues = z.infer<ReturnType<typeof passwordFormSchema>>;

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema()),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PasswordFormValues) => updateUserPassword(userId, data),
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      form.reset();
      onClose();
    },
    onError: (error: unknown) => {
      let errorMessage = 'فشل تغيير كلمة المرور';
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { data?: { message?: string } } };
        if (responseError.response?.data?.message) {
          errorMessage = responseError.response.data.message;
        }
      }
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: PasswordFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تغيير كلمة المرور</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور الحالية</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور الجديدة</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تأكيد كلمة المرور الجديدة</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                تغيير كلمة المرور
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog; 