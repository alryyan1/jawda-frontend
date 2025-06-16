// src/components/settings/attendance/ManageHolidayDialog.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { arSA, enUS } from "date-fns/locale";
import apiClient from "@/services/api";
import type {
  Holiday,
  HolidayFormValues as FormValues,
} from "@/types/attendance"; // Using HolidayFormValues
import { cn } from "@/lib/utils";

interface ManageHolidayDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  holiday: Holiday | null; // Pass null for "add" mode
  onSuccess: () => void; // Callback on successful save
}

// Zod schema using HolidayFormValues definition (Date object for holiday_date)
const getHolidaySchema = (t: any) =>
  z.object({
    name: z
      .string()
      .min(1, {
        message: t("common:validation.required", {
          field: t("attendance:holidays.dialog.nameLabel"),
        }),
      })
      .max(255),
    holiday_date: z.date({
      required_error: t("common:validation.required", {
        field: t("attendance:holidays.dialog.dateLabel"),
      }),
    }),
    is_recurring: z.boolean(),
    description: z.string().max(500).optional(),
  });

const ManageHolidayDialog: React.FC<ManageHolidayDialogProps> = ({
  isOpen,
  onOpenChange,
  holiday,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(["attendance", "common"]);
  const isEditMode = !!holiday;
  const formSchema = getHolidaySchema(t);

  type FormData = z.infer<typeof formSchema>;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      holiday_date: new Date(),
      is_recurring: false,
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (holiday) {
        form.reset({
          name: holiday.name,
          // Ensure holiday_date is parsed correctly. Add time 'T00:00:00' to avoid timezone issues if date is just 'YYYY-MM-DD'
          holiday_date: holiday.holiday_date
            ? parseISO(holiday.holiday_date + "T00:00:00")
            : new Date(),
          is_recurring: holiday.is_recurring,
          description: holiday.description || "",
        });
      } else {
        form.reset({
          name: "",
          holiday_date: new Date(),
          is_recurring: false,
          description: "",
        });
      }
    }
  }, [holiday, isOpen, form]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        holiday_date: format(data.holiday_date, "yyyy-MM-dd"), // Format date for API
      };
      if (isEditMode && holiday) {
        return apiClient.put(`/holidays/${holiday.id}`, payload);
      }
      return apiClient.post("/holidays", payload);
    },
    onSuccess: () => {
      toast.success(
        isEditMode
          ? t("attendance:holidays.updatedSuccess")
          : t("attendance:holidays.createdSuccess")
      );
      onSuccess(); // This will invalidate query and close dialog from parent
    },
    onError: (error: any) => {
      const apiErrorMessage =
        error.response?.data?.errors?.holiday_date?.[0] ||
        error.response?.data?.message;
      toast.error(apiErrorMessage || t("common:error.saveFailed"));
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? t("attendance:holidays.dialog.editTitle")
              : t("attendance:holidays.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("attendance:holidays.dialog.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="holiday_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    {t("attendance:holidays.dialog.dateLabel")}
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
                          disabled={mutation.isPending}
                        >
                          {field.value ? (
                            format(field.value, "PPP", {
                              locale: i18n.language.startsWith("ar")
                                ? arSA
                                : enUS,
                            })
                          ) : (
                            <span>{t("common:pickDate")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        disabled={(date) => date < new Date("1900-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t("attendance:holidays.dialog.recurringLabel")}
                    </FormLabel>
                    <DialogDescription className="text-xs">
                      {t("attendance:holidays.dialog.recurringDescription")}
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("attendance:holidays.dialog.descriptionLabel")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        "attendance:holidays.dialog.descriptionPlaceholder"
                      )}
                      {...field}
                      value={field.value || ""}
                      disabled={mutation.isPending}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                >
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                {t(isEditMode ? "common:saveChanges" : "common:create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ManageHolidayDialog;
