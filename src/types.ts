export type RecordType = 'apply' | 'reject' | 'interview2' | 'final';

export interface JobRecord {
  id: string;
  type: RecordType;
  company: string;
  jobTitle: string;
  notes: string;
  timestamp: number;
}

export interface AppSettings {
  autoClear: boolean;
  dailyGoal: number;
}

export interface DashboardStats {
  totalApplies: number;
  totalRejects: number;
  totalInterviews2: number;
  totalFinals: number;
  todayApplies: number;
  weekApplies: number;
  monthApplies: number;
  rejectRate: string;
}
