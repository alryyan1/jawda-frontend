// src/components/lab/MainTestFormFields.tsx
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useState } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  Box,
  Stack,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AddContainerDialog from './AddContainerDialog';
import type { Container, Package } from '@/types/labTests';
import AddPackageDialog from './AddPackageDialog';
import geminiService from '@/services/geminiService';

interface MainTestFormValues {
  main_test_name: string;
  pack_id?: string;
  pageBreak: boolean;
  container_id: string;
  price?: string;
  divided: boolean;
  available: boolean;
  is_special_test: boolean;
  conditions?: string;
  timer?: string;
  hide_unit: boolean;
}

interface MainTestFormFieldsProps {
  control: Control<MainTestFormValues>; // react-hook-form control object
  isLoadingData: boolean; // For disabling fields while parent data is loading
  isSubmitting: boolean;  // For disabling fields during main form submission
  containers: Container[] | undefined;
  isLoadingContainers: boolean;
  onContainerAdded: (newContainer: Container) => void;
  packages: Package[] | undefined; // NEW PROP
  isLoadingPackages: boolean; // NEW PROP
  onPackageAdded: (newPackage: Package) => void; // NEW PROP
  setValue: (name: keyof MainTestFormValues, value: any) => void; // For updating form values
}

const MainTestFormFields: React.FC<MainTestFormFieldsProps> = ({
  control,
  isLoadingData,
  isSubmitting,
  containers,
  isLoadingContainers,
  onContainerAdded,
  packages,
  isLoadingPackages,
  onPackageAdded,
  setValue,
}) => {
  const disabled = isLoadingData || isSubmitting;
  const [isGeneratingConditions, setIsGeneratingConditions] = useState(false);

  const handleGenerateConditions = async () => {
    setIsGeneratingConditions(true);
    try {
      // Get the current test name from the form
      const testName = control._formValues?.main_test_name || '';
      
      if (!testName.trim()) {
        toast.error('يرجى إدخال اسم الاختبار أولاً');
        return;
      }

      const prompt = `أعطني تعليمات التحضير للاختبار الطبي التالي باللغة العربية: ${testName}. 
      يجب أن تتضمن التعليمات:
      1. التحضيرات المطلوبة قبل الاختبار
      2. المدة الزمنية للصيام أو التحضير
      3. أي قيود على الطعام أو الشراب
      // 4. الأدوية التي يجب تجنبها
      4. أي تعليمات خاصة أخرى
      
        اكتب الإجابة باللغة العربية وبشكل  مختصر في 3 اسطر.`;

      const response = await geminiService.analyzeLabResults({ results: [] }, prompt);
      
      if (response.success && response.data?.analysis) {
        setValue('conditions', response.data.analysis);
        toast.success('تم إنشاء تعليمات التحضير بنجاح');
      } else {
        toast.error(response.error || 'فشل في إنشاء تعليمات التحضير');
      }
    } catch (error) {
      console.error('Error generating conditions:', error);
      toast.error('حدث خطأ في إنشاء تعليمات التحضير');
    } finally {
      setIsGeneratingConditions(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Controller
        control={control}
        name="main_test_name"
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            label="اسم الاختبار"
            placeholder="أدخل اسم الاختبار"
            disabled={disabled}
            error={!!error}
            helperText={error?.message}
            fullWidth
          />
        )}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Controller
          control={control}
          name="price"
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="السعر"
              type="number"
              inputProps={{ step: "0.01" }}
              placeholder="أدخل السعر"
              value={field.value || ''}
              disabled={disabled}
              error={!!error}
              helperText={error?.message}
              fullWidth
            />
          )}
        />
        
        <Controller
          control={control}
          name="pack_id"
          render={({ field, fieldState: { error } }) => (
            <Box sx={{ position: 'relative' }}>
              <FormControl fullWidth error={!!error} disabled={isLoadingPackages || disabled}>
                <InputLabel>الحزمة</InputLabel>
                <Select
                  {...field}
                  value={field.value || ""}
                  label="الحزمة"
                  dir="rtl"
                >
                  <MenuItem value=" ">لا يوجد</MenuItem>
                  {isLoadingPackages ? (
                    <MenuItem value="loading_pkg" disabled>جاري التحميل...</MenuItem>
                  ) : (
                    packages?.map(pkg => (
                      <MenuItem key={pkg.id} value={String(pkg.id)}>{pkg.name}</MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>
                  {error?.message || "اختر الحزمة التي ينتمي إليها هذا الاختبار (اختياري)"}
                </FormHelperText>
              </FormControl>
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <AddPackageDialog onPackageAdded={onPackageAdded} />
              </Box>
            </Box>
          )}
        />
      </Stack>
      
      <Controller
        control={control}
        name="container_id"
        render={({ field, fieldState: { error } }) => (
          <Box sx={{ position: 'relative' }}>
            <FormControl fullWidth error={!!error} disabled={isLoadingContainers || disabled}>
              <InputLabel>الوعاء</InputLabel>
              <Select
                {...field}
                value={field.value}
                label="الوعاء"
                dir="rtl"
              >
                {isLoadingContainers ? (
                  <MenuItem value="loading_cont" disabled>جاري التحميل...</MenuItem>
                ) : (
                  containers?.map(c => (
                    <MenuItem key={c.id} value={String(c.id)}>{c.container_name}</MenuItem>
                  ))
                )}
              </Select>
              <FormHelperText>{error?.message}</FormHelperText>
            </FormControl>
            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
              <AddContainerDialog onContainerAdded={onContainerAdded} />
            </Box>
          </Box>
        )}
      />

      <Stack direction={{ xs: 'column', md: 'column' }} spacing={2}>
        <Controller
          control={control}
          name="conditions"
          render={({ field, fieldState: { error } }) => (
            <Box sx={{ position: 'relative', width: '100%' }}>
              <TextField
                {...field}
                label="الشروط"
                placeholder="أدخل شروط الاختبار"
                disabled={disabled}
                error={!!error}
                helperText={error?.message}
                multiline
                rows={6}
                fullWidth
              />
              <Tooltip title="إنشاء تعليمات التحضير باستخدام الذكاء الاصطناعي">
                <IconButton
                  onClick={handleGenerateConditions}
                  disabled={disabled || isGeneratingConditions}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  {isGeneratingConditions ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        />
        
        <Controller
          control={control}
          name="timer"
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="المؤقت (بالساعات)"
              type="number"
              inputProps={{ 
                min: 0,
                step: 1
              }}
              placeholder="أدخل الوقت بالساعات"
              value={field.value || ''}
              disabled={disabled}
              error={!!error}
              helperText={error?.message || "أدخل الوقت بالساعات (أرقام فقط)"}
              fullWidth
            />
          )}
        />
      </Stack>

      <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" spacing={4} justifyContent="space-around" alignItems="center">
          {/* <Controller
            control={control}
            name="pageBreak"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                }
                label="قطع الصفحة"
              />
            )}
          />
           */}
          <Controller
            control={control}
            name="divided"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                }
                label="قسم النتيجة"
              />
            )}
          />
          
          <Controller
            control={control}
            name="available"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                }
                label="متاح"
              />
            )}
          />

          <Controller
            control={control}
            name="is_special_test"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={!!field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                }
                label="اختبار خاص"
              />
            )}
          />

          <Controller
            control={control}
            name="hide_unit"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                }
                label="إخفاء الوحدة"
              />
            )}
          />
        </Stack>
      </Paper>
    </Stack>
  );
};

export default MainTestFormFields;