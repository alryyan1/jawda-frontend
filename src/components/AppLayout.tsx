import React, { useState, useEffect } from "react";
import {
  Outlet,
  Link,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Your AuthContext
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
import {
  Menu,
  Home,
  Users,
  Stethoscope,
  CalendarDays,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Languages,
  FileBarChart2, // For language icon
} from "lucide-react"; // Common icons
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner"; // Using sonner for toasts

// Define navigation items structure
interface NavItem {
  to: string;
  labelKey: string; // Will be used as t(`navigation:${labelKey}`)
  icon: React.ElementType;
  children?: NavItem[]; // For nested navigation if needed in the future
}

// Define your navigation structure
const mainNavItems: NavItem[] = [
  { to: "/", labelKey: "dashboard", icon: Home },
  { to: "/clinic", labelKey: "clinic", icon: Stethoscope },
  { to: "/doctors", labelKey: "doctors", icon: Users },
  { to: "/services", labelKey: "services", icon: Users },
  { to: "/users", labelKey: "users", icon: Users },
  { to: "/roles", labelKey: "roles", icon: Users },
  { to: "/companies", labelKey: "companies", icon: Users },
  { to: "/appointments", labelKey: "appointments", icon: CalendarDays },
  { to: "/patients", labelKey: "patients", icon: Users },
  { to: "/schedules-appointments", labelKey: "schedules-appointments", icon: CalendarDays },
  { to: "/reports", labelKey: "reports", icon: FileBarChart2 },
  { to: "reports/service-statistics", labelKey: "service-statistics", icon: FileBarChart2 },
];

const bottomNavItems: NavItem[] = [
  { to: "/settings", labelKey: "settings", icon: Settings },
];

// Theme Toggle Hook (Example, you can move this to a separate file)
const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) return storedTheme as "light" | "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
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
  const location = useLocation(); // To get current path for active link styling
  const { t, i18n } = useTranslation(["navigation", "userMenu", "common"]); // Load necessary namespaces
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(" ");
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

  const NavLinkItem: React.FC<{ item: NavItem; onClick?: () => void }> = ({
    item,
    onClick,
  }) => (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors
         ${
           isActive
             ? "bg-primary text-primary-foreground shadow-sm"
             : "text-foreground/70 hover:bg-muted hover:text-foreground"
         }`
      }
      end // `end` prop is important for '/' to not match every route
    >
      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
      {t(`navigation:${item.labelKey}`)}
    </NavLink>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <nav className="flex-grow space-y-1 p-3">
        {mainNavItems.map((item) => (
          <NavLinkItem
            key={item.to}
            item={item}
            onClick={() => setMobileNavOpen(false)}
          />
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        {bottomNavItems.map((item) => (
          <NavLinkItem
            key={item.to}
            item={item}
            onClick={() => setMobileNavOpen(false)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="flex items-center flex-shrink-0 h-16 px-4 border-b border-border">
          <Link to="/" className="text-xl font-bold text-primary">
            {t("common:appName", "MedSys")}{" "}
            {/* Assuming appName is in common.json */}
          </Link>
        </div>
        <SidebarContent />
      </aside>
      {/* Mobile Sidebar (Sheet) - Trigger is in the header, content is here */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side={i18n.dir() === "rtl" ? "right" : "left"} // Correctly uses i18n.dir()
          className="w-60 p-0 bg-card border-border md:hidden" // Removed border-r, SheetContent styles itself
        >
          <SheetHeader className="h-16 px-4 border-b border-border flex flex-row items-center">
            <SheetTitle>
              <Link
                to="/"
                onClick={() => setMobileNavOpen(false)}
                className="text-xl font-bold text-primary"
              >
                {t("common:appName", "MedSys")}
              </Link>
            </SheetTitle>
            {/* REMOVE SheetTrigger from here */}
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <div
        className={`flex flex-col flex-1 ${
          i18n.dir() === "rtl" ? "md:mr-60" : "md:ml-60"
        }`}
      >
        {" "}
        {/* Adjust margin to match sidebar width and direction */}
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          {/* Header Title or Breadcrumbs (Optional) */}
          <div className="flex-1 text-lg font-semibold hidden md:block">
            {/* You could dynamically set this based on current route */}
            {/* Example: t(`navigation:${mainNavItems.find(item => location.pathname.startsWith(item.to))?.labelKey || 'dashboard'}`) */}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Languages className="h-5 w-5" />
                  {i18n.language.toUpperCase()}
                  <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => changeLanguage("en")}
                  disabled={i18n.language === "en"}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => changeLanguage("ar")}
                  disabled={i18n.language === "ar"}
                >
                  العربية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.avatar_url /* Placeholder for user avatar */}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.username} {/* Or user?.email */}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="w-full flex items-center">
                    <Users className="mr-2 h-4 w-4" /> {t("userMenu:profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4" />{" "}
                    {t("userMenu:settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("navigation:logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Add a container here if you want max-width and centering for content */}
          {/* <div className="max-w-7xl mx-auto"> */}
          <Outlet /> {/* Child routes render here */}
          {/* </div> */}
        </main>
      </div>
      <Toaster richColors position="top-right" /> {/* Sonner Toaster */}
    </div>
  );
};

export default AppLayout;
