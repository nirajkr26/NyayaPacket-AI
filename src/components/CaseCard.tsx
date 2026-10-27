import React from 'react';
import { Case, Category, WorkflowState } from '../types';
import { Clock, Paperclip, ChevronRight } from 'lucide-react';

interface CaseCardProps {
  caseData: Case;
  onOpen?: (caseId: string) => void;
}

const categoryColors: Record<Category, string> = {
  'Unpaid Wages': 'bg-blue-50 text-blue-700 border-blue-200',
  'Tenant-Landlord': 'bg-amber-50 text-amber-700 border-amber-200',
  'Consumer Complaint': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const stateColors: Record<WorkflowState, string> = {
  'New Case': 'bg-slate-100 text-slate-700',
  'Interview': 'bg-indigo-50 text-indigo-700',
  'Evidence': 'bg-amber-50 text-amber-700',
  'AI Draft': 'bg-purple-50 text-purple-700',
  'Verification': 'bg-teal-50 text-teal-700',
  'Ready for Lawyer': 'bg-emerald-50 text-emerald-700',
  'Consultation Done': 'bg-blue-50 text-blue-700',
  'Action Plan': 'bg-cyan-50 text-cyan-700',
  'Closed': 'bg-slate-100 text-slate-600',
};

export const CaseCard: React.FC<CaseCardProps> = ({ caseData, onOpen }) => {
  const categoryStyle = categoryColors[caseData.category] || 'bg-slate-50 text-slate-700 border-slate-200';
  const stateStyle = stateColors[caseData.state] || 'bg-slate-100 text-slate-700';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 hover:shadow transition-all flex flex-col justify-between">
      <div>
        {/* Chips row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryStyle}`}>
            {caseData.category}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stateStyle}`}>
            {caseData.state}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 line-clamp-2 leading-snug">
          {caseData.title}
        </h3>

        {/* Readiness Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
            <span>Readiness</span>
            <span className="text-teal-700 font-semibold">{caseData.readinessPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 rounded-full"
              style={{ width: `${caseData.readinessPercentage}%` }}
              role="progressbar"
              aria-valuenow={caseData.readinessPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Case ${caseData.title} readiness`}
            />
          </div>
        </div>
      </div>

      {/* Metadata & Open CTA */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Evidence attached">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            <span>{caseData.evidenceCount} evidence files</span>
          </span>
          <span className="flex items-center gap-1" title="Last updated">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{caseData.lastUpdated}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpen?.(caseData.id)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 border border-teal-200 transition-colors focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label={`Open case: ${caseData.title}`}
        >
          <span>Open</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
