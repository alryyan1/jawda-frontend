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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Menu,
  Home,
  Users,
  Stethoscope,
  Settings,
  LogOut,
  Sun,
  Moon,
  FileBarChart2,
  ShieldCheck,
  CalendarClock,
  BriefcaseMedical,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  ClipboardEditIcon,
  Syringe,
  Microscope,
  Banknote,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Toaster } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSidebarCollapsedState, setSidebarCollapsedState } from '../lib/sidebar-store';
import { getCurrentOpenShift } from "@/services/shiftService";
import realtimeService from "@/services/realtimeService";

// Define navigation items structure
export interface NavItem {
  to: string;
  label: string; // Direct Arabic text
  icon: React.ElementType;
  permission?: string; // Optional: permission string from your PermissionName type
  children?: NavItem[]; 
}

// Main Navigation Items
const mainNavItems: NavItem[] = [
  { to: '/', label: 'لوحة التحكم', icon: Home, permission: 'view dashboard' },
  { to: '/clinic', label: 'العيادة', icon: BriefcaseMedical, permission: 'access clinic_workspace' },
  { to: '/lab-reception', label: 'استقبال المختبر', icon: Microscope, permission: 'access lab_reception' },
  { to: '/lab-sample-collection', label: 'جمع العينات', icon: Syringe, permission: 'access lab_sample_collection' },
  { to: '/lab-workstation', label: 'نتائج المختبر', icon: FlaskConical, permission: 'access lab_workstation' },
  { to: '/attendance/sheet', label: 'سجل الحضور', icon: ClipboardEditIcon, permission: 'record_attendance' },
  { to: '/patients', label: 'المرضى', icon: Users, permission: 'list patients' },
  { to: '/doctors', label: 'الأطباء', icon: Stethoscope, permission: 'list doctors' },
  { to: '/analysis', label: 'التحليل', icon: FileBarChart2, permission: 'view analysis' },
  { to: '/schedules-appointments', label: 'المواعيد والجداول', icon: CalendarClock, permission: 'view doctor_schedules' },
  { to: '/cash-reconciliation', label: 'التسوية النقدية', icon: Banknote, permission: 'access cash_reconciliation' },

  // { to: '/bulk-whatsapp', label: 'الواتساب الجماعي', icon: MessageCircle, permission: 'send bulk whatsapp' },
];

// Utility/Admin Navigation Items (typically at the bottom or in a separate group)
const utilityNavItems: NavItem[] = [
  { to: '/reports/doctor-shifts', label: 'التقارير', icon: FileBarChart2, permission: 'view reports_section' },
  { to: '/users', label: 'المستخدمون', icon: Users, permission: 'list users' },
  { to: '/roles', label: 'الأدوار', icon: ShieldCheck, permission: 'list roles' },
  { to: '/settings/general', label: 'الإعدادات', icon: Settings, permission: 'view settings' },
  { to: '/specialists', label: 'الأخصائيون', icon: Users, permission: 'list specialists' },
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
  const { theme, toggleTheme } = useTheme();

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(getSidebarCollapsedState());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Current general shift status for app-wide indicator
  const { data: currentOpenShift } = useQuery({
    queryKey: ['currentOpenShift'],
    queryFn: getCurrentOpenShift,
    refetchInterval: 30000,
  });

  // Monitor realtime connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsRealtimeConnected(realtimeService.getConnectionStatus());
    };

    // Check initial status
    checkConnection();

    // Check periodically
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, []);

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


  

  interface NavLinkItemProps {
    item: NavItem;
    isCollapsed: boolean;
    onClick?: () => void;
  }

  const NavLinkItem: React.FC<NavLinkItemProps> = ({ item, isCollapsed, onClick }) => {
    if (!can(item.permission)) return null;

    const linkContent = (
      <>
        <item.icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "ml-3")} />
        {!isCollapsed && <span>{item.label}</span>}
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
            <TooltipContent side="left" sideOffset={5}>
              <p>{item.label}</p>
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
        <nav style={{direction: 'rtl'}} className="space-y-1 p-2">
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
  
  const CollapseIcon = ChevronsRight;
  const ExpandIcon = ChevronsLeft;

  return (
    <TooltipProvider delayDuration={100}>
      <div  style={{direction: 'rtl'}}  className="flex  h-screen bg-muted/30 dark:bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside  style={{direction: 'rtl'}}
            className={cn(
                "hidden md:flex flex-col fixed inset-y-0 border-border bg-card transition-all duration-300 ease-in-out z-40", // Added z-40
                isDesktopSidebarCollapsed ? "w-16" : "w-60",
                "border-l"
            )}
        >
          <div className={cn(
              "flex items-center flex-shrink-0 h-16 px-4 border-b border-border",
              isDesktopSidebarCollapsed && "justify-center px-2"
            )}
          >
            <Link to="/" className={cn("flex items-center gap-2 font-bold text-primary truncate", isDesktopSidebarCollapsed ? "text-xl" : "text-lg")}>
              <img src="/logo.png" alt="شعار النظام" className={cn("rounded-md", isDesktopSidebarCollapsed ? "h-8 w-8" : "h-7 w-7")} />
              {!isDesktopSidebarCollapsed && <span>نظام جودة الطبي</span>}
            </Link>
          </div>
          <SidebarContent />
          <div className="p-2 border-t border-border mt-auto">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleDesktopSidebar} className="w-full h-10">
                    {isDesktopSidebarCollapsed ? <ExpandIcon className="h-5 w-5" /> : <CollapseIcon className="h-5 w-5" />}
                    <span className="sr-only">{isDesktopSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={5}>
                    <p>{isDesktopSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}</p>
                </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild className="md:hidden ml-2">
                <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent 
                side="right" 
                className="w-60 p-0 bg-card border-border md:hidden"
            >
                <SheetHeader className="h-16 px-4 border-b border-border flex flex-row items-center justify-between">
                    <SheetTitle>
                        <Link to="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2 text-lg font-bold text-primary">
                            <img src="/logo.png" alt="شعار النظام" className="h-7 w-7 rounded-md" />
                            <span>نظام جودة الطبي</span>
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
                isDesktopSidebarCollapsed ? "md:mr-16" : "md:mr-60"
            )}
        >
            {/* Header */}
            <header className={cn(
                "sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card",
                "px-4 sm:px-6 lg:px-8"
            )}>
                <div className="flex items-center">
                    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                        <SheetTrigger asChild className="md:hidden ml-2">
                            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
                        </SheetTrigger>
                    </Sheet>
                    <div className="flex-1 text-lg font-semibold hidden md:block truncate px-4">
                        {/* Placeholder for dynamic page title based on location.pathname */}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Shift Status Indicator */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-3 w-3 rounded-full" aria-label="shift-status">
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          currentOpenShift ? "bg-green-500" : "bg-red-500"
                        )} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{currentOpenShift ? 'الوردية مفتوحة' : 'لا توجد وردية مفتوحة'}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Realtime Connection Status */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center" aria-label="realtime-status">
                        {isRealtimeConnected ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isRealtimeConnected ? 'متصل بالخادم المباشر' : 'غير متصل بالخادم المباشر'}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Theme Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="تبديل المظهر">
                            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{theme === 'light' ? 'التبديل إلى الوضع المظلم' : 'التبديل إلى الوضع المضيء'}</p></TooltipContent>
                  </Tooltip>


                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 px-3 rounded-md max-w-[220px] truncate">
                        {user?.username || user?.name || "User"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.username}</p>
                      </DropdownMenuLabel>
              
               
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild disabled={!can('view profile')}>
                        <Link to="/profile" className="w-full flex items-center"><Users className="mr-2 h-4 w-4" /> الملف الشخصي</Link>
                      </DropdownMenuItem>
               
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>تسجيل الخروج</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </header>

            <main style={{userSelect: 'none'}} className="flex-1 p-1 overflow-hidden">
                <Outlet />
            </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;