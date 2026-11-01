import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";
import {
  Scale,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  Briefcase,
  ChevronDown,
} from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin/dashboard";
    if (user.role === "LAWYER") return "/lawyer/dashboard";
    return "/citizen/dashboard";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-amber-400 shadow-md group-hover:scale-105 transition-transform dark:from-slate-800 dark:to-slate-900 border border-slate-700/50">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              NyayaPacket <span className="text-amber-500 font-extrabold text-sm uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 ml-0.5">AI</span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase dark:text-slate-400">
              Indian Legal Aid Platform
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <Link
            to="/"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            to="/lawyers"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="h-4 w-4 text-amber-500" />
            Find Advocate
          </Link>
          <a
            href="#features"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            How it Works
          </a>
          <a
            href="#faq"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Action Controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-xl text-slate-600 dark:text-slate-300"
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                    {user.fullName}
                  </p>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                    <p className="text-xs font-semibold">{user.fullName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    to={getDashboardPath()}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {user.role === "ADMIN" ? (
                      <Shield className="h-4 w-4 text-amber-500" />
                    ) : (
                      <User className="h-4 w-4 text-emerald-500" />
                    )}
                    Go to Portal Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="default" size="sm" className="bg-slate-900 text-white font-semibold shadow-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-top-4">
          <div className="space-y-3 pb-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Home
            </Link>
            <Link
              to="/lawyers"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Find Advocate
            </Link>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              How it Works
            </a>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800 space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-2 text-sm font-medium rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  My Portal
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-center py-2 text-sm font-medium text-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full mb-2">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
