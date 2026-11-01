import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  BarChart3,
  Award,
  Users,
  FolderLock,
  Activity,
  History,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";

export function AdminLayout() {
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
      label: "Platform KPIs",
      path: "/admin/dashboard",
      icon: BarChart3,
      exact: true,
    },
    {
      label: "Advocate Verification",
      path: "/admin/lawyers",
      icon: Award,
      exact: false,
    },
    {
      label: "User Accounts",
      path: "/admin/users",
      icon: Users,
      exact: false,
    },
    {
      label: "Case Monitoring",
      path: "/admin/cases",
      icon: FolderLock,
      exact: false,
    },
    {
      label: "Queue Engine",
      path: "/admin/queues",
      icon: Activity,
      exact: false,
    },
    {
      label: "System Audit Logs",
      path: "/admin/audit-logs",
      icon: History,
      exact: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <Link to="/admin/dashboard" className="flex items-center gap-2 font-bold text-foreground">
          <div className="w-8 h-8 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base tracking-tight text-foreground block">
                NyayaPacket
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-destructive block">
                Platform Admin
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

        {/* Privacy Guard Notice */}
        <div className="p-3.5 mx-4 mt-4 rounded-xl bg-destructive/10 border border-destructive/20 text-[10px] text-destructive space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Admin Privacy Guard Active</span>
          </div>
          <p className="leading-relaxed opacity-90">
            Admins monitor metadata only. Direct access to citizen evidence & statements is strictly prohibited.
          </p>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 space-y-1.5">
          <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Governance & Audit
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
                    ? "bg-destructive text-destructive-foreground shadow-sm"
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
            <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-destructive/20">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">{user?.fullName || "Administrator"}</p>
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                SYSTEM ADMIN
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
            <span className="font-medium text-foreground">NyayaPacket System Governance</span>
            <span>/</span>
            <span className="capitalize">{location.pathname.replace("/admin/", "") || "Overview"}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Badge variant="destructive" className="text-xs font-bold">
              Root Audit Mode
            </Badge>
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
