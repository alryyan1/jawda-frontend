import React from "react";
import { useTranslation } from "react-i18next";
import { Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import type { SettingsFormValues } from "@/types/settings";

interface WorkflowSettingsSectionProps {
  control: Control<SettingsFormValues>;
}

const WorkflowSettingsSection: React.FC<WorkflowSettingsSectionProps> = ({
  control,
}) => {
  const { t } = useTranslation("settings");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workflowSection.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="inventory_notification_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("workflowSection.inventoryNotificationNumber")}
              </FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="disable_doctor_service_check"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">
                {t("workflowSection.disableDoctorServiceCheck")}
              </FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="send_result_after_auth"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">
                {t("workflowSection.sendResultAfterAuth")}
              </FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="send_result_after_result"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">
                {t("workflowSection.sendResultAfterResult")}
              </FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="edit_result_after_auth"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">
                {t("workflowSection.editResultAfterAuth")}
              </FormLabel>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default WorkflowSettingsSection; 