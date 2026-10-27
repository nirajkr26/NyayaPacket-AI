import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

export const NotAllowedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const requiredRoles = (location.state as { requiredRoles?: string[] })?.requiredRoles;

  const handleGoHome = () => {
    if (user?.role === 'lawyer') {
      navigate('/lawyer');
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <DisclaimerBanner />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Access Restricted
          </h1>

          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {requiredRoles?.includes('lawyer')
              ? 'This portal is restricted to licensed advocates and legal volunteers.'
              : requiredRoles?.includes('citizen')
              ? 'This section is only available for citizen case owners.'
              : 'You do not have the required permissions to view this resource.'}
          </p>

          {user && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 flex items-center justify-between">
              <span>Logged in as: <strong>{user.name}</strong></span>
              <span className="capitalize px-2 py-0.5 rounded bg-slate-200 font-medium text-slate-800">
                {user.role}
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGoHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-medium rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Home className="w-4 h-4" />
              <span>Go to your dashboard</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        Demo project using fictional data only.
      </footer>
    </div>
  );
};
