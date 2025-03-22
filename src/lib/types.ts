export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  user_id: string;
};

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';

export type Lead = {
  id: string;
  company_name: string;
  email: string;
  employee_count: number | null;
  is_sme: boolean;
  about: string | null;
  industry: string | null;
  ai_readiness: string | null;
  status: LeadStatus;
  lead_source: string | null;
  lead_score: number;
  created_at: string;
  last_contacted: string | null;
  notes: string | null;
};

export type LeadStats = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  averageScore: number;
  byStatus: Record<LeadStatus, number>;
  byIndustry: Record<string, number>;
};

export type LeadScoringSettings = {
  smePoints: number;
  revenueRanges: {
    min: number;
    max: number;
    points: number;
  }[];
  employeeRanges: {
    min: number;
    max: number;
    points: number;
  }[];
  aiReadinessPoints: {
    competent: number;
    ready: number;
    aware: number;
    unaware: number;
  };
  responseTimeMultipliers: {
    within24h: number;
    within48h: number;
    within72h: number;
  };
  qualificationThreshold: number;
};

export type UserSettings = {
  leadScoring: LeadScoringSettings;
  notifications: {
    emailEnabled: boolean;
    scoreAlerts: boolean;
    scoreThreshold: number;
  };
};

export type SettingsContextType = {
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
};