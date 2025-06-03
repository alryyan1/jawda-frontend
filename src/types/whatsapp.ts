// src/types/whatsapp.ts (or similar)
import type { PatientStripped } from './patients'; // Use a stripped version for the list

export interface PatientForBulkMessage extends PatientStripped {
  // Add any other relevant info needed for display in the selection list
  last_visit_date?: string; 
  isSelected: boolean;
  sendStatus?: 'idle' | 'sending' | 'sent' | 'failed';
  sendError?: string;
  waapi_message_id?: string; // From waapi response
}

export interface BulkMessageFilters {
  date_from?: string;
  date_to?: string;
  doctor_id?: string | null;
  service_id?: string | null;
  specialist_id?: string | null;
  unique_phones_only: boolean;
}

export interface WhatsAppTemplateForBulk { // Simplified from SendWhatsAppDialog
  id: string;
  nameKey: string;
  contentKey: string; // Template content with placeholders like {{patientName}}
}