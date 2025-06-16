// src/components/attendance/AttendanceSheetCell.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { Separator } from '@/components/ui/separator'; // Assuming shadcn Separator
import UserAutocomplete from './UserAutocomplete'; // Your UserAutocomplete
import type { DailyAttendanceData, DailyShiftAttendance, AttendanceShiftDefinition, AttendanceRecord } from '@/types/attendance';
import type { UserStripped } from '@/types/auth';
import type { FieldSaveStatus } from '@/pages/attendance/AttendanceSheetPage'; // Ensure this type is exported
import { cn } from '@/lib/utils';
import { Box } from '@mui/material';


interface UserOptionType extends UserStripped { label: string; }

interface AttendanceSheetCellProps {
  day: DailyAttendanceData;
  shiftDef: AttendanceShiftDefinition;
  shiftCellData: DailyShiftAttendance | undefined; // Data for this specific cell
  allUserOptions: UserOptionType[];
  supervisorOptions: UserOptionType[];
  onUserSelection: (
    dayDate: string,
    shiftDefId: number,
    selectedUser: UserOptionType | null,
    isSupervisorSlot: boolean,
    slotIdentifier: string, // Unique ID for this slot (e.g. 'supervisor' or 'employee-0', 'employee-1', employee-userId)
    existingRecordUserId?: number
  ) => void;
  getCellStatus: (slotKey: string) => FieldSaveStatus;
  disabled: boolean; // If the whole cell should be disabled (e.g., holiday, mutation pending globally)
}

const AttendanceSheetCell: React.FC<AttendanceSheetCellProps> = ({
  day, shiftDef, shiftCellData, allUserOptions, supervisorOptions, onUserSelection, getCellStatus, disabled
}) => {
  const { t } = useTranslation(['attendance', 'common']);

  const supervisorRecord = shiftCellData?.attendance_records.find(
    ar => ar.user_id === shiftCellData.supervisor_id
  );
  const employeeRecords = shiftCellData?.attendance_records.filter(
    ar => ar.user_id !== shiftCellData?.supervisor_id
  ) || [];
  
  // Smartly determine number of employee slots
  // Show existing employees + 1 empty slot if not a holiday and not maxed out (e.g. max 5 employees)
  const maxEmployeeSlotsPerShift = 5; // Example, could be configurable
  const numExistingEmployees = employeeRecords.length;
  const numEmployeeSlots = day.is_holiday 
    ? numExistingEmployees 
    : Math.min(maxEmployeeSlotsPerShift, numExistingEmployees + 1);


  const getSelectedUserValue = (userId: number | null | undefined): UserOptionType | null => {
    if (!userId) return null;
    return allUserOptions.find(u => u.id === userId) || null;
  };

  const currentSupervisorUserIdInCell = shiftCellData?.supervisor_id;
  const currentEmployeeUserIdsInCell = employeeRecords.map(e => e.user_id);

  return (
    <Paper
      variant="outlined"
      key={`${day.date}-${shiftDef.id}`}
      className={cn(
        "p-1.5 sm:p-2 space-y-1.5 min-h-[120px] flex flex-col w-[220px] sm:w-[250px] flex-shrink-0",
        day.is_holiday ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300/50 opacity-70" : "bg-card dark:bg-slate-800/40"
      )}
      sx={{minWidth: {xs: '200px', sm: '230px'}}}
    >
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Typography variant="caption" component="div" sx={{fontWeight: 500, fontSize:'0.7rem'}} className="text-muted-foreground">
          {shiftDef.shift_label}
        </Typography>
        {day.is_holiday && <Chip label={t('attendance:sheet.holiday')} size="small" color="warning" sx={{fontSize: '0.6rem', height: '16px', p: '0 4px'}}/>}
      </Box>
      <Separator />
      
      <div className="flex-grow space-y-1.5 overflow-y-auto thin-scrollbar pr-1">
        <UserAutocomplete
          label={t('attendance:sheet.shiftSupervisor')}
          options={supervisorOptions}
          value={getSelectedUserValue(supervisorRecord?.user_id)}
          onChange={(user) => onUserSelection(day.date, shiftDef.id, user, true, 'supervisor', supervisorRecord?.user_id)}
          disabled={disabled || day.is_holiday}
          saveStatus={getCellStatus('supervisor')}
          excludeUserIds={currentEmployeeUserIdsInCell} // Prevent supervisor from being an employee in same shift
          placeholder={t('attendance:sheet.selectSupervisor')}
        />

        {Array.from({ length: numEmployeeSlots }).map((_, idx) => {
          const existingEmpRecord = employeeRecords[idx];
          // Unique slot identifier: use existing record ID if available, otherwise a temp new ID
          const slotIdentifier = existingEmpRecord?.id ? `employee-${existingEmpRecord.id}` : `employee-new-${idx}`;
          return (
            <UserAutocomplete
              key={slotIdentifier}
              label={`${t('attendance:sheet.employee')} ${idx + 1}`}
              options={allUserOptions}
              value={getSelectedUserValue(existingEmpRecord?.user_id)}
              onChange={(user) => onUserSelection(day.date, shiftDef.id, user, false, slotIdentifier, existingEmpRecord?.user_id)}
              disabled={disabled || day.is_holiday}
              saveStatus={getCellStatus(slotIdentifier)}
              excludeUserIds={[currentSupervisorUserIdInCell, ...currentEmployeeUserIdsInCell.filter(id => id !== existingEmpRecord?.user_id)].filter(id => id != null) as number[]}
              placeholder={t('attendance:sheet.selectEmployee')}
            />
          );
        })}
      </div>
    </Paper>
  );
};

export default AttendanceSheetCell;