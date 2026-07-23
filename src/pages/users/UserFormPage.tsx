// src/pages/users/UserFormPage.tsx
import React, { useEffect, useMemo } from "react";
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
  Typography,
  Box,
  Grid,
  FormHelperText,
  CircularProgress,
  Alert,
  Paper,
  Autocomplete,
  Divider,
} from "@mui/material";
import { ArrowLeft, UserPlus, UserCog } from "lucide-react";
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

const USER_TYPE_OPTIONS = [
  "استقبال معمل",
  "ادخال نتائج",
  "استقبال عياده",
  "خزنه موحده",
  "تامين",
];

const UserFormPage: React.FC<UserFormPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const queryClient = useQueryClient();

  const isEditMode = mode === "edit";
  const numericUserId = useMemo(
    () => (userId ? Number(userId) : null),
    [userId],
  );

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
        user_type:
          (userData as unknown as { user_type?: string | null })?.user_type ??
          "",
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
          : "تم إنشاء المستخدم بنجاح!",
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
          };
        };
      };
      let errorMessage = isEditMode
        ? "فشل تحديث بيانات المستخدم."
        : "فشل إنشاء المستخدم.";
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
      is_supervisor: formData.is_supervisor,
      is_active: formData.is_active,
      user_type: formData.user_type ? formData.user_type : null,
      roles: formData.roles || [],
    };

    // Only include password if it's provided (for create or if edit form allows password change)
    if (formData.password && formData.password.trim() !== "") {
      apiPayload.password = formData.password;
      apiPayload.password_confirmation = formData.password_confirmation;
    }
    mutation.mutate(apiPayload);
  };

  const dataIsLoading = isLoadingUser || isLoadingRoles || isLoadingDoctors;
  const fieldsDisabled = dataIsLoading || mutation.isPending;

  if (isEditMode && isLoadingUser && !userData) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 256,
        }}
      >
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>جارٍ تحميل بيانات المستخدم...</Typography>
      </Box>
    );
  }
  if (userError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ textAlign: "center" }}>
          {`فشل تحميل بيانات المستخدم: ${userError.message}`}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 2, px: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Button
          variant="text"
          size="small"
          onClick={() => navigate("/users")}
          startIcon={<ArrowLeft className="h-4 w-4" />}
        >
          رجوع
        </Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {isEditMode ? (
          <UserCog className="h-5 w-5 text-primary" />
        ) : (
          <UserPlus className="h-5 w-5 text-primary" />
        )}
        <Typography variant="h6" component="h1">
          {isEditMode ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ "& > *": { mb: 2 } }}
          >
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  control={control}
                  name="name"
                  rules={{ required: "الاسم مطلوب" }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="الاسم الكامل"
                      fullWidth
                      disabled={fieldsDisabled}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  control={control}
                  name="username"
                  rules={{ required: "اسم المستخدم مطلوب" }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="اسم المستخدم"
                      fullWidth
                      disabled={fieldsDisabled}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  control={control}
                  name="user_type"
                  render={({ field, fieldState: { error } }) => (
                    <FormControl fullWidth size="small" error={!!error}>
                      <InputLabel>نوع المستخدم</InputLabel>
                      <Select {...field} value={field.value || ""} disabled={fieldsDisabled} label="نوع المستخدم">
                        <MenuItem value="">بدون</MenuItem>
                        {USER_TYPE_OPTIONS.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>{error?.message}</FormHelperText>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={control}
                  name="password"
                  rules={{
                    validate: (value) => {
                      if (!isEditMode && !value?.trim()) {
                        return "كلمة المرور مطلوبة";
                      }
                      if (value && value.length < 8) {
                        return "يجب أن تكون كلمة المرور 8 أحرف على الأقل";
                      }
                      return true;
                    },
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      type="password"
                      label={
                        isEditMode
                          ? "كلمة المرور الجديدة (اختياري)"
                          : "كلمة المرور"
                      }
                      fullWidth
                      disabled={mutation.isPending}
                      error={!!error}
                      helperText={
                        error?.message ||
                        (isEditMode
                          ? "اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور."
                          : "8 أحرف على الأقل.")
                      }
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={control}
                  name="password_confirmation"
                  rules={{
                    validate: (value, formValues) => {
                      if (!isEditMode && !value?.trim()) {
                        return "تأكيد كلمة المرور مطلوب";
                      }
                      if (formValues.password && value !== formValues.password) {
                        return "كلمتا المرور غير متطابقتين";
                      }
                      return true;
                    },
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      type="password"
                      label={
                        isEditMode
                          ? "تأكيد كلمة المرور الجديدة"
                          : "تأكيد كلمة المرور"
                      }
                      fullWidth
                      disabled={mutation.isPending}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Controller
              control={control}
              name="doctor_id"
              render={({ field, fieldState: { error } }) => (
                <Autocomplete
                  size="small"
                  options={doctorsList}
                  loading={isLoadingDoctors}
                  disabled={fieldsDisabled}
                  getOptionLabel={(doc: DoctorStripped) =>
                    doc.specialist_name
                      ? `${doc.name} (${doc.specialist_name})`
                      : doc.name
                  }
                  value={
                    doctorsList.find(
                      (doc) => String(doc.id) === field.value,
                    ) ?? null
                  }
                  onChange={(_, newValue) =>
                    field.onChange(
                      newValue ? String(newValue.id) : undefined,
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="الطبيب المرتبط (اختياري)"
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              )}
            />

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              <Controller
                control={control}
                name="is_supervisor"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={fieldsDisabled}
                      />
                    }
                    label="مشرف"
                  />
                )}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={fieldsDisabled}
                      />
                    }
                    label="نشط"
                  />
                )}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                الأدوار
              </Typography>
              {isLoadingRoles ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Controller
                  control={control}
                  name="roles"
                  render={({ field: roleArrayField }) => (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        maxHeight: 200,
                        overflow: "auto",
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 0.5,
                      }}
                    >
                      {rolesList.map((role) => (
                        <FormControlLabel
                          key={role.id}
                          control={
                            <Checkbox
                              size="small"
                              checked={roleArrayField.value?.includes(
                                role.name,
                              )}
                              disabled={fieldsDisabled}
                              onChange={(e) => {
                                const currentRoles =
                                  roleArrayField.value || [];
                                const newRoles = e.target.checked
                                  ? [...currentRoles, role.name]
                                  : currentRoles.filter(
                                      (name) => name !== role.name,
                                    );
                                roleArrayField.onChange(newRoles);
                              }}
                            />
                          }
                          label={<Typography variant="body2">{role.name}</Typography>}
                          sx={{ margin: 0 }}
                        />
                      ))}
                    </Paper>
                  )}
                />
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                pt: 1,
                mb: 0,
              }}
            >
              <Button
                type="button"
                size="small"
                variant="outlined"
                onClick={() => navigate("/users")}
                disabled={mutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={
                  dataIsLoading ||
                  mutation.isPending ||
                  (!isDirty && isEditMode)
                }
                startIcon={
                  mutation.isPending ? <CircularProgress size={16} /> : null
                }
              >
                {isEditMode ? "حفظ التغييرات" : "إنشاء"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default UserFormPage;
