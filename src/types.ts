export type RecordType = 'apply' | 'reject';

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
  todayApplies: number;
  weekApplies: number;
  monthApplies: number;
  rejectRate: string;
}
