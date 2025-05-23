// src/pages/reports/ReportsLayout.tsx
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListCollapse, FileBarChart2 } from 'lucide-react'; // Example icons
import { cn } from '@/lib/utils';

const reportNavItems = [
  { to: '/reports/doctor-shifts', labelKey: 'doctorShiftsReport.titleShort', icon: FileBarChart2 },
  { to: '/reports/service-statistics', labelKey: 'serviceStatisticsReport.titleShort', icon: FileBarChart2 },
  // Add more reports here:
  // { to: '/reports/patient-visits', labelKey: 'patientVisitsReport.titleShort', icon: Users },
  // { to: '/reports/financial-summary', labelKey: 'financialSummaryReport.titleShort', icon: LineChart },
];

const ReportsLayout: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common']);
  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]"> {/* Adjust height based on AppLayout header */}
      <aside 
         className={cn(
             "w-full md:w-56 border-border bg-card p-3 overflow-y-auto md:h-full shrink-0",
             i18n.dir() === 'rtl' ? "md:border-l" : "md:border-r"
         )}
      >
        <h2 className="text-lg font-semibold mb-4 px-2">{t('reports:sidebarTitle', "التقارير")}</h2>
        <nav className="space-y-1">
          {reportNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                  isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey as any, item.labelKey.split('.')[1] || item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto md:h-full">
        <Outlet /> {/* Report content will render here */}
      </main>
    </div>
  );
};
export default ReportsLayout;