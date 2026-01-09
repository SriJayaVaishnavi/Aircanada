
import React, { useState, useEffect } from 'react';
import { Language, Channel, WorkflowStep, SessionRecord } from './types';
import { TRANSLATIONS } from './constants';
import { LanguageToggle } from './components/LanguageToggle';
import { MetricsDashboard } from './components/MetricsDashboard';
import { BackendVisualizer } from './components/BackendVisualizer';
import { VoiceSimulation } from './components/VoiceSimulation';
import { ChatInterface } from './components/ChatInterface';
import { ActivityLog } from './components/ActivityLog';
import { HRPlannerDashboard, PlannerRequest } from './components/HRPlannerDashboard';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { SharedDataProvider, useSharedData } from './contexts/SharedDataContext';

type ViewMode = 'SIMULATOR' | 'EMPLOYEE' | 'HR_PLANNER';

// Conclusion Modal Component
const ConclusionModal: React.FC<{
  data: { summary: string; intent: string; compliance: string; audit: string };
  onClose: () => void;
  lang: Language;
}> = ({ data, onClose, lang }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-[#001E62] p-8 text-white relative">
          <div className="w-12 h-12 bg-[#DA291C] rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{lang === 'EN' ? 'Transaction Receipt' : 'Reçu de transaction'}</h2>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Air Canada HR Orchestrator</p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{lang === 'EN' ? 'Status' : 'Statut'}</p>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${data.compliance === 'PASSED' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <p className="font-bold text-gray-900">{data.compliance}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{lang === 'EN' ? 'Summary' : 'Résumé'}</p>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">{data.summary}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Immutable Audit Entry</p>
            <p className="text-[10px] font-mono text-gray-500 break-words leading-tight">{data.audit}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-[#DA291C] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {lang === 'EN' ? 'Close Session' : 'Fermer la session'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [lang, setLang] = useState<Language>('EN');
  const [channel, setChannel] = useState<Channel>('SELECT');
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [activeReasoning, setActiveReasoning] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<string | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<string>('PENDING');
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micTrigger, setMicTrigger] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);

  // Initial viewMode from URL or default
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as ViewMode;
    return (view === 'SIMULATOR' || view === 'EMPLOYEE' || view === 'HR_PLANNER') ? view : 'SIMULATOR';
  });

  // Update URL when viewMode changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', viewMode);
    window.history.replaceState({}, '', url.toString());
  }, [viewMode]);

  // Conclusion Modal State
  const [conclusionData, setConclusionData] = useState<{
    summary: string;
    intent: string;
    compliance: string;
    audit: string;
  } | null>(null);

  // Current result from intent detection
  const [currentResult, setCurrentResult] = useState<any>(null);

  const { tickets, updateTicketStatus, authState } = useSharedData();

  const t = TRANSLATIONS[lang];

  const handleApprove = (id: string) => {
    updateTicketStatus(id, 'APPROVED');
  };

  const handleDeny = (id: string) => {
    updateTicketStatus(id, 'DENIED');
  };

  const clearSessionUI = () => {
    setActiveIntent(null);
    setActiveReasoning(null);
    setAuditLog(null);
    setComplianceStatus('PENDING');
    setWorkflowSteps([]);
    setIsProcessing(false);
  };

  const handleIntentDetected = (result: any) => {
    setCurrentResult(result); // Store full result
    setActiveIntent(result.intent);
    setActiveReasoning(result.reasoning);
    setAuditLog(result.auditLog);
    const status = result.escalationRequired ? 'ESCALATED' : result.complianceStatus;
    setComplianceStatus(status);
    setIsProcessing(true);
    setWorkflowSteps([]);

    let steps: WorkflowStep[] = [];

    if (result.escalationRequired) {
      steps = [
        { system: 'Compliance Engine', action: 'Flagged policy exception', completed: true },
        { system: 'Teams / HITL', action: 'Escalated to Duty Planner', completed: false },
        { system: 'Staff Admin', action: 'Update HELD pending review', completed: false }
      ];
    } else {
      if (result.intent === 'SICK_LEAVE') {
        steps = [
          { system: 'PeopleSoft', action: 'Update absence balance', completed: true },
          { system: 'Staff Admin', action: 'Mark roster as VACANT', completed: true },
          { system: 'Teams', action: 'Notify Station Manager', completed: true }
        ];
      } else if (result.intent === 'OVERTIME_REQUEST') {
        steps = [
          { system: 'Union Compliance', action: 'Validate hours limit', completed: true },
          { system: 'Workforce Planning', action: 'Queue for approval', completed: true }
        ];
      } else {
        steps = [{ system: 'Audit Log', action: 'Record inquiry', completed: true }];
      }
    }

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setWorkflowSteps(prev => [...prev, step]);
        if (idx === steps.length - 1) {
          setIsProcessing(false);
          // No popup for voice calls - ticket is created silently
        }
      }, (idx + 1) * 600);
    });
  };

  const handleGlobalMicClick = () => {
    if (channel === 'SELECT') setChannel('VOICE');
    setMicTrigger(prev => prev + 1);
  };

  const handleHangUp = () => {
    setChannel('SELECT');
    clearSessionUI();
  };

  const closeConclusion = () => {
    if (conclusionData) {
      const record: SessionRecord = {
        id: Date.now().toString(),
        timestamp: new Date(),
        summary: conclusionData.summary,
        intent: conclusionData.intent,
        compliance: conclusionData.compliance,
        audit: conclusionData.audit,
        lang: lang
      };
      setSessionHistory(prev => [record, ...prev]);
    }
    setConclusionData(null);
    setChannel('SELECT');
    clearSessionUI();
    setCurrentResult(null);
  };

  // Convert tickets to PlannerRequest format for HRPlannerDashboard
  const plannerRequests: PlannerRequest[] = tickets.map(ticket => ({
    ...ticket,
    conversationTranscript: ticket.conversationTranscript,
    intent: ticket.intent
  }));

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 relative font-['Inter']">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[#DA291C] rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-white font-black text-xl italic">AC</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">{t.title}</h1>
              <p className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dropdown Navigation */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'SIMULATOR' | 'EMPLOYEE' | 'HR_PLANNER')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 cursor-pointer hover:border-[#DA291C] focus:outline-none focus:ring-2 focus:ring-[#DA291C]/20 focus:border-[#DA291C] transition-all shadow-sm"
            >
              <option value="SIMULATOR">📞 Call Simulator</option>
              <option value="EMPLOYEE">👤 Employee View</option>
              <option value="HR_PLANNER">📋 HR Planner</option>
            </select>
            <LanguageToggle current={lang} onChange={setLang} />
          </div>
        </div>
      </header>

      {/* VIEW: SIMULATOR */}
      {viewMode === 'SIMULATOR' && (
        <>
          {/* Clean, centered phone UI */}
          <main className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
              {channel === 'SELECT' && (
                <div className="w-full">
                  <button
                    onClick={() => setChannel('VOICE')}
                    className="w-full bg-white border border-gray-100 hover:border-[#DA291C] p-8 rounded-3xl shadow-lg transition-all hover:shadow-2xl group active:scale-95"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-[#DA291C]/5 flex items-center justify-center text-[#DA291C] group-hover:bg-[#DA291C] group-hover:text-white transition-colors">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-900 text-xl">{t.callHr}</p>
                        <p className="text-sm text-gray-400 font-medium tracking-tight mt-1">{t.phoneId}</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {channel === 'VOICE' && (
                <VoiceSimulation
                  key={lang}
                  lang={lang}
                  onHangUp={handleHangUp}
                  onIntentDetected={handleIntentDetected}
                  micTrigger={micTrigger}
                />
              )}
            </div>
          </main>

          {/* Conclusion Modal */}
          {conclusionData && (
            <ConclusionModal
              data={conclusionData}
              onClose={closeConclusion}
              lang={lang}
            />
          )}
        </>
      )}

      {/* VIEW: EMPLOYEE */}
      {viewMode === 'EMPLOYEE' && (
        !authState.isAuthenticated ? (
          <EmployeeLogin />
        ) : (
          <EmployeeDashboard lang={lang} />
        )
      )}

      {/* VIEW: HR PLANNER */}
      {viewMode === 'HR_PLANNER' && (
        <div className="max-w-[1600px] mx-auto px-4 py-8">
          <HRPlannerDashboard
            requests={plannerRequests}
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SharedDataProvider>
      <AppContent />
    </SharedDataProvider>
  );
};

export default App;
