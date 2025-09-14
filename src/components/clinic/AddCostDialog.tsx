// src/components/clinic/AddCostDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, PlusCircle, ReceiptText } from "lucide-react"; // ReceiptText for costs

import type { DoctorShift } from "@/types/doctors"; // Or shifts.ts
import type { Shift } from "@/types/shifts";
import { getActiveDoctorShifts } from "@/services/clinicService"; // To populate doctor shifts dropdown
import { addCost } from "@/services/costService";
import { getCostCategoriesList } from "@/services/costService";
import type { CostCategory, CostFormData } from "@/types/finance";

interface AddCostDialogProps {
  currentOpenClinicShift: Shift | null; // Must have an open general shift
  triggerButton?: React.ReactNode;
  onCostAdded?: (newCost: any) => void; // Callback
}

const getCostFormSchema = (t: Function) =>
  z.object({
      .min(1, {
        message: "validation.required",
      })
      .max(255),
   // "0" or "1"
    cost_category_id: z.string().optional().nullable(),
    doctor_shift_id: z.string().optional().nullable(),
    comment: z.string().max(255).optional().nullable(),
    amount_cash_input: z.string().optional().nullable(),
    amount_bank_input: z.string().optional().nullable(),
  });
type CostFormValues = z.infer<ReturnType<typeof getCostFormSchema>>;

const AddCostDialog: React.FC<AddCostDialogProps> = ({
  currentOpenClinicShift,
  triggerButton,
  onCostAdded,
}) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const costFormSchema = getCostFormSchema(t);
  const form = useForm<CostFormValues>({
    resolver: zodResolver(costFormSchema),
    defaultValues: {
      description: "",
      amount_cash_input: "",
      amount_bank_input: "",
      comment: "",
    },
  });

  const { data: costCategories, isLoading: isLoadingCategories } = useQuery<
    CostCategory[],
    Error
  >({
    queryKey: ["costCategoriesList"],
    queryFn: getCostCategoriesList,
    enabled: isOpen,
  });

  const { data: activeDoctorShifts, isLoading: isLoadingDoctorShifts } =
    useQuery<DoctorShift[], Error>({
      queryKey: ["activeDoctorShiftsForCostDialog", currentOpenClinicShift?.id],
      queryFn: () => getActiveDoctorShifts(currentOpenClinicShift?.id), // Pass general shift ID if API supports
      enabled: isOpen && !!currentOpenClinicShift,
    });

  const mutation = useMutation({
    mutationFn: addCost,
    onSuccess: (newCost) => {
      toast.success("costs.addedSuccess");
      // queryClient.invalidateQueries({ queryKey: ['costsList'] }); // If you have a list of costs elsewhere
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] }); // Costs affect dashboard
      queryClient.invalidateQueries({ queryKey: ["currentOpenShift"] }); // If shift totals are displayed
      if (onCostAdded) onCostAdded(newCost);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "costs.addError"
      );
    },
  });

  const onSubmit = (data: CostFormValues) => {
    if (!currentOpenClinicShift) {
      toast.error("costs.noOpenShift");
      return;
    }
    const submissionData: CostFormData = {
      ...data,
      shift_id: currentOpenClinicShift.id,
    };
    mutation.mutate(submissionData);
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="w-11 h-11"
            aria-label={"costs.addButton"}
            disabled={!currentOpenClinicShift}
          >
            <ReceiptText className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{"costs.addDialogTitle"}</DialogTitle>
          <DialogDescription>
            {"costs.addDialogDescription"}
          </DialogDescription>
        </DialogHeader>
        {!currentOpenClinicShift && isOpen ? (
          <div className="py-10 text-center text-muted-foreground">
            {"costs.noOpenShift"}
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit}
              className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1"
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {"costs.descriptionLabel"}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount_cash_input"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"costs.amountCashLabel"}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <FormField
                control={form.control}
                name="amount_bank_input"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"costs.amountBankLabel"}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             
              <FormField
                control={form.control}
                name="cost_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"costs.categoryLabel"}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      defaultValue={field.value || ""}
                      dir={true}
                      disabled={isLoadingCategories || mutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={"costs.selectCategory"}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{"none"}</SelectItem>
                        {costCategories?.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doctor_shift_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {"costs.doctorShiftLabel"}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      defaultValue={field.value || ""}
                      dir={true}
                      disabled={isLoadingDoctorShifts || mutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={"costs.selectDoctorShift"}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{"none"}</SelectItem>
                        {activeDoctorShifts?.map((ds) => (
                          <SelectItem key={ds.id} value={String(ds.id)}>
                            {ds.doctor_name} ({"shift"} #{ds.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"costs.commentLabel"}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
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
                    {"إلغاء"}
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !currentOpenClinicShift}
                >
                  {mutation.isPending && (
                    <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                  )}
                  {"add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default AddCostDialog;
