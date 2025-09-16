import React, { useState } from 'react';
import { 
  TextField, 
  Popover, 
  PopoverProps,
  IconButton,
  Box,
  Typography,
  Button as MuiButton
} from '@mui/material';
import { 
  DatePicker, 
  LocalizationProvider,
  DatePickerProps 
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// Create a dark theme compatible MUI theme for calendar
const createCalendarTheme = (isDark: boolean) => createTheme({
  typography: {
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
  },
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: 'hsl(var(--primary))',
      contrastText: 'hsl(var(--primary-foreground))',
    },
    secondary: {
      main: 'hsl(var(--secondary))',
      contrastText: 'hsl(var(--secondary-foreground))',
    },
    background: {
      default: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
      paper: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
    },
    text: {
      primary: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
      secondary: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
    },
    divider: isDark ? 'hsl(var(--border))' : 'hsl(var(--border))',
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
            borderColor: isDark ? 'hsl(var(--border))' : 'hsl(var(--border))',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'hsl(var(--border))' : 'hsl(var(--border))',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'hsl(var(--primary))',
            },
          },
          '& .MuiInputLabel-root': {
            color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
            '&.Mui-focused': {
              color: 'hsl(var(--primary))',
            },
          },
          '& .MuiInputBase-input': {
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
            '&::placeholder': {
              color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
              opacity: 1,
            },
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          border: `1px solid ${isDark ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
          boxShadow: isDark 
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&.Mui-selected': {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            '&:hover': {
              backgroundColor: 'hsl(var(--primary))',
            },
          },
          '&.MuiPickersDay-today': {
            border: `2px solid ${isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))'}`,
          },
        },
      },
    },
    MuiPickersCalendarHeader: {
      styleOverrides: {
        root: {
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
        },
        label: {
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
        },
      },
    },
    MuiPickersArrowSwitcher: {
      styleOverrides: {
        button: {
          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
        },
      },
    },
    MuiPickersMonth: {
      styleOverrides: {
        root: {
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&.Mui-selected': {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
        },
      },
    },
    MuiPickersYear: {
      styleOverrides: {
        root: {
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&.Mui-selected': {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
        },
      },
    },
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: {
          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
        },
      },
    },
  },
  typography: {
    fontFamily: 'inherit',
  },
  shape: {
    borderRadius: 8,
  },
});

interface DarkThemeDatePickerProps extends Omit<DatePickerProps<Date>, 'renderInput'> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
}

export const DarkThemeDatePicker: React.FC<DarkThemeDatePickerProps> = ({
  label,
  placeholder,
  helperText,
  error,
  fullWidth = false,
  size = 'medium',
  variant = 'outlined',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const muiTheme = createCalendarTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          {...props}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              helperText={helperText}
              error={error}
              fullWidth={fullWidth}
              size={size}
              variant={variant}
            />
          )}
        />
      </LocalizationProvider>
    </ThemeProvider>
  );
};

// Calendar button component for popover usage
interface DarkThemeCalendarButtonProps {
  value?: Date | null;
  placeholder?: string;
  label?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  disabled?: boolean;
}

export const DarkThemeCalendarButton: React.FC<DarkThemeCalendarButtonProps> = ({
  value,
  placeholder = "Pick a date",
  label,
  onClick,
  className,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const muiTheme = createCalendarTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      <Box className={className}>
        {label && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
              fontSize: '0.75rem',
              marginBottom: '0.25rem',
              display: 'block'
            }}
          >
            {label}
          </Typography>
        )}
        <MuiButton
          variant="outlined"
          onClick={onClick}
          disabled={disabled}
          startIcon={<CalendarIcon style={{ width: '16px', height: '16px' }} />}
          sx={{
            justifyContent: 'flex-start',
            textAlign: 'left',
            fontWeight: 'normal',
            width: '100%',
            color: value ? (isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))') : (isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))'),
            borderColor: isDark ? 'hsl(var(--border))' : 'hsl(var(--border))',
            backgroundColor: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
            '&:hover': {
              borderColor: isDark ? 'hsl(var(--border))' : 'hsl(var(--border))',
              backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
            },
          }}
        >
          {value ? format(value, 'PPP') : placeholder}
        </MuiButton>
      </Box>
    </ThemeProvider>
  );
};

// Popover calendar component
interface DarkThemeCalendarPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  value?: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

export const DarkThemeCalendarPopover: React.FC<DarkThemeCalendarPopoverProps> = ({
  open,
  anchorEl,
  onClose,
  value,
  onChange,
  minDate,
  maxDate,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const muiTheme = createCalendarTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={onClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <DatePicker
            value={value}
            onChange={onChange}
            minDate={minDate}
            maxDate={maxDate}
            renderInput={() => <div />}
            open={true}
            onAccept={onClose}
          />
        </Popover>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

// Export the theme creator for use in other components
export { createCalendarTheme }; 