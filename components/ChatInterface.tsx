
import React, { useState, useRef, useEffect } from 'react';
import { Language, ChatMessage, WorkflowStep, ConversationMessage } from '../types';
import { TRANSLATIONS, COLORS, MOCK_EMPLOYEES } from '../constants';
import { processHRIntent } from '../geminiService';
import { useSharedData } from '../contexts/SharedDataContext';

interface Props {
  lang: Language;
  onIntentDetected: (result: any) => void;
  micTrigger: number;
  employeeId?: string;  // Optional: logged-in employee's ID
  employeeName?: string; // Optional: logged-in employee's name
  onTicketCreated?: (ticketId: string) => void; // Callback when ticket is created
}

export const ChatInterface: React.FC<Props> = ({ lang, onIntentDetected, micTrigger, employeeId, employeeName, onTicketCreated }) => {
  const t = TRANSLATIONS[lang];
  const { addTicket } = useSharedData();

  // If employee is logged in, customize welcome message
  const welcomeMessage = employeeId
    ? `Hello ${employeeName?.split(' ')[0] || 'there'}! How can I help you today?`
    : t.hrWelcome;

  const initialHistory = employeeId
    ? [
      { role: 'model', parts: [{ text: welcomeMessage }] },
      { role: 'user', parts: [{ text: `[SYSTEM: Employee ${employeeName} (ID: ${employeeId}) is logged in. Do not ask for their employee ID.]` }] },
      { role: 'model', parts: [{ text: 'Understood. I will use the provided employee information.' }] }
    ]
    : [{ role: 'model', parts: [{ text: t.hrWelcome }] }];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', text: welcomeMessage, timestamp: new Date() }
  ]);
  const [history, setHistory] = useState<any[]>(initialHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  // Global mic trigger for chat
  useEffect(() => {
    if (micTrigger > 0 && !isListening) {
      startVoiceToChat();
    }
  }, [micTrigger]);

  const startVoiceToChat = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    // Use en-CA for better tolerance of French phonetics in English mode
    recognition.lang = lang === 'EN' ? 'en-CA' : 'fr-CA';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      if (event.results[0].isFinal) {
        setIsListening(false);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsgText = input.trim();
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: userMsgText, timestamp: new Date() };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Pass employeeId so local processing can use it
    const result = await processHRIntent(userMsgText, lang, history, employeeId);

    setHistory(prev => [
      ...prev,
      { role: 'user', parts: [{ text: userMsgText }] },
      { role: 'model', parts: [{ text: result.response }] }
    ]);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: result.response,
        timestamp: new Date(),
        intent: result.intent
      };

      onIntentDetected(result);
      const updatedMessages = [...messages, userMsg, aiMsg];
      setMessages(updatedMessages);
      setIsTyping(false);

      // Create ticket ONLY when conversation is complete (isFinal=true)
      if (result.isFinal === true) {
        createTicketFromChat(result, updatedMessages);
      }
    }, 1000);
  };

  // Create ticket from chat conversation
  const createTicketFromChat = (result: any, chatMessages: ChatMessage[]) => {
    // Convert chat messages to conversation transcript format
    const conversationTranscript: ConversationMessage[] = chatMessages.map(msg => ({
      speaker: msg.sender === 'user' ? 'user' : 'ai',
      text: msg.text,
      timestamp: msg.timestamp
    }));

    // Look up employee data for proper entity extraction
    const empId = employeeId || result.extractedData?.employeeId;
    const employee = empId ? MOCK_EMPLOYEES.find(e => e.employee_id === empId) : null;

    // Extract data from conversation text for rule checks
    const conversationText = chatMessages.map(m => m.text.toLowerCase()).join(' ');

    // Build entity extraction
    const extractedData = {
      employeeId: empId || 'N/A',
      employeeName: employeeName || result.extractedData?.employeeName || employee?.name || 'Unknown',
      station: employee?.station || result.extractedData?.station || 'N/A',
      workgroup: employee?.workgroup || result.extractedData?.workgroup || 'N/A',
      shift: employee?.shifts?.[0] || result.extractedData?.shift || 'N/A'
    };

    // Build rule checks based on intent
    let ruleChecks = result.ruleChecks || [];
    let systemStatus = result.systemStatus || [];

    if (ruleChecks.length === 0 && employee && result.intent) {
      if (result.intent === 'SICK_LEAVE') {
        // Extract days from conversation if mentioned
        const daysMatch = conversationText.match(/(\d+)\s*(?:sick\s*)?days?\s*(?:remaining|left|available)/i);
        const days = daysMatch ? parseInt(daysMatch[1]) : employee.sickDaysRemaining;
        ruleChecks = [{ rule: 'Sick Day Balance', result: days > 0 ? 'PASS' : 'FAIL', details: `${days} sick days remaining` }];
        systemStatus = [{ system: 'PeopleSoft', status: 'UPDATED' }, { system: 'StaffAdmin', status: 'UPDATED' }, { system: 'Teams', status: 'NOTIFIED' }];
      } else if (result.intent === 'OVERTIME_REQUEST') {
        const otMatch = conversationText.match(/(\d+)\s*\/\s*12/i);
        const ot = otMatch ? parseInt(otMatch[1]) : employee.otHoursThisWeek;
        ruleChecks = [{ rule: 'Weekly OT Limit (Union Rule 4.2)', result: ot < 12 ? 'PASS' : 'FAIL', details: `${ot}/12 hours used` }];
        systemStatus = [{ system: 'UnionCompliance', status: 'CHECKED' }, { system: 'WorkforcePlanning', status: 'PENDING' }];
      }
    }

    const reasonBadge = result.escalationRequired
      ? 'ESCALATED'
      : result.complianceStatus === 'FAILED'
        ? 'COMPLIANCE_FAIL'
        : 'AUTO_APPROVED';

    const ticket = {
      id: `CHAT-${Date.now()}`,
      employeeName: extractedData.employeeName,
      employeeId: extractedData.employeeId,
      type: result.intent || 'CHAT_REQUEST',
      status: 'PENDING' as const,
      timestamp: new Date(),
      conversationTranscript,
      intent: result.intent || 'CHAT_REQUEST',
      summary: result.conclusionSummary || result.response || 'Chat request processed',
      extractedData,
      complianceStatus: result.complianceStatus || 'PENDING',
      auditLog: result.auditLog || `${result.intent}|${empId}|${new Date().toISOString()}`,
      reasonBadge,
      ruleChecks,
      systemStatus
    };

    addTicket(ticket);
    // Notify parent after delay so AI message shows first
    setTimeout(() => {
      if (onTicketCreated) onTicketCreated(ticket.id);
    }, 2000); // 2 second delay after response
  };

  return (
    <div className="flex flex-col h-[400px] w-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-[#001E62] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <img src="https://picsum.photos/40/40" className="rounded-full" alt="bot" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">AC HR Support</p>
            <p className="text-green-400 text-[10px] flex items-center">
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
              {isListening ? 'Listening...' : 'Online'}
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${m.sender === 'user' ? 'bg-[#DA291C] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
              <p>{m.text}</p>
              <p className="text-[9px] mt-1 text-right opacity-60">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75" />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center space-x-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : t.typeMsg}
          className={`flex-1 rounded-full px-4 py-2 text-sm focus:outline-none transition-all ${isListening ? 'bg-red-50 ring-2 ring-red-200' : 'bg-gray-100 focus:ring-2 focus:ring-[#00A0DC]/20'
            }`}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${input.trim() ? 'bg-[#DA291C] text-white' : 'bg-gray-100 text-gray-400'
            }`}
        >
          <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
        </button>
      </form>
    </div>
  );
};
