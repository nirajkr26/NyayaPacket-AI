import React from 'react';
import { Case } from '../types';
import { WORKFLOW_STEPS } from '../data/mock';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

interface CaseStepperProps {
  currentCase: Case;
  onNextStepClick?: () => void;
}

export const CaseStepper: React.FC<CaseStepperProps> = ({
  currentCase,
  onNextStepClick,
}) => {
  const currentStepIndex = WORKFLOW_STEPS.indexOf(currentCase.state);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
              <Sparkles className="w-3 h-3 text-teal-600" />
              Continue where you left off
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {currentCase.category}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            {currentCase.title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Readiness</p>
            <p className="text-sm sm:text-base font-semibold text-teal-700">
              {currentCase.readinessPercentage}% ready
            </p>
          </div>
          <button
            type="button"
            onClick={onNextStepClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <span>{currentCase.nextStepLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Readiness progress bar */}
      <div className="mt-4">
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${currentCase.readinessPercentage}%` }}
            role="progressbar"
            aria-valuenow={currentCase.readinessPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Case readiness: ${currentCase.readinessPercentage}%`}
          />
        </div>
      </div>

      {/* 9-Step Stepper */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
          Case Workflow Steps
        </p>

        {/* Desktop & Tablet horizontal stepper */}
        <div className="hidden lg:grid lg:grid-cols-9 gap-1 relative">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step} className="flex flex-col items-center text-center relative group">
                {/* Connecting horizontal line */}
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`absolute top-3.5 left-1/2 w-full h-0.5 -z-0 ${
                      idx < currentStepIndex ? 'bg-teal-500' : 'bg-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                )}

                {/* Step circle indicator */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold z-10 transition-colors ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isCurrent
                      ? 'bg-teal-50 text-teal-700 ring-2 ring-teal-600 ring-offset-2'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`mt-2 text-xs leading-snug line-clamp-2 px-1 ${
                    isCurrent
                      ? 'font-semibold text-teal-800'
                      : isCompleted
                      ? 'text-slate-700 font-medium'
                      : 'text-slate-600'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mobile & Tablet scrollable / compact stepper */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step}
                className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                  isCurrent
                    ? 'bg-teal-50 text-teal-800 border-teal-300 ring-1 ring-teal-500'
                    : isCompleted
                    ? 'bg-slate-50 text-slate-700 border-slate-200'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isCurrent
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
