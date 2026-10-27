import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Loader2, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import type { Shift } from "@/types/shifts";
import type { DoctorVisit, LabRequest } from "@/types/visits"; // For the success callback type
import type { Patient } from "@/types/patients"; // Needed for company check for endurance

import { batchPayLabRequestsForVisit } from "@/services/labRequestService";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

interface BatchLabPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: number;
  requestedTests: LabRequest[]; // Array of ALL requested tests for the visit (to calculate total due accurately)
  currentPatient: Patient | null; // Patient data for company check
  currentClinicShift: Shift;
  onBatchPaymentSuccess: (updatedVisitData: DoctorVisit) => void;
}

// Form values interface
interface BatchPaymentFormValues {
  total_payment_amount: string;
  payment_method_id: string;
  payment_notes?: string | null;
}

const BatchLabPaymentDialog: React.FC<BatchLabPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  visitId,
  requestedTests,
  currentPatient,
  currentClinicShift,
  onBatchPaymentSuccess,
}) => {
  const isCompanyPatient = !!currentPatient?.company_id;
  const { paymentMethods, defaultPaymentMethodId } = usePaymentMethods();

  const calculateItemNetPayable = (lr: LabRequest): number => {
    const price = Number(lr.price) || 0;
    const itemSubTotal = price;
    const discountAmount = (itemSubTotal * (Number(lr.discount_per) || 0)) / 100;
    const enduranceAmount = Number(lr.endurance) || 0;
    return itemSubTotal - discountAmount - (isCompanyPatient ? enduranceAmount : 0);
  };

  const summary = useMemo(() => {
    if (!requestedTests)
      return {
        totalNetPayable: 0,
        totalAlreadyPaid: 0,
        totalBalanceDue: 0,
        itemCount: 0,
      };
    let totalNetPayable = 0;
    let totalAlreadyPaid = 0;
    let itemCount = 0;

    requestedTests.forEach((lr) => {
      if (!lr.is_paid) {
        // Only consider unpaid or partially paid items
        const netPayableForItem = calculateItemNetPayable(lr);
        const alreadyPaidForItem = Number(lr.amount_paid) || 0;
        if (netPayableForItem > alreadyPaidForItem) {
          totalNetPayable += netPayableForItem;
          totalAlreadyPaid += alreadyPaidForItem;
          itemCount++;
        }
      }
    });
    const totalBalanceDue = totalNetPayable - totalAlreadyPaid;
    return { totalNetPayable, totalAlreadyPaid, totalBalanceDue, itemCount };
  }, [requestedTests, isCompanyPatient]);

  const form = useForm<BatchPaymentFormValues>({
    defaultValues: {
      total_payment_amount:
        summary.totalBalanceDue > 0
          ? summary.totalBalanceDue.toFixed(1)
          : "0.00",
      payment_method_id: "",
      payment_notes: "",
    },
  });

  // Reset form when dialog opens or relevant data changes
  useEffect(() => {
    if (isOpen) {
      const defaultAmount =
        summary.totalBalanceDue > 0
          ? summary.totalBalanceDue.toFixed(1)
          : "0.00";
      form.reset({
        total_payment_amount: defaultAmount,
        payment_method_id: defaultPaymentMethodId ? defaultPaymentMethodId.toString() : "",
        payment_notes: "",
      });
      // For display, keep it as string
      form.setValue("total_payment_amount", defaultAmount);
    }
  }, [isOpen, summary.totalBalanceDue, form, defaultPaymentMethodId]);

  const mutation = useMutation({
    mutationFn: (data: {
      total_payment_amount: number;
      payment_method_id: number;
      payment_notes?: string;
    }) =>
      batchPayLabRequestsForVisit(visitId, data),
    onSuccess: (updatedVisitData) => {
      toast.success("batchPaymentSuccess");
      onBatchPaymentSuccess(updatedVisitData);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message || "batchPaymentError"
      );
    },
  });

  const onSubmit = (data: BatchPaymentFormValues) => {
    // Basic validation
    const amount = parseFloat(data.total_payment_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("المبلغ يجب أن يكون رقم صحيح أكبر من الصفر");
      return;
    }
    
    if (amount > summary.totalBalanceDue + 0.001) {
      toast.error("المبلغ يتجاوز الرصيد المستحق");
      return;
    }
    
    if (!data.payment_method_id) {
      toast.error("طريقة الدفع مطلوبة");
      return;
    }

    if (summary.totalBalanceDue <= 0) {
      toast.info("جميع طلبات المختبر مدفوعة أو لا يوجد رصيد مستحق");
      onOpenChange(false);
      return;
    }

    mutation.mutate({
      total_payment_amount: amount,
      payment_method_id: Number(data.payment_method_id),
      payment_notes: data.payment_notes,
    });
  };

  if (!isOpen) return null; // Don't render if not open

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            {"batchPayDialogTitleLab"}
          </DialogTitle>
          <DialogDescription>
            {"batchPayDialogDescription"}
            <br />
            {"totalNetPayableIs"}:
            <span className="font-semibold">
              {summary.totalNetPayable.toFixed(1)}
            </span>
            {"currency"} <br />
            {"totalAlreadyPaidIs"}:
            <span className="font-semibold text-green-600">
              {summary.totalAlreadyPaid.toFixed(1)}
            </span>
            {"currency"} <br />
            {"totalBalanceDueIs"}:
            <span className="font-semibold text-lg text-red-600 ">
              {summary.totalBalanceDue.toFixed(1)}
            </span>
            {"currency"}
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-3" />
        {summary.itemCount === 0 || summary.totalBalanceDue <= 0.009 ? (
          <div className="py-6 text-center text-muted-foreground">
            {"allLabRequestsPaidOrNoBalance"}
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
            >
              <FormField
                control={form.control}
                name="total_payment_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"totalAmountToPayNow"}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)} // Ensure RHF handles string for input
                        value={field.value || ""} // Handle number from RHF state correctly for input
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method_id"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">
                      {"paymentMethod"}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                        dir={true}
                        disabled={mutation.isPending}
                      >
                        {paymentMethods.map((method) => (
                          <FormItem key={method.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                            <FormControl>
                              <RadioGroupItem value={method.id.toString()} />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">
                              {method.name}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"paymentNotesOptional"}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value || ""}
                        disabled={mutation.isPending}
                        placeholder={"paymentNotesPlaceholder"}
                      />
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
                  disabled={
                    mutation.isPending || summary.totalBalanceDue <= 0.009
                  }
                >
                  {mutation.isPending && (
                    <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                  )}
                  {"payTotalAmount"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default BatchLabPaymentDialog;
