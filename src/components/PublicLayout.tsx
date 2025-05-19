// src/components/PublicLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* You could add a very minimal header or footer here if needed for public pages */}
      {/* For example:
      <header className="p-4 bg-slate-100 text-center">
        <h1 className="text-xl font-bold">Medical System</h1>
      </header>
      */}
      <main className="flex-grow">
        <Outlet /> {/* This is where LoginPage or RegisterPage will render */}
      </main>
    </div>
  );
};

export default PublicLayout;