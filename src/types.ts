export type UserRole = 'citizen' | 'lawyer' | 'volunteer' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  barCouncilId?: string;
  isActive: boolean;
  createdAt?: string;
}

export type WorkflowState =
  | 'New Case'
  | 'Interview'
  | 'Evidence'
  | 'AI Draft'
  | 'Verification'
  | 'Ready for Lawyer'
  | 'Consultation Done'
  | 'Action Plan'
  | 'Closed';

export type Category =
  | 'Unpaid Wages'
  | 'Tenant-Landlord'
  | 'Consumer Complaint';

export interface Case {
  id: string;
  title: string;
  category: Category;
  state: WorkflowState;
  readinessPercentage: number;
  itemsToVerifyCount: number;
  evidenceCount: number;
  lastUpdated: string;
  nextStepLabel: string;
  nextStepActionUrl?: string;
}

export type AttentionItemSource = 'ai_draft' | 'citizen_written';
export type AttentionItemType = 'verify' | 'missing_info' | 'missing_document';

export interface AttentionItem {
  id: string;
  caseId: string;
  caseTitle: string;
  title: string;
  description: string;
  source: AttentionItemSource;
  type: AttentionItemType;
  resolved: boolean;
}

export interface ActivityItem {
  id: string;
  caseId: string;
  caseTitle: string;
  description: string;
  timestamp: string;
  type: 'upload' | 'verify' | 'share' | 'expiry_warning';
  expiryWarning?: boolean;
}

export interface StatCardData {
  title: string;
  value: number;
  helperText: string;
  iconName: 'folder-open' | 'check-circle-2' | 'file-text' | 'alert-circle';
}

export interface CategoryCardInfo {
  id: Category;
  name: string;
  description: string;
  iconName: 'briefcase' | 'home' | 'shopping-bag';
}

export interface LawyerSharedCase {
  id: string;
  citizenName: string;
  title: string;
  category: Category;
  sharedDate: string;
  evidenceCount: number;
  readinessPercentage: number;
  status: 'Ready for Review' | 'Consultation Scheduled' | 'Action Plan Drafted';
  packetReady: boolean;
}
