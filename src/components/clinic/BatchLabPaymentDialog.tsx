import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
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

interface BatchLabPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: number;
  requestedTests: LabRequest[]; // Array of ALL requested tests for the visit (to calculate total due accurately)
  currentPatient: Patient | null; // Patient data for company check
  currentClinicShift: Shift;
  onBatchPaymentSuccess: (updatedVisitData: DoctorVisit) => void;
}

// Define translation options type
interface TranslationOptions {
  amount?: number;
  balance?: number;
  field?: string;
  count?: number;
}

// Zod Schema for the batch payment form
const getBatchPaymentSchema = (
  t: (key: string, options?: TranslationOptions) => string,
  maxAmount: number,
  minAmount = 0.01
) =>
  z.object({
    total_payment_amount: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)), {
        message: t("common:validation.mustBeNumeric"),
      })
      .transform((val) => parseFloat(val))
      .refine((val) => val >= minAmount, {
        message: t("payments:validation.amountMinRequired", {
          amount: minAmount.toFixed(1),
        }),
      })
      .refine((val) => val <= maxAmount + 0.001, {
        message: t("payments:validation.amountExceedsTotalBalance", {
          balance: maxAmount.toFixed(1),
        }),
      }), // Allow for small float precision
    is_bankak: z
      .string()
      .min(1, {
        message: t("common:validation.required", {
          field: t("payments:paymentMethod"),
        }),
      }), // "0" cash, "1" bank
    payment_notes: z
      .string()
      .max(255, t("common:validation.maxLengthShort", { count: 255 }))
      .optional()
      .nullable(),
  });

const BatchLabPaymentDialog: React.FC<BatchLabPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  visitId,
  requestedTests,
  currentPatient,
  currentClinicShift,
  onBatchPaymentSuccess,
}) => {
  const { t, i18n } = useTranslation(["payments", "common", "labTests"]);
  const isCompanyPatient = !!currentPatient?.company_id;

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

  const batchPaymentSchema = getBatchPaymentSchema(
    t,
    summary.totalBalanceDue > 0 ? summary.totalBalanceDue : 0.01
  );
  type BatchPaymentFormValues = z.infer<ReturnType<typeof batchPaymentSchema>>;

  const form = useForm<BatchPaymentFormValues>({
    resolver: zodResolver(batchPaymentSchema),
    defaultValues: {
      total_payment_amount:
        summary.totalBalanceDue > 0
          ? summary.totalBalanceDue.toFixed(1)
          : "0.00",
      is_bankak: "0",
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
        total_payment_amount: parseFloat(defaultAmount), // Zod expects number after transform
        is_bankak: "0",
        payment_notes: "",
      });
      // For display, keep it as string
      form.setValue("total_payment_amount", defaultAmount);
    }
  }, [isOpen, summary.totalBalanceDue, form, t]); // Added t to dependencies

  const mutation = useMutation({
    mutationFn: (data: {
      total_payment_amount: number;
      is_bankak: boolean;
      payment_notes?: string;
    }) =>
      batchPayLabRequestsForVisit(visitId, {
        ...data,
        shift_id: currentClinicShift.id,
      }),
    onSuccess: (updatedVisitData) => {
      toast.success(t("payments:batchPaymentSuccess"));
      onBatchPaymentSuccess(updatedVisitData);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message || t("payments:batchPaymentError")
      );
    },
  });

  const onSubmit = (data: BatchPaymentFormValues) => {
    if (summary.totalBalanceDue <= 0) {
      toast.info(t("payments:allLabRequestsPaidOrNoBalance"));
      onOpenChange(false); // Close dialog if nothing to pay
      return;
    }
    mutation.mutate({
      total_payment_amount: data.total_payment_amount, // Already a number from Zod transform
      is_bankak: data.is_bankak === "1",
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
            {t("payments:batchPayDialogTitleLab")}
          </DialogTitle>
          <DialogDescription>
            {t("payments:batchPayDialogDescription", {
              count: summary.itemCount,
            })}
            <br />
            {t("payments:totalNetPayableIs")}:
            <span className="font-semibold">
              {summary.totalNetPayable.toFixed(1)}
            </span>
            {t("common:currency")} <br />
            {t("payments:totalAlreadyPaidIs")}:
            <span className="font-semibold text-green-600">
              {summary.totalAlreadyPaid.toFixed(1)}
            </span>
            {t("common:currency")} <br />
            {t("payments:totalBalanceDueIs")}:
            <span className="font-semibold text-lg text-red-600 dark:text-red-400">
              {summary.totalBalanceDue.toFixed(1)}
            </span>
            {t("common:currency")}
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-3" />
        {summary.itemCount === 0 || summary.totalBalanceDue <= 0.009 ? (
          <div className="py-6 text-center text-muted-foreground">
            {t("payments:allLabRequestsPaidOrNoBalance")}
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
                    <FormLabel>{t("payments:totalAmountToPayNow")}</FormLabel>
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
                name="is_bankak"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">
                      {t("payments:paymentMethod")}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                        dir={i18n.dir()}
                        disabled={mutation.isPending}
                      >
                        <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                          <FormControl>
                            <RadioGroupItem value="0" />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">
                            {t("payments:cash")}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                          <FormControl>
                            <RadioGroupItem value="1" />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">
                            {t("payments:paymentMethodBankak")}
                          </FormLabel>
                        </FormItem>
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
                    <FormLabel>{t("payments:paymentNotesOptional")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value || ""}
                        disabled={mutation.isPending}
                        placeholder={t("payments:paymentNotesPlaceholder")}
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
                    {t("common:cancel")}
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
                  {t("common:payTotalAmount")}
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
