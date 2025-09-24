// src/pages/lab/ChildTestsManagementPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import { Loader2, ArrowLeft } from 'lucide-react';

import type { MainTest, ChildTest, Unit, ChildGroup, ChildTestFormData as ChildTestFormDataType } from '@/types/labTests';
import { getMainTestById } from '@/services/mainTestService';
import { 
    getChildTestsForMainTest, createChildTest, updateChildTest, deleteChildTest, batchUpdateChildTestOrder 
} from '@/services/childTestService';
import { getUnits } from '@/services/unitService';
import { getChildGroups } from '@/services/childGroupService';

import ChildTestsTable from '@/components/lab/management/ChildTestsTable';
import ManageChildTestOptionsDialog from '@/components/lab/ManageChildTestOptionsDialog';
import ChildTestEditableRow from '@/components/lab/management/ChildTestEditableRow';

// import { useAuthorization } from '@/hooks/useAuthorization';

const ChildTestsManagementPage: React.FC = () => {
  const { mainTestId: mainTestIdParam } = useParams<{ mainTestId: string }>();
  const mainTestId = Number(mainTestIdParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // const { can } = useAuthorization(); // For permissions

  const [managingOptionsFor, setManagingOptionsFor] = useState<ChildTest | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChildTest, setEditingChildTest] = useState<ChildTest | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [dialogInitialData, setDialogInitialData] = useState<Partial<ChildTestFormDataType> | undefined>(undefined);
  const [isSavingChildTest, setIsSavingChildTest] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);

  // --- Main Test Info ---
  const { data: mainTest, isLoading: isLoadingMainTest } = useQuery<MainTest, Error>({
    queryKey: ['mainTestForChildManagement', mainTestId],
    queryFn: () => getMainTestById(mainTestId).then(res => res.data),
    enabled: !!mainTestId,
  });

  // --- Child Tests Data (passed to ChildTestsTable) ---
  const childTestsQueryKey = ['childTestsForMainTest', mainTestId] as const;
  const { 
    data: childTestsList = [], // Default to empty array
    isLoading: isLoadingChildTests
  } = useQuery<ChildTest[], Error>({
    queryKey: childTestsQueryKey,
    queryFn: () => mainTestId ? getChildTestsForMainTest(mainTestId) : Promise.resolve([]),
    enabled: !!mainTestId,
  });

  // --- Units and Child Groups for dropdowns in editable rows/dialogs ---
  const { data: units = [], isLoading: isLoadingUnits } = useQuery<Unit[]>({
    queryKey: ['unitsListForChildTests'],
    queryFn: async () => {
      const response = await getUnits();
      return response.data || [];
    }
  });
  const { data: childGroups = [], isLoading: isLoadingChildGroups } = useQuery<ChildGroup[]>({
    queryKey: ['childGroupsListForChildTests'],
    queryFn: async () => {
      const response = await getChildGroups();
      return response.data || [];
    }
  });


  // --- Mutations ---
  const createChildTestMutation = useMutation({
    mutationFn: (formData: ChildTestFormDataType) => createChildTest(mainTestId, formData),
    onSuccess: () => {
      toast.success('تمت إضافة الفحص الفرعي بنجاح');
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || 'فشل إضافة الفحص الفرعي')
  });

  const updateChildTestMutation = useMutation({
    mutationFn: (vars: { childTestId: number, data: Partial<ChildTestFormDataType>}) => updateChildTest(vars.childTestId, vars.data),
    onSuccess: () => {
      toast.success('تم تحديث الفحص الفرعي بنجاح');
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || 'فشل تحديث الفحص الفرعي')
  });
  
  const deleteChildTestMutation = useMutation({
    mutationFn: deleteChildTest,
    onSuccess: () => {
      toast.success('تم حذف الفحص الفرعي بنجاح');
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || 'فشل حذف الفحص الفرعي')
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await batchUpdateChildTestOrder(mainTestId, orderedIds);
    }
  });


  // --- Callbacks for ChildTestsTable ---
  const handleSaveNewChildTest = async (data: ChildTestFormDataType) => {
    return createChildTestMutation.mutateAsync(data); // Return promise for loading state in table
  };
  const handleUpdateChildTest = async (id: number, data: ChildTestFormDataType) => {
    return updateChildTestMutation.mutateAsync({ childTestId: id, data });
  };
  const handleDeleteChildTest = async (id: number) => {
    return deleteChildTestMutation.mutateAsync(id);
  };
  const handleOrderChange = async (orderedIds: number[]) => {
    // alert('handleOrderChange');
    return updateOrderMutation.mutateAsync(orderedIds);
  };
  const handleManageOptions = (childTest: ChildTest) => {
    setManagingOptionsFor(childTest);
  };
  const handleOptionsDialogClose = () => {
    setManagingOptionsFor(null);
    queryClient.invalidateQueries({ queryKey: ['childTestOptions', managingOptionsFor?.id] }); // Refetch options for this child
    queryClient.invalidateQueries({ queryKey: childTestsQueryKey }); // Refetch all child tests as options might affect display
  };
  
  const openAddDialog = () => {
    setIsAddingNew(true);
    setEditingChildTest(null);
    setDialogInitialData({
      id: undefined,
      child_test_name: '',
      test_order: String((childTestsList?.length || 0) + 1),
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (ct: ChildTest) => {
    setIsAddingNew(false);
    setEditingChildTest(ct);
    setDialogInitialData({
      id: ct.id,
      child_test_name: ct.child_test_name,
      low: ct.low !== null ? String(ct.low) : '',
      upper: ct.upper !== null ? String(ct.upper) : '',
      defval: ct.defval || '',
      unit_id: ct.unit_id ? String(ct.unit_id) : undefined,
      normalRange: ct.normalRange || '',
      max: ct.max !== null ? String(ct.max) : '',
      lowest: ct.lowest !== null ? String(ct.lowest) : '',
      test_order: String(ct.test_order || 0),
      child_group_id: ct.child_group_id ? String(ct.child_group_id) : undefined,
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingChildTest(null);
    setDialogInitialData(undefined);
  };

  const handleSaveFromEditableRow = async (data: ChildTestFormDataType) => {
    setIsSavingChildTest(true);
    try {
      if (!isAddingNew && editingChildTest?.id) {
        await handleUpdateChildTest(editingChildTest.id, data);
        setLastSavedId(editingChildTest.id);
      } else {
        const res = await handleSaveNewChildTest(data);
        if (res && (res as ChildTest).id) {
          setLastSavedId((res as ChildTest).id as number);
        }
      }
      closeEditDialog();
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    } catch (e) {
      console.error("Save child test failed from table", e);
    } finally {
      setIsSavingChildTest(false);
    }
  };


  // Placeholder permissions
  const canAddChild = true; // can('edit lab_tests');
  const canEditChild = true; // can('edit lab_tests');
  const canDeleteChild = true; // can('edit lab_tests');
  const canManageChildOptions = true; // can('manage lab_test_child_options');
  const canReorderChild = true; // can('edit lab_tests');


  if (isLoadingMainTest || (mainTestId && !mainTest)) { // Initial load for main test name
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`../${mainTestId}/edit`)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">إدارة الفحوصات الفرعية</h1>
          <p className="text-sm text-muted-foreground">
            للفحص الرئيسي: {mainTest?.main_test_name || 'جاري التحميل...'}
          </p>
        </div>
      </div>

      <ChildTestsTable
        mainTestId={mainTestId}
        initialChildTests={childTestsList || []}
        isLoadingList={isLoadingChildTests || isLoadingUnits || isLoadingChildGroups}
        units={units || []}
        isLoadingUnits={isLoadingUnits}
        childGroups={childGroups || []}
        isLoadingChildGroups={isLoadingChildGroups}
        onSaveNewChildTest={handleSaveNewChildTest}
        onUpdateChildTest={handleUpdateChildTest}
        onDeleteChildTest={handleDeleteChildTest}
        onOrderChange={handleOrderChange}
        onManageOptions={handleManageOptions}
        onUnitQuickAdd={() => {}} // Placeholder - implement if needed
        onChildGroupQuickAdd={() => {}} // Placeholder - implement if needed
        canAdd={canAddChild}
        canEdit={canEditChild}
        canDelete={canDeleteChild}
        canManageOptions={canManageChildOptions}
        canReorder={canReorderChild}
        onStartAddNew={openAddDialog}
        onStartEdit={openEditDialog}
        highlightedId={lastSavedId}
      />

      {managingOptionsFor && (
        <ManageChildTestOptionsDialog
          isOpen={!!managingOptionsFor}
          onOpenChange={(open) => { if(!open) handleOptionsDialogClose(); }}
          childTest={managingOptionsFor}
        />
      )}

      <Dialog open={editDialogOpen} onClose={closeEditDialog} fullWidth maxWidth="md">
        <DialogTitle>{isAddingNew ? 'إضافة فحص فرعي' : 'تعديل فحص فرعي'}</DialogTitle>
        <DialogContent>
          <ChildTestEditableRow
            initialData={dialogInitialData}
            units={units}
            isLoadingUnits={isLoadingUnits}
            childGroups={childGroups}
            isLoadingChildGroups={isLoadingChildGroups}
            onSave={handleSaveFromEditableRow}
            onCancel={closeEditDialog}
            isSaving={isSavingChildTest}
            onUnitQuickAdd={() => {}}
            onChildGroupQuickAdd={() => {}}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default ChildTestsManagementPage;