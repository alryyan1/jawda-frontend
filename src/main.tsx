// src/main.tsx
import { Buffer } from 'buffer';
import { Suspense, useMemo, type ReactNode, type JSX } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeModeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: for dev tools
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { preRegisterAllFonts } from './lib/pdfFonts';
import './index.css';
// i18n removed

// Make Buffer available globally for react-pdf
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  
  // Pre-register all PDF fonts on app load to avoid delays
  preRegisterAllFonts().catch((error) => {
    console.warn('Failed to pre-register PDF fonts:', error);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetch storm when focusing the tab - data stays fresh for 1 min
      staleTime: 60 * 1000,
    },
  },
});

// Create RTL emotion cache for MUI
const rtlCache = createCache({ key: 'mui-rtl', stylisPlugins: [prefixer, rtlPlugin] });

// Ensure document is RTL
document.documentElement.setAttribute('dir', 'rtl');

// Builds the MUI theme with a palette mode driven by ThemeModeContext, so
// MUI components (including the standalone doctor-portal route) follow the
// same light/dark toggle as the rest of the app.
const AppMuiThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const { theme: mode } = useThemeMode();

  const theme = useMemo(
    () =>
      createTheme({
        direction: 'rtl',
        palette: { mode },
        typography: {
          fontFamily: "'Tajawal', 'Cairo', sans-serif",
        },
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to prevent double execution in development
  // <React.StrictMode>
    <Suspense  fallback={<div className="flex items-center justify-center min-h-screen">جار التحميل...</div>}>
      <QueryClientProvider client={queryClient}> {/* Wrap */}
        <CacheProvider value={rtlCache}>
          <ThemeModeProvider>
            <AppMuiThemeProvider>
              <AuthProvider>
                <RouterProvider router={router} />
              </AuthProvider>
            </AppMuiThemeProvider>
          </ThemeModeProvider>
        </CacheProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} />  */}
      </QueryClientProvider>
    </Suspense>
  // </React.StrictMode>
);