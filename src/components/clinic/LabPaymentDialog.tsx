// src/components/clinic/LabPaymentDialog.tsx
import React, { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2 } from "lucide-react";

import type { LabRequest } from "@/types/visits";
import { recordLabRequestPayment } from "@/services/labRequestService";

interface LabPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  labRequest: LabRequest | null;
  onPaymentSuccess: (updatedLabRequest: LabRequest) => void;
  currentClinicShiftId: number | null;
}

// Define the form schema type
type PaymentFormValues = {
  amount_to_pay: string;
  is_bankak: string;
};

const getLabPaymentSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
  maxAmount: number,
  minAmount = 0.01
) =>
  z.object({
    amount_to_pay: z
      .string()
      .min(1, {
        message: t("common:validation.required", {
          field: t("payments:amountToPay"),
        }),
      })
      .refine((val) => !isNaN(parseFloat(val)), {
        message: t("common:validation.mustBeNumeric"),
      })
      .refine((val) => parseFloat(val) >= minAmount, {
        message: t("payments:validation.amountMinRequired", {
          amount: minAmount.toFixed(1),
        }),
      })
      .refine((val) => parseFloat(val) <= maxAmount, {
        message: t("payments:validation.amountExceedsBalance", {
          balance: maxAmount.toFixed(1),
        }),
      }),
    is_bankak: z
      .string()
      .min(1, {
        message: t("common:validation.required", {
          field: t("payments:paymentMethod"),
        }),
      }),
  });

const LabPaymentDialog: React.FC<LabPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  labRequest,
  onPaymentSuccess,
  currentClinicShiftId,
}) => {
  const { t } = useTranslation(["payments", "common", "labTests"]);

  const netPayable = useMemo(() => {
    if (!labRequest) return 0;
    const price = Number(labRequest.price) || 0;
    const discountAmount =
      (price * (Number(labRequest.discount_per) || 0)) / 100;
    const enduranceAmount = Number(labRequest.endurance) || 0;
    return price - discountAmount - enduranceAmount;
  }, [labRequest]);

  const balanceDue = useMemo(() => {
    if (!labRequest) return 0;
    return netPayable - (Number(labRequest.amount_paid) || 0);
  }, [netPayable, labRequest]);

  const paymentSchema = getLabPaymentSchema(
    t,
    balanceDue > 0 ? balanceDue : 0.01,
    0.01
  );

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_to_pay: balanceDue > 0 ? balanceDue.toFixed(1) : "0.0",
      is_bankak: "0",
    },
  });

  useEffect(() => {
    if (isOpen && labRequest) {
      const defaultAmount = balanceDue > 0 ? balanceDue.toFixed(1) : "0.0";
      form.reset({ amount_to_pay: defaultAmount, is_bankak: "0" });
    }
  }, [isOpen, labRequest, balanceDue, form]);

  const recordPaymentMutation = useMutation({
    mutationFn: (data: { amount_to_pay: number; is_bankak: boolean }) => {
      if (!labRequest) throw new Error("Lab request is missing for payment.");
      if (!currentClinicShiftId)
        throw new Error("Active clinic shift ID is missing.");
      return recordLabRequestPayment(labRequest.id, {
        amount_to_pay: data.amount_to_pay,
        is_bankak: data.is_bankak,
        shift_id: currentClinicShiftId,
      });
    },
    onSuccess: (updatedLabRequest) => {
      toast.success(t("payments:paymentSuccess"));
      onPaymentSuccess(updatedLabRequest);
    },
    onError: (error: Error) => {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("payments:paymentError")
      );
    },
  });

  const onSubmit: SubmitHandler<PaymentFormValues> = (data) => {
    if (balanceDue <= 0) {
      toast.info(t("payments:alreadyPaidOrNoBalance"));
      return;
    }
    recordPaymentMutation.mutate({
      amount_to_pay: parseFloat(data.amount_to_pay),
      is_bankak: data.is_bankak === "1",
    });
  };

  if (!labRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("payments:dialogTitleLab", {
              testName:
                labRequest.main_test?.main_test_name ||
                t("labTests:testEntityName"),
            })}
          </DialogTitle>
          <DialogDescription>
            {t("payments:balanceDue")}:{" "}
            <span className="font-semibold">{balanceDue.toFixed(1)}</span>{" "}
            {t("common:currency")}
            <br />
            {t("payments:netPayable")}:{" "}
            <span className="font-semibold">{netPayable.toFixed(1)}</span>{" "}
            {t("common:currency")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="amount_to_pay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("payments:amountToPay")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      value={field.value || ""}
                      disabled={
                        recordPaymentMutation.isPending || balanceDue <= 0
                      }
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
                <FormItem className="space-y-2">
                  <FormLabel>{t("payments:paymentMethod")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4 rtl:space-x-reverse"
                      disabled={
                        recordPaymentMutation.isPending || balanceDue <= 0
                      }
                    >
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem
                            value="0"
                            id={`cash-lab-${labRequest.id}`}
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor={`cash-lab-${labRequest.id}`}
                          className="font-normal"
                        >
                          {t("payments:cash")}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem
                            value="1"
                            id={`bank-lab-${labRequest.id}`}
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor={`bank-lab-${labRequest.id}`}
                          className="font-normal"
                        >
                          {t("payments:paymentMethodBankak")}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
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
                  disabled={recordPaymentMutation.isPending}
                >
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending || balanceDue <= 0}
              >
                {recordPaymentMutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                {t("common:pay")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default LabPaymentDialog;
