// src/components/clinic/AddCompanyRelationDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, PlusCircle } from "lucide-react";

import { createCompanyRelation } from "@/services/companyService";
import type { CompanyRelation } from "@/types/companies";

interface AddCompanyRelationDialogProps {
  companyId: number | null;
  companyName?: string;
  onCompanyRelationAdded: (newRelation: CompanyRelation) => void;
  triggerButton?: React.ReactNode;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface CompanyRelationFormValues {
  name: string;
  lab_endurance: string;
  service_endurance: string;
}

const relationSchema = z.object({
  name: z.string().min(1),
  lab_endurance: z.string().min(1),
  service_endurance: z.string().min(1),
}) satisfies z.ZodType<CompanyRelationFormValues>;

const AddCompanyRelationDialog: React.FC<AddCompanyRelationDialogProps> = ({
  companyId,
  companyName,
  onCompanyRelationAdded,
  triggerButton,
  disabled,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation(["patients", "common"]);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Use controlled state if provided
  const dialogOpen = open ?? isOpen;
  const setDialogOpen = onOpenChange ?? setIsOpen;

  const form = useForm<CompanyRelationFormValues>({
    resolver: zodResolver(relationSchema),
    defaultValues: {
      name: "",
      lab_endurance: "0",
      service_endurance: "0",
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: CompanyRelationFormValues) => {
      if (!companyId)
        throw new Error("Parent company ID is required for relation.");
      const result = await createCompanyRelation({
        name: formData.name,
        lab_endurance: parseFloat(formData.lab_endurance),
        service_endurance: parseFloat(formData.service_endurance),
        company_id: companyId,
      });
      return result;
    },
    onSuccess: (newRelation) => {
      toast.success(t("patients:relation.addedSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["companyRelationsList", companyId],
      });
      onCompanyRelationAdded(newRelation);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message ||
          t("common:error.saveFailed", {
            entity: t("patients:fields.companyRelation"),
          })
      );
    },
  });

  const onSubmit: SubmitHandler<CompanyRelationFormValues> = (data) => {
    if (!companyId) {
      toast.error(t("patients:relation.parentCompanyRequiredError"));
      return;
    }
    mutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 disabled:opacity-50"
      aria-label={t("patients:relation.addButton")}
      disabled={disabled || !companyId}
      title={
        !companyId
          ? t("patients:relation.selectParentCompanyFirst")
          : t("patients:relation.addButton")
      }
    >
      <PlusCircle className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild disabled={disabled || !companyId}>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("patients:relation.addDialogTitle")}{" "}
            {companyName && `(${companyName})`}
          </DialogTitle>
          <DialogDescription>
            {t("patients:relation.addDialogDescription")}
          </DialogDescription>
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
                  <FormLabel>{t("patients:fields.relationName")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lab_endurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("patients:fields.labEnduranceShort")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service_endurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("patients:fields.serviceEnduranceShort")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              <Button type="submit" disabled={mutation.isPending || !companyId}>
                {mutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                {t("common:add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyRelationDialog;
