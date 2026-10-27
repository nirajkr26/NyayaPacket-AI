import React from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { LAWYER_MOCK_CASES, LAWYER_REVIEW_QUEUE } from '../data/lawyerMock';
import {
  FolderSync,
  ClipboardCheck,
  CalendarCheck,
  AlertCircle,
  FileCheck2,
  Shield,
  ChevronRight,
  Clock,
  Paperclip,
} from 'lucide-react';

export const LawyerDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* 1. Welcome Section */}
      <section aria-label="Lawyer welcome section" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <Shield className="w-3 h-3 text-blue-700" />
              Verified Advocate
            </span>
            {user?.barCouncilId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700">
                {user.barCouncilId}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name || 'Advocate'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Review structured citizen packets, assess verified evidence, and prepare consultation action plans.
          </p>
        </div>
      </section>

      {/* 2. Highlighted Privacy & Trust Banner */}
      <section aria-label="Privacy notice">
        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 text-teal-900 flex items-start gap-3">
          <Shield className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-teal-900">Privacy Notice: </span>
            Lawyers only see cases that a citizen has explicitly shared with them. Case packets are verified by the citizen before sharing.
          </div>
        </div>
      </section>

      {/* 3. Four Small Stat Cards */}
      <section aria-label="Lawyer practice statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Cases shared with me"
            value={LAWYER_MOCK_CASES.length}
            helperText="Citizens who shared files"
            icon={<FolderSync className="w-5 h-5 text-teal-600" />}
            badgeColor="teal"
          />
          <StatCard
            title="Awaiting my review"
            value={2}
            helperText="Packets ready for check"
            icon={<ClipboardCheck className="w-5 h-5 text-amber-600" />}
            badgeColor="amber"
          />
          <StatCard
            title="Consultations this week"
            value={1}
            helperText="Scheduled appointments"
            icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
            badgeColor="blue"
          />
          <StatCard
            title="Open action items"
            value={LAWYER_REVIEW_QUEUE.length}
            helperText="Pending lawyer actions"
            icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
            badgeColor="rose"
          />
        </div>
      </section>

      {/* 4. Two Columns: Shared Cases (Left) & Review Queue (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Shared Cases List */}
        <section aria-label="Shared cases" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Shared cases
              </h3>
              <p className="text-xs text-slate-500">
                Citizen case packets actively shared for legal review.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {LAWYER_MOCK_CASES.length} cases
            </span>
          </div>

          <div className="space-y-3">
            {LAWYER_MOCK_CASES.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                    {item.packetReady && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <FileCheck2 className="w-3 h-3 text-emerald-600" />
                        Packet ready
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Shared {item.sharedDate}
                  </span>
                </div>

                <h4 className="text-base font-semibold text-slate-900 mt-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Citizen client: <strong className="text-slate-800">{item.citizenName}</strong>
                </p>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
                    <span>Citizen Verification</span>
                    <span className="text-teal-700 font-semibold">{item.readinessPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-600 h-1.5 rounded-full"
                      style={{ width: `${item.readinessPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.evidenceCount} verified documents</span>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
                  >
                    <span>Review packet</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right 1 Col: Review Queue */}
        <section aria-label="Review queue" className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Review queue
            </h3>
            <p className="text-xs text-slate-500">
              Tasks and advocate verification checkpoints.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            {LAWYER_REVIEW_QUEUE.map((rq) => (
              <div
                key={rq.id}
                className="pb-4 border-b border-slate-100 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {rq.citizenName}
                  </span>
                  {rq.priority === 'high' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Priority
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                  {rq.taskTitle}
                </p>
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Target: {rq.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
