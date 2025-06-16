// src/pages/settings/ShiftDefinitionsPage.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
// ... (imports for Button, Table, Dialog, Loader2, Edit, Trash2, PlusCircle etc.)
import ManageShiftDefinitionDialog from '@/components/settings/attendance/ManageShiftDefinitionDialog'; // New component
import apiClient from '@/services/api';
import type { ShiftDefinition } from '@/types/attendance'; // Create this type
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
// ... other UI imports

interface PaginatedShiftDefinitions {
    data: ShiftDefinition[];
    // ... meta from Laravel pagination
}

const ShiftDefinitionsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['attendance', 'common']);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftDefinition | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // If using pagination

  const { data: paginatedData, isLoading, isFetching } = useQuery<PaginatedShiftDefinitions>({
    queryKey: ['shiftDefinitions', currentPage],
    queryFn: async () => (await apiClient.get('/shifts-definitions', { params: { page: currentPage }})).data,
    placeholderData: keepPreviousData,
  });

  const shifts = paginatedData?.data || [];

  const handleAdd = () => {
    setEditingShift(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (shift: ShiftDefinition) => {
    setEditingShift(shift);
    setIsDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/shifts-definitions/${id}`),
    onSuccess: () => {
      toast.success(t('attendance:shiftDefinitions.deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['shiftDefinitions'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common:error.deleteFailed')),
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(t('common:confirmDeleteMessage', { item: name }))) {
      deleteMutation.mutate(id);
    }
  };
  
  // Define ShiftDefinition type in src/types/attendance.ts
  // export interface ShiftDefinition {
  //   id: number;
  //   name: string;
  //   shift_label: string;
  //   start_time: string; // "HH:mm"
  //   end_time: string;   // "HH:mm"
  //   duration_hours: number;
  //   is_active: boolean;
  // }


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('attendance:shiftDefinitions.pageTitle')}</h1>
        <Button onClick={handleAdd} size="sm">
          <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t('attendance:shiftDefinitions.addButton')}
        </Button>
      </div>

      {/* Table to display shift definitions */}
      {/* ... (Table structure similar to UsersListPage, CompaniesListPage) ... */}
      {/* Columns: Name, Label, Start, End, Duration, Active, Actions (Edit/Delete) */}

      <ManageShiftDefinitionDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shiftDefinition={editingShift}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['shiftDefinitions'] });
          setIsDialogOpen(false);
          setEditingShift(null);
        }}
      />
    </div>
  );
};
export default ShiftDefinitionsPage;