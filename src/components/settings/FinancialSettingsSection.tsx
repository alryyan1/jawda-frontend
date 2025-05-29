import React from "react";
import { useTranslation } from "react-i18next";
import type { Control } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SettingsFormValues } from "@/types/forms";
import type { FinanceAccount } from "@/types/finance";

interface FinancialSettingsSectionProps {
  control: Control<SettingsFormValues>;
  financeAccounts: FinanceAccount[] | undefined;
  isLoadingFinanceAccounts: boolean;
  mutation: { isPending: boolean };
}

interface RenderFinanceAccountSelectProps {
  fieldName: keyof SettingsFormValues;
  labelKey: string;
  control: Control<SettingsFormValues>;
  financeAccounts: FinanceAccount[] | undefined;
  isLoadingFinanceAccounts: boolean;
  mutation: { isPending: boolean };
}

const RenderFinanceAccountSelect: React.FC<RenderFinanceAccountSelectProps> = ({
  fieldName,
  labelKey,
  control,
  financeAccounts,
  isLoadingFinanceAccounts,
  mutation,
}) => {
  const { t } = useTranslation("settings");

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value ? String(field.value) : ""}
            disabled={isLoadingFinanceAccounts || mutation.isPending}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t("selectAccount")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value=" ">{t("common:none")}</SelectItem>
              {financeAccounts?.map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.name} {account.code && `(${account.code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const FinancialSettingsSection: React.FC<FinancialSettingsSectionProps> = ({
  control,
  financeAccounts,
  isLoadingFinanceAccounts,
  mutation,
}) => {
  const { t } = useTranslation("settings");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("financialSection.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="financial_year_start"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  {t("financialSection.financialYearStart")}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "yyyy-MM-dd")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) =>
                        field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                      }
                      disabled={mutation.isPending}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="financial_year_end"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  {t("financialSection.financialYearEnd")}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "yyyy-MM-dd")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) =>
                        field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                      }
                      disabled={mutation.isPending}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RenderFinanceAccountSelect
            fieldName="finance_account_id"
            labelKey="financialSection.financeAccountId"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="bank_id"
            labelKey="financialSection.bankId"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="company_account_id"
            labelKey="financialSection.companyAccountId"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="endurance_account_id"
            labelKey="financialSection.enduranceAccountId"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="main_cash"
            labelKey="financialSection.mainCash"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="main_bank"
            labelKey="financialSection.mainBank"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
        </div>
        <h3 className="font-medium pt-2 border-t">
          {t("pharmacySectionTitle")}
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <RenderFinanceAccountSelect
            fieldName="pharmacy_cash"
            labelKey="financialSection.pharmacyCash"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="pharmacy_bank"
            labelKey="financialSection.pharmacyBank"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
          <RenderFinanceAccountSelect
            fieldName="pharmacy_income"
            labelKey="financialSection.pharmacyIncome"
            control={control}
            financeAccounts={financeAccounts}
            isLoadingFinanceAccounts={isLoadingFinanceAccounts}
            mutation={mutation}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSettingsSection; 