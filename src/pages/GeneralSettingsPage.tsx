import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import type { Setting } from "@/types/settings";
import { getSettings, updateSettings } from "@/services/settingService";
import type { AxiosError } from "axios";

// Minimal settings form (remove zod and tabs/subsections)
type SimpleSettingsForm = {
  phone: string;
  email: string;
  address: string;
  hospital_name: string | null;
  lab_name: string | null;
};

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading: isLoadingSettings,
    isError,
    error,
  } = useQuery<Setting | null, Error>({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const form = useForm<SimpleSettingsForm>({
    defaultValues: {
      phone: "",
      email: "",
      address: "",
      hospital_name: "",
      lab_name: "",
    },
  });
  const { register, handleSubmit, reset } = form;

  useEffect(() => {
    if (settings) {
      reset({
        phone: settings.phone?.toString() || "",
        email: settings.email || "",
        address: settings.address || "",
        hospital_name: settings.hospital_name || "",
        lab_name: settings.lab_name || "",
      });
    }
  }, [settings, reset]);

  const mutation = useMutation<Setting, Error, SimpleSettingsForm>({
    mutationFn: async (data) => {
      const payload: Partial<Setting> = {
        phone: data.phone,
        email: data.email,
        address: data.address,
        hospital_name: data.hospital_name,
        lab_name: data.lab_name,
      };
      return updateSettings(payload as Setting);
    },
    onSuccess: (updatedSettings) => {
      toast.success("تم حفظ الإعدادات بنجاح");
      queryClient.setQueryData(["settings"], updatedSettings);
      reset({
        phone: updatedSettings.phone?.toString() || "",
        email: updatedSettings.email || "",
        address: updatedSettings.address || "",
        hospital_name: updatedSettings.hospital_name || "",
        lab_name: updatedSettings.lab_name || "",
      });
    },
    onError: (error: AxiosError) => {
      toast.error(error.response?.data?.message || error.message || "فشل حفظ الإعدادات");
    },
  });

  const onSubmit = (data: SimpleSettingsForm) => {
    if (!data.phone.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }
    if (!data.email.trim()) {
      toast.error("البريد الإلكتروني مطلوب");
      return;
    }
    mutation.mutate(data);
  };

  if (isLoadingSettings)
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-2">جاري تحميل الإعدادات...</p>
      </div>
    );

  if (isError || !settings)
    return (
      <div className="p-6 text-center text-destructive">
        فشل جلب الإعدادات
        <pre className="text-xs">{error?.message}</pre>
      </div>
    );

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">الإعدادات العامة</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">الهاتف</label>
          <input className="w-full border rounded-md h-10 px-3" {...register("phone")} placeholder="0xxxxxxxxx" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
          <input className="w-full border rounded-md h-10 px-3" {...register("email")} placeholder="example@mail.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">العنوان</label>
          <input className="w-full border rounded-md h-10 px-3" {...register("address")} placeholder="العنوان" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم المستشفى</label>
            <input className="w-full border rounded-md h-10 px-3" {...register("hospital_name")} placeholder="اسم المستشفى" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم المختبر</label>
            <input className="w-full border rounded-md h-10 px-3" {...register("lab_name")} placeholder="اسم المختبر" />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
            )}
            حفظ
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
