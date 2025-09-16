import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';

// Create a comprehensive dark theme compatible MUI theme
const createUnifiedMuiTheme = (isDark: boolean) => createTheme({
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
    error: {
      main: 'hsl(var(--destructive))',
      contrastText: 'hsl(var(--destructive-foreground))',
    },
    warning: {
      main: 'hsl(var(--warning))',
      contrastText: 'hsl(var(--warning-foreground))',
    },
    info: {
      main: 'hsl(var(--info))',
      contrastText: 'hsl(var(--info-foreground))',
    },
    success: {
      main: 'hsl(var(--success))',
      contrastText: 'hsl(var(--success-foreground))',
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
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        option: {
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&[data-focus="true"]': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&[aria-selected="true"]': {
            backgroundColor: isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
            color: isDark ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary-foreground))',
          },
        },
        clearIndicator: {
          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
          '&:hover': {
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          },
        },
        popupIndicator: {
          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
          '&:hover': {
            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          height: '18px',
          minWidth: '18px',
          fontSize: '0.7rem',
          padding: '0 5px',
          fontWeight: '600',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
          color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: isDark ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
            color: isDark ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary-foreground))',
          },
        },
      },
    },
  },
  typography: {
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
  },
  shape: {
    borderRadius: 8,
  },
});

interface MuiThemeProviderProps {
  children: React.ReactNode;
}

export const MuiThemeProvider: React.FC<MuiThemeProviderProps> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const muiTheme = createUnifiedMuiTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      {children}
    </ThemeProvider>
  );
};

// Export the theme creator for use in other components
export { createUnifiedMuiTheme }; 