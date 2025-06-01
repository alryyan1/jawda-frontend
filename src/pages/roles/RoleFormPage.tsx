// src/pages/roles/RoleFormPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from "@/components/ui/scroll-area";

import type { RoleFormData, Permission } from '@/types/auth';
import { createRole, updateRole, getRoleById, getPermissionsList } from '@/services/roleService';

export enum RoleFormMode { CREATE = 'create', EDIT = 'edit' }
interface RoleFormPageProps { mode: RoleFormMode; }

const getRoleFormSchema = (t: (key: string, options?: any) => string) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('roles:form.nameLabel')}) }),
  permissions: z.array(z.string()).optional(), // Array of permission names
});
type RoleFormValues = z.infer<ReturnType<typeof getRoleFormSchema>>;

const RoleFormPage: React.FC<RoleFormPageProps> = ({ mode }) => {
  const { t } = useTranslation(['roles', 'common']);
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === RoleFormMode.EDIT;
  const [searchTerm, setSearchTerm] = useState('');

  const roleFormSchema = getRoleFormSchema(t);

  const { data: roleData, isLoading: isLoadingRole, isFetching: isFetchingRole } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => getRoleById(Number(roleId)).then(res => res.data),
    enabled: isEditMode && !!roleId,
  });

  const { data: allPermissions, isLoading: isLoadingPermissions } = useQuery<Permission[], Error>({
    queryKey: ['permissionsList'],
    queryFn: getPermissionsList,
  });

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      permissions: [],
    },
  });
  const { control, handleSubmit, reset, setValue, watch } = form;

  useEffect(() => {
    if (isEditMode && roleData) {
      reset({
        name: roleData.name,
        permissions: roleData.permissions?.map(p => p.name) || [],
      });
    }
  }, [isEditMode, roleData, reset]);

  const mutation = useMutation({
    mutationFn: (data: RoleFormData) => 
        isEditMode && roleId ? updateRole(Number(roleId), data) : createRole(data),
    onSuccess: () => {
      toast.success(t('roles:form.roleSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      if(isEditMode && roleId) queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      navigate('/roles');
    },
    onError: (error: Error & { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }) => {
      let errorMessage = t('roles:form.roleSaveError');
      if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
      console.error("Save role error:", error.response?.data || error.message);
    },
  });

  const onSubmit = (data: RoleFormValues) => {
    const submissionData: RoleFormData = {
      name: data.name,
      permissions: data.permissions || [],
    };
    mutation.mutate(submissionData);
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingRole || isFetchingRole || isLoadingPermissions;
  // Group permissions by resource for better UI
  const groupedPermissions = allPermissions?.reduce((acc, permission) => {
    const [resource] = permission.name.split(' '); // Simple split, assumes "action resource" or "resource action"
    
    // A more robust grouping based on the first word after common verbs
    const commonVerbs = ['list', 'view', 'create', 'edit', 'delete', 'assign', 'manage'];
    let mainResource = permission.name;
    for (const verb of commonVerbs) {
        if (permission.name.startsWith(verb + ' ')) {
            mainResource = permission.name.substring(verb.length + 1).split(' ')[0].replace('_', ' ');
            break;
        }
    }
    if (mainResource.includes(' ')) mainResource = mainResource.split(' ')[0]; // take first word if complex

    const capitalizedResource = mainResource.charAt(0).toUpperCase() + mainResource.slice(1);

    if (!acc[capitalizedResource]) {
      acc[capitalizedResource] = [];
    }
    acc[capitalizedResource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Filter permissions based on search term
  const filteredGroupedPermissions = useMemo(() => {
    if (!groupedPermissions || !searchTerm.trim()) return groupedPermissions;
    
    const searchLower = searchTerm.toLowerCase();
    const filtered: Record<string, Permission[]> = {};
    
    Object.entries(groupedPermissions).forEach(([group, permissions]) => {
      const matchingPermissions = permissions.filter(permission => {
        const translatedPermission = t(`permissions:${permission.name.replace(/ /g, '_')}`, permission.name).toLowerCase();
        const permissionName = permission.name.toLowerCase();
        return translatedPermission.includes(searchLower) || permissionName.includes(searchLower);
      });
      
      if (matchingPermissions.length > 0) {
        filtered[group] = matchingPermissions;
      }
    });
    
    return filtered;
  }, [groupedPermissions, searchTerm, t]);

  if (isEditMode && isLoadingRole) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('common:loading')}</div>;


  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? t('roles:editRoleTitle') : t('roles:createRoleTitle')}</CardTitle>
        <CardDescription>{t('common:form.fillDetails')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('roles:form.nameLabel')}</FormLabel>
                <FormControl><Input placeholder={t('roles:form.namePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField
              control={control} name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>{t('roles:form.permissionsLabel')}</FormLabel>
                  <FormDescription>{t('roles:form.assignPermissionsDescription')}</FormDescription>
                  {isLoadingPermissions ? <div className="py-4"><Loader2 className="animate-spin h-6 w-6" /></div> : 
                   !groupedPermissions || Object.keys(groupedPermissions).length === 0 ? 
                   <p className="text-sm text-muted-foreground py-4">{t('roles:form.noPermissionsAvailable')}</p> : (
                    <>
                      <div className="relative mb-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('roles:form.searchPermissions')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      <ScrollArea className="h-auto max-h-[50vh] w-full rounded-md border p-4">
                        <div className="space-y-4">
                          {Object.entries(filteredGroupedPermissions || {}).sort(([groupA], [groupB]) => groupA.localeCompare(groupB)).map(([groupName, perms]) => (
                            <div key={groupName}>
                              <h4 className="mb-2 font-medium text-md text-primary border-b pb-1">
                                {/* Attempt to translate group name if you have keys for them */}
                                {t(`permissions:group.${groupName.toLowerCase().replace(' ', '_')}`, groupName)}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                                {perms.sort((a,b) => a.name.localeCompare(b.name)).map((permission) => (
                                  <FormField
                                    key={permission.id} control={control} name="permissions"
                                    render={({ field: permissionArrayField }) => (
                                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse">
                                        <FormControl>
                                          <Checkbox
                                            checked={permissionArrayField.value?.includes(permission.name)}
                                            disabled={dataIsLoading || formIsSubmitting}
                                            onCheckedChange={(checked) => {
                                              const currentPermissions = permissionArrayField.value || [];
                                              return checked
                                                ? permissionArrayField.onChange([...currentPermissions, permission.name])
                                                : permissionArrayField.onChange(currentPermissions.filter((name) => name !== permission.name));
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel title={permission.name} className="font-normal text-sm whitespace-nowrap">
                                          {/* Attempt to translate individual permission names */}
                                          {t(`permissions:${permission.name.replace(/ /g, '_')}`, permission.name)}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                  <FormMessage /> {/* For the permissions array itself (e.g., if 'min 1' was a rule) */}
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/roles')} disabled={formIsSubmitting}>{t('common:cancel')}</Button>
              <Button type="submit" disabled={dataIsLoading || formIsSubmitting}>
                {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('roles:form.saveButton')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
export default RoleFormPage;