// src/pages/users/UserFormPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  FormHelperText,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { Key, ArrowLeft, UserPlus, UserCog } from "lucide-react";
import { toast } from "sonner";

import type {
  UserFormData as UserApiPayload,
  Role,
  UserFormMode as UserFormModeEnum,
  User,
} from "@/types/users";
import type { DoctorStripped } from "@/types/doctors";
import {
  createUser,
  updateUser,
  getUserById,
  getRolesList,
} from "@/services/userService";
import { getDoctorsList as apiGetDoctorsList } from "@/services/doctorService";
import ChangePasswordDialog from "@/components/users/ChangePasswordDialog";

interface UserFormPageProps {
  mode: UserFormModeEnum;
}

type UserFormValues = {
  name: string;
  username: string;
  password?: string;
  password_confirmation?: string;
  doctor_id?: string | undefined;
  is_supervisor: boolean;
  is_active: boolean;
  user_type?: string;
  roles: string[];
};

const UserFormPage: React.FC<UserFormPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const queryClient = useQueryClient();

  const isEditMode = mode === "edit";
  const numericUserId = useMemo(
    () => (userId ? Number(userId) : null),
    [userId]
  );

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const form = useForm<UserFormValues>({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      password_confirmation: "",
      doctor_id: undefined,
      is_supervisor: false,
      is_active: true,
      user_type: "",
      roles: [],
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = form;

  const {
    data: userData,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery({
    queryKey: ["user", numericUserId],
    queryFn: () =>
      numericUserId
        ? getUserById(numericUserId).then((res) => res.data)
        : Promise.resolve(null),
    enabled: isEditMode && !!numericUserId,
  });

  const { data: rolesList = [], isLoading: isLoadingRoles } = useQuery<
    Role[],
    Error
  >({
    queryKey: ["rolesListForUserForm"],
    queryFn: getRolesList,
  });

  const { data: doctorsList = [], isLoading: isLoadingDoctors } = useQuery<
    DoctorStripped[],
    Error
  >({
    queryKey: ["doctorsListForUserForm"],
    queryFn: () => apiGetDoctorsList({ active: true }), // Assuming apiGetDoctorsList returns DoctorStripped[]
  });

  useEffect(() => {
    if (isEditMode && userData) {
      reset({
        name: userData.name || "",
        username: userData.username || "",
        password: "",
        password_confirmation: "",
        doctor_id: userData.doctor_id ? String(userData.doctor_id) : undefined,
        is_supervisor: !!userData.is_supervisor,
        is_active:
          userData.is_active === undefined ? true : !!userData.is_active,
        user_type: (userData as unknown as { user_type?: string })?.user_type || "",
        roles: userData.roles?.map((role) => role.name) || [],
      });
    } else if (!isEditMode) {
      reset({
        name: "",
        username: "",
        password: "",
        password_confirmation: "",
        doctor_id: undefined,
        is_supervisor: false,
        is_active: true,
        user_type: "",
        roles: [],
      });
    }
  }, [isEditMode, userData, reset]);

  const mutation = useMutation<{ data: User }, Error, UserApiPayload>({
    mutationFn: (data: UserApiPayload) =>
      isEditMode && numericUserId
        ? updateUser(numericUserId, data)
        : createUser(data),
    onSuccess: () => {
      toast.success(
        isEditMode
          ? "تم تحديث بيانات المستخدم بنجاح!"
          : "تم إنشاء المستخدم بنجاح!"
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (isEditMode && numericUserId) {
        queryClient.invalidateQueries({ queryKey: ["user", numericUserId] });
      }
      navigate("/users");
    },
    onError: (error: Error) => {
      const errorResponse = error as Error & { 
        response?: { 
          data?: { 
            message?: string; 
            errors?: Record<string, string[]>;
          } 
        } 
      };
      let errorMessage = isEditMode ? "فشل تحديث بيانات المستخدم." : "فشل إنشاء المستخدم.";
      if (errorResponse.response?.data?.errors) {
        const fieldErrors = Object.values(errorResponse.response.data.errors)
          .flat()
          .join(" ");
        errorMessage = `${errorMessage}${
          fieldErrors ? `: ${fieldErrors}` : ""
        }`;
      } else if (errorResponse.response?.data?.message) {
        errorMessage = errorResponse.response.data.message;
      }
      toast.error(errorMessage);
    },
  });

  const onSubmit = (formData: UserFormValues) => {
    const apiPayload: UserApiPayload = {
      name: formData.name,
      username: formData.username,
      doctor_id: formData.doctor_id ? Number(formData.doctor_id) : undefined,
      is_nurse: false,
      is_supervisor: formData.is_supervisor,
      is_active: formData.is_active,
      user_type: formData.user_type || undefined,
      roles: formData.roles || [],
      user_money_collector_type: 'all',
    };

    // Only include password if it's provided (for create or if edit form allows password change)
    if (formData.password && formData.password.trim() !== "") {
      apiPayload.password = formData.password;
      apiPayload.password_confirmation = formData.password_confirmation;
    }
    mutation.mutate(apiPayload);
  };

  const dataIsLoading = isLoadingUser || isLoadingRoles || isLoadingDoctors;

  if (isEditMode && isLoadingUser && !userData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>جارٍ تحميل بيانات المستخدم...</Typography>
      </Box>
    );
  }
  if (userError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ textAlign: 'center' }}>
          {`فشل تحميل بيانات المستخدم: ${userError.message}`}
        </Alert>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3, px: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate("/users")}
          sx={{ mb: 2 }}
          startIcon={<ArrowLeft size={16} />}
        >
          العودة إلى قائمة إدارة المستخدمين
        </Button>

        <Card>
          <CardHeader 
            sx={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              pb: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isEditMode ? (
                <UserCog size={24} color="primary" />
              ) : (
                <UserPlus size={24} color="primary" />
              )}
              <Box>
                <Typography variant="h6" component="h1">
                  {isEditMode
                    ? "تعديل بيانات المستخدم"
                    : "إضافة مستخدم جديد"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isEditMode
                    ? "قم بتعديل بيانات المستخدم أدناه."
                    : "الرجاء ملء التفاصيل أدناه."}
                </Typography>
              </Box>
            </Box>
            {isEditMode && numericUserId && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowPasswordDialog(true)}
                startIcon={<Key size={14} />}
                sx={{ fontSize: '0.75rem' }}
              >
                تغيير كلمة المرور
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ '& > *': { mb: 3 } }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label="الاسم الكامل"
                        fullWidth
                        disabled={dataIsLoading || mutation.isPending}
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    control={control}
                    name="username"
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label="اسم المستخدم"
                        fullWidth
                        disabled={dataIsLoading || mutation.isPending}
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    control={control}
                    name="user_type"
                    render={({ field, fieldState: { error } }) => (
                      <FormControl fullWidth error={!!error}>
                        <InputLabel>نوع المستخدم</InputLabel>
                        <Select
                        sx={{
                          width:'300px'
                        }}
                          {...field}
                          value={field.value || ""}
                          disabled={dataIsLoading || mutation.isPending}
                          label="نوع المستخدم"
                        >
                          <MenuItem value="">بدون</MenuItem>
                          <MenuItem value="استقبال معمل">استقبال معمل</MenuItem>
                          <MenuItem value="ادخال نتائج">ادخال نتائج</MenuItem>
                          <MenuItem value="استقبال عياده">استقبال عياده</MenuItem>
                          <MenuItem value="خزنه موحده">خزنه موحده</MenuItem>
                          <MenuItem value="تامين">تامين</MenuItem>
                        </Select>
                        <FormHelperText>{error?.message}</FormHelperText>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>

              {!isEditMode && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          type="password"
                          label="كلمة المرور"
                          fullWidth
                          disabled={mutation.isPending}
                          error={!!error}
                          helperText={error?.message || "يجب أن تكون كلمة المرور 8 أحرف على الأقل."}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      control={control}
                      name="password_confirmation"
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          type="password"
                          label="تأكيد كلمة المرور"
                          fullWidth
                          disabled={mutation.isPending}
                          error={!!error}
                          helperText={error?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              )}

              <Controller
                control={control}
                name="doctor_id"
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>الطبيب المرتبط (اختياري)</InputLabel>
                    <Select
                      {...field}
                      value={field.value || ""}
                      disabled={dataIsLoading || mutation.isPending}
                      label="الطبيب المرتبط (اختياري)"
                    >
                      <MenuItem value="">لا يوجد</MenuItem>
                      {isLoadingDoctors ? (
                        <MenuItem value="loading_docs" disabled>
                          جار التحميل...
                        </MenuItem>
                      ) : (
                        doctorsList?.map((doc: DoctorStripped) => (
                          <MenuItem key={doc.id} value={String(doc.id)}>
                            {doc.name}{" "}
                            {doc.specialist_name
                              ? `(${doc.specialist_name})`
                              : ""}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    <FormHelperText>
                      {error?.message || "هذا المستخدم مرتبط بطبيب معين."}
                    </FormHelperText>
                  </FormControl>
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    control={control}
                    name="is_supervisor"
                    render={({ field }) => (
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          height: '100%'
                        }}
                      >
                        <Typography variant="body1">
                          هل هو مشرف؟
                        </Typography>
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={dataIsLoading || mutation.isPending}
                        />
                      </Paper>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          height: '100%'
                        }}
                      >
                        <Typography variant="body1">
                          نشط
                        </Typography>
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={dataIsLoading || mutation.isPending}
                        />
                      </Paper>
                    )}
                  />
                </Grid>
              </Grid>

                

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  الأدوار
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  اختر صلاحيات المستخدم
                </Typography>
                {isLoadingRoles ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      maxHeight: 240, 
                      overflow: 'auto',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 1
                    }}
                  >
                    {rolesList.map((role) => (
                      <Controller
                        key={role.id}
                        control={control}
                        name="roles"
                        render={({ field: roleArrayField }) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={roleArrayField.value?.includes(role.name)}
                                disabled={dataIsLoading || mutation.isPending}
                                onChange={(e) => {
                                  const currentRoles = roleArrayField.value || [];
                                  const newRoles = e.target.checked
                                    ? [...currentRoles, role.name]
                                    : currentRoles.filter((name) => name !== role.name);
                                  roleArrayField.onChange(newRoles);
                                }}
                              />
                            }
                            label={role.name}
                            sx={{ margin: 0 }}
                          />
                        )}
                      />
                    ))}
                  </Paper>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate("/users")}
                  disabled={mutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    dataIsLoading ||
                    mutation.isPending ||
                    (!isDirty && isEditMode)
                  }
                  startIcon={mutation.isPending ? <CircularProgress size={16} /> : null}
                >
                  {isEditMode ? "حفظ التغييرات" : "إنشاء"}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {isEditMode && numericUserId && (
        <ChangePasswordDialog
          userId={numericUserId}
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </>
  );
};
export default UserFormPage;
