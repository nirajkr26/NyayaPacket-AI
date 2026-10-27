import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DisclaimerBanner } from './DisclaimerBanner';

const routeTitleMap: Record<string, string> = {
  '/': 'Citizen Dashboard',
  '/dashboard': 'Citizen Dashboard',
  '/cases': 'My Cases',
  '/evidence': 'Evidence Files',
  '/verify': 'Verify Draft',
  '/packets': 'Case Packets',
  '/sharing': 'Secure Sharing',
  '/action-items': 'Action Items',
  '/help': 'Help & Legal Aid Guide',
  '/lawyer': 'Advocate Dashboard',
  '/lawyer/shared': 'Shared Cases',
  '/lawyer/consultations': 'Consultations',
  '/lawyer/action-items': 'Action Items',
};

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const currentTitle = routeTitleMap[location.pathname] || 'NyayaPacket AI';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for desktop & mobile drawer */}
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Topbar */}
        <Topbar
          pageTitle={currentTitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          notificationCount={2}
        />

        {/* Mandatory Slim Info Banner */}
        <DisclaimerBanner />

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-6 px-6 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>Demo project using fictional data only.</p>
        </footer>
      </div>
    </div>
  );
};
