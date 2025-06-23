// src/types/attendance.ts

import type { UserStripped } from "./auth";

export interface AttendanceSetting {
    id: number;
    number_of_shifts_per_day: number;
    updated_at?: string;
  }
  
  export interface ShiftDefinition {
    id: number;
    name: string;
    shift_label: string; // "Shift 1", "Shift 2"
    start_time: string;  // "HH:mm"
    end_time: string;    // "HH:mm"
    duration_hours?: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
  }
  
  export interface Holiday {
    id: number;
    name: string;
    holiday_date: string; // "YYYY-MM-DD"
    is_recurring: boolean;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
  }
  
  export interface AttendanceRecord {
    id: number;
    user_id: number;
    user_name?: string;
    shift_definition_id: number;
    shift_label?: string;
    shift_name?: string;
    attendance_date: string; // "YYYY-MM-DD"
    status: 'present' | 'absent' | 'late_present' | 'early_leave' | 'on_leave' | 'holiday' | 'off_day' | 'sick_leave';
    check_in_time?: string | null;  // ISO DateTime string
    check_out_time?: string | null; // ISO DateTime string
    supervisor_id?: number | null;
    supervisor_name?: string;
    notes?: string | null;
    recorded_by_user_id?: number;
    recorded_by_user_name?: string;
    created_at?: string;
    updated_at?: string;
  }
  
  // For the getMonthlySheet API response structure
  export interface DailyShiftAttendance {
    shift_definition_id: number;
    shift_label: string;
    shift_name: string;
    supervisor_id: number | null;
    attendance_records: AttendanceRecord[]; // Actual attendance records for this shift-day
  }
  
  export interface DailyAttendanceData {
    date: string; // "YYYY-MM-DD"
    day_name: string; // Localized short day name
    is_holiday: boolean;
    shifts: DailyShiftAttendance[];
  }
  
  export interface MonthlySheetMeta {
    month: number;
    year: number;
    month_name: string;
    number_of_shifts_configured: number;
    active_shift_definitions: ShiftDefinition[];
  }
  
  export interface MonthlySheetData {
    days: DailyAttendanceData[];
    meta: MonthlySheetMeta;
    selectable_users: UserStripped[];
    selectable_supervisors: UserStripped[];
  }

  // Form values type for Holiday (using Date object for shadcn Calendar)
export interface HolidayFormValues {
  name: string;
  holiday_date: Date;
  is_recurring: boolean;
  description?: string;
}

  // Type alias for consistency with existing code
  export type AttendanceShiftDefinition = ShiftDefinition;


  // src/types/attendance.ts

// ... (AttendanceSetting if defined) ...

export interface ShiftDefinition {
  id: number;
  name: string; // e.g., "Morning Shift A", "Evening Main"
  shift_label: string; // e.g., "Shift 1", "Shift 2", "MS1" - User-friendly unique label
  start_time: string; // "HH:mm" format (e.g., "08:00")
  end_time: string;   // "HH:mm" format (e.g., "16:00")
  duration_hours?: number; // Calculated on backend, optional on frontend
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // users_count?: number; // If backend provides count of users assigned
}

export interface ShiftDefinitionFormData {
  name: string;
  shift_label: string;
  start_time: string; // "HH:mm" format expected by form input type="time"
  end_time: string;   // "HH:mm"
  is_active?: boolean;
}

// ... (Holiday types, AttendanceRecord types etc.) ...

export interface ShiftDefinition {
  id: number;
  name: string;
  shift_label: string;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  is_active: boolean;
  duration_hours?: number; // Optional, calculated or from backend
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSetting {
    id: number;
    number_of_shifts_per_day: 1 | 2 | 3;
    updated_at?: string;
}

export interface Holiday {
    id: number;
    name: string;
    holiday_date: string; // "YYYY-MM-DD"
    is_recurring: boolean;
    description?: string | null;
}

// ... other attendance related types will go here ...

// src/types/attendance.ts (add/update)

export interface ShiftDefinition { // (Already defined from previous step)
  id: number;
  name: string;
  shift_label: string;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  is_active: boolean;
}

export interface UserMonthlyAttendanceSummary {
  user_id: number;
  user_name: string;
  is_supervisor: boolean;
  default_shift_label?: string | null;
  total_scheduled_days: number;
  present_days: number;
  absent_days: number;
  late_present_days: number; // Count of days marked as 'late_present'
  early_leave_days: number; // Count of days marked as 'early_leave'
  on_leave_days: number;    // Count of days marked as 'on_leave'
  sick_leave_days: number;  // Count of days marked as 'sick_leave'
  holidays_on_workdays: number;
  // Add other relevant counts
}

export interface MonthlyAttendanceReportData {
  data: UserMonthlyAttendanceSummary[];
  meta: {
    year: number;
    month: number;
    month_name: string; // e.g., "October 2023"
    shift_definition_id?: number | null;
    shift_name?: string | null;
    total_working_days_in_month: number; // Business days in the month
  };
}

// For daily sheet processing if dedicated summary API is not ready
export interface DailyAttendanceUserRecord {
    user_id: number;
    user_name?: string;
    status: string; // 'present', 'absent', 'on_leave', etc.
    supervisor_id?: number | null;
    attendance_id?: number;
}
export interface DailyAttendanceShiftRecord {
    shift_definition_id: number;
    shift_label: string;
    shift_name: string;
    attended_users: DailyAttendanceUserRecord[];
    // expected_users?: UserStripped[]; // From getDailySheet
}
export interface DailyAttendanceDayRecord {
    date: string; // "YYYY-MM-DD"
    day_name: string;
    is_holiday: boolean;
    holiday_name?: string | null;
    shifts: DailyAttendanceShiftRecord[];
}
export interface DailySheetResponse {
    days_data: DailyAttendanceDayRecord[];
    meta: {
        month: number;
        year: number;
        month_name: string;
        number_of_shifts_configured: number;
        defined_shifts_count: number;
    };
    // user_options and supervisor_options are not needed for this summary page directly
}