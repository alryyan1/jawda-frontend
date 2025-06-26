// src/pages/users/UserFormPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

const getUserFormSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
  isEditMode: boolean
) =>
  z
    .object({
      name: z
        .string()
        .min(1, {
          message: t("common:validation.required", {
            field: t("users:form.nameLabel"),
          }),
        })
        .max(255),
      username: z
        .string()
        .min(3, { message: t("users:validation.usernameMinLength") })
        .max(255),
      password: isEditMode
        ? z
            .string()
            .optional()
            .refine((val) => !val || val.length === 0 || val.length >= 8, {
              message: t("users:validation.passwordMinLengthOptional"),
            })
        : z
            .string()
            .min(8, { message: t("users:validation.passwordMinLength") }),
      password_confirmation: isEditMode ? z.string().optional() : z.string(),
      doctor_id: z.string().optional().nullable(),
      is_nurse: z.boolean(),
      is_supervisor: z.boolean(),
      is_active: z.boolean(),
      user_money_collector_type: z.enum(["lab", "company", "clinic", "all"]),
      roles: z
        .array(z.string())
        .min(1, { message: t("users:validation.roleRequired") }),
    })
    .refine(
      (data) => {
        if (data.password && data.password.length > 0) {
          return data.password === data.password_confirmation;
        }
        return true;
      },
      {
        message: t("users:validation.passwordsDoNotMatch"),
        path: ["password_confirmation"],
      }
    );

type UserFormSchemaValues = z.infer<ReturnType<typeof getUserFormSchema>>;

const UserFormPage: React.FC<UserFormPageProps> = ({ mode }) => {
  const { t, i18n } = useTranslation(["users", "common"]);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const queryClient = useQueryClient();

  const isEditMode = mode === "edit";
  const numericUserId = useMemo(
    () => (userId ? Number(userId) : null),
    [userId]
  );

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const userFormSchema = getUserFormSchema(t, isEditMode);

  const form = useForm<UserFormSchemaValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      password_confirmation: "",
      doctor_id: undefined,
      is_nurse: false,
      is_supervisor: false,
      is_active: true,
      roles: [],
      user_money_collector_type: "all",
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
        is_nurse: !!userData.is_nurse,
        is_supervisor: !!userData.is_supervisor,
        is_active:
          userData.is_active === undefined ? true : !!userData.is_active,
        roles: userData.roles?.map((role) => role.name) || [],
        user_money_collector_type: userData.user_money_collector_type || "all",
      });
    } else if (!isEditMode) {
      reset({
        name: "",
        username: "",
        password: "",
        password_confirmation: "",
        doctor_id: undefined,
        is_nurse: false,
        is_supervisor: false,
        is_active: true,
        roles: [],
        user_money_collector_type: "all",
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
        t(
          isEditMode
            ? "users:form.userUpdatedSuccess"
            : "users:form.userCreatedSuccess"
        )
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
      let errorMessage = t(
        isEditMode ? "users:form.userUpdateError" : "users:form.userCreateError"
      );
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

  const onSubmit = (formData: UserFormSchemaValues) => {
    const apiPayload: UserApiPayload = {
      name: formData.name,
      username: formData.username,
      doctor_id: formData.doctor_id ? Number(formData.doctor_id) : undefined,
      is_nurse: formData.is_nurse,
      is_supervisor: formData.is_supervisor,
      is_active: formData.is_active,
      roles: formData.roles || [],
      user_money_collector_type: formData.user_money_collector_type,
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
        {t("common:loadingEntity", { entity: t("users:entityName") })}
      </div>
    );
  }
  if (userError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common:error.loadFailedExt", {
          entity: t("users:entityName"),
          message: userError.message,
        })}
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
          {t("common:backToList", { listName: t("users:pageTitle") })}
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
                    ? t("users:editUserTitle")
                    : t("users:createUserTitle")}
                </CardTitle>
                <CardDescription>
                  {isEditMode
                    ? t("users:form.editDetailsDescription")
                    : t("users:form.fillDetailsToCreate")}
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
                {t("users:changePassword")}
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
                        <FormLabel>{t("users:form.nameLabel")}</FormLabel>
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
                        <FormLabel>{t("users:form.usernameLabel")}</FormLabel>
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
                          <FormLabel>{t("users:form.passwordLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              disabled={mutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("users:validation.passwordMinLength")}
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
                            {t("users:form.confirmPasswordLabel")}
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
                      <FormLabel>{t("users:form.doctorIdLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={dataIsLoading || mutation.isPending}
                        dir={i18n.dir()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "users:form.selectDoctorPlaceholder"
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=" ">{t("common:none")}</SelectItem>
                          {isLoadingDoctors ? (
                            <SelectItem value="loading_docs" disabled>
                              {t("common:loading")}
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
                        {t("users:form.doctorIdDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="is_nurse"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse space-y-0 rounded-md border p-3 shadow-sm h-full justify-between">
                        <FormLabel className="font-normal cursor-pointer">
                          {t("users:form.isNurseLabel")}
                        </FormLabel>
                        <FormControl>
                          <Checkbox
                            id="is_nurse_checkbox"
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
                    name="is_supervisor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                        <FormLabel className="font-normal cursor-pointer">
                          {t("users:form.isSupervisorLabel")}
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
                          {t("users:form.isActiveLabel")}
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
                  name="user_money_collector_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("users:form.moneyCollectorTypeLabel")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={dataIsLoading || mutation.isPending}
                        dir={i18n.dir()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("users:moneyCollectorTypes.all")}
                          </SelectItem>
                          <SelectItem value="lab">
                            {t("users:moneyCollectorTypes.lab")}
                          </SelectItem>
                          <SelectItem value="company">
                            {t("users:moneyCollectorTypes.company")}
                          </SelectItem>
                          <SelectItem value="clinic">
                            {t("users:moneyCollectorTypes.clinic")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {t("users:form.moneyCollectorTypeDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="roles"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t("users:form.rolesLabel")}</FormLabel>
                      <FormDescription>
                        {t("users:form.selectRolesDescription")}
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
                    {t("common:cancel")}
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
                    {isEditMode ? t("common:saveChanges") : t("common:create")}
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
