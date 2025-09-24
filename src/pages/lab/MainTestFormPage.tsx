// src/pages/lab/MainTestFormPage.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  CircularProgress,
  Stack
} from '@mui/material';
import { FormProvider } from 'react-hook-form';

import type { Container, Package } from '@/types/labTests';
import { createMainTest, updateMainTest, getMainTestById } from '@/services/mainTestService';
import { getContainers } from '@/services/containerService';

import MainTestFormFields from '@/components/lab/MainTestFormFields';
// import ChildTestsSection from '@/components/lab/ChildTestsSection';
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
  available: z.boolean(),
  is_special_test: z.boolean()
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
  is_special_test?: boolean;
}

const MainTestFormPage: React.FC<MainTestFormPageProps> = ({ mode }) => {
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
      available: true,
      is_special_test: false
    }
  });
  
  const handlePackageAdded = (newPackage: Package) => {
    queryClient.invalidateQueries({ queryKey: ['packagesList'] });
    // Optionally set the new package as selected
    setMainValue('pack_id', String(newPackage.id), { shouldValidate: true, shouldDirty: true });
    toast.info(`تم إضافة الحزمة "${newPackage.name}" إلى القائمة وتم تحديدها`);
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
        available: true,
        is_special_test: false
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
        is_special_test: Boolean((mainTestData as unknown as { is_special_test?: boolean }).is_special_test)
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
        is_special_test: data.is_special_test,
      };
      return isEditMode && currentMainTestId 
        ? updateMainTest(currentMainTestId, submissionData) 
        : createMainTest(submissionData);
    },
    onSuccess: (response) => {
      const savedMainTest = response.data;
      toast.success('تم حفظ الاختبار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mainTests'] });
      
      if (!isEditMode && savedMainTest.id) {
        setCurrentMainTestId(savedMainTest.id);
        navigate(`/settings/laboratory/${savedMainTest.id}/edit`, { replace: true });
      } else if (isEditMode && currentMainTestId) {
        queryClient.invalidateQueries({ queryKey: ['mainTest', String(currentMainTestId)] });
      }
    },
    onError: () => {
      toast.error('فشل في حفظ البيانات');
    }
  });

  const onSubmit = (data: MainTestFormValues) => {
    mainTestMutation.mutate(data);
  };

  const handleContainerAdded = (newContainer: Container) => {
    setMainValue('container_id', String(newContainer.id), { shouldValidate: true, shouldDirty: true });
    toast.info(`تم إضافة الوعاء "${newContainer.container_name}" إلى القائمة وتم تحديده`);
  };

  const formIsSubmitting = mainTestMutation.isPending;

  if (isEditMode && isLoadingMainTestInitial && !mainTestData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={256}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography>جاري التحميل...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2, pb: 5 }}>
      <Card>
        <CardHeader>
          <Typography variant="h5" component="h1">
            {isEditMode ? 'تعديل الاختبار' : 'إضافة اختبار جديد'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            يرجى ملء التفاصيل المطلوبة
          </Typography>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
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
                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
                  {currentMainTestId && (
                    <Button 
                      type="button" 
                      variant="outlined" 
                      onClick={() => navigate(`/settings/laboratory/${currentMainTestId}/parameters`)}
                      startIcon={<Settings2 size={16} />}
                    >
                      إدارة الباراميترات
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outlined" 
                    onClick={() => navigate('/settings/laboratory')} 
                    disabled={formIsSubmitting}
                  >
                    إلغاء
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained"
                    disabled={dataIsLoading || formIsSubmitting}
                    startIcon={formIsSubmitting ? <CircularProgress size={16} /> : null}
                  >
                    حفظ
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </FormProvider>
        </CardContent>
      </Card>

      {/* <ChildTestsSection mainTestId={currentMainTestId} /> */}
    </Box>
  );
};

export default MainTestFormPage;