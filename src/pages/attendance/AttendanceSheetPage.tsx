// src/pages/attendance/AttendanceSheetPage.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isValid as isValidDate,
} from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";
import _debounce from "lodash/debounce";

// MUI Imports
import Autocomplete, {
  AutocompleteInputChangeReason,
  createFilterOptions,
} from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// Shadcn UI imports
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors

import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  UserCheck,
  UserX,
  UserCog,
  RotateCcw,
  Filter as FilterIcon,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import apiClient from "@/services/api";
import type { UserStripped } from "@/types/auth";
import type {
  MonthlySheetData,
  DailyAttendanceData,
  DailyShiftAttendance,
  AttendanceRecord,
  AttendanceShiftDefinition,
} from "@/types/attendance";
import { cn } from "@/lib/utils";

interface UserOptionType extends UserStripped {
  label: string; // For Autocomplete
}

// Type for individual field save status
export type FieldSaveStatus = "idle" | "saving" | "success" | "error";
interface CellSaveStatus {
  supervisor?: FieldSaveStatus;
  employees?: Record<number, FieldSaveStatus>; // Keyed by employee user_id or a temp ID
}

const AttendanceSheetPage: React.FC = () => {
  const { t, i18n } = useTranslation(["attendance", "common"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;
  const queryClient = useQueryClient();

  const [currentMonthDate, setCurrentMonthDate] = useState(() =>
    startOfMonth(new Date())
  );
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>("all");
  const [cellSaveStatus, setCellSaveStatus] = useState<
    Record<string, Record<number, CellSaveStatus>>
  >({}); // { [date]: { [shiftDefId]: CellSaveStatus } }

  const monthYearParams = useMemo(
    () => ({
      month: currentMonthDate.getMonth() + 1,
      year: currentMonthDate.getFullYear(),
    }),
    [currentMonthDate]
  );

  const monthlySheetQueryKey = [
    "attendanceMonthlySheet",
    monthYearParams.year,
    monthYearParams.month,
  ] as const;

  const {
    data: sheetData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<MonthlySheetData, Error>({
    queryKey: monthlySheetQueryKey,
    queryFn: async () =>
      (
        await apiClient.get("/attendances/monthly-sheet", {
          params: monthYearParams,
        })
      ).data,
    refetchOnWindowFocus: false,
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: (payload: {
      key: string; // Unique key for status: e.g. `date-shiftId-slotType-userId`
      user_id: number;
      shift_definition_id: number;
      attendance_date: string;
      status: AttendanceRecord["status"];
      supervisor_id?: number | null; // ID of the user in the supervisor slot for this shift-day
      is_shift_supervisor_entry?: boolean; // True if this is the supervisor slot itself
    }) => {
      const { key, ...apiPayload } = payload; // Exclude key from API payload
      return apiClient.post("/attendances/record", apiPayload);
    },
    onMutate: (variables) => {
      const [date, shiftIdStr, slotType, slotId] = variables.key.split("-");
      const shiftId = parseInt(shiftIdStr);
      setCellSaveStatus((prev) => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [shiftId]: {
            ...(prev[date]?.[shiftId] || {}),
            [slotType === "supervisor" ? "supervisor" : `employees.${slotId}`]:
              "saving",
          },
        },
      }));
    },
    onSuccess: (response, variables) => {
      toast.success(t("attendance:record.saveSuccess"));
      const [date, shiftIdStr, slotType, slotId] = variables.key.split("-");
      const shiftId = parseInt(shiftIdStr);
      setCellSaveStatus((prev) => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [shiftId]: {
            ...(prev[date]?.[shiftId] || {}),
            [slotType === "supervisor" ? "supervisor" : `employees.${slotId}`]:
              "success",
          },
        },
      }));
      // Smartly update cache instead of full refetch if possible
      queryClient.setQueryData(
        monthlySheetQueryKey,
        (oldData: MonthlySheetData | undefined) => {
          if (!oldData) return oldData;
          const newDays = oldData.days.map((day) => {
            if (day.date === variables.attendance_date) {
              return {
                ...day,
                shifts: day.shifts.map((shift) => {
                  if (
                    shift.shift_definition_id === variables.shift_definition_id
                  ) {
                    let updatedRecords = [...(shift.attendance_records || [])];
                    const existingRecordIndex = updatedRecords.findIndex(
                      (ar) => ar.user_id === variables.user_id
                    );

                    if (variables.status === "absent") {
                      // If user was removed
                      updatedRecords = updatedRecords.filter(
                        (ar) => ar.user_id !== variables.user_id
                      );
                    } else if (existingRecordIndex > -1) {
                      updatedRecords[existingRecordIndex] = {
                        ...updatedRecords[existingRecordIndex],
                        ...response.data.data,
                      };
                    } else {
                      updatedRecords.push(response.data.data);
                    }

                    let newSupervisorId = shift.supervisor_id;
                    if (variables.is_shift_supervisor_entry) {
                      newSupervisorId =
                        variables.status === "absent"
                          ? null
                          : variables.user_id;
                    }

                    return {
                      ...shift,
                      attendance_records: updatedRecords,
                      supervisor_id: newSupervisorId,
                    };
                  }
                  return shift;
                }),
              };
            }
            return day;
          });
          return { ...oldData, days: newDays };
        }
      );
      setTimeout(() => {
        setCellSaveStatus((prev) => ({
          ...prev,
          [date]: {
            ...(prev[date] || {}),
            [shiftId]: {
              ...(prev[date]?.[shiftId] || {}),
              [slotType === "supervisor"
                ? "supervisor"
                : `employees.${slotId}`]: "idle",
            },
          },
        }));
      }, 2000);
    },
    onError: (error: any, variables) => {
      toast.error(
        error.response?.data?.message || t("common:error.saveFailed")
      );
      const [date, shiftIdStr, slotType, slotId] = variables.key.split("-");
      const shiftId = parseInt(shiftIdStr);
      setCellSaveStatus((prev) => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [shiftId]: {
            ...(prev[date]?.[shiftId] || {}),
            [slotType === "supervisor" ? "supervisor" : `employees.${slotId}`]:
              "error",
          },
        },
      }));
    },
  });

  const debouncedRecordAttendance = useCallback(
    _debounce((payload) => recordAttendanceMutation.mutate(payload), 1000),
    [recordAttendanceMutation] // Recreate if mutation instance changes (shouldn't often)
  );

  const handleUserSelection = (
    dayDate: string,
    shiftDefId: number,
    selectedUser: UserOptionType | null,
    isSupervisorSlot: boolean,
    slotIdentifier: string | number, // Could be 'supervisor' or employee index/tempId
    existingRecordUserId?: number // User ID of the record being replaced/removed
  ) => {
    const keyBase = `${dayDate}-${shiftDefId}`;
    const slotKey = isSupervisorSlot
      ? "supervisor"
      : `employees.${slotIdentifier}`;
    const mutationKey = `${keyBase}-${slotKey}`;

    // Find the currently assigned supervisor for this shift-day to pass as supervisor_id for employee entries
    let currentShiftSupervisorId: number | null | undefined = undefined;
    if (!isSupervisorSlot) {
      const dayData = sheetData?.days.find((d) => d.date === dayDate);
      const shiftData = dayData?.shifts.find(
        (s) => s.shift_definition_id === shiftDefId
      );
      currentShiftSupervisorId = shiftData?.supervisor_id;
    }

    // If deselecting a user (newValue is null)
    if (!selectedUser && existingRecordUserId) {
      debouncedRecordAttendance({
        key: mutationKey,
        user_id: existingRecordUserId, // Use existing user_id to mark them as absent
        shift_definition_id: shiftDefId,
        attendance_date: dayDate,
        status: "absent", // Mark as absent, or remove record based on backend
        supervisor_id: isSupervisorSlot ? null : currentShiftSupervisorId,
        is_shift_supervisor_entry: isSupervisorSlot,
      });
    } else if (selectedUser) {
      // If selecting a new user or changing an existing one
      debouncedRecordAttendance({
        key: mutationKey,
        user_id: selectedUser.id,
        shift_definition_id: shiftDefId,
        attendance_date: dayDate,
        status: "present",
        supervisor_id: isSupervisorSlot
          ? selectedUser.id
          : currentShiftSupervisorId,
        is_shift_supervisor_entry: isSupervisorSlot,
      });
    }
  };

  const changeMonth = (amount: number) => {
    setCurrentMonthDate((prev) => {
      const newDate = amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1);
      return startOfMonth(newDate); // Ensure it's always the start of the month
    });
  };

  const activeShiftDefinitionsToDisplay = useMemo(() => {
    if (!sheetData?.meta.active_shift_definitions) return [];
    if (selectedShiftFilter === "all")
      return sheetData.meta.active_shift_definitions;
    return sheetData.meta.active_shift_definitions.filter(
      (sd: AttendanceShiftDefinition) => String(sd.id) === selectedShiftFilter
    );
  }, [sheetData?.meta.active_shift_definitions, selectedShiftFilter]);

  // Memoized options for Autocompletes
  const allUserOptions = useMemo(
    () =>
      sheetData?.selectable_users.map((u) => ({ ...u, label: u.name })) || [],
    [sheetData?.selectable_users]
  );
  const supervisorOptions = useMemo(
    () =>
      sheetData?.selectable_supervisors.map((u) => ({ ...u, label: u.name })) ||
      [],
    [sheetData?.selectable_supervisors]
  );

  if (isLoading && !sheetData)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("common:error.anErrorOccurred")}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  if (!sheetData)
    return (
      <div className="p-8 text-center text-muted-foreground">
        {t("common:noDataAvailable")}
      </div>
    );

  const renderDayCell = (
    day: DailyAttendanceData,
    shiftDef: AttendanceShiftDefinition
  ) => {
    const shiftCellData = day.shifts.find(
      (s) => s.shift_definition_id === shiftDef.id
    );
    const supervisorRecord = shiftCellData?.attendance_records.find(
      (ar) => ar.user_id === shiftCellData.supervisor_id
    );
    const employeeRecords =
      shiftCellData?.attendance_records.filter(
        (ar) => ar.user_id !== shiftCellData?.supervisor_id
      ) || [];
    const numEmployeeSlots = Math.max(
      1,
      employeeRecords.length + (day.is_holiday ? 0 : 1)
    ); // At least 1 slot, or more if records exist

    const getSelectedUserValue = (
      userId: number | null | undefined
    ): UserOptionType | null => {
      if (!userId) return null;
      return allUserOptions.find((u) => u.id === userId) || null;
    };

    const getCellStatus = (
      slotType: "supervisor" | `employees.${string | number}`
    ): FieldSaveStatus => {
      return cellSaveStatus[day.date]?.[shiftDef.id]?.[slotType] || "idle";
    };

    return (
      <Paper
        elevation={1}
        key={`${day.date}-${shiftDef.id}`}
        className={cn(
          "p-1.5 sm:p-2 space-y-1 min-h-[120px] flex flex-col w-[220px] sm:w-[250px] flex-shrink-0", // Fixed width
          day.is_holiday
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300/50"
            : "bg-card dark:bg-slate-800/40"
        )}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="caption"
            component="div"
            sx={{ fontWeight: 500, fontSize: "0.7rem" }}
            className="text-muted-foreground"
          >
            {shiftDef.shift_label}
          </Typography>
          {day.is_holiday && (
            <Chip
              label={t("attendance:sheet.holiday")}
              size="small"
              color="warning"
              sx={{ fontSize: "0.6rem", height: "16px", p: "0 4px" }}
            />
          )}
        </Box>
        <Separator />

        <div className="flex-grow space-y-1.5 overflow-y-auto thin-scrollbar pr-1">
          {/* Supervisor Autocomplete */}
          <UserAutocomplete
            label={t("attendance:sheet.shiftSupervisor")}
            options={supervisorOptions}
            value={getSelectedUserValue(shiftCellData?.supervisor_id)}
            onChange={(user) =>
              handleUserSelection(
                day.date,
                shiftDef.id,
                user,
                true,
                "supervisor",
                supervisorRecord?.user_id
              )
            }
            disabled={recordAttendanceMutation.isPending || day.is_holiday}
            saveStatus={getCellStatus("supervisor")}
            excludeUserIds={employeeRecords.map((e) => e.user_id)}
          />

          {/* Employee Autocompletes */}
          {Array.from({ length: numEmployeeSlots }).map((_, idx) => {
            const existingEmpRecord = employeeRecords[idx];
            return (
              <UserAutocomplete
                key={existingEmpRecord?.id || `new-${idx}`}
                label={`${t("attendance:sheet.employee")} ${idx + 1}`}
                options={allUserOptions.filter(
                  (u) => u.id !== shiftCellData?.supervisor_id
                )}
                value={getSelectedUserValue(existingEmpRecord?.user_id)}
                onChange={(user) =>
                  handleUserSelection(
                    day.date,
                    shiftDef.id,
                    user,
                    false,
                    existingEmpRecord?.id || `new-${idx}`,
                    existingEmpRecord?.user_id
                  )
                }
                disabled={recordAttendanceMutation.isPending || day.is_holiday}
                saveStatus={getCellStatus(
                  existingEmpRecord?.id
                    ? `employees.${existingEmpRecord.id}`
                    : `employees.new-${idx}`
                )}
                excludeUserIds={[
                  shiftCellData?.supervisor_id,
                  ...employeeRecords
                    .filter((_, i) => i !== idx)
                    .map((e) => e.user_id)
                ].filter(Boolean)}
              />
            );
          })}
        </div>
      </Paper>
    );
  };

  return (
    <div
      className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-3 h-full flex flex-col"
      style={{ direction: i18n.dir() }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-card rounded-lg shadow flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          {t("attendance:sheet.pageTitle")}
        </h1>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => changeMonth(-1)}
            disabled={isFetching}
          >
            <ChevronLeft className="h-4 sm:h-5 w-4 sm:w-5" />
          </Button>
          <Typography
            variant="h6"
            component="div"
            className="min-w-[130px] sm:min-w-[150px] text-sm sm:text-base text-center font-semibold"
          >
            {format(currentMonthDate, "MMMM yyyy", { locale: dateLocale })}
          </Typography>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => changeMonth(1)}
            disabled={isFetching}
          >
            <ChevronRight className="h-4 sm:h-5 w-4 sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => refetch()}
            disabled={isFetching || isLoading}
            title={t("common:refresh")}
          >
            <RotateCcw
              className={cn(
                "h-4 sm:h-5 w-4 sm:w-5",
                (isFetching || isLoading) && "animate-spin"
              )}
            />
          </Button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <FilterIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Select
            value={selectedShiftFilter}
            onValueChange={setSelectedShiftFilter}
            dir={i18n.dir()}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
              <SelectValue placeholder={t("attendance:sheet.filterByShift")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("attendance:sheet.allShifts")}
              </SelectItem>
              {sheetData.meta.active_shift_definitions.map((sd) => (
                <SelectItem key={sd.id} value={String(sd.id)}>
                  {sd.shift_label} ({sd.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isFetching && !isLoading && (
        <div className="text-center text-xs text-muted-foreground py-1">
          <Loader2 className="inline h-3 w-3 animate-spin" />{" "}
          {t("common:loadingData")}
        </div>
      )}

      <ScrollArea className="flex-grow border rounded-md bg-slate-50 dark:bg-slate-900/50 flex-shrink min-h-0">
        <div className="flex p-1 sm:p-1.5 min-w-max">
          {" "}
          {/* min-w-max for horizontal scroll content */}
          {sheetData.days.map((day) => (
            <div
              key={day.date}
              className="flex flex-col border-r dark:border-slate-700 last:border-r-0 rtl:border-l rtl:last:border-l-0 rtl:first:border-r-0 flex-shrink-0"
            >
              <div className="p-1.5 sm:p-2 text-center border-b dark:border-slate-700 bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 min-h-[45px] flex flex-col justify-center">
                <Typography
                  variant="subtitle2"
                  component="div"
                  sx={{ fontSize: "0.75rem", fontWeight: "bold" }}
                >
                  {day.day_name}
                </Typography>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ fontSize: "0.65rem" }}
                >
                  {format(new Date(day.date + "T00:00:00"), "d")}
                </Typography>
              </div>
              <div
                className="flex flex-row md:flex-col gap-1 sm:gap-1.5 p-1 sm:p-1.5 overflow-y-auto thin-scrollbar"
                style={{ maxHeight: "calc(100vh - 250px)" }}
              >
                {activeShiftDefinitionsToDisplay.map((shiftDef) =>
                  renderDayCell(day, shiftDef)
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

// Helper component for User Autocomplete with Save Status
interface UserAutocompleteProps {
  label: string;
  options: UserOptionType[];
  value: UserOptionType | null;
  onChange: (user: UserOptionType | null) => void;
  disabled?: boolean;
  saveStatus: FieldSaveStatus;
  allUsers: UserOptionType[]; // All users for filtering out already selected ones
  currentShiftEmployeeIds?: number[]; // IDs of employees already assigned to other slots in this shift
  currentSupervisorId?: number | null; // ID of the current supervisor for this shift
}
const UserAutocomplete: React.FC<UserAutocompleteProps> = ({
  label,
  options,
  value,
  onChange,
  disabled,
  saveStatus,
  allUsers,
  currentShiftEmployeeIds = [],
  currentSupervisorId,
}) => {
  const filterOptions = createFilterOptions<UserOptionType>();
  const memoizedOptions = useMemo(() => {
    // Filter out users already assigned in other slots of the same shift (excluding the current value if it's an update)
    return options.filter(
      (opt) =>
        (value && opt.id === value.id) || // Always include the currently selected value for this slot
        (!currentShiftEmployeeIds.includes(opt.id) &&
          opt.id !== currentSupervisorId)
    );
  }, [options, value, currentShiftEmployeeIds, currentSupervisorId]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Autocomplete
        options={memoizedOptions}
        getOptionLabel={(option) => option.label || ""}
        value={value}
        onChange={(event, newValue) => onChange(newValue)}
        isOptionEqualToValue={(option, val) => option.id === val?.id}
        size="small"
        fullWidth
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            variant="standard"
            sx={{
              "& .MuiInputLabel-root": { fontSize: "0.75rem" },
              "& .MuiInputBase-root": { fontSize: "0.8rem" },
            }}
          />
        )}
        slotProps={{
          paper: { className: "dark:bg-slate-800 dark:text-slate-100" },
        }}
      />
      <Box
        sx={{
          width: "16px",
          height: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {" "}
        {/* Consistent size for status icon */}
        {saveStatus === "saving" && (
          <CircularProgress size={12} thickness={5} />
        )}
        {saveStatus === "success" && (
          <UserCheck className="h-3.5 w-3.5 text-green-500" />
        )}
        {saveStatus === "error" && (
          <UserX className="h-3.5 w-3.5 text-red-500" />
        )}
      </Box>
    </Box>
  );
};

export default AttendanceSheetPage;
