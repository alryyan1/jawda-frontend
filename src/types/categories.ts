// src/types/categories.ts

import type { Service, ServiceGroup } from './services';
import type { Doctor } from './doctors';

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  services_count?: number;
  doctors_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryService {
  id: number;
  name: string;
  price?: number;
  service_group_id?: number;
  service_group?: ServiceGroup;
  percentage: number | null;
  fixed: number | null;
}

export interface CategoryWithServices extends Category {
  services?: CategoryService[];
  doctors?: Array<{
    id: number;
    name: string;
    specialist?: {
      id: number;
      name: string;
    } | null;
  }>;
}

export interface CategoryFormData {
  name: string;
  description?: string;
}

export interface CategoryServiceFormData {
  service_id: number;
  percentage?: string | null;
  fixed?: string | null;
}

export interface AssignServicesPayload {
  services: CategoryServiceFormData[];
}
