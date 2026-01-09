
import { Employee, Language } from './types';

export const COLORS = {
  primary: '#DA291C',
  secondary: '#001E62',
  accent: '#00A0DC',
  voiceBg: '#1A1A1A',
  chatBg: '#F8F9FA',
  success: '#2E7D32',
  warning: '#ED6C02',
};

export const HR_RULES = {
  SICK_LEAVE: {
    MAX_DAYS_PER_YEAR: 10, // Canada Labour Code minimum
    MEDICAL_NOTE_THRESHOLD: 5, // days - required after 5+ consecutive days
    CARRYOVER_MAX: 10
  },
  OVERTIME: {
    STANDARD_HOURS_PER_WEEK: 40,
    MAX_OT_HOURS_PER_WEEK: 12, // Union Rule 4.2: Maximum 12 hours per week
    MIN_REST_HOURS: 10, // Between shifts (union specific, 8-10 hours)
    OT_RATE: 1.5
  },
  TRAINING: {
    MIN_REST_HOURS: 10, // Rule 8.1: Minimum 10 hours rest between shift and training
    MIN_RESCHEDULE_NOTICE_HOURS: 24 // Minimum notice for reschedule
  }
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    employee_id: "AC78923",
    name: "Jean Tremblay",
    station: "YYZ",
    workgroup: "Ramp Services",
    bilingual: true,
    skills: ["Baggage", "Safety"],
    shifts: ["06:00-14:00"],
    contact: "555-0123",
    sickDaysRemaining: 7,
    otHoursThisWeek: 11, // 11/12 used - requesting 2 hours will exceed limit
    trainings: [{ course: "Security Refresher", date: "Dec 22", time: "10:00 AM" }]
  },
  {
    employee_id: "AC45678",
    name: "Sarah Liu",
    station: "YVR",
    workgroup: "Ramp Services",
    bilingual: false,
    skills: ["Customer Service"],
    shifts: ["08:00-16:00"],
    contact: "555-0124",
    sickDaysRemaining: 3,
    otHoursThisWeek: 12, // Maxed out
    trainings: [{ course: "Safety Training", date: "Dec 23", time: "02:00 PM" }]
  },
  {
    employee_id: "AC90123",
    name: "Pierre Martin",
    station: "YUL",
    workgroup: "Gate Ops",
    bilingual: true,
    skills: ["Ticketing"],
    shifts: ["14:00-22:00"],
    contact: "555-9999",
    sickDaysRemaining: 10,
    otHoursThisWeek: 0,
    trainings: [{ course: "Security Refresher", date: "Dec 22", time: "10:00 AM" }]
  }
];

export const TRANSLATIONS: Record<Language, any> = {
  EN: {
    title: "Air Canada HR Assistant",
    subtitle: "AI-Powered Employee Support",
    callHr: "Call HR",
    chatHr: "Chat with HR",
    phoneId: "(888) 555-ACHR",
    listening: "Listening (EN/FR)...",
    sayId: "Say your employee ID",
    processing: "Processing request...",
    compliance: "Checking compliance...",
    updating: "Updating records...",
    successMsg: "Request processed successfully",
    errorMsg: "I didn't catch that. Could you repeat?",
    typeMsg: "Type in English or French...",
    station: "Station",
    workgroup: "Workgroup",
    metrics: "Today's Metrics",
    callsHandled: "Calls Handled",
    chatSessions: "Chat Sessions",
    avgTime: "Avg Handle Time",
    autoResolved: "Auto-Resolved",
    compliancePass: "Compliance Pass",
    intent: "Intent Insight",
    backendOrch: "Backend Orchestration",
    back: "Back",
    understanding: "Understanding",
    compliancePassed: "Compliance Check Passed",
    waitingInput: "Waiting for user input (EN/FR)...",
    liveTranscript: "Live Transcript",
    inCall: "In Call",
    calling: "Dialing...",
    otAvailable: "Overtime Available YYZ (14:00-22:00)",
    hrWelcome: "Hello! I can help in English or French. What can I do for you?",
    hrVoiceWelcome: "Air Canada HR. I can help in English or French. How can I help?",
    mute: "mute",
    keypad: "keypad",
    speaker: "speaker"
  },
  FR: {
    title: "Assistant RH Air Canada",
    subtitle: "Support employé propulsé par l'IA",
    callHr: "Appeler les RH",
    chatHr: "Clavarder avec les RH",
    phoneId: "(888) 555-ACHR",
    listening: "À l'écoute (FR/EN)...",
    sayId: "Dites votre ID employé",
    processing: "Traitement...",
    compliance: "Vérification...",
    updating: "Mise à jour...",
    successMsg: "Traitée avec succès",
    errorMsg: "Je n'ai pas compris. Pouvez-vous répéter?",
    typeMsg: "Écrivez en français ou anglais...",
    station: "Station",
    workgroup: "Groupe",
    metrics: "Statistiques",
    callsHandled: "Appels",
    chatSessions: "Chats",
    avgTime: "Temps moy.",
    autoResolved: "Auto-résolu",
    compliancePass: "Conformité",
    intent: "Analyse d'intention",
    backendOrch: "Orchestration Backend",
    back: "Retour",
    understanding: "Compréhension",
    compliancePassed: "Vérification réussie",
    waitingInput: "En attente (FR/EN)...",
    liveTranscript: "Transcription",
    inCall: "En appel",
    calling: "Appel...",
    otAvailable: "Heures suppl. YYZ (14:00-22:00)",
    hrWelcome: "Bonjour ! Je peux vous aider en français ou en anglais. Que puis-je faire ?",
    hrVoiceWelcome: "RH Air Canada. Je peux vous aider en français ou en anglais. Comment puis-je vous aider ?",
    mute: "sourdine",
    keypad: "clavier",
    speaker: "parleur"
  }
};

// Mock credentials for employee authentication
export const MOCK_CREDENTIALS = [
  { userId: 'AC78923', password: 'jean123', name: 'Jean Tremblay', role: 'EMPLOYEE' as const },
  { userId: 'AC45678', password: 'sarah123', name: 'Sarah Liu', role: 'EMPLOYEE' as const },
  { userId: 'AC90123', password: 'pierre123', name: 'Pierre Martin', role: 'EMPLOYEE' as const },
  { userId: 'HR001', password: 'hrplanner', name: 'HR Planner', role: 'HR_PLANNER' as const }
];
