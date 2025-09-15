// src/main.tsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: for dev tools
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import './index.css';
// i18n removed

const queryClient = new QueryClient(); // Create a client

// Create RTL emotion cache for MUI
const rtlCache = createCache({ key: 'mui-rtl', stylisPlugins: [prefixer, rtlPlugin] });

// Create MUI theme with RTL direction
const theme = createTheme({ direction: 'rtl' });

// Ensure document is RTL
document.documentElement.setAttribute('dir', 'rtl');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense  fallback={<div className="flex items-center justify-center min-h-screen">جار التحميل...</div>}>
      <QueryClientProvider client={queryClient}> {/* Wrap */}
        <CacheProvider value={rtlCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </ThemeProvider>
        </CacheProvider>
        <ReactQueryDevtools initialIsOpen={false} /> 
      </QueryClientProvider>
    </Suspense>
  </React.StrictMode>
);