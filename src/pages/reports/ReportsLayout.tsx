// src/pages/reports/ReportsLayout.tsx
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListCollapse, FileBarChart2, FileSpreadsheet, BarChartBig, HandCoins, LineChart, UsersRound, Users, CalendarCheck2, FileText } from 'lucide-react'; // Example icons
import { cn } from '@/lib/utils';

const reportNavItems = [
  { to: '/reports/doctor-shifts', label: 'مناوبات الأطباء', icon: FileBarChart2 },
  { to: '/reports/service-statistics', label: 'إحصائيات الخدمات', icon: FileBarChart2 },
  { to: '/reports/clinic-shift-summary', label: 'ملخص مناوبة العيادة', icon: FileSpreadsheet },
  { to: '/reports/costs', label: 'تقرير التكاليف', icon: FileSpreadsheet },
  { to: '/reports/monthly-service-income', label: 'دخل الخدمات الشهري', icon: BarChartBig },
  { to: '/reports/service-cost-breakdown', label: 'تفصيل تكلفة الخدمات', icon: BarChartBig },
  { to: '/reports/doctor-statistics', label: 'إحصائيات الأطباء', icon: BarChartBig },
  { to: '/reports/company-performance', label: 'أداء الشركات', icon: BarChartBig },
  { to: '/reports/doctor-company-entitlement', label: 'استحقاقات الأطباء للشركات', icon: HandCoins },
  { to: '/reports/yearly-income-comparison', label: 'مقارنة الدخل السنوية', icon: LineChart },
  { to: '/reports/yearly-patient-frequency', label: 'تكرار المرضى السنوي', icon: UsersRound },
  { to: '/reports/attendance-summary', label: 'ملخص الحضور الشهري', icon: Users, permission: 'view attendance_reports' },
  { to: '/reports/attendance-daily', label: 'تفاصيل الحضور اليومي', icon: CalendarCheck2, permission: 'view attendance_reports' },
  { to: '/reports/attendance-payroll', label: 'رواتب الحضور', icon: FileText, permission: 'view payroll_attendance_report' },
  { to: '/reports/monthly-lab-income', label: 'دخل المختبر الشهري', icon: BarChartBig },
  { to: '/reports/lab-test-statistics', label: 'إحصائيات تحاليل المختبر', icon: BarChartBig },

  // Add more reports here:
  // { to: '/reports/patient-visits', label: 'زيارات المرضى', icon: Users },
  // { to: '/reports/financial-summary', label: 'الملخص المالي', icon: LineChart },
];

const ReportsLayout: React.FC = () => {
  

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]"> {/* Adjust height based on AppLayout header */}
      <aside 
         className={cn(
             "w-full md:w-56 border-border bg-card p-3 overflow-y-auto md:h-full shrink-0",
             "md:border-l"
         )}
      >
        <h2 className="text-lg font-semibold mb-4 px-2">التقارير</h2>
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
              {item.label}
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