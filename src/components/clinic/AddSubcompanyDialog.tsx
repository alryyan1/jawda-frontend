// src/components/clinic/AddSubcompanyDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

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

import { createSubcompany } from "@/services/companyService";
import type { Subcompany } from "@/types/companies";

interface AddSubcompanyDialogProps {
  companyId: number | null;
  companyName?: string;
  onSubcompanyAdded: (newSubcompany: Subcompany) => void;
  triggerButton?: React.ReactNode;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface SubcompanyFormValues {
  name: string;
  lab_endurance: string;
  service_endurance: string;
}

// Removed Zod schema - using manual validation

const AddSubcompanyDialog: React.FC<AddSubcompanyDialogProps> = ({
  companyId,
  companyName,
  onSubcompanyAdded,
  triggerButton,
  disabled,
  open,
  onOpenChange,
}) => {
  // Translation hook removed since we're not using translations
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Use controlled state if provided
  const dialogOpen = open ?? isOpen;
  const setDialogOpen = onOpenChange ?? setIsOpen;

  const form = useForm<SubcompanyFormValues>({
    defaultValues: {
      name: "",
      lab_endurance: "0",
      service_endurance: "0",
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: SubcompanyFormValues) => {
      if (!companyId) throw new Error("Parent company ID is required.");
      const result = await createSubcompany({
        name: formData.name,
        lab_endurance: parseFloat(formData.lab_endurance),
        service_endurance: parseFloat(formData.service_endurance),
        company_id: companyId,
      });
      return result;
    },
    onSuccess: (newSubcompany) => {
      toast.success("subcompany.addedSuccess");
      queryClient.invalidateQueries({
        queryKey: ["subcompaniesList", companyId],
      });
      onSubcompanyAdded(newSubcompany);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message ||
          "error.saveFailed"
      );
    },
  });

  const onSubmit: SubmitHandler<SubcompanyFormValues> = (data) => {
    // Basic validation
    if (!data.name.trim()) {
      toast.error("اسم الشركة الفرعية مطلوب");
      return;
    }
    
    if (!companyId) {
      toast.error("معرف الشركة الأم مطلوب");
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
      aria-label={"subcompany.addButton"}
      disabled={disabled || !companyId}
      title={
        !companyId
          ? "subcompany.selectParentCompanyFirst"
          : "subcompany.addButton"
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
            {"subcompany.addDialogTitle"}{" "}
            {companyName && `(${companyName})`}
          </DialogTitle>
          <DialogDescription>
            {"subcompany.addDialogDescription"}
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
                  <FormLabel>{"fields.subCompanyName"}</FormLabel>
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
                      {"fields.labEnduranceShort"}
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
                      {"fields.serviceEnduranceShort"}
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
                  {"إلغاء"}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending || !companyId}>
                {mutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                {"add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubcompanyDialog;
