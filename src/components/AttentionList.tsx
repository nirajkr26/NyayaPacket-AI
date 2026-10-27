import React from 'react';
import { AttentionItem } from '../types';
import { CheckSquare, Square, Bot, User, AlertCircle, FileQuestion, HelpCircle } from 'lucide-react';

interface AttentionListProps {
  items: AttentionItem[];
  onToggleResolve: (id: string) => void;
}

export const AttentionList: React.FC<AttentionListProps> = ({
  items,
  onToggleResolve,
}) => {
  const unresolvedItems = items.filter((item) => !item.resolved);
  const resolvedCount = items.length - unresolvedItems.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
            Needs your attention
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {unresolvedItems.length} pending
          {resolvedCount > 0 && ` (${resolvedCount} done)`}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          All items verified! Your cases are ready for lawyer consultation.
        </p>
      ) : (
        <ul className="space-y-3 flex-1" aria-label="Items requiring your verification or input">
          {items.map((item) => {
            const isResolved = item.resolved;
            return (
              <li
                key={item.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  isResolved
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleResolve(item.id)}
                    className="mt-0.5 text-slate-400 hover:text-teal-600 focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-0.5"
                    aria-label={`Mark "${item.title}" as ${isResolved ? 'unresolved' : 'resolved'}`}
                  >
                    {isResolved ? (
                      <CheckSquare className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Source chip: AI Draft vs You wrote this */}
                      {item.source === 'ai_draft' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Bot className="w-3 h-3 text-amber-700" />
                          AI draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                          <User className="w-3 h-3 text-blue-700" />
                          You wrote this
                        </span>
                      )}

                      {/* Type tag */}
                      <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                        {item.type === 'verify' && <HelpCircle className="w-3 h-3 text-slate-400" />}
                        {item.type === 'missing_document' && <FileQuestion className="w-3 h-3 text-slate-400" />}
                        {item.type === 'verify'
                          ? 'Verification needed'
                          : item.type === 'missing_document'
                          ? 'Missing document'
                          : 'Missing detail'}
                      </span>
                    </div>

                    <p
                      className={`text-sm font-medium ${
                        isResolved ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                      Case: {item.caseTitle}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
