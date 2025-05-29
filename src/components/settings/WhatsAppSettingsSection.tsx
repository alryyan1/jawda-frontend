import React from "react";
import { useTranslation } from "react-i18next";
import { Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

interface WhatsAppSettingsSectionProps {
  control: Control<SettingsFormValues>;
}

const WhatsAppSettingsSection: React.FC<WhatsAppSettingsSectionProps> = ({
  control,
}) => {
  const { t } = useTranslation("settings");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("whatsappSection.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="instance_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("whatsappSection.instanceId")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("whatsappSection.token")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="welcome_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("whatsappSection.welcomeMessage")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  rows={5}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="send_welcome_message"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">
                {t("whatsappSection.sendWelcomeMessage")}
              </FormLabel>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default WhatsAppSettingsSection; 