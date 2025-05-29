import React from "react";
import { useTranslation } from "react-i18next";
import { Controller } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ImageUploadField from "./ImageUploadField";
import type { Setting } from "@/types/settings";
import type { SettingsFormValues } from "@/types/forms";

interface ReportHeaderSettingsSectionProps {
  control: Control<SettingsFormValues>;
  settings: Setting | null;
  setValue: UseFormSetValue<SettingsFormValues>;
  mutation: { isPending: boolean };
}

const ReportHeaderSettingsSection: React.FC<ReportHeaderSettingsSectionProps> = ({
  control,
  settings,
  setValue,
  mutation,
}) => {
  const { t } = useTranslation("settings");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reportHeaderSection.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="report_header_company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("reportHeaderSection.companyName")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="report_header_address_line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("reportHeaderSection.addressLine1")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="report_header_address_line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("reportHeaderSection.addressLine2")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="report_header_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportHeaderSection.phone")}</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="report_header_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportHeaderSection.email")}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="report_header_vatin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportHeaderSection.vatin")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="report_header_cr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportHeaderSection.cr")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Controller
          control={control}
          name="report_header_logo_file"
          render={({ field }) => (
            <ImageUploadField
              field={field}
              currentImageUrl={settings?.report_header_logo_base64}
              label={t("reportHeaderSection.logoFile")}
              onClear={() => setValue("clear_report_header_logo_base64", true)}
              disabled={mutation.isPending}
            />
          )}
        />
      </CardContent>
    </Card>
  );
};

export default ReportHeaderSettingsSection; 