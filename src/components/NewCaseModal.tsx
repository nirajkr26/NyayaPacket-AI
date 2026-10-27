import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { X, FolderPlus } from 'lucide-react';

interface NewCaseModalProps {
  isOpen: boolean;
  initialCategory?: Category;
  onClose: () => void;
  onCreateCase: (data: { title: string; category: Category }) => void;
}

const CATEGORIES: Category[] = [
  'Unpaid Wages',
  'Tenant-Landlord',
  'Consumer Complaint',
];

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  initialCategory = 'Unpaid Wages',
  onClose,
  onCreateCase,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(initialCategory);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory(initialCategory);
      setError('');
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a short description or title for your case.');
      return;
    }
    onCreateCase({
      title: title.trim(),
      category,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
                Start a new case
              </h3>
              <p className="text-xs text-slate-500">
                NyayaPacket AI will help you assemble information for your lawyer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="case-category" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Case Category
            </label>
            <select
              id="case-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="case-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Case Title
            </label>
            <input
              id="case-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. 3 months salary withheld by XYZ Logistics"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-200">
            <span className="font-semibold text-slate-700">Next step: </span>
            You'll answer a guided questionnaire, upload evidence documents, and review the draft summary.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Create case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
