import type { ChildGroup, ChildTest, ChildTestOption, Unit } from "./labTests";

export interface PatientLabQueueItem { // For the leftmost list
  visit_id: number; // DoctorVisit ID
  patient_id: number;
  patient_name: string;
  sample_id?: string | null; // Or primary LabRequest ID for the visit
  lab_request_ids: number[]; // All labrequest IDs for this patient's visit
  oldest_request_time: string;
  test_count: number;
  // status_summary?: string; // e.g. "3 Pending, 1 Complete"
}

export type PaginatedPatientLabQueueResponse = {
  data: PatientLabQueueItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
// src/types/labWorkflow.ts
// ...

export interface ChildTestWithResult { // Was part of MainTestWithChildrenResults
  id: number; // ChildTest ID
  main_test_id: number;
  child_test_name: string;
  low?: number | string | null;
  upper?: number | string | null;
  defval?: string | null;
  unit_id?: number | null;
  unit_name?: string | null;
  unit?: Unit; // If full unit object is needed
  normalRange?: string | null; // The textual normal range to display
  max?: number | string | null;
  lowest?: number | string | null;
  test_order?: number | string | null;
  child_group_id?: number | null;
  child_group_name?: string;
  child_group?: ChildGroup;
  options?: ChildTestOption[]; // Array of predefined options
  
  result_id?: number; // ID of the RequestedResult record
  result_value?: string | null; 
  result_flags?: string | null;
  result_comment?: string | null;
  is_result_authorized?: boolean;
  // ... other result-specific fields
}
// ... (MainTestWithChildrenResults and ResultEntryFormValues remain similar)

// For the form array items:
export interface ResultEntryItemFormValue {
    child_test_id: number;
    child_test_name: string; // For display
    unit_name?: string | null;
    normal_range_text?: string | null; // For display in StatusAndInfoPanel
    options?: ChildTestOption[];
    is_qualitative_with_options: boolean; // Helper flag

    result_value: string | ChildTestOption | null; // Can be string or option object for Autocomplete
    result_flags?: string;
    result_comment?: string;
}
export interface ResultEntryFormValues {
    results: ResultEntryItemFormValue[];
    main_test_comment?: string;
}


export interface MainTestWithChildrenResults { // Data for the ResultEntryPanel
  lab_request_id: number; // The specific LabRequest ID we are entering results for
  main_test_id: number;
  main_test_name: string;
  is_trailer_hidden?: boolean; // from LabRequest.hidden
  // Add other MainTest details if needed for display (e.g., default container)
  child_tests_with_results: ChildTestWithResult[];
}

// For the form submitting results for one MainTest (LabRequest)
export interface ResultEntryItemFormValue { // For each item in useFieldArray
    child_test_id: number;
    child_test_name: string; // For display, not submitted directly
    unit_name?: string | null;    // For display
    normal_range_text?: string | null; // For display
    options?: ChildTestOption[]; // For MUI Autocomplete / Select
    is_numeric?: boolean; // Helper flag based on child_test properties (low/upper vs options)
    is_boolean_result?: boolean; // Helper flag for boolean-like results

    result_value: string | null; // The actual input value
    result_flags?: string;
    result_comment?: string;
    // Keep original values if needed for comparison or reset
    // original_result_value?: string | null;
}

export interface ResultEntryFormValues {
    results: ResultEntryItemFormValue[];
    main_test_comment?: string;
    // sample_received_at?: string; // If tracking this
}