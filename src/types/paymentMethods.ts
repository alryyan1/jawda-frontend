export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface PaymentMethodFormData {
  name: string;
  code: string;
  is_active?: boolean;
  sort_order?: number;
}
