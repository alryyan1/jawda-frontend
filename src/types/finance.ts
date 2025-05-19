// src/types/finance.ts
export interface FinanceAccount {
  id: number;
  name: string;
  debit: 'debit' | 'credit'; // Based on ENUM
  description?: string | null;
  code: string;
  type?: 'revenue' | 'cost' | null; // Based on ENUM
  created_at: string;
  updated_at: string;
}