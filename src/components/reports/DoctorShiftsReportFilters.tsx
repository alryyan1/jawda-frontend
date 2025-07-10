import React from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Autocomplete, TextField } from "@mui/material";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Doctor } from "@/types/doctors";
import type { User } from "@/types/auth";
import type { Shift as GeneralShiftType } from "@/types/shifts";

interface Filters {
  userIdOpened: string;
  doctorId: string;
  generalShiftId: string;
  dateFrom: string;
  dateTo: string;
  searchDoctorName: string;
  status: "all" | "open" | "closed";
}

interface AutocompleteOption {
  id: string;
  name: string;
}

interface DoctorShiftsReportFiltersProps {
  filters: Filters;
  onFilterChange: (filterName: keyof Filters, value: string) => void;
  usersForFilter: User[];
  doctorsForFilter?: Doctor[];
  generalShiftsForFilter?: GeneralShiftType[];
  isLoadingUIData: boolean;
  isFetching: boolean;
  canViewAllUsersShifts: boolean;
}

const DoctorShiftsReportFilters: React.FC<DoctorShiftsReportFiltersProps> = ({
  filters,
  onFilterChange,
  usersForFilter,
  doctorsForFilter,
  generalShiftsForFilter,
  isLoadingUIData,
  isFetching,
  canViewAllUsersShifts,
}) => {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t("reports:filters.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
          {/* User Opened By Filter */}
          {canViewAllUsersShifts && (
            <div className="min-w-[150px]">
              <Label htmlFor="dsr-user-filter" className="text-sm font-medium">
                {t("reports:filters.userOpened")}
              </Label>
              <Autocomplete<AutocompleteOption>
                id="dsr-user-filter"
                options={[
                  { id: "all", name: t("reports:filters.allUsers") },
                  ...usersForFilter.map((u) => ({ id: u.id.toString(), name: u.name }))
                ]}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={(() => {
                  if (filters.userIdOpened === "all") {
                    return { id: "all", name: t("reports:filters.allUsers") };
                  }
                  const user = usersForFilter.find(u => u.id.toString() === filters.userIdOpened);
                  return user ? { id: user.id.toString(), name: user.name } : null;
                })()}
                onChange={(_, newValue) => {
                  onFilterChange("userIdOpened", newValue?.id || "all");
                }}
                disabled={isLoadingUIData || isFetching}
                sx={{
                  '& .MuiAutocomplete-popper': {
                    zIndex: 9999,
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={t("reports:filters.userOpened")}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: '40px',
                        fontSize: '16px',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '14px',
                      },
                      '& .MuiAutocomplete-listbox': {
                        fontSize: '16px',
                      },
                    }}
                  />
                )}
              />
            </div>
          )}
          
          {/* Doctor Filter */}
          <div className="min-w-[150px]">
            <Label htmlFor="dsr-doctor-filter" className="text-sm font-medium">
              {t("reports:filters.doctor")}
            </Label>
            <Autocomplete<AutocompleteOption>
              id="dsr-doctor-filter"
              options={[
                { id: "all", name: t("reports:filters.allDoctors") },
                ...(doctorsForFilter?.map((doc) => ({ id: doc.id.toString(), name: doc.name })) || [])
              ]}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={(() => {
                if (filters.doctorId === "all") {
                  return { id: "all", name: t("reports:filters.allDoctors") };
                }
                const doctor = doctorsForFilter?.find(doc => doc.id.toString() === filters.doctorId);
                return doctor ? { id: doctor.id.toString(), name: doctor.name } : null;
              })()}
              onChange={(_, newValue) => {
                onFilterChange("doctorId", newValue?.id || "all");
              }}
              disabled={isLoadingUIData || isFetching}
              sx={{
                '& .MuiAutocomplete-popper': {
                  zIndex: 9999,
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={t("reports:filters.doctor")}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      fontSize: '16px',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '14px',
                    },
                    '& .MuiAutocomplete-listbox': {
                      fontSize: '16px',
                    },
                  }}
                />
              )}
            />
          </div>
    
          {/* General Shift Filter */}
          <div className="min-w-[150px]">
            <Label htmlFor="dsr-gshift-filter" className="text-sm font-medium">
              {t("reports:filters.generalShift")}
            </Label>
            <Autocomplete<AutocompleteOption>
              id="dsr-gshift-filter"
              options={[
                { id: "all", name: t("reports:filters.allShifts") },
                ...(generalShiftsForFilter?.map((s) => ({ 
                  id: s.id.toString(), 
                  name: s.name || `#${s.id} (${format(parseISO(s.created_at), "PP", { locale: dateLocale })})`
                })) || [])
              ]}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={(() => {
                if (filters.generalShiftId === "all") {
                  return { id: "all", name: t("reports:filters.allShifts") };
                }
                const shift = generalShiftsForFilter?.find(s => s.id.toString() === filters.generalShiftId);
                return shift ? { 
                  id: shift.id.toString(), 
                  name: shift.name || `#${shift.id} (${format(parseISO(shift.created_at), "PP", { locale: dateLocale })})`
                } : null;
              })()}
              onChange={(_, newValue) => {
                onFilterChange("generalShiftId", newValue?.id || "all");
              }}
              disabled={isLoadingUIData || isFetching}
              sx={{
                '& .MuiAutocomplete-popper': {
                  zIndex: 9999,
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={t("reports:filters.generalShift")}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      fontSize: '16px',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '14px',
                    },
                    '& .MuiAutocomplete-listbox': {
                      fontSize: '16px',
                    },
                  }}
                />
              )}
            />
          </div>
       
          {/* Date From Input */}
          <div className="min-w-[150px]">
            <Label htmlFor="dsr-date-from" className="text-sm font-medium">
              {t("reports:filters.dateFrom")}
            </Label>
            <Input
              id="dsr-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              className="h-10 text-base"
              disabled={isFetching}
            />
          </div>
          
          {/* Date To Input */}
          <div className="min-w-[150px]">
            <Label htmlFor="dsr-date-to" className="text-sm font-medium">
              {t("reports:filters.dateTo")}
            </Label>
            <Input
              id="dsr-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              className="h-10 text-base"
              disabled={isFetching}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorShiftsReportFilters; 