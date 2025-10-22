// src/pages/settings/SettingsLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';

const SettingsLayout: React.FC = () => {
  return (
    <div className="h-full">
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto h-full">
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsLayout;