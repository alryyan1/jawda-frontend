// src/components/clinic/LabPaymentDialog.tsx
import React, { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

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

// Removed Zod schema - using manual validation

const LabPaymentDialog: React.FC<LabPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  labRequest,
  onPaymentSuccess,
  currentClinicShiftId,
}) => {
  // Translation hook removed since we're not using translations

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

  const form = useForm<PaymentFormValues>({
    defaultValues: {
      amount_to_pay: balanceDue > 0 ? balanceDue.toFixed(1) : "0.0",
      is_bankak: "0",
    },
  });

  useEffect(() => {
    if (isOpen && labRequest) {
      const defaultAmount = balanceDue > 0 ? balanceDue.toFixed(1) : "0.0";
      form.reset({
        amount_to_pay: defaultAmount,
        is_bankak: "0",
      });
    }
  }, [isOpen, labRequest, balanceDue, form]);

  const recordPaymentMutation = useMutation({
    mutationFn: (data: { amount_to_pay: number; is_bankak: boolean }) => {
      if (!labRequest) throw new Error("Lab request is missing for payment.");
      if (!currentClinicShiftId)
        throw new Error("Active clinic shift ID is missing.");
      return recordLabRequestPayment(labRequest.id, {
        ...data,
        shift_id: currentClinicShiftId
      });
    },
    onSuccess: (updatedLabRequest) => {
      toast.success("paymentSuccess");
      onPaymentSuccess(updatedLabRequest);
    },
    onError: (error: Error) => {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "paymentError"
      );
    },
  });

  const onSubmit: SubmitHandler<PaymentFormValues> = (data) => {
    // Basic validation
    const amount = parseFloat(data.amount_to_pay);
    if (isNaN(amount) || amount <= 0) {
      toast.error("المبلغ يجب أن يكون رقم صحيح أكبر من الصفر");
      return;
    }
    
    if (amount > balanceDue) {
      toast.error("المبلغ يتجاوز الرصيد المستحق");
      return;
    }
    
    if (!data.is_bankak) {
      toast.error("طريقة الدفع مطلوبة");
      return;
    }
    
    if (balanceDue <= 0) {
      toast.info("الطلب مدفوع بالفعل أو لا يوجد رصيد مستحق");
      return;
    }
    
    recordPaymentMutation.mutate({
      amount_to_pay: amount,
      is_bankak: data.is_bankak === "1",
    });
  };

  if (!labRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {"dialogTitleLab"}
          </DialogTitle>
          <DialogDescription>
            {"balanceDue"}:{" "}
            <span className="font-semibold">{balanceDue.toFixed(1)}</span>{" "}
            {"currency"}
            <br />
            {"netPayable"}:{" "}
            <span className="font-semibold">{netPayable.toFixed(1)}</span>{" "}
            {"currency"}
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
                  <FormLabel>{"amountToPay"}</FormLabel>
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
                  <FormLabel>{"paymentMethod"}</FormLabel>
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
                          {"cash"}
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
                          {"paymentMethodBankak"}
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
                  {"إلغاء"}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending || balanceDue <= 0}
              >
                {recordPaymentMutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                {"pay"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default LabPaymentDialog;
