// src/components/lab/workstation/dialogs/LabQueueFilterDialog.tsx (New file)
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Autocomplete,
  TextField,
} from "@mui/material";
import { Filter as FilterIcon } from "lucide-react";

import type { Package } from "@/types/labTests";

import { useCachedMainTestsList } from "@/hooks/useCachedData";
import { getPackagesList } from "@/services/packageService";
import { useCachedCompaniesList, useCachedDoctorsList } from "@/hooks/useCachedData";

export interface LabQueueFilters {
  search?: string;
  page?: number;
  per_page?: number;
  shift_id?: number;
  result_status_filter?: "all" | "finished" | "pending";
  print_status_filter?: "all" | "printed" | "not_printed";
  main_test_id?: number | null | 'all';
  package_id?: number | null | 'all';
  company_id?: number | null;
  doctor_id?: number | null;
  show_unfinished_only?: boolean;
  ready_for_print_only?: boolean;
}

interface LabQueueFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: LabQueueFilters;
  onApplyFilters: (newFilters: LabQueueFilters) => void;
}

const LabQueueFilterDialog: React.FC<LabQueueFilterDialogProps> = ({
  isOpen,
  onOpenChange,
  currentFilters,
  onApplyFilters,
}) => {
  // Set RTL direction for Arabic
  const isRTL = true;
  const [localFilters, setLocalFilters] =
    useState<LabQueueFilters>(currentFilters);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(currentFilters); // Sync with parent when dialog opens
    }
  }, [isOpen, currentFilters]);

  const handleFilterChange = (key: keyof LabQueueFilters, value: string | number | undefined) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === "all" || value === "" ? undefined : value,
    }));
  };

  const { data: mainTests, isLoading: isLoadingMainTests, error: mainTestsError } = useCachedMainTestsList();

  // Debug logs
  useEffect(() => {
    if (isOpen) {
      console.log('Dialog opened, mainTests:', mainTests);
      console.log('isLoadingMainTests:', isLoadingMainTests);
      console.log('mainTestsError:', mainTestsError);
      console.log('localFilters:', localFilters);
    }
  }, [isOpen, mainTests, isLoadingMainTests, mainTestsError, localFilters]);

  const { data: packages, isLoading: isLoadingPackages } = useQuery<
    Package[],
    Error
  >({
    queryKey: ["allPackagesForFilter"],
    queryFn: getPackagesList,
    enabled: isOpen,
    staleTime: Infinity,
  });

  const { data: companies, isLoading: isLoadingCompanies } = useCachedCompaniesList();
  const { data: doctors, isLoading: isLoadingDoctors } = useCachedDoctorsList();

  const isLoadingDropdowns =
    isLoadingMainTests ||
    isLoadingPackages ||
    isLoadingCompanies ||
    isLoadingDoctors;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultFilters: LabQueueFilters = {
      search: undefined,
      page: 1,
      per_page: 10,
      shift_id: undefined,
      result_status_filter: "all",
      print_status_filter: "all",
      main_test_id: undefined,
      package_id: undefined,
      company_id: undefined,
      doctor_id: undefined,
      show_unfinished_only: false,
      ready_for_print_only: false,
    };
    setLocalFilters(defaultFilters);
  };

  const handleShowUnfinishedOnly = () => {
    setLocalFilters((prev) => ({
      ...prev,
      show_unfinished_only: !prev.show_unfinished_only,
      ready_for_print_only: false, // Disable the other filter when this is enabled
    }));
  };

  const handleShowReadyForPrintOnly = () => {
    setLocalFilters((prev) => ({
      ...prev,
      ready_for_print_only: !prev.ready_for_print_only,
      show_unfinished_only: false, // Disable the other filter when this is enabled
    }));
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
  
      
      <DialogContent sx={{ flexGrow: 1, px: 3, py: 2 }}>
        <Stack spacing={3}>
          {/* Quick Filter Buttons */}
      

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
              فلتره بالفحوصات 
            </Typography>
            
            {/* Debug info */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {isLoadingMainTests ? "جاري تحميل الاختبارات..." : 
               mainTestsError ? `خطأ: ${mainTestsError.message}` :
               `${mainTests?.length || 0} اختبار محمل`}
            </Typography>
            
            <Autocomplete
              size="small"
              options={mainTests || []}
              getOptionLabel={(option) => option.main_test_name}
              value={
                localFilters.main_test_id && mainTests
                  ? mainTests.find(test => test.id === localFilters.main_test_id) || null
                  : null
              }
              onChange={(_, newValue) => {
                console.log('Autocomplete onChange:', newValue);
                if (newValue) {
                  handleFilterChange("main_test_id", newValue.id);
                } else {
                  handleFilterChange("main_test_id", undefined);
                }
              }}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                return option.id === value.id;
              }}
              loading={isLoadingMainTests}
              disabled={isLoadingMainTests}
              disableClearable={false}
              noOptionsText={
                isLoadingMainTests 
                  ? "جاري التحميل..."
                  : mainTestsError 
                    ? "فشل في جلب البيانات"
                    : "لا توجد نتائج"
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.main_test_name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="فلتره بالفحوصات ..."
                  variant="outlined"
                  error={!!mainTestsError}
                  helperText={mainTestsError?.message}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingMainTests ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
              فلتره بالمجموعه
            </Typography>
            <Autocomplete
              size="small"
              options={packages || []}
              getOptionLabel={(option) => option.name}
              value={
                localFilters.package_id && packages
                  ? packages.find(pkg => pkg.id === localFilters.package_id) || null
                  : null
              }
              onChange={(_, newValue) => {
                if (newValue) {
                  handleFilterChange("package_id", newValue.id);
                } else {
                  handleFilterChange("package_id", undefined);
                }
              }}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                return option.id === value.id;
              }}
              loading={isLoadingPackages}
              disabled={isLoadingPackages}
              disableClearable={false}
              noOptionsText={
                isLoadingPackages
                  ? "جاري التحميل..."
                  : "لا توجد نتائج"
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="فلتره بالمجموعه ..."
                  variant="outlined"
                  dir={isRTL ? "rtl" : "ltr"}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingPackages ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
              فلتره بالشركة
            </Typography>
            <Autocomplete
              size="small"
              options={companies || []}
              getOptionLabel={(option) => option.name}
              value={
                localFilters.company_id && companies
                  ? companies.find(comp => comp.id === localFilters.company_id) || null
                  : null
              }
              onChange={(_, newValue) => {
                if (newValue) {
                  handleFilterChange("company_id", newValue.id);
                } else {
                  handleFilterChange("company_id", undefined);
                }
              }}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                return option.id === value.id;
              }}
              loading={isLoadingCompanies}
              disabled={isLoadingCompanies}
              disableClearable={false}
              noOptionsText={
                isLoadingCompanies
                  ? "جاري التحميل..."
                  : "لا توجد نتائج"
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="فلتره بالشركة ..."
                  variant="outlined"
                  dir={isRTL ? "rtl" : "ltr"}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingCompanies ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
              فلتره بالطبيب
            </Typography>
            <Autocomplete
              size="small"
              options={doctors || []}
              getOptionLabel={(option) => option.name}
              value={
                localFilters.doctor_id && doctors
                  ? doctors.find(doc => doc.id === localFilters.doctor_id) || null
                  : null
              }
              onChange={(_, newValue) => {
                if (newValue) {
                  handleFilterChange("doctor_id", newValue.id);
                } else {
                  handleFilterChange("doctor_id", undefined);
                }
              }}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                return option.id === value.id;
              }}
              loading={isLoadingDoctors}
              disabled={isLoadingDoctors}
              disableClearable={false}
              noOptionsText={
                isLoadingDoctors
                  ? "جاري التحميل..."
                  : "لا توجد نتائج"
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="فلتره بالطبيب ..."
                  variant="outlined"
                  dir={isRTL ? "rtl" : "ltr"}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingDoctors ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>
          
          {isLoadingDropdowns && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={20} />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between' }}>
        <Button
          onClick={handleReset}
          size="small"
          color="inherit"
        >
          إعادة تعيين
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outlined"
            size="small"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleApply}
            disabled={isLoadingDropdowns}
            variant="contained"
            size="small"
            startIcon={<FilterIcon size={16} />}
          >
            تطبيق الفلاتر
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LabQueueFilterDialog;
