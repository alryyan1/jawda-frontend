import React from "react";
import { useTranslation } from "react-i18next";
import { Control, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/form";
import ImageUploadField from "./ImageUploadField";
import type { SettingsFormValues } from "@/types/settings";
import type { Setting } from "@/types/settings";

interface PrintSettingsSectionProps {
  control: Control<SettingsFormValues>;
  settings: Setting | null;
  setValue: (name: any, value: any) => void;
  watch: (name: string) => any;
  mutation: { isPending: boolean };
}

const PrintSettingsSection: React.FC<PrintSettingsSectionProps> = ({
  control,
  settings,
  setValue,
  watch,
  mutation,
}) => {
  const { t } = useTranslation("settings");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("printSection.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="is_logo"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  {t("printSection.isLogo")}
                </FormLabel>
              </FormItem>
            )}
          />
          {watch("is_logo") && (
            <Controller
              control={control}
              name="logo_file"
              render={({ field }) => (
                <ImageUploadField
                  field={field}
                  currentImageUrl={settings?.logo_base64}
                  label={t("printSection.logoFile")}
                  onClear={() => setValue("clear_logo_base64", true)}
                  disabled={mutation.isPending}
                />
              )}
            />
          )}
          <Separator />
          <FormField
            control={control}
            name="is_header"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  {t("printSection.isHeader")}
                </FormLabel>
              </FormItem>
            )}
          />
          {watch("is_header") && (
            <>
              <FormField
                control={control}
                name="header_content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("printSection.headerContent")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        rows={2}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Controller
                control={control}
                name="header_image_file"
                render={({ field }) => (
                  <ImageUploadField
                    field={field}
                    currentImageUrl={settings?.header_base64}
                    label={t("printSection.headerImageFile")}
                    onClear={() => setValue("clear_header_base64", true)}
                    disabled={mutation.isPending}
                  />
                )}
              />
            </>
          )}
          <Separator />
          <FormField
            control={control}
            name="print_direct"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  {t("printSection.printDirect")}
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="barcode"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  {t("printSection.barcode")}
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="show_water_mark"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  {t("printSection.showWaterMark")}
                </FormLabel>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("stampsSection.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Controller
            control={control}
            name="auditor_stamp_file"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                currentImageUrl={settings?.auditor_stamp}
                label={t("stampsSection.auditorStampFile")}
                onClear={() => setValue("clear_auditor_stamp", true)}
                disabled={mutation.isPending}
              />
            )}
          />
          <Controller
            control={control}
            name="manager_stamp_file"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                currentImageUrl={settings?.manager_stamp}
                label={t("stampsSection.managerStampFile")}
                onClear={() => setValue("clear_manager_stamp", true)}
                disabled={mutation.isPending}
              />
            )}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default PrintSettingsSection; 