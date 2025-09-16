// src/pages/users/UserFormPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Key, ArrowLeft, UserPlus, UserCog } from "lucide-react";
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
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />{" "}
        جارٍ تحميل بيانات المستخدم...
      </div>
    );
  }
  if (userError) {
    return (
      <div className="p-4 text-center text-destructive">
        {`فشل تحميل بيانات المستخدم: ${userError.message}`}
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-6 max-w-3xl">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/users")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          العودة إلى قائمة إدارة المستخدمين
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <UserCog className="h-6 w-6 text-primary" />
              ) : (
                <UserPlus className="h-6 w-6 text-primary" />
              )}
              <div>
                <CardTitle>
                  {isEditMode
                    ? "تعديل بيانات المستخدم"
                    : "إضافة مستخدم جديد"}
                </CardTitle>
                <CardDescription>
                  {isEditMode
                    ? "قم بتعديل بيانات المستخدم أدناه."
                    : "الرجاء ملء التفاصيل أدناه."}
                </CardDescription>
              </div>
            </div>
            {isEditMode && numericUserId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Key className="h-3.5 w-3.5" />
                تغيير كلمة المرور
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={dataIsLoading || mutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المستخدم</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={dataIsLoading || mutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!isEditMode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              disabled={mutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            يجب أن تكون كلمة المرور 8 أحرف على الأقل.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="password_confirmation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            تأكيد كلمة المرور
                          </FormLabel>
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
                  </div>
                )}

                <FormField
                  control={control}
                  name="doctor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الطبيب المرتبط (اختياري)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={dataIsLoading || mutation.isPending}
                        dir="rtl"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder="اختر طبيباً..."
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=" ">لا يوجد</SelectItem>
                          {isLoadingDoctors ? (
                            <SelectItem value="loading_docs" disabled>
                              جار التحميل...
                            </SelectItem>
                          ) : (
                            doctorsList?.map((doc: DoctorStripped) => (
                              <SelectItem key={doc.id} value={String(doc.id)}>
                                {doc.name}{" "}
                                {doc.specialist_name
                                  ? `(${doc.specialist_name})`
                                  : ""}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        هذا المستخدم مرتبط بطبيب معين.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="is_supervisor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                        <FormLabel className="font-normal cursor-pointer">
                          هل هو مشرف؟
                        </FormLabel>
                        <FormControl>
                          <Switch
                            id="is_supervisor_switch"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={dataIsLoading || mutation.isPending}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                        <FormLabel className="font-normal cursor-pointer">
                          نشط
                        </FormLabel>
                        <FormControl>
                          <Switch
                            id="is_active_switch"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={dataIsLoading || mutation.isPending}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                

                <FormField
                  control={control}
                  name="roles"
                  render={() => (
                    <FormItem>
                      <FormLabel>الأدوار</FormLabel>
                      <FormDescription>
                        اختر صلاحيات المستخدم
                      </FormDescription>
                      {isLoadingRoles ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                          {rolesList.map((role) => (
                            <Controller
                              key={role.id}
                              control={control}
                              name="roles"
                              render={({ field: roleArrayField }) => (
                                <FormItem className="flex flex-row items-center space-x-2 rtl:space-x-reverse space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={roleArrayField.value?.includes(
                                        role.name
                                      )}
                                      disabled={
                                        dataIsLoading || mutation.isPending
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentRoles =
                                          roleArrayField.value || [];
                                        const newRoles = checked
                                          ? [...currentRoles, role.name]
                                          : currentRoles.filter(
                                              (name) => name !== role.name
                                            );
                                        roleArrayField.onChange(newRoles);
                                      }}
                                      id={`role-${role.id}`}
                                    />
                                  </FormControl>
                                  <FormLabel
                                    htmlFor={`role-${role.id}`}
                                    className="font-normal text-sm cursor-pointer"
                                  >
                                    {role.name}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/users")}
                    disabled={mutation.isPending}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      dataIsLoading ||
                      mutation.isPending ||
                      (!isDirty && isEditMode)
                    }
                  >
                    {mutation.isPending && (
                      <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                    )}
                    {isEditMode ? "حفظ التغييرات" : "إنشاء"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

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
