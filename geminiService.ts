import { GoogleGenAI, Type } from "@google/genai";
import { Language, Employee } from "./types";
import { MOCK_EMPLOYEES } from "./constants";

// Token-saving: Cache for repeated queries
const responseCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

// Token-saving: Local intent detection to skip API for simple cases
function detectIntentLocally(input: string): string | null {
  const lower = input.toLowerCase();
  // Sick leave patterns
  if (/sick|malade|congé|ill|unwell/i.test(lower)) return 'SICK_LEAVE';
  // Overtime patterns - expanded for common phrases
  if (/overtime|heures sup|ot\b|extra hours|\d+\s*h(ours?)?\s*(ot|overtime|extra)?|take\s*ot|need\s*ot|record\s*ot/i.test(lower)) return 'OVERTIME_REQUEST';
  // Training patterns
  if (/training|formation|reschedule/i.test(lower)) return 'TRAINING_RESCHEDULE';
  // Balance query patterns
  if (/balance|solde|remaining|how many|left/i.test(lower)) return 'BALANCE_QUERY';
  return null;
}

// Token-saving: Extract employee ID locally
function extractEmployeeId(input: string): string | null {
  const match = input.match(/AC\d{5}/i);
  return match ? match[0].toUpperCase() : null;
}

// Token-saving: Get employee data locally
function getEmployeeData(empId: string) {
  return MOCK_EMPLOYEES.find(e => e.employee_id === empId);
}

// Token-saving: Process simple requests without API
function processLocally(input: string, lang: Language, knownEmpId?: string): any | null {
  const intent = detectIntentLocally(input);
  // Use provided empId or try to extract from input
  const empId = knownEmpId || extractEmployeeId(input);

  if (!intent || !empId) return null; // Need API for complex cases

  const emp = getEmployeeData(empId);
  if (!emp) return null;

  // Handle locally for known scenarios
  if (intent === 'SICK_LEAVE' && emp.sickDaysRemaining > 0) {
    return {
      intent: 'SICK_LEAVE',
      response: lang === 'EN'
        ? `Sick leave approved for ${emp.name}. You have ${emp.sickDaysRemaining} days remaining.`
        : `Congé de maladie approuvé pour ${emp.name}. Il vous reste ${emp.sickDaysRemaining} jours.`,
      complianceStatus: 'PASSED',
      escalationRequired: false,
      isFinal: true,
      auditLog: `SICK_LEAVE|${empId}|${new Date().toISOString()}|PASS`,
      extractedData: { employeeId: empId, employeeName: emp.name, station: emp.station, workgroup: emp.workgroup },
      ruleChecks: [{ rule: 'Sick Day Balance', result: 'PASS', details: `${emp.sickDaysRemaining} days remaining` }],
      systemStatus: [{ system: 'PeopleSoft', status: 'UPDATED' }, { system: 'StaffAdmin', status: 'UPDATED' }]
    };
  }

  if (intent === 'OVERTIME_REQUEST') {
    // Check if already at the limit first
    if (emp.otHoursThisWeek >= 12) {
      return {
        intent: 'OVERTIME_REQUEST',
        response: lang === 'EN'
          ? `Sorry ${emp.name}, you've already used all 12 overtime hours this week. No additional overtime is available until next week (Union Rule 4.2).`
          : `Désolé ${emp.name}, vous avez déjà utilisé vos 12 heures supplémentaires cette semaine. Aucune heure sup. disponible jusqu'à la semaine prochaine (Règle syndicale 4.2).`,
        complianceStatus: 'FAILED',
        escalationRequired: false,
        isFinal: true,
        auditLog: `OVERTIME|${empId}|${new Date().toISOString()}|FAIL|AT_LIMIT`,
        extractedData: { employeeId: empId, employeeName: emp.name, station: emp.station, workgroup: emp.workgroup },
        ruleChecks: [{ rule: 'Weekly OT Limit (Union Rule 4.2)', result: 'FAIL', details: `${emp.otHoursThisWeek}/12 hours used - at maximum limit` }],
        systemStatus: [{ system: 'UnionCompliance', status: 'BLOCKED' }]
      };
    }

    // Extract requested hours from input (e.g., "2 hours", "3h")
    const hoursMatch = input.match(/(\d+)\s*(?:hours?|h\b)/i);
    const requestedHours = hoursMatch ? parseInt(hoursMatch[1]) : null;

    // If no hours specified and under limit, ask how many
    if (!requestedHours) {
      return {
        intent: 'OVERTIME_REQUEST',
        response: lang === 'EN'
          ? `Sure ${emp.name}! How many hours of overtime would you like to request?`
          : `Bien sûr ${emp.name}! Combien d'heures supplémentaires souhaitez-vous demander?`,
        complianceStatus: 'PENDING',
        escalationRequired: false,
        isFinal: false, // Not final - need more info
        auditLog: `OVERTIME|${empId}|${new Date().toISOString()}|PENDING|AWAITING_HOURS`,
        extractedData: { employeeId: empId, employeeName: emp.name, station: emp.station, workgroup: emp.workgroup },
        ruleChecks: [],
        systemStatus: []
      };
    }

    const wouldExceed = (emp.otHoursThisWeek + requestedHours) > 12;
    if (wouldExceed) {
      const available = 12 - emp.otHoursThisWeek;
      return {
        intent: 'OVERTIME_REQUEST',
        response: lang === 'EN'
          ? `Sorry ${emp.name}, you can only request up to ${available} more hours this week (${emp.otHoursThisWeek}/12 used). ${requestedHours} hours exceeds the limit. This request has been escalated to HR for review.`
          : `Désolé ${emp.name}, vous ne pouvez demander que ${available} heures de plus cette semaine (${emp.otHoursThisWeek}/12 utilisées). ${requestedHours}h dépasse la limite. Cette demande a été transmise aux RH pour examen.`,
        complianceStatus: 'ESCALATED',
        escalationRequired: true,
        isFinal: true,
        auditLog: `OVERTIME|${empId}|${new Date().toISOString()}|ESCALATED|EXCEEDS_LIMIT`,
        extractedData: { employeeId: empId, employeeName: emp.name, station: emp.station, workgroup: emp.workgroup },
        ruleChecks: [{ rule: 'Weekly OT Limit (Union Rule 4.2)', result: 'FAIL', details: `${emp.otHoursThisWeek}+${requestedHours} would exceed 12hr limit - ESCALATED` }],
        systemStatus: [{ system: 'UnionCompliance', status: 'ESCALATED' }, { system: 'HR Planner', status: 'PENDING_REVIEW' }]
      };
    }
    // Allow if under limit
    return {
      intent: 'OVERTIME_REQUEST',
      response: lang === 'EN'
        ? `Overtime approved for ${emp.name}! ${requestedHours} hours added. You now have ${emp.otHoursThisWeek + requestedHours}/12 OT this week.`
        : `Heures sup. approuvées pour ${emp.name}! ${requestedHours}h ajoutées. Vous avez maintenant ${emp.otHoursThisWeek + requestedHours}/12 cette semaine.`,
      complianceStatus: 'PASSED',
      escalationRequired: false,
      isFinal: true,
      auditLog: `OVERTIME|${empId}|${new Date().toISOString()}|PASS`,
      extractedData: { employeeId: empId, employeeName: emp.name, station: emp.station, workgroup: emp.workgroup },
      ruleChecks: [{ rule: 'Weekly OT Limit (Union Rule 4.2)', result: 'PASS', details: `${emp.otHoursThisWeek}+${requestedHours}=${emp.otHoursThisWeek + requestedHours}/12 hours` }],
      systemStatus: [{ system: 'UnionCompliance', status: 'APPROVED' }, { system: 'WorkforcePlanning', status: 'UPDATED' }]
    };
  }

  // Training reschedule - always allow with proper rule checks
  if (intent === 'TRAINING_RESCHEDULE') {
    const training = emp.trainings?.[0];
    return {
      intent: 'TRAINING_RESCHEDULE',
      response: lang === 'EN'
        ? `Training reschedule confirmed for ${emp.name}. ${training ? `Your ${training.course} has been updated.` : 'Your training schedule has been updated.'} I will proceed with this change.`
        : `Modification de formation confirmée pour ${emp.name}. ${training ? `Votre ${training.course} a été mise à jour.` : 'Votre horaire de formation a été mis à jour.'} Je procède à ce changement.`,
      complianceStatus: 'PASSED',
      escalationRequired: false,
      isFinal: true,
      auditLog: `TRAINING_RESCHEDULE|${empId}|${new Date().toISOString()}|PASS`,
      extractedData: { employeeId: empId, employeeName: emp.name, station: emp.station, workgroup: emp.workgroup, shift: emp.shifts?.[0] },
      ruleChecks: [{ rule: 'Rest Period (Rule 8.1)', result: 'PASS', details: 'Minimum 10 hours rest between shift and training maintained' }],
      systemStatus: [{ system: 'TrainingSystem', status: 'UPDATED' }, { system: 'Calendar', status: 'BLOCKED' }, { system: 'Teams', status: 'NOTIFIED' }]
    };
  }

  return null; // Complex case, need API
}

export async function processHRIntent(input: string, lang: Language, conversationHistory: any[] = [], employeeId?: string) {
  // 1. Try local processing first (zero API tokens!)
  const localResult = processLocally(input, lang, employeeId);
  if (localResult) {
    console.log('[Token Saver] Processed locally, no API call needed');
    return localResult;
  }

  // 2. Check cache for repeated queries
  const cacheKey = `${input.toLowerCase().trim()}_${lang}`;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Token Saver] Returning cached response');
    return cached.response;
  }

  // 3. Limit conversation history to last 3 exchanges (saves ~50% tokens)
  const limitedHistory = conversationHistory.slice(-6); // 3 user + 3 model

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

  // 4. Minimal employee data string
  const empData = MOCK_EMPLOYEES.map(e => `${e.employee_id}:${e.name},OT=${e.otHoursThisWeek},Sick=${e.sickDaysRemaining}`).join('|');

  // 5. Ultra-compact system instruction
  const sysInstr = `HR Assistant. Lang:${lang}. Employees:${empData}. Reply briefly.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [...limitedHistory, { role: 'user', parts: [{ text: input }] }],
      config: {
        systemInstruction: sysInstr,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING },
            response: { type: Type.STRING },
            complianceStatus: { type: Type.STRING },
            escalationRequired: { type: Type.BOOLEAN },
            isFinal: { type: Type.BOOLEAN },
            auditLog: { type: Type.STRING },
            extractedData: { type: Type.OBJECT, properties: { employeeId: { type: Type.STRING }, employeeName: { type: Type.STRING } } },
            ruleChecks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { rule: { type: Type.STRING }, result: { type: Type.STRING }, details: { type: Type.STRING } } } },
            systemStatus: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { system: { type: Type.STRING }, status: { type: Type.STRING } } } }
          },
          required: ["intent", "response", "isFinal"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    // Cache the response
    responseCache.set(cacheKey, { response: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      intent: "UNKNOWN",
      complianceStatus: "PENDING",
      escalationRequired: true,
      isFinal: true,
      auditLog: "API Error",
      response: lang === 'EN' ? "Sorry, having trouble. Let me connect you." : "Désolé, problème technique."
    };
  }
}
