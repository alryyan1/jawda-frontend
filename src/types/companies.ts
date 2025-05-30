import type { PaginatedResponse } from './common';
import type { FinanceAccount } from './finance'; // Assuming FinanceAccount type is in finance.ts

// Based on the `companies` table
export interface Company {
  id: number;
  name: string;
  lab_endurance: number; // Or string if API returns as string, then parse
  service_endurance: number; // Or string
  status: boolean; // tinyint(1)
  lab_roof: number;
  service_roof: number;
  phone: string;
  email: string;
  
  finance_account_id?: number | null;
  finance_account?: FinanceAccount; // Optional: loaded FinanceAccount object

  created_at: string; // DateTime string (ISO 8601)
  updated_at: string; // DateTime string
  contracted_services_count?: number; // Count of contracted services
  // You might add arrays for related subcompanies or company_relations if fetched
  // subcompanies?: Subcompany[];
  // company_relations?: CompanyRelation[];
}
export type CompanyFormData = Omit<Company, 'id' | 'created_at' | 'updated_at'> 
// Based on the `subcompanies` table
export interface Subcompany {
  id: number;
  name: string;
  lab_endurance: number; // Or string
  service_endurance: number; // Or string
  
  company_id: number;
  company?: Company; // Optional: loaded parent Company object

  created_at: string; // DateTime string
  updated_at: string; // DateTime string
}

// Based on the `company_relations` table
// This table structure is very similar to Subcompany.
// Ensure its distinct purpose is reflected if needed.
export interface CompanyRelation {
  id: number;
  name: string;
  lab_endurance: number; // Or string
  service_endurance: number; // Or string
  
  company_id: number;
  company?: Company; // Optional: loaded parent Company object

  created_at: string; // DateTime string
  updated_at: string; // DateTime string
}

// For the data in the company_service pivot table, plus service details
export interface CompanyServiceContract {
  contract_id?: number; // ID from company_service table (pivot table's own ID)
  company_id: number;
  service_id: number;
  service_name: string;
  service_group_name?: string;
  price: number | string;
  static_endurance: number | string;
  percentage_endurance: number | string;
  static_wage: number | string;
  percentage_wage: number | string;
  use_static: boolean;
  approval: boolean;
  // You might also include the full Service object if needed
  // service?: Service; 
}

export interface CompanyServiceFormData {
  service_id: string | undefined; // From select
  price: string;
  static_endurance: string;
  percentage_endurance: string;
  static_wage: string;
  percentage_wage: string;
  use_static: boolean;
  approval: boolean;
}
export interface CompanyMainTestContract {
  main_test_id: number;
  main_test_name: string;
  default_price?: number; // Original price from main_tests table
  container_name?: string;
  contract_details: { // Pivot data
    contract_id: number; // PK of the company_main_test row
    company_id: number;
    status: boolean;
    price: number;
    approve: boolean;
    endurance_static: number;
    endurance_percentage: number;
    use_static: boolean;
  };
}
export interface CompanyMainTestFormData {
  main_test_id: string | undefined; // From select
  status: boolean;
  price: string;
  approve: boolean;
  endurance_static: string;
  endurance_percentage: string;
  use_static: boolean;
}
// src/types/companies.ts
// ... (Company type) ...
export interface Subcompany {
  id: number;
  name: string;
  company_id: number; // Parent company
  // ... other fields like lab_endurance if needed
}
export interface CompanyRelation { // Generic relations
  id: number;
  name: string;
  // ... other fields if any
}
export type PaginatedCompanyMainTestContractsResponse  = PaginatedResponse<CompanyMainTestContract> 