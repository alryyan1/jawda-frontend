// src/types/parties.ts

// Based on the `parties` table
export interface Party {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  services_count?: number;
}

export type PartyFormData = Pick<Party, 'name'>;

// For the data in the party_service_costs pivot table, plus service details
export interface PartyServiceCost {
  contract_id?: number; // ID from party_service_costs table (pivot table's own ID)
  party_id: number;
  service_id: number;
  service_name: string;
  service_group_name?: string;
  price: number | string;
}

export interface PartyServiceCostFormData {
  service_id: string | undefined; // From select
  price: string;
}
