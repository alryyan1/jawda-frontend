// src/pages/roles/RoleFormPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Loader2, Search, Settings, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

import type { RoleFormData, Permission } from '@/types/auth';
import { createRole, updateRole, getRoleById, getPermissionsList } from '@/services/roleService';

export enum RoleFormMode { CREATE = 'create', EDIT = 'edit' }
interface RoleFormPageProps { mode: RoleFormMode; }

const roleFormSchema = z.object({
  name: z.string().min(1, { message: 'الاسم مطلوب' }),
  permissions: z.array(z.string()).optional(), // Array of permission names
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

const RoleFormPage: React.FC<RoleFormPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === RoleFormMode.EDIT;
  const [searchTerm, setSearchTerm] = useState('');
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  const { data: roleData, isLoading: isLoadingRole, isFetching: isFetchingRole } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => getRoleById(Number(roleId)).then(res => res.data),
    enabled: isEditMode && !!roleId,
  });

  const { data: allPermissions, isLoading: isLoadingPermissions } = useQuery<Permission[], Error>({
    queryKey: ['permissionsList'],
    queryFn: getPermissionsList,
  });

  const { control, handleSubmit, reset, watch, setValue, getValues } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      permissions: [],
    },
  });
  const selectedPermissions = watch('permissions') || [];

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
      toast.success('تم حفظ الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      if(isEditMode && roleId) queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      navigate('/roles');
    },
    onError: (error: Error & { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }) => {
      let errorMessage = 'فشل حفظ الدور';
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
  const groupedPermissions = useMemo(() => allPermissions?.reduce((acc, permission) => {
    let groupName: string;

    // Reports and settings menu-item permissions each get their own group,
    // rather than being lumped together under the generic "عرض" bucket.
    if (permission.name.includes('تقرير') || permission.name.includes('تقارير')) {
      groupName = 'التقارير';
    } else if (permission.name.includes('اعدادات')) {
      groupName = 'الاعدادات';
    } else {
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

      groupName = mainResource.charAt(0).toUpperCase() + mainResource.slice(1);
    }

    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>), [allPermissions]);

  // Filter permissions based on search term
  const filteredGroupedPermissions = useMemo(() => {
    if (!groupedPermissions || !searchTerm.trim()) return groupedPermissions;

    const searchLower = searchTerm.toLowerCase();
    const filtered: Record<string, Permission[]> = {};

    Object.entries(groupedPermissions).forEach(([group, permissions]) => {
      const matchingPermissions = permissions.filter(permission => {
        const permissionName = permission.name.toLowerCase();
        return permissionName.includes(searchLower);
      });

      if (matchingPermissions.length > 0) {
        filtered[group] = matchingPermissions;
      }
    });

    return filtered;
  }, [groupedPermissions, searchTerm]);

  const sortedGroupEntries = useMemo(
    () => Object.entries(filteredGroupedPermissions || {}).sort(([a], [b]) => a.localeCompare(b)),
    [filteredGroupedPermissions]
  );

  const visiblePermissionNames = useMemo(
    () => sortedGroupEntries.flatMap(([, perms]) => perms.map(p => p.name)),
    [sortedGroupEntries]
  );
  const allVisibleSelected = visiblePermissionNames.length > 0 && visiblePermissionNames.every(name => selectedPermissions.includes(name));

  const togglePermissionNames = (names: string[], shouldSelect: boolean) => {
    const current = getValues('permissions') || [];
    const next = shouldSelect
      ? Array.from(new Set([...current, ...names]))
      : current.filter(name => !names.includes(name));
    setValue('permissions', next, { shouldDirty: true });
  };

  if (isEditMode && isLoadingRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256, gap: 1 }}>
        <CircularProgress size={24} />
        <Typography>جاري التحميل...</Typography>
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 700, mx: 'auto' }}>
      <CardContent sx={{ pb: 2 }}>
        <Typography variant="h6" component="h1">{isEditMode ? 'تعديل دور' : 'إضافة دور'}</Typography>
        <Typography variant="caption" color="text.secondary">يرجى تعبئة البيانات التالية</Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                size="small"
                label="الإسم"
                placeholder="أدخل اسم الدور"
                fullWidth
                disabled={dataIsLoading || formIsSubmitting}
                error={!!error}
                helperText={error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="permissions"
            render={({ field }) => (
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>الصلاحيات</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={() => setIsPermissionsDialogOpen(true)}
                    disabled={dataIsLoading || formIsSubmitting}
                    startIcon={<Settings className="h-3.5 w-3.5" />}
                  >
                    إدارة الصلاحيات
                  </Button>
                  <Chip
                    size="small"
                    color={field.value?.length ? 'secondary' : 'default'}
                    variant={field.value?.length ? 'filled' : 'outlined'}
                    label={`${field.value?.length || 0} / ${allPermissions?.length || 0}`}
                  />
                </Box>
              </Box>
            )}
          />

          <Dialog
            open={isPermissionsDialogOpen}
            onClose={() => setIsPermissionsDialogOpen(false)}
            maxWidth="xl"
            fullWidth
            PaperProps={{ sx: { maxHeight: '80vh', display: 'flex', flexDirection: 'column' } }}
            dir="rtl"
          >
            <DialogTitle sx={{ pb: 0.5 }}>
              <Typography variant="subtitle1">إدارة الصلاحيات</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                قم بتحديد الصلاحيات المناسبة لهذا الدور
              </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
              {isLoadingPermissions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : !groupedPermissions || Object.keys(groupedPermissions).length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  لا توجد صلاحيات متاحة
                </Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="ابحث عن صلاحية"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search className="h-3.5 w-3.5" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      disabled={visiblePermissionNames.length === 0}
                      onClick={() => togglePermissionNames(visiblePermissionNames, !allVisibleSelected)}
                      startIcon={<CheckCheck className="h-3.5 w-3.5" />}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      {allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </Button>
                    <Chip
                      size="small"
                      color="secondary"
                      label={`${selectedPermissions.length} / ${allPermissions?.length || 0}`}
                      sx={{ flexShrink: 0 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {sortedGroupEntries.map(([groupName, perms]) => {
                        const groupNames = perms.map(p => p.name);
                        const groupAllSelected = groupNames.every(name => selectedPermissions.includes(name));
                        const groupSomeSelected = !groupAllSelected && groupNames.some(name => selectedPermissions.includes(name));
                        return (
                          <Paper key={groupName} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1.25,
                                py: 0.75,
                                borderBottom: 1,
                                borderColor: 'divider',
                                cursor: 'pointer',
                                userSelect: 'none',
                                '&:hover': { bgcolor: 'action.selected' },
                              }}
                              onClick={() => togglePermissionNames(groupNames, !groupAllSelected)}
                            >
                              <Checkbox
                                size="small"
                                checked={groupAllSelected}
                                indeterminate={groupSomeSelected}
                                onChange={(e) => togglePermissionNames(groupNames, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0 }}
                              />
                              <Typography variant="caption" color="primary" fontWeight={600}>{groupName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({groupNames.filter(n => selectedPermissions.includes(n)).length}/{groupNames.length})
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: 'repeat(2, 1fr)',
                                  sm: 'repeat(3, 1fr)',
                                  lg: 'repeat(4, 1fr)',
                                  xl: 'repeat(5, 1fr)',
                                },
                                columnGap: 1,
                                p: 1,
                              }}
                            >
                              {perms.sort((a, b) => a.name.localeCompare(b.name)).map((permission) => (
                                <Controller
                                  key={permission.id}
                                  control={control}
                                  name="permissions"
                                  render={({ field: permissionArrayField }) => {
                                    const current = permissionArrayField.value || [];
                                    const checked = current.includes(permission.name);
                                    return (
                                      <FormControlLabel
                                        onClick={() => {
                                          permissionArrayField.onChange(
                                            checked
                                              ? current.filter((name: string) => name !== permission.name)
                                              : [...current, permission.name]
                                          );
                                        }}
                                        control={
                                          <Checkbox
                                            size="small"
                                            checked={checked}
                                            disabled={dataIsLoading || formIsSubmitting}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              permissionArrayField.onChange(
                                                e.target.checked
                                                  ? [...current, permission.name]
                                                  : current.filter((name: string) => name !== permission.name)
                                              );
                                            }}
                                          />
                                        }
                                        label={
                                          <Typography variant="caption" noWrap title={permission.name}>
                                            {permission.name}
                                          </Typography>
                                        }
                                        sx={{ m: 0, borderRadius: 1, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                                      />
                                    );
                                  }}
                                />
                              ))}
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ pt: 1.5 }}>
              <Button type="button" variant="outlined" size="small" onClick={() => setIsPermissionsDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogActions>
          </Dialog>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
            <Button type="button" variant="outlined" size="small" onClick={() => navigate('/roles')} disabled={formIsSubmitting}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={dataIsLoading || formIsSubmitting}
              startIcon={formIsSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            >
              حفظ
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
export default RoleFormPage;
