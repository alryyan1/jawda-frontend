// src/pages/reports/ReportsLayout.tsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ListCollapse, FileBarChart2, FileSpreadsheet, BarChartBig, HandCoins, LineChart, UsersRound, Users, CalendarCheck2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// MUI imports
import {
	Box,
	Drawer,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Paper,
	Typography,
} from '@mui/material';

const reportNavItems = [
  { to: '/reports/lab-general', label: 'تقرير المختبر العام', icon: BarChartBig },
  { to: '/reports/doctor-shifts', label: 'مناوبات الأطباء', icon: FileBarChart2 },
  { to: '/reports/service-statistics', label: 'إحصائيات الخدمات', icon: FileBarChart2 },
  { to: '/reports/clinic-shift-summary', label: 'التقرير العام للعيادات', icon: FileSpreadsheet },
  { to: '/reports/costs', label: 'تقرير التكاليف', icon: FileSpreadsheet },
  { to: '/reports/monthly-service-income', label: 'دخل الخدمات الشهري', icon: BarChartBig },
  { to: '/reports/service-cost-breakdown', label: 'تفصيل تكلفة الخدمات', icon: BarChartBig },
  { to: '/reports/doctor-statistics', label: 'إحصائيات الأطباء', icon: BarChartBig },
  { to: '/reports/company-performance', label: 'أداء الشركات', icon: BarChartBig },
  { to: '/reports/doctor-company-entitlement', label: 'استحقاقات الأطباء للشركات', icon: HandCoins },
  { to: '/reports/yearly-income-comparison', label: 'مقارنة الدخل السنوية', icon: LineChart },
  { to: '/reports/yearly-patient-frequency', label: 'تردد المرضى ', icon: UsersRound },
  // { to: '/reports/attendance-summary', label: 'ملخص الحضور الشهري', icon: Users },
  // { to: '/reports/attendance-daily', label: 'تفاصيل الحضور اليومي', icon: CalendarCheck2 },
  // { to: '/reports/attendance-payroll', label: 'رواتب الحضور', icon: FileText },
  { to: '/reports/monthly-lab-income', label: 'دخل المختبر الشهري', icon: BarChartBig },
  { to: '/reports/lab-test-statistics', label: 'إحصائيات تحاليل المختبر', icon: BarChartBig },
];

const ReportsLayout: React.FC = () => {
  return (
    <Box className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      <Paper className={cn('w-full md:w-56 p-3 overflow-y-auto md:h-full shrink-0')} elevation={1}>
        <Typography variant="h6" className="mb-4 px-2" fontWeight={600}>التقارير</Typography>
        <List disablePadding>
          {reportNavItems.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('block rounded-md', isActive && 'bg-primary/10') }>
              {({ isActive }) => (
                <ListItemButton selected={isActive} className="rounded-md">
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <item.icon className="h-4 w-4" />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} primary={item.label} />
                </ListItemButton>
              )}
            </NavLink>
          ))}
        </List>
      </Paper>
      <Box className="flex-1 p-4 sm:p-6 overflow-y-auto md:h-full">
        <Outlet />
      </Box>
    </Box>
  );
};
export default ReportsLayout;