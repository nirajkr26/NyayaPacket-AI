import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
  notificationCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  onOpenMobileMenu,
  notificationCount = 2,
}) => {
  const { user } = useAuth();
  const initial = user?.name ? user.name[0].toUpperCase() : 'A';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg lg:hidden focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Input Box */}
        <div className="relative hidden md:block w-64 lg:w-80">
          <label htmlFor="global-search" className="sr-only">
            Search cases, evidence, or documents
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="global-search"
            type="search"
            placeholder="Search cases, files, dates..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Notifications Bell */}
        <button
          type="button"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
          aria-label={`Notifications, ${notificationCount} unread`}
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div
            className="w-8 h-8 rounded-full bg-teal-600 text-white font-medium text-xs flex items-center justify-center shadow-xs"
            aria-label={`User profile ${user?.name || 'Aarav'}`}
            title={user?.name || 'Aarav Sharma'}
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
};
