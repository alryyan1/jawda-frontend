// src/types/doctorLabProfiles.ts
import type { MainTestStripped } from "./labTests";

/** A doctor-owned, saved panel of lab tests ("profile") for one-click bulk ordering. */
export interface DoctorLabTestProfile {
  id: number;
  name: string;
  main_test_ids: number[];
  main_tests: MainTestStripped[];
  created_at?: string;
}

export interface DoctorLabTestProfileFormValues {
  name: string;
  main_test_ids: number[];
}
