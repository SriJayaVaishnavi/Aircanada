import React, { useState } from 'react';
import { Employee, ConversationMessage } from '../types';

export interface PlannerRequest {
    id: string;
    employeeName: string;
    employeeId: string;
    type: string; // e.g., 'OVERTIME_REQUEST'
    status: 'PENDING' | 'APPROVED' | 'DENIED';
    timestamp: Date;
    reasonBadge: string; // e.g., 'OT_LIMIT_FAIL'
    summary: string;
    extractedData: {
        station: string;
        workgroup: string;
        shift?: string;
    };
    ruleChecks: {
        rule: string;
        result: 'PASS' | 'FAIL';
        details: string;
    }[];
    systemStatus: {
        system: string;
        status: string;
    }[];
    conversationTranscript?: ConversationMessage[];
    intent?: string;
}

interface Props {
    requests: PlannerRequest[];
    onApprove: (id: string) => void;
    onDeny: (id: string) => void;
}

export const HRPlannerDashboard: React.FC<Props> = ({ requests, onApprove, onDeny }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedRequest = requests.find(r => r.id === selectedId);

    return (
        <div className="h-[calc(100vh-100px)] bg-gray-50 flex gap-6 max-w-[1600px] mx-auto overflow-hidden">

            {/* 1. THE APPROVAL QUEUE (LEFT PANEL) */}
            <div className="w-1/4 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Approval Queue</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {requests.length === 0 && (
                        <div className="text-center mt-10 opacity-40">
                            <p className="text-sm font-bold text-gray-400">No Pending requests</p>
                        </div>
                    )}
                    {requests.map(req => (
                        <div
                            key={req.id}
                            onClick={() => setSelectedId(req.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${selectedId === req.id
                                ? 'bg-[#001E62] border-[#001E62] text-white ring-2 ring-[#001E62]/20'
                                : 'bg-white border-gray-100 hover:border-gray-200 text-gray-900'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${selectedId === req.id ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {req.employeeId}
                                </span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                    req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {req.status}
                                </span>
                            </div>
                            <p className="font-bold text-sm truncate">{req.employeeName}</p>
                            <p className={`text-[10px] font-medium mt-1 ${selectedId === req.id ? 'text-white/70' : 'text-gray-400'}`}>
                                {req.type.replace('_', ' ')}
                            </p>
                            <div className="mt-3 inline-block">
                                <span className="text-[9px] font-bold bg-[#DA291C] text-white px-2 py-1 rounded shadow-sm">
                                    {req.reasonBadge}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER & RIGHT PANELS (Conditional) */}
            {selectedRequest ? (
                <>
                    {/* 2. CONVERSATION INSIGHTS (MIDDLE PANEL) */}
                    <div className="w-2/4 flex flex-col gap-6">
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 flex-1">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-black text-gray-400">
                                    {selectedRequest.employeeName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedRequest.employeeName}</h2>
                                    <p className="text-xs text-gray-500 font-mono">{selectedRequest.employeeId}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">[ENTITY_EXTRACTION]</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Station</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedRequest.extractedData.station}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Workgroup</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedRequest.extractedData.workgroup}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Shift / Time</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedRequest.extractedData.shift || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">[CONVERSATION_TRANSCRIPT]</h3>
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 max-h-60 overflow-y-auto">
                                        {selectedRequest.conversationTranscript && selectedRequest.conversationTranscript.length > 0 ? (
                                            selectedRequest.conversationTranscript.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.speaker === 'user'
                                                        ? 'bg-[#DA291C] text-white'
                                                        : 'bg-white text-gray-800 border border-gray-200'
                                                        }`}>
                                                        <p className="text-xs font-bold opacity-60 mb-1">
                                                            {msg.speaker === 'user' ? 'Employee' : 'AI Assistant'}
                                                        </p>
                                                        <p>{msg.text}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-400 italic text-center py-4">No transcript available</p>
                                        )}
                                    </div>
                                </div>

                                {selectedRequest.intent && (
                                    <div>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">[DETECTED_INTENT]</h3>
                                        <div className="inline-block px-4 py-2 bg-[#00A0DC]/10 text-[#00A0DC] rounded-xl text-sm font-bold">
                                            {selectedRequest.intent}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">[CONVO_SUMMARY]</h3>
                                    <div className="bg-[#F0F7FF] p-4 rounded-2xl border border-blue-100 text-blue-900 text-sm font-medium leading-relaxed">
                                        {selectedRequest.summary}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. RULE CHECKS & ACTION (RIGHT PANEL) */}
                    <div className="w-1/4 flex flex-col gap-6">
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 flex-1 flex flex-col">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">[RULE_CHECKS]</h3>

                            <div className="space-y-4 mb-8">
                                {selectedRequest.ruleChecks.map((check, idx) => (
                                    <div key={idx} className="flex items-start space-x-3">
                                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${check.result === 'PASS' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {check.result === 'PASS' ? (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">{check.rule}</p>
                                            <p className={`text-[10px] font-bold ${check.result === 'PASS' ? 'text-green-600' : 'text-red-500'}`}>
                                                {check.details}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">[SYSTEM_ORCHESTRATION]</h3>
                            <div className="space-y-2 mb-auto">
                                {selectedRequest.systemStatus.map((sys, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-gray-600">{sys.system}</span>
                                        <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">{sys.status}</span>
                                    </div>
                                ))}
                            </div>

                            {selectedRequest.status === 'PENDING' && (
                                <div className="pt-6 border-t border-gray-100 space-y-3">
                                    <button
                                        onClick={() => onApprove(selectedRequest.id)}
                                        className="w-full py-4 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-green-900/10 transition-all active:scale-95 flex items-center justify-center space-x-2"
                                    >
                                        <span>Allow / Approve</span>
                                    </button>
                                    <button
                                        onClick={() => onDeny(selectedRequest.id)}
                                        className="w-full py-4 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-100 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        <span>Deny Request</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* EMPTY STATE FOR MIDDLE/RIGHT PANELS */
                <div className="w-3/4 bg-white rounded-3xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-300">
                    <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="font-medium text-sm">Select a request from the queue to view details</p>
                </div>
            )}
        </div>
    );
};
