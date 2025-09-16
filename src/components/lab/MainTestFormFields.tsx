// src/components/lab/MainTestFormFields.tsx
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
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
  Typography,
  Paper
} from '@mui/material';
import AddContainerDialog from './AddContainerDialog';
import type { Container, Package } from '@/types/labTests';
import AddPackageDialog from './AddPackageDialog';

interface MainTestFormValues {
  main_test_name: string;
  pack_id: string;
  pageBreak: boolean;
  container_id: string;
  price: string;
  divided: boolean;
  available: boolean;
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
}) => {
  const disabled = isLoadingData || isSubmitting;

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

      <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" spacing={4} justifyContent="space-around" alignItems="center">
          <Controller
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
                label="مقسم"
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
        </Stack>
      </Paper>
    </Stack>
  );
};

export default MainTestFormFields;