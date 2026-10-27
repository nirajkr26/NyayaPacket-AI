import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Scale, UserPlus, AlertCircle, Briefcase, UserCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState<'citizen' | 'lawyer'>('citizen');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [barCouncilId, setBarCouncilId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        barCouncilId: role === 'lawyer' && barCouncilId.trim() ? barCouncilId.trim() : undefined,
      });

      if (user.role === 'lawyer') {
        navigate('/lawyer', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your information.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <DisclaimerBanner />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-xs mb-3">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Create your NyayaPacket AI account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your role to start organizing cases or conducting consultations.
            </p>
          </div>

          {/* Role selection choice cards */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Select Account Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Citizen Option */}
              <button
                type="button"
                onClick={() => setRole('citizen')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  role === 'citizen'
                    ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  {role === 'citizen' && (
                    <span className="w-2 h-2 rounded-full bg-teal-600" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  I need help organizing a legal issue
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Citizen preparing evidence & case packet
                </p>
              </button>

              {/* Lawyer Option */}
              <button
                type="button"
                onClick={() => setRole('lawyer')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  role === 'lawyer'
                    ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  {role === 'lawyer' && (
                    <span className="w-2 h-2 rounded-full bg-teal-600" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  I'm a lawyer
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Advocate reviewing organized packets
                </p>
              </button>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Password (minimum 8 characters)
              </label>
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Optional Bar Council field for lawyers */}
            {role === 'lawyer' && (
              <div>
                <label
                  htmlFor="register-bar"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  Bar Council Enrollment Number (Optional for Demo)
                </label>
                <input
                  id="register-bar"
                  type="text"
                  value={barCouncilId}
                  onChange={(e) => setBarCouncilId(e.target.value)}
                  placeholder="e.g. MAH/5432/2018"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating account...' : 'Create account'}</span>
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
            >
              Log in
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        Demo project using fictional data only.
      </footer>
    </div>
  );
};
