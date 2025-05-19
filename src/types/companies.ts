import { FinanceAccount } from './finance'; // Assuming FinanceAccount type is in finance.ts

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

  // You might add arrays for related subcompanies or company_relations if fetched
  // subcompanies?: Subcompany[];
  // company_relations?: CompanyRelation[];
}

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

// For form data, if you have forms specific to these entities
export interface CompanyFormData extends Omit<Company, 'id' | 'created_at' | 'updated_at' | 'finance_account'> {
  // Add any specific form fields if different from the main Company type
}

export interface SubcompanyFormData extends Omit<Subcompany, 'id' | 'created_at' | 'updated_at' | 'company'> {
  // company_id will be set, typically required
}

export interface CompanyRelationFormData extends Omit<CompanyRelation, 'id' | 'created_at' | 'updated_at' | 'company'> {
  // company_id will be set, typically required
}


// For paginated responses if you list these entities
export interface PaginatedCompaniesResponse {
  data: Company[];
  // ... (links and meta structure, similar to PaginatedPatientsResponse) ...
}

export interface PaginatedSubcompaniesResponse {
  data: Subcompany[];
  // ... (links and meta structure) ...
}

export interface PaginatedCompanyRelationsResponse {
  data: CompanyRelation[];
  // ... (links and meta structure) ...
}