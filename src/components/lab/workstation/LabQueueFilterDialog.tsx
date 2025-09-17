// src/components/lab/workstation/dialogs/LabQueueFilterDialog.tsx (New file)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Filter } from "lucide-react";

import type { MainTestStripped, Package } from "@/types/labTests";
import type { Company } from "@/types/companies";
import type { DoctorStripped } from "@/types/doctors";

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
  main_test_id?: string | null;
  package_id?: string | null;
  company_id?: string | null;
  doctor_id?: string | null;
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
  const { t, i18n } = useTranslation(["labResults", "common", "filters"]);
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
    };
    setLocalFilters(defaultFilters);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            {t("filters:titleLabQueue")}
          </DialogTitle>
          <DialogDescription>
            {t("filters:descriptionLabQueue")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-result-status" className="text-xs">
                {t("filters:resultStatus")}
              </Label>
              <Select
                value={localFilters.result_status_filter || "all"}
                onValueChange={(val) =>
                  handleFilterChange("result_status_filter", val)
                }
                dir={i18n.dir()}
              >
                <SelectTrigger id="filter-result-status" className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters:status.all")}</SelectItem>
                  <SelectItem value="finished">
                    {t("filters:status.finished")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("filters:status.pending")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-print-status" className="text-xs">
                {t("filters:printStatus")}
              </Label>
              <Select
                value={localFilters.print_status_filter || "all"}
                onValueChange={(val) =>
                  handleFilterChange("print_status_filter", val)
                }
                dir={i18n.dir()}
              >
                <SelectTrigger id="filter-print-status" className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters:status.all")}</SelectItem>
                  <SelectItem value="printed">
                    {t("filters:status.printed")}
                  </SelectItem>
                  <SelectItem value="not_printed">
                    {t("filters:status.notPrinted")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-main-test" className="text-xs">
                {t("filters:specificTest")}
              </Label>
              
              {/* Debug info */}
              <div className="text-xs text-muted-foreground mb-1">
                {isLoadingMainTests ? "Loading tests..." : 
                 mainTestsError ? `Error: ${mainTestsError.message}` :
                 `${mainTests?.length || 0} tests loaded`}
              </div>
              
              <Autocomplete
                id="filter-main-test"
                size="small"
                options={mainTests || []}
                getOptionLabel={(option) => option.main_test_name}
                value={
                  localFilters.main_test_id && mainTests
                    ? mainTests.find(test => test.id === parseInt(localFilters.main_test_id!)) || null
                    : null
                }
                onChange={(event, newValue) => {
                  console.log('Autocomplete onChange:', newValue);
                  if (newValue) {
                    handleFilterChange("main_test_id", String(newValue.id));
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
                    ? t("common:loading")
                    : mainTestsError 
                      ? t("common:error.fetchFailed")
                      : t("common:noResultsFound")
                }
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.main_test_name}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t("filters:selectTestPlaceholder")}
                    variant="outlined"
                    error={!!mainTestsError}
                    helperText={mainTestsError?.message}
                    sx={{
                      mt: 0.5,
                      '& .MuiOutlinedInput-root': {
                        height: '36px',
                        fontSize: '0.875rem',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                        '& fieldset': {
                          borderColor: 'var(--border)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'var(--ring)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'var(--ring)',
                        },
                        '&.Mui-error fieldset': {
                          borderColor: 'var(--destructive)',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'var(--muted-foreground)',
                      },
                      '& .MuiAutocomplete-clearIndicator': {
                        color: 'var(--muted-foreground)',
                        '&:hover': {
                          color: 'var(--foreground)',
                        },
                      },
                      '& .MuiFormHelperText-root': {
                        color: 'var(--destructive)',
                        fontSize: '0.75rem',
                      },
                    }}
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
                PaperComponent={(props) => (
                  <Paper
                    {...props}
                    sx={{
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                      '& .MuiAutocomplete-option': {
                        color: 'var(--foreground)',
                        '&:hover': {
                          backgroundColor: 'var(--accent)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'var(--accent)',
                        },
                      },
                      '& .MuiAutocomplete-noOptions': {
                        color: 'var(--muted-foreground)',
                      },
                    }}
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="filter-package" className="text-xs">
                {t("filters:package")}
              </Label>
              <Select
                value={localFilters.package_id || ""}
                onValueChange={(val) => handleFilterChange("package_id", val)}
                dir={i18n.dir()}
                disabled={isLoadingPackages}
              >
                <SelectTrigger id="filter-package" className="h-9 mt-1">
                  <SelectValue
                    placeholder={t("filters:selectPackagePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">{t("filters:allPackages")}</SelectItem>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={String(pkg.id)}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-company" className="text-xs">
                {t("filters:company")}
              </Label>
              <Select
                value={localFilters.company_id || ""}
                onValueChange={(val) => handleFilterChange("company_id", val)}
                dir={i18n.dir()}
                disabled={isLoadingCompanies}
              >
                <SelectTrigger id="filter-company" className="h-9 mt-1">
                  <SelectValue
                    placeholder={t("filters:selectCompanyPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">{t("filters:allCompanies")}</SelectItem>
                  {companies?.map((comp) => (
                    <SelectItem key={comp.id} value={String(comp.id)}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-doctor" className="text-xs">
                {t("filters:referringDoctor")}
              </Label>
              <Select
                value={localFilters.doctor_id || ""}
                onValueChange={(val) => handleFilterChange("doctor_id", val)}
                dir={i18n.dir()}
                disabled={isLoadingDoctors}
              >
                <SelectTrigger id="filter-doctor" className="h-9 mt-1">
                  <SelectValue
                    placeholder={t("filters:selectDoctorPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">{t("filters:allDoctors")}</SelectItem>
                  {doctors?.map((doc) => (
                    <SelectItem key={doc.id} value={String(doc.id)}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoadingDropdowns && (
              <div className="text-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pt-4 pb-6 border-t flex-wrap justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="text-xs"
          >
            {t("filters:resetFilters")}
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleApply}
              disabled={isLoadingDropdowns}
            >
              <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />{" "}
              {t("filters:applyFilters")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabQueueFilterDialog;
