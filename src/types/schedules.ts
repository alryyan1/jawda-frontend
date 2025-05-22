// src/types/schedules.ts
import { DoctorStripped } from './doctors';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'full_day'; // Align with backend enum

export interface DoctorScheduleEntry {
  id?: number; // Present if fetched, absent if new
  doctor_id: number;
  doctor_name?: string; // If loaded
  day_of_week: number; // 0 (Sun) - 6 (Sat)
  time_slot: TimeSlot;
  // start_time?: string; // HH:mm if using specific times
  // end_time?: string;   // HH:mm
}

// For the form, representing a doctor's whole weekly schedule
export interface DoctorWeeklySchedule {
  doctorId: number;
  schedules: Array<{ day_of_week: number; time_slot: TimeSlot /*; start_time?: string; end_time?: string;*/ }>;
}