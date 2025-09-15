// src/main.tsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: for dev tools
import './index.css';
import './i18n';

const queryClient = new QueryClient(); // Create a client

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense  fallback={<div className="flex items-center justify-center min-h-screen">جار التحميل...</div>}>
      <QueryClientProvider client={queryClient}> {/* Wrap */}
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} /> 
      </QueryClientProvider>
    </Suspense>
  </React.StrictMode>
);