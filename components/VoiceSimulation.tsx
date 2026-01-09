
import React, { useState, useEffect, useRef } from 'react';
import { Language, WorkflowStep, ConversationMessage } from '../types';
import { TRANSLATIONS, MOCK_EMPLOYEES } from '../constants';
import { processHRIntent } from '../geminiService';
import { useSharedData } from '../contexts/SharedDataContext';

interface Props {
  lang: Language;
  onHangUp: () => void;
  onIntentDetected: (result: any) => void;
  micTrigger: number;
}

export const VoiceSimulation: React.FC<Props> = ({ lang, onHangUp, onIntentDetected, micTrigger }) => {
  const t = TRANSLATIONS[lang];
  const { addTicket } = useSharedData();
  const [callStatus, setCallStatus] = useState<'dialing' | 'ringing' | 'connected' | 'ended'>('dialing');
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [aiSpeech, setAiSpeech] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationTranscript, setConversationTranscript] = useState<ConversationMessage[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const historyRef = useRef<any[]>([]);
  const isFinalRef = useRef(false);
  const conversationRef = useRef<ConversationMessage[]>([]);

  useEffect(() => {
    const dialTimeout = setTimeout(() => setCallStatus('ringing'), 800);
    const ringTimeout = setTimeout(() => connectCall(), 2000);

    return () => {
      clearTimeout(dialTimeout);
      clearTimeout(ringTimeout);
      stopRecognition();
      synthRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (micTrigger > 0 && callStatus === 'connected' && !isListening && !synthRef.current.speaking && !isFinalRef.current) {
      startListening();
    }
  }, [micTrigger]);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) { }
    }
  };

  const speak = (text: string, onEnd?: () => void) => {
    stopRecognition();
    setAiSpeech(text);
    const utterance = new SpeechSynthesisUtterance(text);

    // Robust French detection: Check for accents or common French function words
    const isFrench = /[àâäéèêëîïôöùûüç]/i.test(text) ||
      /\b(le|la|les|un|une|des|est|sont|avez|votre|notre|pour|avec)\b/i.test(text) ||
      text.toLowerCase().includes('bonjour') ||
      text.toLowerCase().includes('désolé');

    utterance.lang = isFrench ? 'fr-CA' : 'en-CA';

    // Make voice more natural - adjusted rate and pitch for warmer tone
    utterance.rate = 0.88;  // Slightly slower for natural cadence
    utterance.pitch = 1.1;  // Slightly higher pitch for friendlier, warmer tone
    utterance.volume = 1.0;

    // Try to select a more natural voice - prefer premium/enhanced voices
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      const matchesLang = isFrench ? v.lang.includes('fr') : v.lang.includes('en');
      // Priority: Premium voices > Natural > Default
      return matchesLang && (
        name.includes('premium') ||
        name.includes('enhanced') ||
        name.includes('neural') ||
        name.includes('wavenet') ||
        name.includes('samantha') ||
        name.includes('karen') ||
        name.includes('moira') ||
        name.includes('tessa') ||
        name.includes('google uk english female') ||
        name.includes('google us english')
      );
    }) || voices.find(v =>
      (isFrench ? v.lang.includes('fr') : v.lang.includes('en')) &&
      v.localService === false // Prefer cloud voices
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsListening(false);
    utterance.onend = () => {
      if (onEnd) onEnd();
      else if (isFinalRef.current) {
        // Create ticket before ending - using either lastResult or basic ticket
        createTicketFromCurrentState();
        setCallStatus('ended');
        setTimeout(() => onHangUp(), 1000);
      } else {
        startListening();
      }
    };
    utterance.onerror = () => {
      if (isFinalRef.current) onHangUp();
      else startListening();
    };

    synthRef.current.speak(utterance);
  };

  const connectCall = () => {
    setCallStatus('connected');
    const welcome = t.hrVoiceWelcome;
    const initialHistory = [{ role: 'model', parts: [{ text: welcome }] }];
    setHistory(initialHistory);
    historyRef.current = initialHistory;
    // Add AI welcome to transcript
    const aiMsg: ConversationMessage = { speaker: 'ai', text: welcome, timestamp: new Date() };
    conversationRef.current = [aiMsg];
    setConversationTranscript([aiMsg]);
    speak(welcome);
  };

  const createTicketFromResult = (result: any) => {
    const reasonBadge = result.escalationRequired
      ? 'ESCALATED'
      : result.complianceStatus === 'FAILED'
        ? 'COMPLIANCE_FAIL'
        : 'AUTO_APPROVED';

    const ticket = {
      id: `REQ-${Date.now()}`,
      employeeName: result.extractedData?.employeeName || 'Unknown Employee',
      employeeId: result.extractedData?.employeeId || 'N/A',
      type: result.intent,
      status: 'PENDING' as const,
      timestamp: new Date(),
      conversationTranscript: conversationRef.current,
      intent: result.intent,
      summary: result.conclusionSummary || result.response,
      extractedData: result.extractedData || {},
      complianceStatus: result.complianceStatus || 'PENDING',
      auditLog: result.auditLog || '',
      reasonBadge,
      ruleChecks: result.ruleChecks || [],
      systemStatus: result.systemStatus || []
    };

    addTicket(ticket);
  };

  // NEW: Create ticket from current conversation state (even if incomplete)
  const createTicketFromCurrentState = () => {
    if (lastResult) {
      // If we have a complete result, use it
      createTicketFromResult(lastResult);
    } else if (conversationRef.current.length > 0) {
      // Try to detect intent from conversation text
      const conversationText = conversationRef.current
        .map(msg => msg.text.toLowerCase())
        .join(' ');

      // Simple intent detection based on keywords
      let detectedIntent = 'GENERAL_INQUIRY';
      let intentType = 'GENERAL_INQUIRY';

      if (conversationText.includes('sick leave') || conversationText.includes('sick day') || conversationText.includes('appeler malade') || conversationText.includes('congé de maladie')) {
        detectedIntent = 'SICK_LEAVE';
        intentType = 'SICK_LEAVE';
      } else if (conversationText.includes('overtime') || conversationText.includes('heures supplémentaires') || conversationText.includes('ot ')) {
        detectedIntent = 'OVERTIME_REQUEST';
        intentType = 'OVERTIME_REQUEST';
      } else if (conversationText.includes('training') || conversationText.includes('reschedule') || conversationText.includes('formation')) {
        detectedIntent = 'TRAINING_RESCHEDULE';
        intentType = 'TRAINING_RESCHEDULE';
      } else if (conversationText.includes('vacation') || conversationText.includes('time off') || conversationText.includes('vacances')) {
        detectedIntent = 'VACATION_REQUEST';
        intentType = 'VACATION_REQUEST';
      }

      // Try to extract employee info from conversation
      let employeeName = 'Unknown Employee';
      let employeeId = 'N/A';
      let employee: any = null;

      // Look for employee ID pattern (e.g., AC12345)
      const idMatch = conversationText.match(/ac\d{5}/i);
      if (idMatch) {
        employeeId = idMatch[0].toUpperCase();
        // Look up employee name from MOCK_EMPLOYEES
        employee = MOCK_EMPLOYEES.find(emp => emp.employee_id === employeeId);
        if (employee) {
          employeeName = employee.name;
        }
      }

      // Generate rule checks based on intent type
      const ruleChecks = [];
      const systemStatus = [];
      let extractedData: any = {};
      let complianceStatus = 'PENDING';
      let reasonBadge = 'PENDING_INFO';

      // If we found the employee, use their data
      if (employee) {
        extractedData = {
          station: employee.station,
          workgroup: employee.workgroup,
          shift: employee.shifts?.[0] || 'N/A'
        };

        if (intentType === 'SICK_LEAVE') {
          // Extract sick days from conversation text if mentioned (e.g., "6 days remaining")
          const daysMatch = conversationText.match(/(\d+)\s*(?:sick\s*)?days?\s*(?:remaining|left|available)/i);
          const sickDaysRemaining = daysMatch ? parseInt(daysMatch[1]) : (employee.sickDaysRemaining ?? 5);
          ruleChecks.push({
            rule: 'Sick Day Balance',
            result: sickDaysRemaining > 0 ? 'PASS' : 'FAIL',
            details: `${sickDaysRemaining} sick days remaining`
          });
          systemStatus.push(
            { system: 'PeopleSoft', status: 'PENDING' },
            { system: 'Staff Admin', status: 'PENDING' },
            { system: 'Teams', status: 'PENDING' }
          );
          complianceStatus = sickDaysRemaining > 0 ? 'PASSED' : 'FAILED';
          reasonBadge = sickDaysRemaining > 0 ? 'AUTO_APPROVED' : 'INSUFFICIENT_BALANCE';
        } else if (intentType === 'OVERTIME_REQUEST') {
          // Extract OT hours from conversation if mentioned (e.g., "12/12 hours" or "at limit")
          const otMatch = conversationText.match(/(\d+)\s*\/\s*12\s*(?:hours?|h)/i);
          const otUsed = otMatch ? parseInt(otMatch[1]) : (employee.otHoursThisWeek ?? 0);
          const otLimit = 12; // Union Rule 4.2
          ruleChecks.push({
            rule: 'Weekly OT Limit (Union Rule 4.2)',
            result: otUsed < otLimit ? 'PASS' : 'FAIL',
            details: `${otUsed}/${otLimit} hours used this week`
          });
          systemStatus.push(
            { system: 'Union Compliance', status: 'CHECKED' },
            { system: 'Workforce Planning', status: 'PENDING' }
          );
          complianceStatus = otUsed < otLimit ? 'PENDING' : 'FAILED';
          reasonBadge = otUsed >= otLimit ? 'OT_LIMIT_REACHED' : 'PENDING_INFO';
        } else if (intentType === 'TRAINING_RESCHEDULE') {
          ruleChecks.push({
            rule: 'Rest Period (Rule 8.1)',
            result: 'PENDING',
            details: 'Minimum 10 hours rest between shift and training'
          });
          systemStatus.push(
            { system: 'Training System', status: 'PENDING' },
            { system: 'Calendar', status: 'PENDING' }
          );
        }
      } else {
        // No employee found, add generic pending checks
        ruleChecks.push({
          rule: 'Employee Verification',
          result: 'PENDING',
          details: 'Awaiting employee ID verification'
        });
        systemStatus.push(
          { system: 'Identity Verification', status: 'PENDING' }
        );
      }

      const ticket = {
        id: `REQ-${Date.now()}`,
        employeeName,
        employeeId,
        type: intentType,
        status: 'PENDING' as const,
        timestamp: new Date(),
        conversationTranscript: conversationRef.current,
        intent: detectedIntent,
        summary: `${intentType.replace(/_/g, ' ')} request from ${employeeName}`,
        extractedData,
        complianceStatus,
        auditLog: `${intentType}|${employeeId}|${new Date().toISOString()}`,
        reasonBadge,
        ruleChecks,
        systemStatus
      };
      addTicket(ticket);
    }
  };

  // Handle manual hang up
  const handleCallEnd = () => {
    // Create ticket with current state before hanging up
    createTicketFromCurrentState();
    onHangUp();
  };

  const startListening = () => {
    if (isFinalRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported.");
      return;
    }

    stopRecognition();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    // en-CA is a bilingual-friendly English variant used in Canada
    recognition.lang = lang === 'EN' ? 'en-CA' : 'fr-CA';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }

      setTranscript(finalTranscript || interimTranscript);

      if (event.results[0].isFinal) {
        setIsListening(false);
        stopRecognition();

        // Add user message to transcript
        const userMsg: ConversationMessage = { speaker: 'user', text: finalTranscript, timestamp: new Date() };
        conversationRef.current = [...conversationRef.current, userMsg];

        const result = await processHRIntent(finalTranscript, lang, historyRef.current);

        // Add AI response to transcript
        const aiMsg: ConversationMessage = { speaker: 'ai', text: result.response, timestamp: new Date() };
        conversationRef.current = [...conversationRef.current, aiMsg];
        setConversationTranscript(conversationRef.current);

        const newTurns = [
          { role: 'user', parts: [{ text: finalTranscript }] },
          { role: 'model', parts: [{ text: result.response }] }
        ];

        const updatedHistory = [...historyRef.current, ...newTurns];
        historyRef.current = updatedHistory;
        setHistory(updatedHistory);

        if (result.isFinal) {
          isFinalRef.current = true;
          setLastResult(result);
        }

        onIntentDetected(result);
        speak(result.response);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col items-center justify-between h-[600px] w-full max-w-[340px] bg-[#1A1A1A] rounded-[50px] border-[10px] border-gray-800 p-8 shadow-2xl overflow-hidden relative text-white border-double transition-opacity duration-500 ${callStatus === 'ended' ? 'opacity-50' : 'opacity-100'}`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-3xl" />

      <div className="mt-8 text-center w-full">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
          {callStatus === 'ended' ? 'Call Ended' : (callStatus === 'connected' ? (isListening ? t.listening : t.inCall) : t.calling)}
        </p>
        <h2 className="text-2xl font-black mt-2 tracking-tighter">{t.phoneId}</h2>
        {callStatus === 'connected' && <p className="text-xs font-mono text-gray-500 mt-2">{formatTime(timer)}</p>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-8">
        {callStatus === 'connected' ? (
          <>
            {/* Simple call icon - no animations */}
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/40">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </>
        ) : callStatus === 'ended' ? (
          <div className="text-center animate-bounce">
            <p className="text-red-500 font-black text-xl">Hanging Up...</p>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center animate-pulse border border-white/10">
            <svg className="w-10 h-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 w-full mb-10">
        {[
          { icon: 'mute', label: t.mute },
          { icon: 'keypad', label: t.keypad },
          { icon: 'speaker', label: t.speaker },
        ].map(ctrl => (
          <div key={ctrl.label} className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group hover:bg-white/10 transition-colors">
              <div className="w-4 h-4 bg-white/20 rounded-sm" />
            </div>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{ctrl.label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleCallEnd}
        className="mb-10 w-20 h-20 rounded-full bg-[#DA291C] flex items-center justify-center shadow-2xl shadow-red-900/40 hover:scale-105 active:scale-95 transition-all"
      >
        <svg className="w-10 h-10 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>
    </div>
  );
};
