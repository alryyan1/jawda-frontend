// src/pages/users/UserFormPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';

import { type UserFormData, type User, type Role, UserFormMode } from '@/types/users'; // User type might include Doctor if populated
import { createUser, updateUser, getUserById, getRolesList } from '@/services/userService';
import { getDoctors } from '@/services/doctorService'; // To select associated doctor
import type { Doctor } from '@/types/doctors';
import ChangePasswordDialog from '@/components/users/ChangePasswordDialog';

interface UserFormPageProps { mode: UserFormMode; }

const getUserFormSchema = (t: Function, isEditMode: boolean) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('users:form.nameLabel')}) }),
  username: z.string().min(3, { message: t('users:validation.usernameMinLength', "Username must be at least 3 characters.") }),
  password: isEditMode 
    ? z.string().optional() 
    : z.string().min(8, { message: t('users:validation.passwordMinLength', "Password must be at least 8 characters.") }),
  password_confirmation: isEditMode 
    ? z.string().optional() 
    : z.string(),
  doctor_id: z.string().optional(),
  is_nurse: z.boolean(),
  roles: z.array(z.string()).min(1, { message: t('users:validation.roleRequired', "At least one role is required.") }),
}).refine((data) => {
  if (!data.password && !data.password_confirmation) return true;
  return data.password === data.password_confirmation;
}, {
  message: t('users:validation.passwordsDoNotMatch', "Passwords do not match"),
  path: ["password_confirmation"],
});

type FormData = {
  name: string;
  username: string;
  password?: string;
  password_confirmation?: string;
  doctor_id?: string;
  is_nurse: boolean;
  roles: string[];
};

const UserFormPage: React.FC<UserFormPageProps> = ({ mode }) => {
  const { t } = useTranslation(['users', 'common']);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === UserFormMode.EDIT;
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const userFormSchema = getUserFormSchema(t, isEditMode);

  const { data: userData, isLoading: isLoadingUser, isFetching: isFetchingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(Number(userId)).then(res => res.data),
    enabled: isEditMode && !!userId,
  });

  const { data: rolesList, isLoading: isLoadingRoles } = useQuery<Role[], Error>({
    queryKey: ['rolesList'],
    queryFn: getRolesList,
  });

  const { data: doctorsList, isLoading: isLoadingDoctors } = useQuery<Doctor[], Error>({
    queryKey: ['doctorsList'], // Assuming doctorsList is the query key for all doctors
    queryFn: ()=>{
        return getDoctors().then(res => res.data);
    },  // Using the one from doctorService
  });

  const form = useForm<FormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '', 
      username: '', 
      password: '', 
      password_confirmation: '',
      doctor_id: undefined, 
      is_nurse: false, 
      roles: [],
    },
  });
  const { control, handleSubmit, reset, setValue, watch } = form;

  useEffect(() => {
    if (isEditMode && userData) {
      reset({
        name: userData.name,
        username: userData.username,
        password: '',
        password_confirmation: '',
        doctor_id: userData.doctor_id ? String(userData.doctor_id) : undefined,
        is_nurse: userData.is_nurse,
        roles: userData.roles?.map(role => role.name) || [],
      });
    }
  }, [isEditMode, userData, reset]);

  const mutation = useMutation({
    mutationFn: (data: UserFormData) => 
        isEditMode && userId ? updateUser(Number(userId), data) : createUser(data),
    onSuccess: () => {
      toast.success(t('users:form.userSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if(isEditMode && userId) queryClient.invalidateQueries({ queryKey: ['user', userId] });
      navigate('/users');
    },
    onError: (error: any) => {
      let errorMessage = t('users:form.userSaveError');
      if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
      console.error("Save user error:", error.response?.data || error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    const submissionData: UserFormData = {
      name: data.name,
      username: data.username,
      doctor_id: data.doctor_id || undefined,
      is_nurse: data.is_nurse,
      roles: data.roles || [],
    };
    
    // Only include password fields in create mode
    if (!isEditMode && data.password) {
      submissionData.password = data.password;
      submissionData.password_confirmation = data.password_confirmation;
    }
    
    mutation.mutate(submissionData);
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingUser || isFetchingUser || isLoadingRoles || isLoadingDoctors;

  if (isEditMode && isLoadingUser) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('common:loading')}</div>;

  return (
    <>
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>{isEditMode ? t('users:editUserTitle') : t('users:createUserTitle')}</CardTitle>
            <CardDescription>{t('common:form.fillDetails')}</CardDescription>
          </div>
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              {t('users:changePassword')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users:form.nameLabel')}</FormLabel>
                    <FormControl><Input placeholder={t('users:form.namePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users:form.usernameLabel')}</FormLabel>
                    <FormControl><Input placeholder={t('users:form.usernamePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Only show password fields in create mode */}
              {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users:form.passwordLabel')}</FormLabel>
                      <FormControl><Input type="password" {...field} disabled={formIsSubmitting}/></FormControl>
                      <FormDescription>{t('common:validation.passwordMinLengthGeneral')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="password_confirmation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users:form.confirmPasswordLabel')}</FormLabel>
                      <FormControl><Input type="password" {...field} disabled={formIsSubmitting}/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="doctor_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users:form.doctorIdLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={dataIsLoading || formIsSubmitting}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('users:form.selectDoctor')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t('common:none')}</SelectItem>
                        {isLoadingDoctors ? <SelectItem value="loading_docs" disabled>{t('common:loading')}</SelectItem> :
                          doctorsList?.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={control} name="is_nurse" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 rtl:space-x-reverse">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                  <FormLabel className="font-normal">{t('users:form.isNurseLabel')}</FormLabel>
                </FormItem>
              )} />

              <FormField
                control={control} name="roles"
                render={() => ( // No 'field' needed here as we manage array directly
                  <FormItem>
                    <FormLabel>{t('users:form.rolesLabel')}</FormLabel>
                    <FormDescription>{t('users:form.selectRoles')}</FormDescription>
                    {isLoadingRoles ? <Loader2 className="animate-spin"/> : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 p-2 border rounded-md max-h-60 overflow-y-auto">
                        {rolesList?.map((role) => (
                          <FormField
                            key={role.id} control={control} name="roles"
                            render={({ field: roleArrayField }) => ( // alias field to avoid conflict
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse">
                                <FormControl>
                                  <Checkbox
                                    checked={roleArrayField.value?.includes(role.name)}
                                    disabled={dataIsLoading || formIsSubmitting}
                                    onCheckedChange={(checked) => {
                                      const currentRoles = roleArrayField.value || [];
                                      return checked
                                        ? roleArrayField.onChange([...currentRoles, role.name])
                                        : roleArrayField.onChange(currentRoles.filter((name) => name !== role.name));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">{role.name}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}
                    <FormMessage /> {/* For the roles array itself (e.g., min 1 role) */}
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/users')} disabled={formIsSubmitting}>{t('common:cancel')}</Button>
                <Button type="submit" disabled={dataIsLoading || formIsSubmitting}>
                  {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                  {t('users:form.saveButton')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isEditMode && userId && (
        <ChangePasswordDialog
          userId={Number(userId)}
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </>
  );
};

export default UserFormPage;