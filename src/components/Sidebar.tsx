import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderLock,
  FileCheck2,
  PackageOpen,
  Share2,
  CheckSquare,
  HelpCircle,
  Files,
  Scale,
  X,
  LogOut,
  FolderSync,
  CalendarCheck,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const citizenNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: 'My Cases', path: '/cases', icon: <FolderLock className="w-4 h-4" /> },
  { name: 'Evidence', path: '/evidence', icon: <Files className="w-4 h-4" /> },
  { name: 'Verify Draft', path: '/verify', icon: <FileCheck2 className="w-4 h-4" /> },
  { name: 'Packets', path: '/packets', icon: <PackageOpen className="w-4 h-4" /> },
  { name: 'Sharing', path: '/sharing', icon: <Share2 className="w-4 h-4" /> },
  { name: 'Action Items', path: '/action-items', icon: <CheckSquare className="w-4 h-4" /> },
  { name: 'Help', path: '/help', icon: <HelpCircle className="w-4 h-4" /> },
];

const lawyerNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/lawyer', icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: 'Shared Cases', path: '/lawyer/shared', icon: <FolderSync className="w-4 h-4" /> },
  { name: 'Consultations', path: '/lawyer/consultations', icon: <CalendarCheck className="w-4 h-4" /> },
  { name: 'Action Items', path: '/lawyer/action-items', icon: <CheckSquare className="w-4 h-4" /> },
  { name: 'Help', path: '/help', icon: <HelpCircle className="w-4 h-4" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = user?.role === 'lawyer' ? lawyerNavItems : citizenNavItems;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'NP';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        <div>
          {/* Logo header */}
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <NavLink
              to={user?.role === 'lawyer' ? '/lawyer' : '/'}
              className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  NyayaPacket <span className="text-teal-600">AI</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {user?.role === 'lawyer' ? 'Advocate Portal' : 'Citizen Portal'}
                </span>
              </div>
            </NavLink>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/' || item.path === '/lawyer'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User profile chip at bottom with Logout */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-semibold flex items-center justify-center text-xs shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.name || 'Aarav Sharma'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] text-slate-500 capitalize">
                    {user?.role || 'Citizen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
