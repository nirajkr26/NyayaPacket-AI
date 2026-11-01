import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Scale,
  FolderLock,
  PlusCircle,
  Users,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Bell,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";

export function CitizenLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "My Cases",
      path: "/dashboard",
      icon: FolderLock,
      exact: true,
    },
    {
      label: "New Case Intake",
      path: "/dashboard/cases/new",
      icon: PlusCircle,
      exact: false,
    },
    {
      label: "Advocate Directory",
      path: "/lawyers",
      icon: Users,
      exact: false,
    },
  ];

  const isActive = (itemPath: string, exact: boolean) => {
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <span className="font-heading text-base">NyayaPacket</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-foreground hover:bg-muted"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand / Logo */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base tracking-tight text-foreground block">
                NyayaPacket
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-accent block">
                Citizen Portal
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 flex-1 space-y-1.5">
          <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Workspace
          </p>
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Privacy & Compliance Badge */}
        <div className="p-4 mx-4 mb-4 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Zero-Trust Shield Active</span>
          </div>
          <p className="text-[10px] leading-relaxed">
            Case records are cryptographically sealed and accessible only via explicit client grants.
          </p>
        </div>

        {/* User Profile Card & Sign Out */}
        <div className="p-4 border-t border-border bg-background/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-primary/20">
              {(user?.fullName || "Citizen")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">{user?.fullName || "Citizen"}</p>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {user?.role || "CITIZEN"}
              </Badge>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">NyayaPacket Platform</span>
            <span>/</span>
            <span className="capitalize">{location.pathname.replace("/dashboard", "Dashboard") || "Overview"}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/dashboard">
              <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/dashboard/cases/new">
              <Button size="sm" variant="default" className="text-xs gap-1.5 h-8">
                <PlusCircle className="w-3.5 h-3.5" /> Start New Case
              </Button>
            </Link>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
