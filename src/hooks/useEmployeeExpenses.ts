import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  getEmployees, 
  getEmployeeExpenses, 
  createEmployeeExpense, 
  deleteEmployeeExpense,
  createEmployee,
  deleteEmployee,
  downloadEmployeeExpensesPdf
} from "@/services/employeeService";
import type { Employee } from "@/services/employeeService";

export const useEmployeeExpenses = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isPrinting, setIsPrinting] = useState(false);

  // Queries
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["employeeExpenses", selectedDate],
    queryFn: () => getEmployeeExpenses(selectedDate),
  });

  // Mutations
  const addExpenseMutation = useMutation({
    mutationFn: createEmployeeExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeExpenses"] });
      toast.success("تم إضافة المصروف بنجاح");
    },
    onError: () => toast.error("فشل في إضافة المصروف"),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteEmployeeExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeExpenses"] });
      toast.success("تم حذف المصروف بنجاح");
    },
    onError: () => toast.error("فشل في حذف المصروف"),
  });

  const addEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم إضافة الموظف بنجاح");
    },
    onError: () => toast.error("فشل في إضافة الموظف"),
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم إلغاء تفعيل الموظف بنجاح");
    },
    onError: () => toast.error("فشل في حذف الموظف"),
  });

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await downloadEmployeeExpensesPdf(selectedDate);
      toast.success("جاري تحميل التقرير...");
    } catch (error) {
      toast.error("فشل في تحميل التقرير");
    } finally {
      setIsPrinting(false);
    }
  };

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, typeof expenses> = {};
    expenses.forEach((exp) => {
      const dept = exp.employee?.department || "بدون قسم";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(exp);
    });
    return groups;
  }, [expenses]);

  return {
    selectedDate,
    setSelectedDate,
    employees,
    isLoadingEmployees,
    expenses,
    groupedExpenses,
    isLoadingExpenses,
    totalAmount,
    isPrinting,
    handlePrint,
    addExpense: addExpenseMutation.mutateAsync,
    isAddingExpense: addExpenseMutation.isPending,
    deleteExpense: deleteExpenseMutation.mutate,
    isDeletingExpense: deleteExpenseMutation.isPending,
    addEmployee: addEmployeeMutation.mutateAsync,
    isAddingEmployee: addEmployeeMutation.isPending,
    removeEmployee: removeEmployeeMutation.mutate,
    isRemovingEmployee: removeEmployeeMutation.isPending,
  };
};
