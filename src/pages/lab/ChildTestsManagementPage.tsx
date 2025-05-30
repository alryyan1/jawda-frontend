// src/pages/lab/ChildTestsManagementPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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

// import { useAuthorization } from '@/hooks/useAuthorization';

const ChildTestsManagementPage: React.FC = () => {
  const { mainTestId: mainTestIdParam } = useParams<{ mainTestId: string }>();
  const mainTestId = Number(mainTestIdParam);
  const navigate = useNavigate();
  const { t } = useTranslation(['labTests', 'common']);
  const queryClient = useQueryClient();
  // const { can } = useAuthorization(); // For permissions

  const [managingOptionsFor, setManagingOptionsFor] = useState<ChildTest | null>(null);

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
      toast.success(t('labTests:childTests.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || t('labTests:childTests.addError'))
  });

  const updateChildTestMutation = useMutation({
    mutationFn: (vars: { childTestId: number, data: Partial<ChildTestFormDataType>}) => updateChildTest(vars.childTestId, vars.data),
    onSuccess: () => {
      toast.success(t('labTests:childTests.updatedSuccess'));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || t('labTests:childTests.updateError'))
  });
  
  const deleteChildTestMutation = useMutation({
    mutationFn: deleteChildTest,
    onSuccess: () => {
      toast.success(t('labTests:childTests.deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || t('labTests:childTests.deleteError'))
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
          <h1 className="text-2xl font-bold">{t('labTests:childTests.managePageTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('labTests:childTests.forMainTest', { testName: mainTest?.main_test_name || t('common:loading') })}
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
      />

      {managingOptionsFor && (
        <ManageChildTestOptionsDialog
          isOpen={!!managingOptionsFor}
          onOpenChange={(open) => { if(!open) handleOptionsDialogClose(); }}
          childTest={managingOptionsFor}
        />
      )}
    </div>
  );
};
export default ChildTestsManagementPage;