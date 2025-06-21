// src/pages/SettingsPage.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import GeneralSettingsSection from "@/components/settings/GeneralSettingsSection";
import PrintSettingsSection from "@/components/settings/PrintSettingsSection";
import FinancialSettingsSection from "@/components/settings/FinancialSettingsSection";
import WorkflowSettingsSection from "@/components/settings/WorkflowSettingsSection";
import WhatsAppSettingsSection from "@/components/settings/WhatsAppSettingsSection";
import ReportHeaderSettingsSection from "@/components/settings/ReportHeaderSettingsSection";

import type { Setting } from "@/types/settings";
import type { FinanceAccount } from "@/types/finance";
import { getSettings, updateSettings } from "@/services/settingService";
import { getFinanceAccountsList } from "@/services/doctorService";
import type { AxiosError } from "axios";

// Define the settings schema
const settingsSchema = z.object({
  phone: z.string(),
  email: z.string(),
  is_logo: z.boolean(),
  send_welcome_message: z.boolean(),
  is_header: z.boolean(),
  barcode: z.boolean(),
  show_water_mark: z.boolean(),
  disable_doctor_service_check: z.boolean(),
  send_result_after_auth: z.boolean(),
  send_result_after_result: z.boolean(),
  edit_result_after_auth: z.boolean(),
  hospital_name: z.string().nullable(),
  lab_name: z.string().nullable(),
  address: z.string().nullable(),
  vatin: z.string().nullable(),
  cr: z.string().nullable(),
  logo_file: z.custom<File>().nullable(),
  clear_logo_base64: z.boolean(),
  financial_year_start: z.string().nullable(),
  financial_year_end: z.string().nullable(),
  welcome_message: z.string().max(2000).nullable(),
  header_content: z.string().nullable(),
  header_image_file: z.custom<File>().nullable(),
  clear_header_base64: z.boolean(),
  inventory_notification_number: z.string().nullable(),
  instance_id: z.string().nullable(),
  token: z.string().nullable(),
  finance_account_id: z.string().nullable(),
  bank_id: z.string().nullable(),
  company_account_id: z.string().nullable(),
  endurance_account_id: z.string().nullable(),
  main_cash: z.string().nullable(),
  main_bank: z.string().nullable(),
  pharmacy_cash: z.string().nullable(),
  pharmacy_bank: z.string().nullable(),
  pharmacy_income: z.string().nullable(),
  auditor_stamp_file: z.custom<File>().nullable(),
  clear_auditor_stamp: z.boolean(),
  manager_stamp_file: z.custom<File>().nullable(),
  clear_manager_stamp: z.boolean(),
  report_header_company_name: z.string().max(255).nullable(),
  report_header_address_line1: z.string().max(255).nullable(),
  report_header_address_line2: z.string().max(255).nullable(),
  report_header_phone: z.string().max(50).nullable(),
  report_header_email: z.string().email().nullable(),
  report_header_vatin: z.string().max(50).nullable(),
  report_header_cr: z.string().max(50).nullable(),
  report_header_logo_file: z.custom<File>().nullable(),
  clear_report_header_logo_base64: z.boolean(),
});

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation(["settings", "common"]);
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

  const { data: financeAccounts, isLoading: isLoadingFinanceAccounts } =
    useQuery<FinanceAccount[], Error>({
      queryKey: ["financeAccountsListForSettings"],
      queryFn: async () => {
        const accounts = await getFinanceAccountsList();
        return accounts.map(account => ({
          id: account.id,
          name: account.name,
          debit: "debit" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      },
    });

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      phone: "0",
      email: "a@a.com",
      is_logo: false,
      send_welcome_message: false,
      vatin: "123",
      is_header: false,
      address: "address",
      barcode: false,
      show_water_mark: false,
      disable_doctor_service_check: false,
      send_result_after_auth: false,
      send_result_after_result: false,
      edit_result_after_auth: false,
      clear_logo_base64: false,
      clear_header_base64: false,
      clear_auditor_stamp: false,
      clear_manager_stamp: false,
      clear_report_header_logo_base64: false,
      cr: "123",
     
    },
  });

  const { control, handleSubmit, reset, setValue } = form;

  useEffect(() => {
    if (settings) {
      const formValues = {
        ...settings,
        phone: settings.phone?.toString() || "0",
        finance_account_id: settings.finance_account_id?.toString() || null,
        bank_id: settings.bank_id?.toString() || null,
        company_account_id: settings.company_account_id?.toString() || null,
        endurance_account_id: settings.endurance_account_id?.toString() || null,
        main_cash: settings.main_cash?.toString() || null,
        main_bank: settings.main_bank?.toString() || null,
        pharmacy_cash: settings.pharmacy_cash?.toString() || null,
        pharmacy_bank: settings.pharmacy_bank?.toString() || null,
        pharmacy_income: settings.pharmacy_income?.toString() || null,
        logo_file: null,
        header_image_file: null,
        report_header_logo_file: null,
        vatin: settings.vatin?.toString() || "123",
        auditor_stamp_file: null,
        manager_stamp_file: null,
        clear_logo_base64: false,
        clear_header_base64: false,
        clear_auditor_stamp: false,
        clear_manager_stamp: false,
        clear_report_header_logo_base64: false,
        cr: settings.cr?.toString() || "123",
        email: settings.email || "a@a.com",
        address: settings.address || "address",
      };
      
      reset(formValues);
    }
  }, [settings, reset]);

  const mutation = useMutation<Setting, Error, z.infer<typeof settingsSchema>>({
    mutationFn: async (data) => {
      // Convert string IDs back to numbers for API
      const apiData = {
        ...data,
        finance_account_id: data.finance_account_id ? parseInt(data.finance_account_id) : null,
        bank_id: data.bank_id ? parseInt(data.bank_id) : null,
        company_account_id: data.company_account_id ? parseInt(data.company_account_id) : null,
        endurance_account_id: data.endurance_account_id ? parseInt(data.endurance_account_id) : null,
        main_cash: data.main_cash ? parseInt(data.main_cash) : null,
        main_bank: data.main_bank ? parseInt(data.main_bank) : null,
        pharmacy_cash: data.pharmacy_cash ? parseInt(data.pharmacy_cash) : null,
        pharmacy_bank: data.pharmacy_bank ? parseInt(data.pharmacy_bank) : null,
        pharmacy_income: data.pharmacy_income ? parseInt(data.pharmacy_income) : null,
      };
      return updateSettings(apiData);
    },
    onSuccess: (updatedSettings) => {
      toast.success(t("settings:settingsSavedSuccess"));
      queryClient.setQueryData(["settings"], updatedSettings);
      
      // Reset form with updated values
      const formValues = {
        ...updatedSettings,
        finance_account_id: updatedSettings.finance_account_id?.toString() || null,
        bank_id: updatedSettings.bank_id?.toString() || null,
        company_account_id: updatedSettings.company_account_id?.toString() || null,
        endurance_account_id: updatedSettings.endurance_account_id?.toString() || null,
        main_cash: updatedSettings.main_cash?.toString() || null,
        main_bank: updatedSettings.main_bank?.toString() || null,
        pharmacy_cash: updatedSettings.pharmacy_cash?.toString() || null,
        pharmacy_bank: updatedSettings.pharmacy_bank?.toString() || null,
        pharmacy_income: updatedSettings.pharmacy_income?.toString() || null,
        logo_file: null,
        header_image_file: null,
        report_header_logo_file: null,
        auditor_stamp_file: null,
        manager_stamp_file: null,
        clear_logo_base64: false,
        clear_header_base64: false,
        clear_auditor_stamp: false,
        clear_manager_stamp: false,
        clear_report_header_logo_base64: false,
      };
      
      reset(formValues);
    },
    onError: (error: AxiosError) => {
      toast.error(error.response?.data?.message || error.message || t("settings:settingsSaveError"));
    },
  });

  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    mutation.mutate(data);
  };

  if (isLoadingSettings)
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-2">{t("settings:loadingSettings")}</p>
      </div>
    );

  if (isError || !settings)
    return (
      <div className="p-6 text-center text-destructive">
        {t("settings:errorNoSettings")}
        <pre className="text-xs">{error?.message}</pre>
      </div>
    );

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t("settings:pageTitle")}</h1>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full" dir={i18n.dir()}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
              <TabsTrigger value="general">
                {t("settings:tabs.general")}
              </TabsTrigger>
              <TabsTrigger value="print">
                {t("settings:tabs.print")}
              </TabsTrigger>
              <TabsTrigger value="financial">
                {t("settings:tabs.financial")}
              </TabsTrigger>
              <TabsTrigger value="workflow">
                {t("settings:tabs.workflow")}
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                {t("settings:tabs.whatsapp")}
              </TabsTrigger>
              <TabsTrigger value="reportHeader">
                {t("settings:tabs.reportHeaderSettings")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettingsSection control={control} />
            </TabsContent>

            <TabsContent value="print">
              <PrintSettingsSection
                control={control}
                settings={settings}
                setValue={setValue}
                watch={form.watch}
                mutation={mutation}
              />
            </TabsContent>

            <TabsContent value="financial">
              <FinancialSettingsSection
                control={control}
                financeAccounts={financeAccounts}
                isLoadingFinanceAccounts={isLoadingFinanceAccounts}
                mutation={mutation}
              />
            </TabsContent>

            <TabsContent value="workflow">
              <WorkflowSettingsSection control={control} />
            </TabsContent>

            <TabsContent value="whatsapp">
              <WhatsAppSettingsSection control={control} />
            </TabsContent>

            <TabsContent value="reportHeader">
              <ReportHeaderSettingsSection
                control={control}
                settings={settings}
                setValue={setValue}
                mutation={mutation}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
              )}
              {t("settings:saveButton")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SettingsPage;
