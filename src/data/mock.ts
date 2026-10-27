import { Case, AttentionItem, ActivityItem, WorkflowState, CategoryCardInfo } from '../types';

export const WORKFLOW_STEPS: WorkflowState[] = [
  'New Case',
  'Interview',
  'Evidence',
  'AI Draft',
  'Verification',
  'Ready for Lawyer',
  'Consultation Done',
  'Action Plan',
  'Closed',
];

export const INITIAL_CASES: Case[] = [
  {
    id: 'case-1',
    title: 'Salary not paid for 2 months',
    category: 'Unpaid Wages',
    state: 'Verification',
    readinessPercentage: 72,
    itemsToVerifyCount: 6,
    evidenceCount: 5,
    lastUpdated: '2 hours ago',
    nextStepLabel: 'Verify 6 draft items',
    nextStepActionUrl: '/verify',
  },
  {
    id: 'case-2',
    title: 'Security deposit not returned',
    category: 'Tenant-Landlord',
    state: 'Evidence',
    readinessPercentage: 40,
    itemsToVerifyCount: 2,
    evidenceCount: 6,
    lastUpdated: 'Yesterday',
    nextStepLabel: 'Upload lease agreement',
    nextStepActionUrl: '/evidence',
  },
  {
    id: 'case-3',
    title: 'Defective washing machine refund',
    category: 'Consumer Complaint',
    state: 'Ready for Lawyer',
    readinessPercentage: 95,
    itemsToVerifyCount: 0,
    evidenceCount: 3,
    lastUpdated: '3 days ago',
    nextStepLabel: 'Download case packet',
    nextStepActionUrl: '/packets',
  },
];

export const INITIAL_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: 'att-1',
    caseId: 'case-1',
    caseTitle: 'Salary not paid for 2 months',
    title: 'Verify termination date & final notice period',
    description: 'AI extracted 30-day notice period from company email. Please confirm if notice was served.',
    source: 'ai_draft',
    type: 'verify',
    resolved: false,
  },
  {
    id: 'att-2',
    caseId: 'case-1',
    caseTitle: 'Salary not paid for 2 months',
    title: 'Confirm missing bank transaction statement',
    description: 'Provide the bank statement PDF covering August and September showing no credited salary.',
    source: 'citizen_written',
    type: 'missing_document',
    resolved: false,
  },
  {
    id: 'att-3',
    caseId: 'case-2',
    caseTitle: 'Security deposit not returned',
    title: 'Verify landlord move-out inspection notes',
    description: 'Draft summary mentions wear-and-tear deductions claimed by owner. Verify your response.',
    source: 'ai_draft',
    type: 'verify',
    resolved: false,
  },
  {
    id: 'att-4',
    caseId: 'case-2',
    caseTitle: 'Security deposit not returned',
    title: 'Add rental agreement end date',
    description: 'Missing specific date when tenancy handover keys were returned in person.',
    source: 'citizen_written',
    type: 'missing_info',
    resolved: false,
  },
];

export const INITIAL_ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'act-1',
    caseId: 'case-1',
    caseTitle: 'Salary not paid for 2 months',
    description: 'Uploaded salary slip for July 2026 (July_Slip.pdf)',
    timestamp: '2 hours ago',
    type: 'upload',
  },
  {
    id: 'act-2',
    caseId: 'case-1',
    caseTitle: 'Salary not paid for 2 months',
    description: 'Verified key timeline event: "Employment offer accepted on Jan 15"',
    timestamp: '5 hours ago',
    type: 'verify',
  },
  {
    id: 'act-3',
    caseId: 'case-3',
    caseTitle: 'Defective washing machine refund',
    description: 'Shared encrypted case packet with Legal Aid Volunteer (Pooja Rao)',
    timestamp: '1 day ago',
    type: 'share',
  },
  {
    id: 'act-4',
    caseId: 'case-3',
    caseTitle: 'Defective washing machine refund',
    description: 'Secure share link for volunteer expires in 2 days (Oct 28, 2026)',
    timestamp: '1 day ago',
    type: 'expiry_warning',
    expiryWarning: true,
  },
];

export const CATEGORY_TILES: CategoryCardInfo[] = [
  {
    id: 'Unpaid Wages',
    name: 'Unpaid wages',
    description: 'Delayed salary, unpaid overtime, or withheld final settlement from an employer.',
    iconName: 'briefcase',
  },
  {
    id: 'Tenant-Landlord',
    name: 'Tenant-landlord dispute',
    description: 'Unreturned security deposit, eviction notice, or repair dispute with your landlord.',
    iconName: 'home',
  },
  {
    id: 'Consumer Complaint',
    name: 'Consumer complaint',
    description: 'Defective product, denied warranty refund, or deficient service from a business.',
    iconName: 'shopping-bag',
  },
];
