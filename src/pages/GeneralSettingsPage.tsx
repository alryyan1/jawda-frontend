import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Loader2, Building2, MessageSquare, FileText, Settings, Bell } from "lucide-react";

import type { Setting } from "@/types/settings";
import { getSettings, updateSettings } from "@/services/settingService";

// Settings form data type
type SettingsFormData = {
  // Basic Information
  phone?: string;
  email?: string;
  address?: string;
  hospital_name?: string;
  lab_name?: string;
  currency?: string;
  vatin?: string;
  cr?: string;
  
  // Ultramsg WhatsApp Settings
  ultramsg_instance_id?: string;
  ultramsg_token?: string;
  ultramsg_base_url?: string;
  ultramsg_default_country_code?: string;
  
  // Lab Workflow Settings
  send_result_after_auth?: boolean;
  send_result_after_result?: boolean;
  edit_result_after_auth?: boolean;
  print_direct?: boolean;
  disable_doctor_service_check?: boolean;
  barcode?: boolean;
  show_water_mark?: boolean;
  
  // Notification Settings
  inventory_notification_number?: string;
  welcome_message?: string;
  send_welcome_message?: boolean;
  
  // Report Settings
  is_header?: boolean;
  is_footer?: boolean;
  is_logo?: boolean;
  header_content?: string;
  footer_content?: string;
  report_header_company_name?: string;
  report_header_address_line1?: string;
  report_header_address_line2?: string;
  report_header_phone?: string;
  report_header_email?: string;
  report_header_vatin?: string;
  report_header_cr?: string;
  default_lab_report_template?: string;
};

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");

  const {
    data: settings,
    isLoading: isLoadingSettings,
    isError,
    error,
  } = useQuery<Setting | null, Error>({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const form = useForm<SettingsFormData>({
    defaultValues: {
      // Basic Information
      phone: undefined,
      email: undefined,
      address: undefined,
      hospital_name: undefined,
      lab_name: undefined,
      currency: undefined,
      vatin: undefined,
      cr: undefined,
      
      // Ultramsg WhatsApp Settings
      ultramsg_instance_id: undefined,
      ultramsg_token: undefined,
      ultramsg_base_url: undefined,
      ultramsg_default_country_code: undefined,
      
      // Lab Workflow Settings
      send_result_after_auth: undefined,
      send_result_after_result: undefined,
      edit_result_after_auth: undefined,
      print_direct: undefined,
      disable_doctor_service_check: undefined,
      barcode: undefined,
      show_water_mark: undefined,
      
      // Notification Settings
      inventory_notification_number: undefined,
      welcome_message: undefined,
      send_welcome_message: undefined,
      
      // Report Settings
      is_header: undefined,
      is_footer: undefined,
      is_logo: undefined,
      header_content: undefined,
      footer_content: undefined,
      report_header_company_name: undefined,
      report_header_address_line1: undefined,
      report_header_address_line2: undefined,
      report_header_phone: undefined,
      report_header_email: undefined,
      report_header_vatin: undefined,
      report_header_cr: undefined,
      default_lab_report_template: undefined,
    },
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (settings) {
      reset({
        // Basic Information
        phone: settings.phone?.toString() || undefined,
        email: settings.email || undefined,
        address: settings.address || undefined,
        hospital_name: settings.hospital_name || undefined,
        lab_name: settings.lab_name || undefined,
        currency: settings.currency || undefined,
        vatin: settings.vatin || undefined,
        cr: settings.cr || undefined,
        
        // Ultramsg WhatsApp Settings
        ultramsg_instance_id: settings.ultramsg_instance_id || undefined,
        ultramsg_token: settings.ultramsg_token || undefined,
        ultramsg_base_url: settings.ultramsg_base_url || undefined,
        ultramsg_default_country_code: settings.ultramsg_default_country_code || undefined,
        
        // Lab Workflow Settings
        send_result_after_auth: settings.send_result_after_auth || undefined,
        send_result_after_result: settings.send_result_after_result || undefined,
        edit_result_after_auth: settings.edit_result_after_auth || undefined,
        print_direct: settings.print_direct || undefined,
        disable_doctor_service_check: settings.disable_doctor_service_check || undefined,
        barcode: settings.barcode || undefined,
        show_water_mark: settings.show_water_mark || undefined,
        
        // Notification Settings
        inventory_notification_number: settings.inventory_notification_number || undefined,
        welcome_message: settings.welcome_message || undefined,
        send_welcome_message: settings.send_welcome_message || undefined,
        
        // Report Settings
        is_header: settings.is_header || undefined,
        is_footer: settings.is_footer || undefined,
        is_logo: settings.is_logo || undefined,
        header_content: settings.header_content || undefined,
        footer_content: settings.footer_content || undefined,
        report_header_company_name: settings.report_header_company_name || undefined,
        report_header_address_line1: settings.report_header_address_line1 || undefined,
        report_header_address_line2: settings.report_header_address_line2 || undefined,
        report_header_phone: settings.report_header_phone || undefined,
        report_header_email: settings.report_header_email || undefined,
        report_header_vatin: settings.report_header_vatin || undefined,
        report_header_cr: settings.report_header_cr || undefined,
        default_lab_report_template: settings.default_lab_report_template || undefined,
      });
    }
  }, [settings, reset]);

  const mutation = useMutation<Setting, Error, SettingsFormData>({
    mutationFn: async (data) => {
      return updateSettings(data as Setting);
    },
    onSuccess: (updatedSettings) => {
      toast.success("تم حفظ الإعدادات بنجاح");
      queryClient.setQueryData(["settings"], updatedSettings);
    },
    onError: (error: Error) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || error?.message || "فشل حفظ الإعدادات";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    // All fields are now optional, so we can save without validation
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">الإعدادات العامة</h1>
        <p className="text-muted-foreground mt-2">إدارة جميع إعدادات النظام والمختبر</p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                الأساسية
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                واتساب
              </TabsTrigger>
              <TabsTrigger value="workflow" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                سير العمل
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                الإشعارات
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                التقارير
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>المعلومات الأساسية</CardTitle>
                  <CardDescription>المعلومات الأساسية للمستشفى والمختبر</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0xxxxxxxxx" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="example@mail.com" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العنوان</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="العنوان الكامل" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="hospital_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستشفى</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="اسم المستشفى" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="lab_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المختبر</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="اسم المختبر" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العملة</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="SDG" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="vatin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرقم الضريبي</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="الرقم الضريبي" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="cr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم السجل التجاري</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="رقم السجل التجاري" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Settings Tab */}
            <TabsContent value="whatsapp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات واتساب</CardTitle>
                  <CardDescription>إعدادات خدمة واتساب</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="ultramsg_instance_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>instance id</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="instance140877" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="ultramsg_token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>token</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="df2r46jz82otkegg" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="ultramsg_base_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رابط الخدمة</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://api.ultramsg.com" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="ultramsg_default_country_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رمز الدولة الافتراضي</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="249" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs will be added in separate edits */}
            <TabsContent value="workflow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات سير العمل</CardTitle>
                  <CardDescription>إعدادات تدفق العمل في المختبر</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">إعدادات سير العمل ستكون متاحة قريباً...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات الإشعارات</CardTitle>
                  <CardDescription>إعدادات الإشعارات والرسائل الترحيبية</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">إعدادات الإشعارات ستكون متاحة قريباً...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات التقارير</CardTitle>
                  <CardDescription>إعدادات تنسيق وعرض التقارير</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={control}
                    name="default_lab_report_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>قالب تقرير المختبر الافتراضي</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="اسم القالب الافتراضي" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={mutation.isPending} size="lg">
              {mutation.isPending && (
                <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
              )}
              حفظ الإعدادات
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SettingsPage;
