import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  Briefcase,
  Users,
  Calendar,
  Award,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Badge } from "../ui/Badge";
import { NotificationBell } from "../layout/NotificationBell";
import { cn } from "../../lib/utils";

export function LawyerLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch current lawyer profile to determine verification status
  const { data: profile } = useQuery<any>({
    queryKey: ["lawyer-profile-me"],
    queryFn: async () => {
      const res = await api.get("/lawyers/me/profile");
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Advocate Dashboard",
      path: "/lawyer/dashboard",
      icon: Briefcase,
      exact: true,
    },
    {
      label: "Consultation Inbox",
      path: "/lawyer/consultations",
      icon: Calendar,
      exact: false,
    },
    {
      label: "Profile & Bar Council",
      path: "/lawyer/onboarding",
      icon: Award,
      exact: false,
    },
    {
      label: "Public Directory View",
      path: "/lawyers",
      icon: Users,
      exact: false,
    },
  ];

  const verificationStatus = profile?.verificationStatus || "PENDING";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <Link to="/lawyer/dashboard" className="flex items-center gap-2 font-bold text-foreground">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
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
        {/* Brand */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base tracking-tight text-foreground block">
                NyayaPacket
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Advocate Portal
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

        {/* Verification Status Pill */}
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Bar Standing:</span>
            {verificationStatus === "APPROVED" ? (
              <Badge variant="success" className="text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 mr-1" /> Bar Verified
              </Badge>
            ) : verificationStatus === "REJECTED" ? (
              <Badge variant="destructive" className="text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3 mr-1" /> Recheck Needed
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px] font-bold">
                <Clock className="w-3 h-3 mr-1" /> Pending Review
              </Badge>
            )}
          </div>
          {profile?.barCouncilNumber && (
            <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
              Roll: {profile.barCouncilNumber}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 space-y-1.5">
          <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Practice Management
          </p>
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
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

        {/* User Card */}
        <div className="p-4 border-t border-border bg-background/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-emerald-500/20">
              {(user?.fullName || "Advocate")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">{user?.fullName || "Advocate"}</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30">
                ADVOCATE
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
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">NyayaPacket Legal Workspace</span>
            <span>/</span>
            <span className="capitalize">{location.pathname.replace("/lawyer/", "") || "Dashboard"}</span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Privilege Protected Workspace</span>
            </div>
          </div>
        </header>

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
