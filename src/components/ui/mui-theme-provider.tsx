import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';

// index.css defines design tokens as full color functions (e.g. `oklch(...)`),
// not raw component triplets, so they must be used as `var(--x)` directly —
// never wrapped in `hsl(...)`, which produces invalid CSS like `hsl(oklch(...))`.
// MUI's palette also needs concrete rgb/hex values (not var() refs) for colors
// it runs through its own lighten/darken math (primary, secondary, error, etc.),
// so those are resolved via canvas, which can parse any CSS color the browser supports.
let resolveCanvasCtx: CanvasRenderingContext2D | null | undefined;
const resolveCssVar = (name: string, fallback: string): string => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  if (resolveCanvasCtx === undefined) {
    resolveCanvasCtx = document.createElement('canvas').getContext('2d');
  }
  if (!resolveCanvasCtx) return fallback;
  try {
    resolveCanvasCtx.fillStyle = '#000000';
    resolveCanvasCtx.fillStyle = raw;
    return resolveCanvasCtx.fillStyle;
  } catch {
    return fallback;
  }
};

// Create a comprehensive dark theme compatible MUI theme
const createUnifiedMuiTheme = (isDark: boolean) => createTheme({
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: resolveCssVar('--primary', isDark ? '#ebebeb' : '#1a1a1a'),
      contrastText: resolveCssVar('--primary-foreground', isDark ? '#1a1a1a' : '#fafafa'),
    },
    secondary: {
      main: resolveCssVar('--secondary', isDark ? '#444444' : '#f5f5f5'),
      contrastText: resolveCssVar('--secondary-foreground', isDark ? '#fafafa' : '#1a1a1a'),
    },
    background: {
      default: 'var(--background)',
      paper: 'var(--card)',
    },
    text: {
      primary: 'var(--foreground)',
      secondary: 'var(--muted-foreground)',
    },
    error: {
      main: resolveCssVar('--destructive', '#e53e3e'),
    },
    warning: {
      main: resolveCssVar('--warning', '#dd6b20'),
    },
    info: {
      main: resolveCssVar('--info', '#3182ce'),
    },
    success: {
      main: resolveCssVar('--success', '#38a169'),
    },
    divider: 'var(--border)',
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            borderColor: 'var(--border)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--border)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--primary)',
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--destructive)',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'var(--muted-foreground)',
            '&.Mui-focused': {
              color: 'var(--primary)',
            },
            '&.Mui-error': {
              color: 'var(--destructive)',
            },
          },
          '& .MuiFormHelperText-root': {
            color: 'var(--muted-foreground)',
            '&.Mui-error': {
              color: 'var(--destructive)',
            },
          },
          '& .MuiInputBase-input': {
            color: 'var(--foreground)',
            '&::placeholder': {
              color: 'var(--muted-foreground)',
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
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            borderColor: 'var(--border)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--border)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--primary)',
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--destructive)',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'var(--muted-foreground)',
            '&.Mui-focused': {
              color: 'var(--primary)',
            },
            '&.Mui-error': {
              color: 'var(--destructive)',
            },
          },
          '& .MuiFormHelperText-root': {
            color: 'var(--muted-foreground)',
            '&.Mui-error': {
              color: 'var(--destructive)',
            },
          },
          '& .MuiInputBase-input': {
            color: 'var(--foreground)',
            '&::placeholder': {
              color: 'var(--muted-foreground)',
              opacity: 1,
            },
          },
        },
        paper: {
          backgroundColor: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        option: {
          '&:hover': {
            backgroundColor: 'var(--accent)',
          },
          '&[data-focus="true"]': {
            backgroundColor: 'var(--accent)',
          },
          '&[aria-selected="true"]': {
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
          },
        },
        clearIndicator: {
          color: 'var(--muted-foreground)',
          '&:hover': {
            color: 'var(--foreground)',
          },
        },
        popupIndicator: {
          color: 'var(--muted-foreground)',
          '&:hover': {
            color: 'var(--foreground)',
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
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'var(--accent)',
          },
          '&.Mui-selected': {
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
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