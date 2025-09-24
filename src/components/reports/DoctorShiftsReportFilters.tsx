import React from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Autocomplete, TextField, Card, CardContent, CardHeader } from "@mui/material";
import { Typography } from "@mui/material";

import type { Doctor } from "@/types/doctors";
import type { User } from "@/types/auth";
import type { Shift as GeneralShiftType } from "@/types/shifts";
import showJsonDialog from "@/lib/showJsonDialog";

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
  const dateLocale = arSA;
//  showJsonDialog(usersForFilter, "usersForFilter");
  return (
    <Card>
      <CardHeader title={<Typography variant="h6">مرشحات التقرير</Typography>} />
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
          {/* User Opened By Filter */}
          
            <div className="min-w-[150px]">
              <Autocomplete<AutocompleteOption>
                id="dsr-user-filter"
                options={[
                  { id: "all", name: "كل المستخدمين" },
                  ...usersForFilter.map((u) => ({ id: u.id.toString(), name: u.name }))
                ]}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={(() => {
                  if (filters.userIdOpened === "all") {
                    return { id: "all", name: "كل المستخدمين" };
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
          
          
          {/* Doctor Filter */}
          <div className="min-w-[150px]">
            <Autocomplete<AutocompleteOption>
              id="dsr-doctor-filter"
              options={[
                { id: "all", name: "كل الأطباء" },
                ...(doctorsForFilter?.map((doc) => ({ id: doc.id.toString(), name: doc.name })) || [])
              ]}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={(() => {
                if (filters.doctorId === "all") {
                  return { id: "all", name: "كل الأطباء" };
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
                  label="الطبيب"
                  placeholder="الطبيب"
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
              id="dsr-gshift-filter"
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
              id="dsr-date-from"
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
              id="dsr-date-to"
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

export default DoctorShiftsReportFilters; 