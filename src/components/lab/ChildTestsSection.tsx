// src/components/lab/ChildTestsSection.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Using Card for section
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import type { ChildTest, Unit, ChildGroup, ChildTestFormData } from '@/types/labTests';
import { getChildTestsForMainTest, createChildTest, updateChildTest, deleteChildTest } from '@/services/childTestService';
import { getUnits } from '@/services/unitService';
import { getChildGroups } from '@/services/childGroupService';

import ChildTestItemRow from './management/ChildTestEditableRow'; // Existing component
// AddUnitDialog and AddChildGroupDialog are used within ChildTestItemRow

interface ChildTestsSectionProps {
  mainTestId: number | null; // Null if main test is not yet created/persisted
  // Add permission props if needed for actions
  // canManageChildTests?: boolean;
}

const ChildTestsSection: React.FC<ChildTestsSectionProps> = ({ mainTestId }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const queryClient = useQueryClient();

  const childTestsQueryKey = ['childTestsForMainTest', mainTestId] as const;

  const { 
    data: childTestsList, 
    isLoading: isLoadingChildTests,
    isError: isChildTestsError,
    error: childTestsError,
  } = useQuery<ChildTest[], Error>({
    queryKey: childTestsQueryKey,
    queryFn: () => mainTestId ? getChildTestsForMainTest(mainTestId) : Promise.resolve([]),
    enabled: !!mainTestId,
  });

  const [isAddingChildTest, setIsAddingChildTest] = useState(false);
  const [editingChildTest, setEditingChildTest] = useState<ChildTest | null>(null);

  const { data: units = [], isLoading: isLoadingUnits } = useQuery<Unit[], Error>({
    queryKey: ['unitsListForChildTests'], 
    queryFn: () => getUnits().then(res => res.data)
  });

  const { data: childGroups = [], isLoading: isLoadingChildGroups } = useQuery<ChildGroup[], Error>({
    queryKey: ['childGroupsListForChildTests'], 
    queryFn: () => getChildGroups().then(res => res.data)
  });

  const createChildTestMutation = useMutation({
    mutationFn: (formData: ChildTestFormData) => {
      if (!mainTestId) throw new Error(t('labTests:childTests.mainTestIdMissing'));
      return createChildTest(mainTestId, formData);
    },
    onSuccess: () => {
      toast.success(t('labTests:childTests.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
      setIsAddingChildTest(false);
    },
    onError: () => {
      toast.error(t('common:errors.saveFailed'));
    }
  });

  const updateChildTestMutation = useMutation({
    mutationFn: (variables: { childTestId: number; data: ChildTestFormData }) => 
      updateChildTest(variables.childTestId, variables.data),
    onSuccess: () => {
      toast.success(t('labTests:childTests.updatedSuccess'));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
      setEditingChildTest(null);
    },
    onError: () => {
      toast.error(t('common:errors.saveFailed'));
    }
  });
  
  const deleteChildTestMutation = useMutation({
    mutationFn: (childTestId: number) => deleteChildTest(childTestId),
    onSuccess: () => {
      toast.success(t('labTests:childTests.deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: () => {
      toast.error(t('common:errors.saveFailed'));
    }
  });

  const handleSaveChildTest = (data: ChildTestFormData, existingChildTestId?: number) => {
    if (existingChildTestId) {
      updateChildTestMutation.mutate({ childTestId: existingChildTestId, data });
    } else {
      createChildTestMutation.mutate(data);
    }
  };

  const handleDeleteChildTest = (childTestId: number) => {
    if (window.confirm(t('labTests:childTests.deleteConfirm'))) {
      deleteChildTestMutation.mutate(childTestId);
    }
  };
  
  const handleUnitAdded = (newUnit: Unit) => {
    queryClient.invalidateQueries({queryKey: ['unitsListForChildTests']});
    toast.info(`${t('labTests:units.entityName')} "${newUnit.name}" ${t('common:addedToList')}`);
  };

  const handleChildGroupAdded = (newGroup: ChildGroup) => {
    queryClient.invalidateQueries({queryKey: ['childGroupsListForChildTests']});
    toast.info(`${t('labTests:childGroups.entityName')} "${newGroup.name}" ${t('common:addedToList')}`);
  };

  if (!mainTestId) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('labTests:childTests.sectionTitle')}</CardTitle>
            <CardDescription>{t('labTests:childTests.sectionDescription')}</CardDescription>
          </div>
          {!isAddingChildTest && !editingChildTest && (
            <Button 
              size="sm" 
              onClick={() => { setIsAddingChildTest(true); setEditingChildTest(null); }} 
              disabled={createChildTestMutation.isPending || updateChildTestMutation.isPending || isLoadingUnits || isLoadingChildGroups}
            >
              <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4"/> {t('labTests:childTests.addChildButton')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingChildTests && (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary"/>
          </div>
        )}
        
        {isChildTestsError && (
          <div className="text-center py-4 text-destructive">
            {childTestsError.message}
          </div>
        )}
        
        {isAddingChildTest && !editingChildTest && (
          <ChildTestItemRow
            key={`new-child-${mainTestId}`} 
            units={units}
            childGroups={childGroups}
            onSave={handleSaveChildTest}
            onCancel={() => setIsAddingChildTest(false)}
            isLoading={createChildTestMutation.isPending || isLoadingUnits || isLoadingChildGroups}
            onUnitQuickAdd={handleUnitAdded}
            onChildGroupQuickAdd={handleChildGroupAdded}
          />
        )}

        {childTestsList && childTestsList.length > 0 && (
          <div className="space-y-3 mt-3">
            {childTestsList.map(ct => (
              editingChildTest?.id === ct.id ? (
                <ChildTestItemRow
                  key={ct.id}
                  childTest={ct}
                  units={units}
                  childGroups={childGroups}
                  onSave={(data) => handleSaveChildTest(data, ct.id)}
                  onCancel={() => setEditingChildTest(null)}
                  isLoading={updateChildTestMutation.isPending && updateChildTestMutation.variables?.childTestId === ct.id}
                  onUnitQuickAdd={handleUnitAdded}
                  onChildGroupQuickAdd={handleChildGroupAdded}
                />
              ) : (
                <Card key={ct.id} className="p-3 flex justify-between items-center bg-muted/40 dark:bg-muted/20 hover:shadow-sm transition-shadow">
                  <div className="flex-grow">
                    <h4 className="font-medium">{ct.child_test_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {ct.unit?.name} • {ct.child_group?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingChildTest(ct)}
                      disabled={updateChildTestMutation.isPending}
                    >
                      {t('common:edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => ct.id && handleDeleteChildTest(ct.id)}
                      disabled={deleteChildTestMutation.isPending}
                    >
                      {t('common:delete')}
                    </Button>
                  </div>
                </Card>
              )
            ))}
          </div>
        )}

        {!isLoadingChildTests && (!childTestsList || childTestsList.length === 0) && !isAddingChildTest && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('labTests:childTests.noChildTests')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ChildTestsSection;