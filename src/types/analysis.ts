// src/types/analysis.ts

export interface AnalysisPeriod {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
    number_of_days: number;
  }
  
  export interface TopService {
    service_name: string;
    request_count: number;
  }
  
  export interface TopDoctor {
    doctor_name: string;
    visit_count: number;
  }
  
  export interface AnalysisData {
    period: AnalysisPeriod;
    total_income: number;
    doctors_present_count: number;
    average_daily_income: number;
    average_patient_frequency: number;
    total_costs: number;
    top_services: TopService[];
    most_frequent_doctor: TopDoctor | null;
  }
  
  export interface AnalysisResponse {
    data: AnalysisData;
  }