import { LawyerSharedCase } from '../types';

export const LAWYER_MOCK_CASES: LawyerSharedCase[] = [
  {
    id: 'l-case-1',
    citizenName: 'Aarav Sharma',
    title: 'Salary not paid for 2 months by XYZ Logistics',
    category: 'Unpaid Wages',
    sharedDate: 'Today at 09:30 AM',
    evidenceCount: 5,
    readinessPercentage: 72,
    status: 'Ready for Review',
    packetReady: true,
  },
  {
    id: 'l-case-2',
    citizenName: 'Rajeev Nair',
    title: 'Unlawful security deposit deductions by landlord',
    category: 'Tenant-Landlord',
    sharedDate: 'Yesterday',
    evidenceCount: 6,
    readinessPercentage: 85,
    status: 'Consultation Scheduled',
    packetReady: true,
  },
  {
    id: 'l-case-3',
    citizenName: 'Meera Kulkarni',
    title: 'Defective consumer appliance refund denial',
    category: 'Consumer Complaint',
    sharedDate: '3 days ago',
    evidenceCount: 3,
    readinessPercentage: 95,
    status: 'Action Plan Drafted',
    packetReady: true,
  },
];

export interface ReviewQueueItem {
  id: string;
  citizenName: string;
  caseTitle: string;
  taskTitle: string;
  deadline: string;
  priority: 'high' | 'normal';
}

export const LAWYER_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: 'rq-1',
    citizenName: 'Aarav Sharma',
    caseTitle: 'Salary not paid for 2 months',
    taskTitle: 'Verify termination email & unpaid notice period claim',
    deadline: 'Tomorrow, 5:00 PM',
    priority: 'high',
  },
  {
    id: 'rq-2',
    citizenName: 'Rajeev Nair',
    caseTitle: 'Security deposit dispute',
    taskTitle: 'Inspect landlord move-out photos and claim deductions',
    deadline: 'Oct 29, 2026',
    priority: 'normal',
  },
  {
    id: 'rq-3',
    citizenName: 'Meera Kulkarni',
    caseTitle: 'Defective appliance refund',
    taskTitle: 'Approve draft legal notice before submission to consumer forum',
    deadline: 'Nov 02, 2026',
    priority: 'normal',
  },
];
