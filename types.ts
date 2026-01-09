
export type Language = 'EN' | 'FR';

export interface Employee {
  employee_id: string;
  name: string;
  station: string;
  workgroup: string;
  bilingual: boolean;
  skills: string[];
  shifts: string[];
  contact: string;
  sickDaysRemaining: number;
  otHoursThisWeek: number;
  trainings: TrainingRecord[];
}

export interface TrainingRecord {
  course: string;
  date: string;
  time: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  intent?: string;
}

export type Channel = 'SELECT' | 'VOICE' | 'CHAT';

export interface WorkflowStep {
  system: string;
  action: string;
  completed: boolean;
}

export interface HRSystemState {
  employees: Employee[];
}

export interface SessionRecord {
  id: string;
  timestamp: Date;
  summary: string;
  intent: string;
  compliance: string;
  audit: string;
  lang: Language;
}

// New types for three-panel system
export interface ConversationMessage {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface Ticket {
  id: string;
  employeeName: string;
  employeeId: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  timestamp: Date;
  conversationTranscript: ConversationMessage[];
  intent: string;
  summary: string;
  extractedData: any;
  complianceStatus: string;
  auditLog: string;
  reasonBadge: string;
  ruleChecks?: any[];
  systemStatus?: any[];
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userRole: 'EMPLOYEE' | 'HR_PLANNER' | null;
}
