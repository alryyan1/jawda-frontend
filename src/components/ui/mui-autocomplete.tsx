import React from 'react';
import { Autocomplete } from '@mui/material';
import type { AutocompleteProps } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';

// Create a dark theme compatible MUI theme for Autocomplete
const createAutocompleteTheme = (isDark: boolean) => createTheme({
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
    MuiAutocomplete: {
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
        paper: {
          backgroundColor: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          border: `1px solid ${isDark ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
          boxShadow: isDark 
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(8px)',
          '& .MuiAutocomplete-listbox': {
            backgroundColor: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
            padding: '8px 0',
          },
        },
        option: {
          backgroundColor: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&[data-focus="true"]': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&[aria-selected="true"]': {
            backgroundColor: isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
            color: isDark ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary-foreground))',
            '&:hover': {
              backgroundColor: isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
            },
          },
        },
        clearIndicator: {
          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
          '&:hover': {
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
        },
        popupIndicator: {
          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
          '&:hover': {
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
        },
        endAdornment: {
          backgroundColor: 'transparent',
        },
        input: {
          backgroundColor: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
        },
      },
    },
  },
});

type DarkThemeAutocompleteProps<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined
> = AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>;

export const DarkThemeAutocomplete = <
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined
>({
  ...props
}: DarkThemeAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const muiTheme = createAutocompleteTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      <Autocomplete
        {...props}
      />
    </ThemeProvider>
  );
};

// Export the theme creator for use in other components
export { createAutocompleteTheme }; 