// src/pages/settings/SettingsLayout.tsx
import React from 'react';
import { Outlet, NavLink, /* useLocation */ } from 'react-router-dom';
import { 
    Settings, Building, FlaskConical, ListOrdered, CreditCard,
    Layers,
    Link2,
    Stethoscope,
    // Users,
    User,
    ShieldCheck,
    Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
// Removed i18n usage
    // import { useAuthorization } from '@/hooks/useAuthorization';

interface SettingsNavItem {
  to: string;
  labelKey: string; // kept for mapping to Arabic labels
  icon: React.ElementType;
  permission?: string;
}

// Updated list of settings navigation items
const settingsNavItems: SettingsNavItem[] = [
  { to: 'general', labelKey: 'tabs.general', icon: Settings, permission: 'view settings' },
  { to: 'companies', labelKey: 'companies', icon: Building, permission: 'manage company_settings' }, // Example permission
  { to: 'laboratory', labelKey: 'laboratory', icon: FlaskConical, permission: 'manage laboratory_settings' },
  { to: 'service-groups', labelKey: 'tabs.serviceGroups', icon: Layers, permission: 'manage service_groups' }, // NEW
  { to: 'services', labelKey: 'tabs.servicesConfig', icon: ListOrdered, permission: 'manage service_settings' },
  //doctors
  { to: 'doctors', labelKey: 'الاطباء', icon: Stethoscope, permission: 'manage doctors' },
  { to: 'specialists', labelKey: 'التخصصات الطبيه', icon: Users, permission: 'manage specialists' },
  //users
  { to: 'users', labelKey: 'المستخدمون', icon: User, permission: 'manage users' },
  //roles
  { to: 'roles', labelKey: 'الأدوار', icon: ShieldCheck, permission: 'manage roles' },
  //specialists
  //patients
  // { to: 'patients', labelKey: 'patients', icon: User, permission: 'manage patients' },
  // { to: '/settings/laboratory/price-list', labelKey: 'laboratoryTestsPriceList', icon: CreditCard, permission: 'manage price_list' },
  // { to: 'insurance-audit', labelKey: 'insuranceAudit', icon: CreditCard, permission: 'manage insurance_audit' },
  { to: 'lab-to-lab', labelKey: 'labToLab', icon: Link2, permission: 'manage laboratory_settings' },
  // Example settingsNavItems update
// { to: 'attendance/shift-definitions', labelKey: 'settings:tabs.shiftDefinitions', icon: ClockIcon, permission: 'manage_shift_definitions' },
// { to: 'attendance/holidays', labelKey: 'settings:tabs.holidays', icon: PartyPopperIcon, permission: 'manage_holidays' },

];

// Function to get Arabic labels for settings navigation
const getSettingsLabel = (labelKey: string): string => {
  const labels: Record<string, string> = {
    'tabs.general': 'عام',
    'companies': 'الشركات',
    'laboratory': 'المختبر',
    'tabs.servicesConfig': 'إعدادات الخدمات',
    'laboratoryTestsPriceList': 'قائمة أسعار التحاليل',
    'insuranceAudit': 'مراجعة التأمين',
    'settings:tabs.shiftDefinitions': 'تعريفات المناوبات',
    'settings:tabs.holidays': 'العطل',
    'tabs.serviceGroups': 'مجموعات الخدمات',
    'labToLab': 'المعامل المتعاقده'
  };
  return labels[labelKey] || labelKey;
};

const SettingsLayout: React.FC = () => {
  // const { can } = useAuthorization(); // Implement actual permission checks

  // Placeholder 'can' function for layout demonstration
  const can = (permission?: string): boolean => {
    if (!permission) return true; // No specific permission required
    // console.log("Checking permission for settings sub-nav:", permission);
    return true; // Default to true for now
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      <aside 
        className={cn(
            "w-full md:w-60 border-border bg-card p-3 md:p-4 overflow-y-auto md:h-full shrink-0 print:hidden",
            "md:border-l"
        )}
      >
        <h2 className="text-lg font-semibold mb-4 px-2 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          الإعدادات
        </h2>
        <nav className="space-y-1">
          {settingsNavItems.map(item => 
            can(item.permission) && (
            <NavLink
              key={item.to}
              to={item.to} 
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )
              }
              end // Important for exact path matching
            >
              <item.icon className="h-4 w-4" />
              {getSettingsLabel(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto md:h-full">
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsLayout;