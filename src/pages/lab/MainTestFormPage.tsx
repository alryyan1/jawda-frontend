// src/pages/lab/MainTestFormPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from "@/components/ui/form";

import type { Container, Package } from '@/types/labTests';
import { createMainTest, updateMainTest, getMainTestById } from '@/services/mainTestService';
import { getContainers } from '@/services/containerService';

import MainTestFormFields from '@/components/lab/MainTestFormFields';
import ChildTestsSection from '@/components/lab/ChildTestsSection';
import { getPackagesList } from '@/services/packageService';

const TestFormMode = {
  CREATE: 'create',
  EDIT: 'edit'
} as const;
type TestFormMode = typeof TestFormMode[keyof typeof TestFormMode];

interface MainTestFormPageProps { 
  mode: TestFormMode; 
}

const mainTestFormSchema = z.object({
  main_test_name: z.string().min(1).max(70),
  pack_id: z.string().optional(),
  pageBreak: z.boolean(),
  container_id: z.string().min(1),
  price: z.string().optional(),
  divided: z.boolean(),
  available: z.boolean()
});

type MainTestFormValues = z.infer<typeof mainTestFormSchema>;

interface MainTestSubmissionData {
  main_test_name: string;
  pack_id?: number;
  pageBreak: boolean;
  container_id: number;
  price?: string;
  divided: boolean;
  available: boolean;
}

const MainTestFormPage: React.FC<MainTestFormPageProps> = ({ mode }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const navigate = useNavigate();
  const { testId: routeTestId } = useParams<{ testId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === TestFormMode.EDIT;
  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[], Error>({
    queryKey: ['packagesList'], 
    queryFn: getPackagesList,
 });
  const [currentMainTestId, setCurrentMainTestId] = useState<number | null>(
    isEditMode && routeTestId ? Number(routeTestId) : null
  );

  const { data: mainTestData, isLoading: isLoadingMainTestInitial } = useQuery({
    queryKey: ['mainTest', currentMainTestId],
    queryFn: () => getMainTestById(currentMainTestId!).then(res => res.data),
    enabled: !!currentMainTestId,
  });

  const { data: containers = [], isLoading: isLoadingContainers } = useQuery<Container[], Error>({
    queryKey: ['containersList'], 
    queryFn: () => getContainers().then(res => res.data)
  });

  const form = useForm<MainTestFormValues>({
    resolver: zodResolver(mainTestFormSchema),
    defaultValues: {
      main_test_name: '',
      pack_id: '',
      pageBreak: false,
      container_id: '',
      price: '',
      divided: false,
      available: true
    }
  });
  
  const handlePackageAdded = (newPackage: Package) => {
    queryClient.invalidateQueries({ queryKey: ['packagesList'] });
    // Optionally set the new package as selected
    setMainValue('pack_id', String(newPackage.id), { shouldValidate: true, shouldDirty: true });
    toast.info(`${t('labPackages:entityName')} "${newPackage.name}" ${t('common:addedToListAndSelected')}`);
 };
 
 const dataIsLoading = isLoadingMainTestInitial || isLoadingContainers || isLoadingPackages; // Add isLoadingPackages
 const { control, handleSubmit, reset, setValue: setMainValue } = form;

  useEffect(() => {
    if (isEditMode && routeTestId) {
      setCurrentMainTestId(Number(routeTestId));
    } else if (!isEditMode) {
      reset({
        main_test_name: '',
        pack_id: '',
        pageBreak: false,
        container_id: '',
        price: '',
        divided: false,
        available: true
      });
      setCurrentMainTestId(null);
    }
  }, [isEditMode, routeTestId, reset]);

  useEffect(() => {
    if (currentMainTestId && mainTestData && mainTestData.id === currentMainTestId) {
      reset({
        main_test_name: mainTestData.main_test_name,
        pack_id: mainTestData.pack_id ? String(mainTestData.pack_id) : '',
        pageBreak: mainTestData.pageBreak,
        container_id: String(mainTestData.container_id),
        price: mainTestData.price ? String(mainTestData.price) : '',
        divided: mainTestData.divided,
        available: mainTestData.available,
      });
    }
  }, [mainTestData, currentMainTestId, reset]);

  const mainTestMutation = useMutation({
    mutationFn: (data: MainTestFormValues) => {
      const submissionData: MainTestSubmissionData = {
        main_test_name: data.main_test_name,
        pack_id: data.pack_id?.trim() ? Number(data.pack_id) : undefined,
        pageBreak: data.pageBreak,
        container_id: Number(data.container_id),
        price: data.price?.trim() || undefined,
        divided: data.divided,
        available: data.available,
      };
      return isEditMode && currentMainTestId 
        ? updateMainTest(currentMainTestId, submissionData) 
        : createMainTest(submissionData);
    },
    onSuccess: (response) => {
      const savedMainTest = response.data;
      toast.success(t('labTests:form.testSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['mainTests'] });
      
      if (!isEditMode && savedMainTest.id) {
        setCurrentMainTestId(savedMainTest.id);
        navigate(`/settings/laboratory/${savedMainTest.id}/edit`, { replace: true });
      } else if (isEditMode && currentMainTestId) {
        queryClient.invalidateQueries({ queryKey: ['mainTest', String(currentMainTestId)] });
      }
    },
    onError: () => {
      toast.error(t('common:errors.saveFailed'));
    }
  });

  const onSubmit = (data: MainTestFormValues) => {
    mainTestMutation.mutate(data);
  };

  const handleContainerAdded = (newContainer: Container) => {
    setMainValue('container_id', String(newContainer.id), { shouldValidate: true, shouldDirty: true });
    toast.info(`${t('labTests:containers.entityName')} "${newContainer.container_name}" ${t('common:addedToListAndSelected')}`);
  };

  const formIsSubmitting = mainTestMutation.isPending;

  if (isEditMode && isLoadingMainTestInitial && !mainTestData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> {t('common:loading')}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? t('labTests:editTestTitle') : t('labTests:createTestTitle')}</CardTitle>
          <CardDescription>{t('common:form.fillDetails')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <MainTestFormFields
                control={control}
                isLoadingData={dataIsLoading}
                isSubmitting={formIsSubmitting}
                containers={containers}
                isLoadingContainers={isLoadingContainers}
                onContainerAdded={handleContainerAdded}
                packages={packages}
                isLoadingPackages={isLoadingPackages}
                onPackageAdded={handlePackageAdded}
              />
              <div className="flex justify-end gap-2 pt-4">
              {currentMainTestId && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => navigate(`/settings/laboratory/${currentMainTestId}/parameters`)} // Navigate to new page
                    // Or onClick={() => setIsChildTestDialogOpen(true)} // If using a dialog
                  >
                    <Settings2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> 
                    {t('labTests:form.manageParametersButton')}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => navigate('/settings/laboratory')} disabled={formIsSubmitting}>
                  {t('common:cancel')}
                </Button>
                <Button type="submit" disabled={dataIsLoading || formIsSubmitting}>
                  {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                  {t('labTests:form.saveButton')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* <ChildTestsSection mainTestId={currentMainTestId} /> */}
    </div>
  );
};

export default MainTestFormPage;