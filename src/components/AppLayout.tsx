import React, { useState, useEffect } from "react";
import {
  Outlet,
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Menu,
  Home,
  Users,
  Stethoscope,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Languages,
  FileBarChart2,
  ShieldCheck,
  CalendarClock,
  BriefcaseMedical,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSidebarCollapsedState, setSidebarCollapsedState } from '../lib/sidebar-store';

// Define navigation items structure
export interface NavItem {
  to: string;
  labelKey: string; // e.g., 'dashboard', 'clinic'
  icon: React.ElementType;
  permission?: string; // Optional: permission string from your PermissionName type
  children?: NavItem[]; 
}

// Main Navigation Items
const mainNavItems: NavItem[] = [
  { to: '/', labelKey: 'dashboard', icon: Home, permission: 'view dashboard' },
  { to: '/clinic', labelKey: 'clinic', icon: BriefcaseMedical, permission: 'access clinic_workspace' },
  { to: '/lab-workstation', labelKey: 'labWorkstation', icon: FlaskConical, permission: 'access lab_workstation' },
  { to: '/schedules-appointments', labelKey: 'schedulesAppointments', icon: CalendarClock, permission: 'view doctor_schedules' }, // Or 'manage appointments'
  { to: '/patients', labelKey: 'patients', icon: Users, permission: 'list patients' },
  { to: '/doctors', labelKey: 'doctors', icon: Stethoscope, permission: 'list doctors' },
  { to: '/analysis', labelKey: 'analysis', icon: FileBarChart2, permission: 'view analysis' },
  { to: '/bulk-whatsapp', labelKey: 'bulkWhatsApp', icon: MessageCircle, permission: 'send bulk whatsapp' },
];

// Utility/Admin Navigation Items (typically at the bottom or in a separate group)
const utilityNavItems: NavItem[] = [
  { to: '/reports/doctor-shifts', labelKey: 'reports', icon: FileBarChart2, permission: 'view reports_section' },
  { to: '/users', labelKey: 'users', icon: Users, permission: 'list users' },
  { to: '/roles', labelKey: 'roles', icon: ShieldCheck, permission: 'list roles' },
  { to: '/settings/general', labelKey: 'settings', icon: Settings, permission: 'view settings' }, // Points to the default general settings page
];


// Theme Toggle Hook (ensure this is defined, possibly in a separate utils/hooks file)
const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === 'undefined') return 'light'; // Default for SSR or non-browser
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) return storedTheme as "light" | "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return { theme, toggleTheme };
};


const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Ensure all namespaces used by t() are loaded, especially `navigation` and `common`
  const { t, i18n } = useTranslation(['navigation', 'userMenu', 'common', 'reports', 'labTests', 'settings']); 
  const { theme, toggleTheme } = useTheme();

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(getSidebarCollapsedState());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Placeholder for actual permission checking from useAuthorization hook
  const can = (permission?: string): boolean => {
    if (!permission) return true; // If no specific permission is required, item is visible
    // const { can: checkPermission } = useAuthorization(); // This would be the actual hook
    // return checkPermission(permission as PermissionName);
    // For now, for layout purposes, we'll assume all are visible
    return true; 
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev: boolean) => {
      const newState = !prev;
      setSidebarCollapsedState(newState);
      return newState;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    // Optionally, store language preference in localStorage
    // localStorage.setItem('i18nextLng', lang);
  };

  const getInitials = (name?: string | null) => {
    if (!name?.trim()) return "U";
    const names = name.trim().split(" ");
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    if (names[0]) {
      return names[0][0].toUpperCase();
    }
    return "U";
  };

  interface NavLinkItemProps {
    item: NavItem;
    isCollapsed: boolean;
    onClick?: () => void;
  }

  const NavLinkItem: React.FC<NavLinkItemProps> = ({ item, isCollapsed, onClick }) => {
    if (!can(item.permission)) return null;

    const linkContent = (
      <>
        <item.icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && (i18n.dir() === 'rtl' ? "ml-3" : "mr-3"))} />
        {!isCollapsed && <span>{t(item.labelKey, { ns: 'navigation' })}</span>}
      </>
    );

    return (
      <NavLink
        to={item.to}
        onClick={onClick}
        className={({ isActive }) =>
          cn(
            "flex items-center rounded-md text-sm font-medium transition-colors h-10",
            isCollapsed ? "justify-center px-2" : "px-3 py-2.5",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "text-foreground/70 hover:bg-muted hover:text-foreground"
          )
        }
        end={item.to === '/'} // `end` prop for exact match, esp. for home '/'
      >
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-full h-full">
                {linkContent}
              </div>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
              <p>{t(item.labelKey, { ns: 'navigation' })}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          linkContent
        )}
      </NavLink>
    );
  };

  const SidebarContent: React.FC<{isMobile?: boolean}> = ({ isMobile = false }) => (
    <div  className="flex flex-col h-full">
      <ScrollArea className="flex-grow"> {/* Added ScrollArea for long lists */}
        <nav style={{direction: isRTL ? 'rtl' : 'ltr'}} className="space-y-1 p-2">
          {mainNavItems.map((item) => (
            <NavLinkItem key={item.to} item={item} isCollapsed={!isMobile && isDesktopSidebarCollapsed} onClick={() => isMobile && setMobileNavOpen(false)} />
          ))}
        </nav>
      </ScrollArea>
      <div className="mt-auto p-2 space-y-1 border-t border-border">
        {utilityNavItems.map((item) => (
           <NavLinkItem key={item.to} item={item} isCollapsed={!isMobile && isDesktopSidebarCollapsed} onClick={() => isMobile && setMobileNavOpen(false)} />
        ))}
      </div>
    </div>
  );
  
  const isRTL = i18n.dir() === 'rtl';
  const CollapseIcon = isRTL ? ChevronsRight : ChevronsLeft;
  const ExpandIcon = isRTL ? ChevronsLeft : ChevronsRight ;

  return (
    <TooltipProvider delayDuration={100}>
      <div  style={{direction: isRTL ? 'rtl' : 'ltr'}}  className="flex  h-screen bg-muted/30 dark:bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside  style={{direction: isRTL ? 'rtl' : 'ltr'}}
            className={cn(
                "hidden md:flex flex-col fixed inset-y-0 border-border bg-card transition-all duration-300 ease-in-out z-40", // Added z-40
                isDesktopSidebarCollapsed ? "w-16" : "w-60",
                isRTL ? "border-l" : "border-r"
            )}
        >
          <div className={cn(
              "flex items-center flex-shrink-0 h-16 px-4 border-b border-border",
              isDesktopSidebarCollapsed && "justify-center px-2"
            )}
          >
            <Link to="/" className={cn("font-bold text-primary truncate", isDesktopSidebarCollapsed ? "text-xl" : "text-lg")}>
              {isDesktopSidebarCollapsed ? t('appNameShort', { ns: 'common' }) : t("appName", { ns: 'common' })}
            </Link>
          </div>
          <SidebarContent />
          <div className="p-2 border-t border-border mt-auto">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleDesktopSidebar} className="w-full h-10">
                    {isDesktopSidebarCollapsed ? <ExpandIcon className="h-5 w-5" /> : <CollapseIcon className="h-5 w-5" />}
                    <span className="sr-only">{isDesktopSidebarCollapsed ? t('expandSidebar', {ns: 'common'}) : t('collapseSidebar', {ns: 'common'})}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side={isRTL ? 'left' : 'right'} sideOffset={5}>
                    <p>{isDesktopSidebarCollapsed ? t('expandSidebar', {ns: 'common'}) : t('collapseSidebar', {ns: 'common'})}</p>
                </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild className="md:hidden ltr:mr-2 rtl:ml-2">
                <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent 
                side={isRTL ? "right" : "left"} 
                className="w-60 p-0 bg-card border-border md:hidden"
            >
                <SheetHeader className="h-16 px-4 border-b border-border flex flex-row items-center justify-between">
                    <SheetTitle>
                        <Link to="/" onClick={() => setMobileNavOpen(false)} className="text-lg font-bold text-primary">
                            {t("appName", { ns: 'common' })}
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <SidebarContent isMobile={true}/>
            </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div 
            className={cn(
                "flex flex-col flex-1 transition-all duration-300 ease-in-out",
                isDesktopSidebarCollapsed ? (isRTL ? "md:mr-16" : "md:ml-16") : (isRTL ? "md:mr-60" : "md:ml-60")
            )}
        >
            {/* Header */}
            <header className={cn(
                "sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card",
                "px-4 sm:px-6 lg:px-8"
            )}>
                <div className="flex items-center">
                    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                        <SheetTrigger asChild className="md:hidden ltr:mr-2 rtl:ml-2">
                            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
                        </SheetTrigger>
                    </Sheet>
                    <div className="flex-1 text-lg font-semibold hidden md:block truncate px-4">
                        {/* Placeholder for dynamic page title based on location.pathname */}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Theme Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('toggleTheme', {ns: 'common'})}>
                            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t(theme === 'light' ? 'switchToDark' : 'switchToLight', {ns: 'common'})}</p></TooltipContent>
                  </Tooltip>

                  {/* Language Switcher */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
                        <Languages className="h-5 w-5" />
                        <span className="hidden sm:inline">{i18n.language.toUpperCase()}</span>
                        <ChevronDown className="ltr:ml-1 rtl:mr-1 h-4 w-4 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => changeLanguage("en")} disabled={i18n.language === "en"}>English</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => changeLanguage("ar")} disabled={i18n.language === "ar"}>العربية</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={undefined /* user?.avatar_url */} alt={user?.name || "User"} />
                          <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.username}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild disabled={!can('view profile')}>
                        <Link to="/profile" className="w-full flex items-center"><Users className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('profile', {ns: 'userMenu'})}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild disabled={!can('view settings')}>
                        <Link to="/settings/general" className="w-full flex items-center"><Settings className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('settings', {ns: 'userMenu'})}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <LogOut className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                        <span>{t('logout', {ns: 'navigation'})}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </header>

            <main style={{userSelect: 'none'}} className="flex-1 p-1  overflow-y-auto">
                <Outlet />
            </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;