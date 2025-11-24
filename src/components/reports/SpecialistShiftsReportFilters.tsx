import React from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Autocomplete, TextField, Card, CardContent } from "@mui/material";
import { Typography } from "@mui/material";

import type { Specialist } from "@/types/doctors";
import type { User } from "@/types/auth";
import type { Shift as GeneralShiftType } from "@/types/shifts";

interface Filters {
  userIdOpened: string;
  specialistId: string;
  generalShiftId: string;
  dateFrom: string;
  dateTo: string;
  searchSpecialistName: string;
  status: "all" | "open" | "closed";
}

interface AutocompleteOption {
  id: string;
  name: string;
}

interface SpecialistShiftsReportFiltersProps {
  filters: Filters;
  onFilterChange: (filterName: keyof Filters, value: string) => void;
  usersForFilter: User[];
  specialistsForFilter?: Specialist[];
  generalShiftsForFilter?: GeneralShiftType[];
  isLoadingUIData: boolean;
  isFetching: boolean;
  canViewAllUsersShifts: boolean;
}

const SpecialistShiftsReportFilters: React.FC<SpecialistShiftsReportFiltersProps> = ({
  filters,
  onFilterChange,
  usersForFilter,
  specialistsForFilter,
  generalShiftsForFilter,
  isLoadingUIData,
  isFetching,
  canViewAllUsersShifts,
}) => {
  const dateLocale = arSA;

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
          {/* User Opened By Filter */}
          <div className="min-w-[150px]">
            <Autocomplete<AutocompleteOption>
              id="ssr-user-filter"
              options={[
                ...(canViewAllUsersShifts ? [{ id: "all", name: "كل المستخدمين" }] : []),
                ...usersForFilter.map((u) => ({ id: u.id.toString(), name: u.name }))
              ]}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={(() => {
                if (!filters.userIdOpened || filters.userIdOpened === "") {
                  return null;
                }
                if (filters.userIdOpened === "all") {
                  return canViewAllUsersShifts ? { id: "all", name: "كل المستخدمين" } : null;
                }
                const user = usersForFilter.find(u => u.id.toString() === filters.userIdOpened);
                return user ? { id: user.id.toString(), name: user.name } : null;
              })()}
              onChange={(_, newValue) => {
                onFilterChange("userIdOpened", newValue?.id || "");
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
                  label="المستخدم الذي فتح"
                  placeholder="المستخدم الذي فتح"
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
          
          {/* Specialist Filter */}
          <div className="min-w-[150px]">
            <Autocomplete<AutocompleteOption>
              id="ssr-specialist-filter"
              options={[
                { id: "all", name: "كل التخصصات" },
                ...(specialistsForFilter?.map((spec) => ({ id: spec.id.toString(), name: spec.name })) || [])
              ]}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={(() => {
                if (!filters.specialistId || filters.specialistId === "" || filters.specialistId === "all") {
                  return null;
                }
                const specialist = specialistsForFilter?.find(spec => spec.id.toString() === filters.specialistId);
                return specialist ? { id: specialist.id.toString(), name: specialist.name } : null;
              })()}
              onChange={(_, newValue) => {
                onFilterChange("specialistId", newValue?.id || "");
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
                  label="التخصص"
                  placeholder="التخصص"
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
            <Autocomplete<AutocompleteOption>
              id="ssr-gshift-filter"
              options={[
                { id: "all", name: "كل المناوبات" },
                ...(generalShiftsForFilter?.map((s) => ({ 
                  id: s.id.toString(), 
                  name: s.name || `#${s.id} (${format(parseISO(s.created_at), "PP", { locale: dateLocale })})`
                })) || [])
              ]}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={(() => {
                if (filters.generalShiftId === "all") {
                  return { id: "all", name: "كل المناوبات" };
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
                  label="المناوبة العامة"
                  placeholder="المناوبة العامة"
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
            <TextField
              id="ssr-date-from"
              type="date"
              label="من تاريخ"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              size="small"
              className="h-10 text-base"
              disabled={isFetching}
              InputLabelProps={{ shrink: true }}
            />
          </div>
          
          {/* Date To Input */}
          <div className="min-w-[150px]">
            <TextField
              id="ssr-date-to"
              type="date"
              label="إلى تاريخ"
              value={filters.dateTo}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              size="small"
              className="h-10 text-base"
              disabled={isFetching}
              InputLabelProps={{ shrink: true }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecialistShiftsReportFilters;

