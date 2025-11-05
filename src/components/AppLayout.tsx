import React, { useMemo, useState, useEffect } from "react";
import {
  Outlet,
  Link,
  NavLink,
  useNavigate,
  useLocation,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Menu,
  Home,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  FileBarChart2,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  Syringe,
  Microscope,
  Wifi,
  WifiOff,
  Pencil,
  Bell,
  BellOff,
  Building,
  ListOrdered,
  CreditCard,
  Layers,
  Link2,
  Stethoscope,
  User,
  ShieldCheck,
  Tag,
  BarChartBig,
  FileSpreadsheet,
  HandCoins,
  LineChart,
  UsersRound,
  CalendarCheck2,
  FileText,
  ClipboardEditIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { ClinicSelectionProvider, useClinicSelection } from "@/contexts/ClinicSelectionContext";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import { searchRecentDoctorVisits, getPatientById } from "@/services/patientService";
import { getActiveDoctorShifts } from "@/services/clinicService";
import type { DoctorShift } from "@/types/doctors";
import queueWorkerService from "@/services/queueWorkerService";
import type { QueueWorkerStatus } from "@/services/queueWorkerService";
import { toast } from "sonner";
import { useAuthorization } from "@/hooks/useAuthorization";

// Define navigation items structure
export interface NavItem {
  to: string;
  label: string; // Direct Arabic text
  icon: React.ElementType;
  children?: NavItem[]; 
}

// Reusable report dropdown item
const ReportMenuItem: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ to, icon: Icon, label }) => (
  <DropdownMenuItem asChild>
    <Link to={to} className="w-full flex items-center">
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Link>
  </DropdownMenuItem>
);

// Reusable settings dropdown item
const SettingsMenuItem: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ to, icon: Icon, label }) => (
  <DropdownMenuItem asChild>
    <Link to={to} className="w-full flex items-center">
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Link>
  </DropdownMenuItem>
);

// Main Navigation Items - All available items
const allMainNavItems: NavItem[] = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: Home },
  { to: '/clinic', label: 'العيادة', icon: Pencil },
  { to: '/lab-reception', label: 'استقبال المختبر', icon: Microscope },
  { to: '/lab-sample-collection', label: 'جمع العينات', icon: Syringe },
  { to: '/lab-workstation', label: 'نتائج المختبر', icon: FlaskConical },
  // { to: '/laboratory/offers', label: 'عروض التحاليل', icon: Package },
  { to: '/attendance/sheet', label: 'سجل الحضور', icon: ClipboardEditIcon },
  { to: '/patients', label: 'المرضى', icon: Users },
  // { to: '/doctors', label: 'الأطباء', icon: Stethoscope },
  // { to: '/analysis', label: 'التحليل', icon: FileBarChart2 },
  // { to: '/schedules-appointments', label: 'المواعيد والجداول', icon: CalendarClock },
  // { to: '/cash-reconciliation', label: 'الفئات', icon: Banknote },
  // { to: '/hl7-parser', label: 'محلل HL7', icon: FileText },
  // { to: '/bankak-gallery', label: 'بنك الصور', icon: Image },

  // { to: '/bulk-whatsapp', label: 'الواتساب الجماعي', icon: MessageCircle },
];
// 'استقبال معمل','ادخال نتائج','استقبال عياده','خزنه موحده','تامين'
const UserType = {
  lab_reception: 'استقبال معمل',
  lab_results: 'ادخال نتائج',
  clinic_reception: 'استقبال عياده',
  cash_reconciliation: 'خزنه موحده',
  insurance: 'تامين',
} as const;

type UserType = typeof UserType[keyof typeof UserType];
// Visual style mapping for each user type (border/text/background colors)
const userTypeStyles: Record<UserType, { border: string; text: string; bg: string }> = {
  [UserType.lab_reception]: {
    border: 'border-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  [UserType.lab_results]: {
    border: 'border-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  [UserType.clinic_reception]: {
    border: 'border-amber-500',
    text: 'text-amber-800',
    bg: 'bg-amber-50',
  },
  [UserType.cash_reconciliation]: {
    border: 'border-purple-500',
    text: 'text-purple-700',
    bg: 'bg-purple-50',
  },
  [UserType.insurance]: {
    border: 'border-rose-500',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
  },
};
// Function to get navigation items based on user type
const getMainNavItems = (userType?: UserType): NavItem[] => {
  // If user type is 'استقبال معمل', show only specific items
  if (userType === UserType.lab_reception) {
    return allMainNavItems.filter(item => 
      item.to === '/dashboard' || 
      item.to === '/lab-reception' || 
      item.to === '/lab-sample-collection' ||
      item.to === '/cash-reconciliation'
    );
  }
  if (userType === UserType.lab_results) {
    return allMainNavItems.filter(item => 
      item.to === '/dashboard' || 
      item.to === '/lab-workstation' || 
      item.to === '/lab-sample-collection'
    );
  }
  if (userType === UserType.clinic_reception) {
    return allMainNavItems.filter(item => 
      item.to === '/dashboard' || 
      item.to === '/clinic' ||
      item.to === '/cash-reconciliation'

    );
  }
  if (userType === UserType.cash_reconciliation) {
    return allMainNavItems.filter(item => 
      item.to === '/dashboard' || 
      item.to === '/clinic' ||
      item.to === '/cash-reconciliation'
    );
  }
  if (userType === UserType.insurance) {
    return allMainNavItems.filter(item => 
      item.to === '/dashboard' || 
      item.to === '/clinic' ||
      item.to === '/cash-reconciliation'||
      item.to === '/lab-reception' ||
      item.to === '/lab-sample-collection'
    );
  }
  
  // For all other user types, show all items
  return allMainNavItems;
};

// Function to get utility navigation items based on user type
const getUtilityNavItems = (userType?: UserType): NavItem[] => {
  // If user has a specific type (not admin), hide all utility items
  if (userType && Object.values(UserType).includes(userType)) {
    return [];
  }
  
  // For admin users (no specific type or other types), show all utility items
  return utilityNavItems;
};

// Utility/Admin Navigation Items (typically at the bottom or in a separate group)
const utilityNavItems: NavItem[] = [
  // Moved to dropdown menu in app bar
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


const AppHeaderSearch: React.FC = () => {
  const location = useLocation();
  const isClinicRoute = useMemo(() => location.pathname.startsWith("/clinic"), [location.pathname]);
  const { currentRequest } = useClinicSelection();

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Array<{ label: string; visit_id: number; patient_id: number; doctor_shift_id?: number | null }>>([]);
  const [open, setOpen] = useState(false);
  const [activeDoctorShifts, setActiveDoctorShifts] = useState<DoctorShift[]>([]);
  const loading = open && inputValue.trim().length >= 2 && options.length === 0;

  // Fetch active doctor shifts when component mounts
  useEffect(() => {
    if (!isClinicRoute) return;
    
    const fetchActiveDoctorShifts = async () => {
      try {
        const shifts = await getActiveDoctorShifts();
        setActiveDoctorShifts(shifts);
      } catch (error) {
        console.error('Failed to fetch active doctor shifts:', error);
      }
    };

    fetchActiveDoctorShifts();
  }, [isClinicRoute]);

  useEffect(() => {
    let active = true;
    const term = inputValue.trim();
    
    // For numeric input (visit ID), search immediately
    // For text input, require minimum 2 characters
    const isNumeric = /^\d+$/.test(term);
    const shouldSearch = isNumeric ? term.length >= 1 : term.length >= 2;
    
    if (!open || !shouldSearch) {
      setOptions([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const results = await searchRecentDoctorVisits(term, 15);
        if (!active) return;
        setOptions(results.map(r => ({ 
          label: r.autocomplete_label || r.patient_name, 
          visit_id: r.visit_id, 
          patient_id: r.patient_id,
          doctor_shift_id: r.doctor_shift_id
        })));
      } catch {
        if (!active) return;
        setOptions([]);
      }
    }, isNumeric ? 100 : 250); // Faster response for numeric search
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue, open]);

  const handleSelect = async (_: unknown, value: { label: string; visit_id: number; patient_id: number; doctor_shift_id?: number | null } | null) => {
    if (!value || !currentRequest) return;
    const patient = await getPatientById(value.patient_id);
    
    // Check if the patient's doctor shift is currently active
    const matchingDoctorShift = value.doctor_shift_id 
      ? activeDoctorShifts.find(shift => shift.id === value.doctor_shift_id)
      : null;
    
    // Pass the doctor shift information along with the patient selection
    currentRequest.onSelect(patient, value.visit_id, matchingDoctorShift || undefined);
    setInputValue("");
    setOptions([]);
  };

  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      event.preventDefault();
      
      // If there are options available, select the first one
      if (options.length > 0) {
        await handleSelect(null, options[0]);
        return;
      }
      
      // If no options but input is numeric (visit ID), try to search directly
      const term = inputValue.trim();
      const isNumeric = /^\d+$/.test(term);
      
      if (isNumeric && currentRequest) {
        try {
          const results = await searchRecentDoctorVisits(term, 1);
          if (results.length > 0) {
            const result = results[0];
            const patient = await getPatientById(result.patient_id);
            
            // Check if the patient's doctor shift is currently active
            const matchingDoctorShift = result.doctor_shift_id 
              ? activeDoctorShifts.find(shift => shift.id === result.doctor_shift_id)
              : null;
            
            currentRequest.onSelect(patient, result.visit_id, matchingDoctorShift || undefined);
            setInputValue("");
            setOptions([]);
          }
        } catch (error) {
          console.error('Error searching by ID:', error);
        }
      }
    }
  };

  if (!isClinicRoute) return null;
  return (
    <div className="hidden md:flex items-center w-[360px] max-w-[45vw]">
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={loading}
        onChange={handleSelect}
        filterOptions={(x) => x}
        getOptionLabel={(o) => o.label}
        noOptionsText="لا توجد نتائج"
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="بحث عن مريض بالاسم أو رقم الزيارة"
            size="small"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{ width: '100%' }}
      />
    </div>
  );
};

const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(getSidebarCollapsedState());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [queueWorkerStatus, setQueueWorkerStatus] = useState<QueueWorkerStatus>({
    is_running: false,
    status: 'stopped'
  });
  const [isQueueWorkerLoading, setIsQueueWorkerLoading] = useState(false);

  // Current general shift status for app-wide indicator
  const { data: currentOpenShift } = useQuery({
    queryKey: ['currentOpenShift'],
    queryFn: getCurrentOpenShift,
    // Removed refetchInterval - fetch only once
  });
 // console.log(currentOpenShift,'currentOpenShift')

  // Queue worker status query with polling
  const { data: queueWorkerData, refetch: refetchQueueWorkerStatus } = useQuery({
    queryKey: ['queueWorkerStatus'],
    queryFn: () => queueWorkerService.getStatus(),
    refetchInterval: 500000, // Poll every 5 seconds
  });

  // Update queue worker status when data changes
  useEffect(() => {
    if (queueWorkerData?.success) {
      setQueueWorkerStatus(queueWorkerData.data);
    }
  }, [queueWorkerData]);

  // Queue worker toggle mutation
  const queueWorkerToggleMutation = useMutation({
    mutationFn: () => queueWorkerService.toggle(),
    onMutate: () => {
      setIsQueueWorkerLoading(true);
    },
    onSuccess: (response) => {
      if (response.success) {
        setQueueWorkerStatus(response.data);
        toast.success(response.data.is_running ? 'تم تشغيل معالج الإشعارات بنجاح' : 'تم إيقاف معالج الإشعارات بنجاح');
      } else {
        toast.error(response.message || 'فشل في تشغيل/إيقاف معالج الإشعارات');
      }
    },
    onError: (error: Error) => {
      toast.error('حدث خطأ أثناء تشغيل/إيقاف معالج الإشعارات');
      console.error('Queue Worker error:', error);
    },
    onSettled: () => {
      setIsQueueWorkerLoading(false);
      refetchQueueWorkerStatus(); // Refresh status after toggle
    }
  });

  const handleQueueWorkerToggle = () => {
    queueWorkerToggleMutation.mutate();
  };
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
    const linkContent = (
      <>
        <item.icon className={cn("h-5 w-5 flex-shrink-0 ", !isCollapsed && "ml-3")} />
        {!isCollapsed && <span className="text-black! font-bold" style={{fontWeight:'bold'}}>{item.label}</span>}
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
              ? "bg-blue-300 text-white!  shadow-sm "
              : "text-foreground/70 "
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

  const SidebarContent: React.FC<{isMobile?: boolean}> = ({ isMobile = false }) => {
    // Get filtered navigation items based on user type
    const filteredMainNavItems = getMainNavItems(user?.user_type as UserType);
    const filteredUtilityNavItems = getUtilityNavItems(user?.user_type as UserType);
    const { can } = useAuthorization();
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 min-h-0"> {/* Changed from flex-grow to flex-1 min-h-0 for proper flex behavior */}
          <nav style={{direction: 'rtl'}} className="space-y-1 p-2">
            {filteredMainNavItems.map((item) => (
              <NavLinkItem key={item.to} item={item} isCollapsed={!isMobile && isDesktopSidebarCollapsed} onClick={() => isMobile && setMobileNavOpen(false)} />
            ))}
          </nav>
        </ScrollArea>
      </div>
    );
  };
  
  const CollapseIcon = ChevronsRight;
  const ExpandIcon = ChevronsLeft;
  const {can} = useAuthorization();
  return (
    <ClinicSelectionProvider>
    <TooltipProvider delayDuration={100}>
      <div  style={{direction: 'rtl'}}  className="flex  h-screen bg-muted/30 dark:bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside  style={{direction: 'rtl'}}
            className={cn(
                "hidden md:flex flex-col fixed inset-y-0 border-border bg-card transition-all duration-300 ease-in-out z-40 h-screen", // Added h-screen for explicit height
                isDesktopSidebarCollapsed ? "w-16" : "w-50",
                "border-l"
            )}
        >
          <div className={cn(
              "flex items-center flex-shrink-0 h-16 px-4 border-b border-border",
              isDesktopSidebarCollapsed && "justify-center px-2"
            )}
          >
            <Link to="/dashboard" className={cn("flex items-center gap-2 font-bold text-primary truncate", isDesktopSidebarCollapsed ? "text-xl" : "text-lg")}>
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
        {/* <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild className="md:hidden ml-2">
                <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent 
                side="right" 
                className="w-60 p-0 bg-card border-border md:hidden h-full"
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
        </Sheet> */}

        {/* Main Content Area */}
        <div 
            className={cn(
                "flex flex-col flex-1 transition-all duration-300 ease-in-out",
                isDesktopSidebarCollapsed ? "md:mr-16" : "md:mr-50"
            )}
        >
            {/* Header */}
            <header className={cn(
                "sticky top-0 z-30 flex h-11 flex-shrink-0 items-center justify-between border-b border-border bg-card",
                "px-1 sm:px-6 lg:px-2"
            )}>
                <div className="flex items-center">
                    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                        <SheetTrigger asChild className="md:hidden ml-2">
                            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
                        </SheetTrigger>
                    </Sheet>
                    <div className="flex-1 text-lg font-semibold hidden md:block truncate px-4" />
                    {/* Desktop sidebar toggle button in navbar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleDesktopSidebar}
                          className="hidden md:inline-flex mr-2"
                          aria-label={isDesktopSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
                        >
                          {isDesktopSidebarCollapsed ? (
                            <ExpandIcon className="h-5 w-5" />
                          ) : (
                            <CollapseIcon className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6}>
                        <p>{isDesktopSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}</p>
                      </TooltipContent>
                    </Tooltip>
                    <AppHeaderSearch />
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Shift Status Indicator */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-3 w-3 rounded-full" aria-label="shift-status">
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          currentOpenShift?.is_closed ==false ? "bg-green-500" : "bg-red-500"
                        )} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{currentOpenShift?.is_closed == false ? 'الوردية مفتوحة' : 'لا توجد وردية مفتوحة'}</p>
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
                      <p>{isRealtimeConnected ? 'التزامن مفعل' : 'التزامن معطل'}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Queue Worker Status */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleQueueWorkerToggle}
                        disabled={isQueueWorkerLoading}
                        className="h-8 w-8"
                        aria-label="queue-worker-status"
                      >
                        {isQueueWorkerLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : queueWorkerStatus.is_running ? (
                          <Bell className={cn("h-4 w-4", "text-green-500")} />
                        ) : (
                          <BellOff className={cn("h-4 w-4", "text-gray-500")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {queueWorkerStatus.is_running 
                          ? `معالج الإشعارات يعمل (PID: ${queueWorkerStatus.pid})` 
                          : 'معالج الإشعارات متوقف'
                        }
                      </p>
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
                      {(() => {
                        const type = (user?.user_type as UserType | undefined);
                        const style = type ? userTypeStyles[type] : undefined;
                        return (
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-9 px-3 rounded-md max-w-[220px] truncate border",
                              style?.border ?? "border-border",
                              style?.text ?? "text-foreground"
                            )}
                          >
                            {user?.username || user?.name || "User"}
                          </Button>
                        );
                      })()}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="p-0">
                        {(() => {
                          const type = (user?.user_type as UserType | undefined);
                          const style = type ? userTypeStyles[type] : undefined;
                          return (
                            <div
                              className={cn(
                                'flex flex-col space-y-1 p-2 rounded-md border',
                                style?.border ?? 'border-gray-300',
                                style?.bg ?? 'bg-accent/30'
                              )}
                            >
                              <p className="text-sm font-medium leading-none">{user?.name}</p>
                              <p className="text-xs leading-none text-muted-foreground">{user?.username}</p>
                              {('user_type' in (user || {})) && (
                                <p className={cn('text-xs leading-none', style?.text ?? 'text-foreground')}>نوع المستخدم: {user?.user_type ?? 'بدون'}</p>
                              )}
                            </div>
                          );
                        })()}
                      </DropdownMenuLabel>
              
               
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="w-full flex items-center"><Users className="mr-2 h-4 w-4" /> الملف الشخصي</Link>
                      </DropdownMenuItem>
                      
                      {/* Reports and Settings for admin users */}
                     
                        <>
                          <DropdownMenuSeparator />
                          
                          {/* Reports Submenu */}
                          {can('عرض التقارير') && <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center">
                              <FileBarChart2 className="mr-2 h-4 w-4" />
                              التقارير
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <ReportMenuItem to="/reports/lab-general" icon={BarChartBig} label="المختبر" />
                              <ReportMenuItem to="/reports/doctor-shifts" icon={FileBarChart2} label="عيادات اليوم" />
                              <ReportMenuItem to="/reports/clinic-shift-summary" icon={FileSpreadsheet} label="التقرير العام" />
                              <ReportMenuItem to="/reports/costs" icon={FileSpreadsheet} label="المصروفات" />
                              <ReportMenuItem to="/reports/monthly-lab-income" icon={BarChartBig} label="دخل المختبر الشهري" />
                              <ReportMenuItem to="/reports/monthly-service-income" icon={BarChartBig} label="دخل الخدمات الشهري" />
                              <ReportMenuItem to="/reports/service-cost-breakdown" icon={BarChartBig} label="تفصيل تكلفة الخدمات" />
                              <ReportMenuItem to="/settings/attendance-summary" icon={BarChartBig} label="ملخص الحضور والانصراف" />
                              <ReportMenuItem to="/reports/company-performance" icon={BarChartBig} label="أداء الشركات" />
                              <ReportMenuItem to="/reports/doctor-company-entitlement" icon={HandCoins} label="استحقاقات الأطباء للشركات" />
                              <ReportMenuItem to="/reports/yearly-income-comparison" icon={LineChart} label="مقارنة الدخل السنوية" />
                              <ReportMenuItem to="/reports/yearly-patient-frequency" icon={UsersRound} label="تردد المرضى" />
                              <ReportMenuItem to="/reports/doctor-statistics" icon={BarChartBig} label="إحصائيات الأطباء" />
                              <ReportMenuItem to="/reports/service-statistics" icon={FileBarChart2} label="إحصائيات الخدمات" />
                              <ReportMenuItem to="/reports/lab-test-statistics" icon={BarChartBig} label="إحصائيات تحاليل المختبر" />
                            </DropdownMenuSubContent>
                         
                          </DropdownMenuSub>}
                          
                          {/* Settings Submenu */}
                          {can('عرض الاعدادات') && <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center">
                              <Settings className="mr-2 h-4 w-4" />
                              الإعدادات
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <SettingsMenuItem to="/settings/general" icon={Settings} label="عام" />
                              <SettingsMenuItem to="/settings/companies" icon={Building} label="الشركات" />
                              <SettingsMenuItem to="/settings/laboratory" icon={FlaskConical} label="المختبر" />
                              <SettingsMenuItem to="/settings/service-groups" icon={Layers} label="مجموعات الخدمات" />
                              <SettingsMenuItem to="/settings/services" icon={ListOrdered} label="إعدادات الخدمات" />
                              <SettingsMenuItem to="/settings/offers" icon={Tag} label="العروض" />
                              <SettingsMenuItem to="/settings/doctors" icon={Stethoscope} label="الأطباء" />
                              <SettingsMenuItem to="/settings/specialists" icon={Users} label="التخصصات الطبية" />
                              <SettingsMenuItem to="/settings/users" icon={User} label="المستخدمون" />
                              <SettingsMenuItem to="/settings/attendance/shift-definitions" icon={BarChartBig} label="الورديات" />
                              <SettingsMenuItem to="/settings/roles" icon={ShieldCheck} label="الأدوار" />
                              <SettingsMenuItem to="/settings/lab-to-lab" icon={Link2} label="المعامل المتعاقدة" />
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>}
                        </>
                    
               
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>تسجيل الخروج</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </header>

            <main style={{userSelect: 'none',overflow:'hidden'}} className="flex-1 p-1 ">
                <Outlet />
            </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </TooltipProvider>
    </ClinicSelectionProvider>
  );
};

export default AppLayout;