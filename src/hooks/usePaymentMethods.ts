import { useQuery } from "@tanstack/react-query";
import { getPaymentMethods } from "@/services/paymentMethodService";
import type { PaymentMethod } from "@/types/paymentMethods";

export const usePaymentMethods = () => {
  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[], Error>({
    queryKey: ["paymentMethods", "active"],
    queryFn: () => getPaymentMethods(true),
    staleTime: 5 * 60 * 1000,
  });

  const defaultPaymentMethodId = paymentMethods.find((m) => m.is_default)?.id ?? paymentMethods[0]?.id;

  return { paymentMethods, isLoading, defaultPaymentMethodId };
};
