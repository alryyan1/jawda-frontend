// src/components/attendance/UserAutocomplete.tsx (New component)
import React, { useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { UserCheck, UserX } from 'lucide-react'; // For save status

import type { UserStripped } from '@/types/auth';
import type { FieldSaveStatus } from '@/pages/attendance/AttendanceSheetPage'; // Assuming type is exported

interface UserOptionType extends UserStripped { label: string; }

interface UserAutocompleteProps {
  label: string;
  options: UserOptionType[]; // Full list of users for this type (e.g., all supervisors, or all general users)
  value: UserOptionType | null;
  onChange: (user: UserOptionType | null) => void;
  disabled?: boolean;
  saveStatus: FieldSaveStatus;
  // For filtering out already selected users in the current context (day-shift)
  excludeUserIds?: (number | null | undefined)[]; 
  placeholder?: string;
  variant?: "standard" | "outlined"; // Allow different TextField variants
}

const UserAutocomplete: React.FC<UserAutocompleteProps> = ({
  label, options, value, onChange, disabled, saveStatus, excludeUserIds = [], placeholder, variant = "standard"
}) => {
  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
        !excludeUserIds.includes(opt.id) || (value && opt.id === value.id) // Always include current value
    );
  }, [options, excludeUserIds, value]);

  const getStatusIcon = () => {
    if (saveStatus === 'saving') return <CircularProgress size={12} thickness={5} sx={{color: 'primary.main'}} />;
    if (saveStatus === 'success') return <UserCheck className="h-3.5 w-3.5 text-green-500" />;
    if (saveStatus === 'error') return <UserX className="h-3.5 w-3.5 text-red-500" />;
    return null;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
      <Autocomplete
        options={filteredOptions}
        getOptionLabel={(option) => option.label || ''}
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
            variant={variant}
            placeholder={placeholder}
            sx={{ 
                '& .MuiInputLabel-root': {fontSize: '0.75rem', color: 'text.secondary'}, 
                '& .MuiInputBase-root': {fontSize: '0.8rem', backgroundColor: 'background.default'},
                '& .MuiInputBase-input': { py: '6px' } // Adjust padding for standard variant
            }} 
          />
        )}
        slotProps={{ paper: { className: "dark:bg-slate-800 dark:text-slate-100" } }}
        className="min-w-[150px]" // Ensure it has a min width
      />
      <Box sx={{ width: '16px', height: '16px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
        {getStatusIcon()}
      </Box>
    </Box>
  );
};

export default UserAutocomplete;