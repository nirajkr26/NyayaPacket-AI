import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FolderOpen,

  CheckCircle2,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  INITIAL_CASES,
  INITIAL_ATTENTION_ITEMS,
  INITIAL_ACTIVITY_ITEMS,
  CATEGORY_TILES,
} from '../data/mock';
import { Case, Category, CategoryCardInfo } from '../types';
import { StatCard } from '../components/StatCard';
import { CaseStepper } from '../components/CaseStepper';
import { CaseCard } from '../components/CaseCard';
import { AttentionList } from '../components/AttentionList';
import { ActivityFeed } from '../components/ActivityFeed';
import { CategoryTile } from '../components/CategoryTile';
import { NewCaseModal } from '../components/NewCaseModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Local state for interactive cases & attention items
  const [cases, setCases] = useState<Case[]>(INITIAL_CASES);
  const [attentionItems, setAttentionItems] = useState(INITIAL_ATTENTION_ITEMS);
  const [activityItems, setActivityItems] = useState(INITIAL_ACTIVITY_ITEMS);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Unpaid Wages');

  // Stats computation
  const activeCasesCount = cases.length;
  const itemsToVerifyCount = attentionItems.filter((i) => !i.resolved).length;
  const totalEvidenceCount = cases.reduce((acc, curr) => acc + curr.evidenceCount, 0);
  const openActionItemsCount = attentionItems.filter((i) => !i.resolved && i.type !== 'verify').length + 2;

  // The most recent case for "Continue where you left off"
  const recentCase = cases[0];

  const handleOpenModal = (category: Category = 'Unpaid Wages') => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCreateCase = ({ title, category }: { title: string; category: Category }) => {
    const newCase: Case = {
      id: `case-${Date.now()}`,
      title,
      category,
      state: 'New Case',
      readinessPercentage: 10,
      itemsToVerifyCount: 1,
      evidenceCount: 0,
      lastUpdated: 'Just now',
      nextStepLabel: 'Start guided interview',
      nextStepActionUrl: '/verify',
    };

    setCases((prev) => [newCase, ...prev]);

    // Add activity record
    setActivityItems((prev) => [
      {
        id: `act-${Date.now()}`,
        caseId: newCase.id,
        caseTitle: newCase.title,
        description: `Created new case: "${newCase.title}"`,
        timestamp: 'Just now',
        type: 'upload',
      },
      ...prev,
    ]);
  };

  const handleToggleResolveAttention = (id: string) => {
    setAttentionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, resolved: !item.resolved } : item
      )
    );
  };

  const handleNextStep = () => {
    if (recentCase?.nextStepActionUrl) {
      navigate(recentCase.nextStepActionUrl);
    }
  };

  const handleOpenCase = (caseId: string) => {
    navigate(`/cases?id=${caseId}`);
  };

  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* 1. Welcome Row */}
      <section
        aria-label="Welcome section"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hello, {user?.name || 'Aarav'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Organize your legal issue, evidence, and timeline before consulting a lawyer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal('Unpaid Wages')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Start a new case</span>
        </button>
      </section>

      {/* 2. Four Small Stat Cards */}
      <section aria-label="Quick statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active cases"
            value={activeCasesCount}
            helperText="Ongoing case packets"
            icon={<FolderOpen className="w-5 h-5 text-teal-600" />}
            badgeColor="teal"
          />
          <StatCard
            title="Items to verify"
            value={itemsToVerifyCount}
            helperText="Needs your review"
            icon={<CheckCircle2 className="w-5 h-5 text-amber-600" />}
            badgeColor="amber"
          />
          <StatCard
            title="Evidence files"
            value={totalEvidenceCount}
            helperText="Uploaded receipts & docs"
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            badgeColor="blue"
          />
          <StatCard
            title="Open action items"
            value={openActionItemsCount}
            helperText="Pending citizen tasks"
            icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
            badgeColor="rose"
          />
        </div>
      </section>

      {/* 3. Continue where you left off */}
      {recentCase && (
        <section aria-label="Continue where you left off">
          <CaseStepper
            currentCase={recentCase}
            onNextStepClick={handleNextStep}
          />
        </section>
      )}

      {/* 4. My Cases */}
      <section aria-label="My cases list">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              My cases
            </h3>
            <p className="text-xs text-slate-500">
              Overview of your active legal packets and verification progress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
          >
            View all ({cases.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <CaseCard key={c.id} caseData={c} onOpen={handleOpenCase} />
          ))}
        </div>
      </section>

      {/* 5. Two Columns: Needs Your Attention (Left) & Recent Activity (Right) */}
      <section aria-label="Attention and activity">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Needs your attention */}
          <AttentionList
            items={attentionItems}
            onToggleResolve={handleToggleResolveAttention}
          />

          {/* Right Column: Recent activity */}
          <ActivityFeed activities={activityItems} />
        </div>
      </section>

      {/* 6. Start a new case section with exactly 3 category tiles */}
      <section aria-label="Start a new case category selection">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Start a new case
          </h3>
          <p className="text-xs text-slate-500">
            Select an issue category to begin organized intake.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORY_TILES.map((cat: CategoryCardInfo) => (
            <CategoryTile
              key={cat.id}
              category={cat}
              onSelect={(item) => handleOpenModal(item.id)}
            />
          ))}
        </div>
      </section>

      {/* Modal for creating a new case */}
      <NewCaseModal
        isOpen={isModalOpen}
        initialCategory={selectedCategory}
        onClose={() => setIsModalOpen(false)}
        onCreateCase={handleCreateCase}
      />
    </div>
  );
};
