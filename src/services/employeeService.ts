import apiClient from './api';

export interface Employee {
  id: number;
  name: string;
  job_title?: string;
  department?: string;
  fixed_amount: number;
  is_active: boolean;
}

export interface EmployeeExpense {
  id: number;
  employee_id: number;
  amount: number;
  cash_amount: number;
  bank_amount: number;
  date: string;
  created_at: string;
  shift_id: number | null;
  user_id: number;
  employee?: Employee;
  recorded_by?: {
    id: number;
    name: string;
  };
}

export const getEmployees = async (): Promise<Employee[]> => {
  const response = await apiClient.get<Employee[]>('/employees');
  return response.data;
};

export const createEmployee = async (data: { name: string; fixed_amount: number }): Promise<Employee> => {
  const response = await apiClient.post<Employee>('/employees', data);
  return response.data;
};

export const updateEmployee = async (id: number, data: Partial<Employee>): Promise<Employee> => {
  const response = await apiClient.put<Employee>(`/employees/${id}`, data);
  return response.data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await apiClient.delete(`/employees/${id}`);
};

export const getEmployeeExpenses = async (date: string): Promise<EmployeeExpense[]> => {
  const response = await apiClient.get<EmployeeExpense[]>('/employee-expenses', { params: { date } });
  return response.data;
};

export const createEmployeeExpense = async (data: { employee_id: number; amount: number; date: string }): Promise<EmployeeExpense> => {
  const response = await apiClient.post<EmployeeExpense>('/employee-expenses', data);
  return response.data;
};

export const deleteEmployeeExpense = async (id: number): Promise<void> => {
  await apiClient.delete(`/employee-expenses/${id}`);
};

export const downloadEmployeeExpensesPdf = async (date: string): Promise<void> => {
  const response = await apiClient.get(`/employee-expenses/print`, {
    params: { date },
    responseType: 'blob'
  });
  
  const file = new Blob([response.data], { type: 'application/pdf' });
  const fileURL = URL.createObjectURL(file);
  window.open(fileURL, '_blank');
};
