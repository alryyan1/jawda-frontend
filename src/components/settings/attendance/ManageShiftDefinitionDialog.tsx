// src/components/settings/attendance/ManageShiftDefinitionDialog.tsx (New file in new directory)
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Loader2 } from "lucide-react";

import type {
  ShiftDefinition,
  ShiftDefinitionFormData,
} from "@/types/attendance";

// Mock service functions - replace with actual imports when service is available
const createShiftDefinition = async (data: ShiftDefinitionFormData): Promise<ShiftDefinition> => {
  // Mock implementation
  console.log('Creating shift definition:', data);
  return Promise.resolve({ id: Date.now(), ...data, duration_hours: 8 } as ShiftDefinition);
};

const updateShiftDefinition = async (id: number, data: Partial<ShiftDefinitionFormData>): Promise<ShiftDefinition> => {
  // Mock implementation
  console.log('Updating shift definition:', id, data);
  return Promise.resolve({ id, ...data, duration_hours: 8 } as ShiftDefinition);
};

interface ManageShiftDefinitionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftDefinition?: ShiftDefinition | null; // For editing
  onSuccess?: () => void;
}

type TranslationFunction = (key: string, options?: { field?: string }) => string;

const getShiftDefinitionSchema = (t: TranslationFunction) =>
  z.object({
    name: z
      .string()
      .min(1, {
        message: t("common:validation.requiredField", {
          field: t("attendance:shiftDefinitions.form.nameLabel"),
        }),
      })
      .max(255),
    shift_label: z
      .string()
      .min(1, {
        message: t("common:validation.requiredField", {
          field: t("attendance:shiftDefinitions.form.labelLabel"),
        }),
      })
      .max(50),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: t("attendance:validation.invalidTimeFormat"),
      }), // HH:mm
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: t("attendance:validation.invalidTimeFormat"),
      }), // HH:mm
    is_active: z.boolean(),
  });
// Add refinement for end_time > start_time if needed, considering overnight shifts.

type ShiftDefinitionFormValues = z.infer<
  ReturnType<typeof getShiftDefinitionSchema>
>;

const ManageShiftDefinitionDialog: React.FC<
  ManageShiftDefinitionDialogProps
> = ({ isOpen, onOpenChange, shiftDefinition, onSuccess }) => {
  const { t } = useTranslation(["attendance", "settings", "common"]);
  const queryClient = useQueryClient();
  const isEditMode = !!shiftDefinition;

  const formSchema = getShiftDefinitionSchema(t);
  const form = useForm<ShiftDefinitionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shift_label: "",
      start_time: "08:00",
      end_time: "16:00",
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && shiftDefinition) {
        form.reset({
          name: shiftDefinition.name,
          shift_label: shiftDefinition.shift_label,
          start_time: shiftDefinition.start_time, // Assumes backend sends HH:mm
          end_time: shiftDefinition.end_time, // Assumes backend sends HH:mm
          is_active: shiftDefinition.is_active,
        });
      } else {
        form.reset({
          name: "",
          shift_label: "",
          start_time: "08:00",
          end_time: "16:00",
          is_active: true,
        });
      }
    }
  }, [isOpen, isEditMode, shiftDefinition, form]);

  const mutation = useMutation({
    mutationFn: (data: ShiftDefinitionFormData) =>
      isEditMode && shiftDefinition?.id
        ? updateShiftDefinition(shiftDefinition.id, data)
        : createShiftDefinition(data),
    onSuccess: () => {
      toast.success(
        isEditMode
          ? t("attendance:shiftDefinitions.updatedSuccess")
          : t("attendance:shiftDefinitions.createdSuccess")
      );
      queryClient.invalidateQueries({ queryKey: ["shiftDefinitions"] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : t("common:error.saveFailed");
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: ShiftDefinitionFormValues) => {
    const payload: ShiftDefinitionFormData = {
      ...data,
      is_active: data.is_active,
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? t("attendance:shiftDefinitions.editTitle")
              : t("attendance:shiftDefinitions.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("common:form.fillDetails")}</DialogDescription>
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
                    {t("attendance:shiftDefinitions.form.nameLabel")}
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
              name="shift_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("attendance:shiftDefinitions.form.labelLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        "attendance:shiftDefinitions.form.labelPlaceholder"
                      )}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("attendance:shiftDefinitions.form.startTimeLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("attendance:shiftDefinitions.form.endTimeLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <FormLabel className="font-normal">
                    {t("attendance:shiftDefinitions.form.isActiveLabel")}
                  </FormLabel>
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
            <DialogFooter className="pt-4">
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
                {isEditMode ? t("common:saveChanges") : t("common:create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ManageShiftDefinitionDialog;
