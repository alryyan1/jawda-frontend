import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';

// Create a dark theme compatible MUI theme
const createMuiTheme = (isDark: boolean) => createTheme({
  typography: {
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
  },
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: 'hsl(var(--primary))',
    },
    secondary: {
      main: 'hsl(var(--secondary))',
    },
    background: {
      default: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
      paper: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
    },
    text: {
      primary: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
      secondary: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
    },
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
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: 'hsl(var(--destructive))',
            },
          },
          '& .MuiInputLabel-root': {
            color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
            '&.Mui-focused': {
              color: 'hsl(var(--primary))',
            },
            '&.Mui-error': {
              color: 'hsl(var(--destructive))',
            },
          },
          '& .MuiFormHelperText-root': {
            color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
            '&.Mui-error': {
              color: 'hsl(var(--destructive))',
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
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          },
        },
        paper: {
          backgroundColor: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          border: `1px solid ${isDark ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
        },
        option: {
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&[data-focus="true"]': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
        },
      },
    },
  },
});

interface DarkThemeTextFieldProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard';
}

export const DarkThemeTextField: React.FC<DarkThemeTextFieldProps> = ({ 
  variant = 'outlined',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const muiTheme = createMuiTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      <TextField
        variant={variant}
        {...props}
      />
    </ThemeProvider>
  );
};

// Export the theme creator for use in other components
export { createMuiTheme }; 