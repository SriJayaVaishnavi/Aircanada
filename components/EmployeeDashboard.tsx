import React, { useState } from 'react';
import { useSharedData } from '../contexts/SharedDataContext';
import { ChatInterface } from './ChatInterface';
import { Language, ConversationMessage } from '../types';

interface Props {
    lang: Language;
}

export const EmployeeDashboard: React.FC<Props> = ({ lang }) => {
    const { tickets, authState, logout } = useSharedData();
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'historical'>('all');
    const [ticketPopup, setTicketPopup] = useState<string | null>(null); // Full-screen popup

    // Filter tickets to only show those belonging to the logged-in employee
    const myTickets = tickets.filter(t => t.employeeId === authState.userId);

    // Calculate ticket counts
    const openCount = myTickets.filter(t => t.status === 'PENDING').length;
    const awaitingCount = myTickets.filter(t => t.complianceStatus === 'PENDING').length;
    const resolvedCount = myTickets.filter(t => t.status === 'APPROVED' || t.status === 'DENIED').length;

    // Filter by tab
    const filteredTickets = myTickets.filter(ticket => {
        if (activeTab === 'active') return ticket.status === 'PENDING';
        if (activeTab === 'historical') return ticket.status === 'APPROVED' || ticket.status === 'DENIED';
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return { text: 'Resolved', color: 'bg-green-500 text-white' };
            case 'DENIED': return { text: 'Denied', color: 'bg-red-500 text-white' };
            default: return { text: 'In Progress', color: 'bg-yellow-400 text-yellow-900' };
        }
    };

    const getCategoryFromType = (type: string) => {
        switch (type) {
            case 'SICK_LEAVE': return 'Benefits';
            case 'OVERTIME_REQUEST': return 'Payroll';
            case 'TRAINING_RESCHEDULE': return 'Training';
            case 'VACATION_REQUEST': return 'Benefits';
            default: return 'HR Support';
        }
    };

    const selectedTicketData = tickets.find(t => t.id === selectedTicket);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Summary Cards */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="px-8 py-4 bg-blue-500 text-white rounded-full font-bold shadow-lg">
                        Open Tickets {openCount}
                    </div>
                    <div className="px-8 py-4 bg-yellow-400 text-yellow-900 rounded-full font-bold shadow-lg">
                        Awaiting Action {awaitingCount}
                    </div>
                    <div className="px-8 py-4 bg-green-500 text-white rounded-full font-bold shadow-lg">
                        Resolved (Last 30 Days) {resolvedCount}
                    </div>
                </div>

                {/* Tabs and Create Button */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center space-x-8">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === 'all'
                                    ? 'text-gray-900 border-[#DA291C]'
                                    : 'text-gray-400 border-transparent hover:text-gray-600'
                                    }`}
                            >
                                All Tickets
                            </button>
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === 'active'
                                    ? 'text-gray-900 border-[#DA291C]'
                                    : 'text-gray-400 border-transparent hover:text-gray-600'
                                    }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setActiveTab('historical')}
                                className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === 'historical'
                                    ? 'text-gray-900 border-[#DA291C]'
                                    : 'text-gray-400 border-transparent hover:text-gray-600'
                                    }`}
                            >
                                Historical
                            </button>
                        </div>
                        <button
                            onClick={() => setChatOpen(true)}
                            className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 active:scale-95 transition-all flex items-center space-x-2"
                        >
                            <span>+</span>
                            <span>Create New Ticket</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ticket ID</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Created</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            No tickets found. Click "Create New Ticket" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTickets.map((ticket) => {
                                        const statusBadge = getStatusBadge(ticket.status);
                                        return (
                                            <tr
                                                key={ticket.id}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => setSelectedTicket(ticket.id)}
                                            >
                                                <td className="px-6 py-4 text-sm font-mono text-gray-900">#{ticket.id.replace('REQ-', 'AC-').replace('CHAT-', 'AC-').slice(0, 10)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{getCategoryFromType(ticket.type)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                                    {ticket.type === 'SICK_LEAVE' ? 'Sick leave request' :
                                                        ticket.type === 'OVERTIME_REQUEST' ? 'Overtime hour request' :
                                                            ticket.type === 'TRAINING_RESCHEDULE' ? 'Training reschedule request' :
                                                                ticket.summary?.slice(0, 40) || 'HR Request'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {ticket.timestamp.toISOString().split('T')[0]}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color}`}>
                                                        {statusBadge.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Ticket Details Modal */}
            {selectedTicketData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-[#001E62] p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black">{selectedTicketData.type.replace('_', ' ')}</h2>
                                    <p className="text-white/60 text-sm mt-1">Ticket #{selectedTicketData.id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                                    <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold ${getStatusBadge(selectedTicketData.status).color}`}>
                                        {getStatusBadge(selectedTicketData.status).text}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Summary</p>
                                    <p className="text-gray-700">{selectedTicketData.summary}</p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conversation Transcript</p>
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 max-h-60 overflow-y-auto">
                                        {selectedTicketData.conversationTranscript && selectedTicketData.conversationTranscript.length > 0 ? (
                                            selectedTicketData.conversationTranscript.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.speaker === 'user'
                                                        ? 'bg-[#DA291C] text-white'
                                                        : 'bg-white text-gray-800 border border-gray-200'
                                                        }`}>
                                                        <p className="text-xs font-bold opacity-60 mb-1">
                                                            {msg.speaker === 'user' ? 'You' : 'AI Assistant'}
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

                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detected Intent</p>
                                    <div className="inline-block px-4 py-2 bg-[#00A0DC]/10 text-[#00A0DC] rounded-xl text-sm font-bold">
                                        {selectedTicketData.intent}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Chatbot Button */}
            {!chatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-[#001E62] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white group"
                >
                    <div className="absolute inset-0 rounded-full bg-[#001E62] animate-ping opacity-20 group-active:animate-none"></div>
                    <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </button>
            )}

            {/* Chatbot Widget with AI prompt */}
            {chatOpen && (
                <div className="fixed bottom-24 right-6 w-80 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
                    <div className="relative">
                        <button
                            onClick={() => setChatOpen(false)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-20"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <ChatInterface
                            lang={lang}
                            onIntentDetected={() => { }}
                            micTrigger={0}
                            employeeId={authState.userId || undefined}
                            employeeName={authState.userName || undefined}
                            onTicketCreated={(ticketId) => {
                                setTicketPopup(ticketId);
                                setTimeout(() => setTicketPopup(null), 5000);
                            }}
                        />
                    </div>
                    {/* AI Prompt Bubble */}
                    <div className="absolute -left-64 bottom-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 max-w-[240px]">
                        <p className="text-sm text-gray-700">
                            Hi {authState.userName?.split(' ')[0]}, would you like to check the status of a specific request?
                        </p>
                        <div className="absolute right-[-8px] bottom-4 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-white"></div>
                    </div>
                </div>
            )}

            {/* Full-Screen Ticket Created Popup */}
            {ticketPopup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md mx-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-3">Ticket Created!</h3>
                        <p className="text-gray-600 mb-4">Your request has been submitted and is being processed by the HR team.</p>
                        <p className="text-sm text-gray-400 font-mono mb-6">Reference: #{ticketPopup}</p>
                        <button
                            onClick={() => setTicketPopup(null)}
                            className="px-8 py-3 bg-[#DA291C] text-white rounded-xl font-bold text-sm hover:bg-[#b8231a] active:scale-95 transition-all shadow-lg"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
