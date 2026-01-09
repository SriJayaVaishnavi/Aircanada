import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Ticket, ConversationMessage, AuthState } from '../types';

interface SharedDataContextType {
    tickets: Ticket[];
    addTicket: (ticket: Ticket) => void;
    updateTicketStatus: (id: string, status: 'PENDING' | 'APPROVED' | 'DENIED') => void;
    authState: AuthState;
    login: (userId: string, userName: string, userRole: 'EMPLOYEE' | 'HR_PLANNER') => void;
    logout: () => void;
}

const SharedDataContext = createContext<SharedDataContextType | undefined>(undefined);

export const useSharedData = () => {
    const context = useContext(SharedDataContext);
    if (!context) {
        throw new Error('useSharedData must be used within a SharedDataProvider');
    }
    return context;
};

interface Props {
    children: ReactNode;
}

// Helper to handle Date serialization in LocalStorage
const serializeDate = (obj: any) => JSON.parse(JSON.stringify(obj));
const deserializeDate = (obj: any) => {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map(deserializeDate);
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            if (key === 'timestamp' || key === 'date') {
                newObj[key] = new Date(obj[key]);
            } else {
                newObj[key] = deserializeDate(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};

export const SharedDataProvider: React.FC<Props> = ({ children }) => {
    // Initial mock tickets
    const MOCK_TICKETS: Ticket[] = [
        {
            id: 'AC-8829',
            employeeName: 'Jean Tremblay',
            employeeId: 'AC78923',
            type: 'SICK_LEAVE',
            status: 'APPROVED',
            timestamp: new Date('2024-07-25'),
            conversationTranscript: [{ speaker: 'user', text: 'I need to take sick leave', timestamp: new Date() }],
            intent: 'SICK_LEAVE',
            summary: 'Health insurance inquiry - approved sick leave for 2 days',
            extractedData: { employeeId: 'AC78923', employeeName: 'Jean Tremblay', station: 'YYZ', workgroup: 'Ramp Services' },
            complianceStatus: 'PASSED',
            auditLog: 'SICK_LEAVE|AC78923|2024-07-25|APPROVED',
            reasonBadge: 'AUTO_APPROVED',
            ruleChecks: [{ rule: 'Sick Day Balance', result: 'PASS', details: '7 days remaining' }],
            systemStatus: [{ system: 'PeopleSoft', status: 'UPDATED' }]
        },
        {
            id: 'AC-8828',
            employeeName: 'Jean Tremblay',
            employeeId: 'AC78923',
            type: 'OVERTIME_REQUEST',
            status: 'APPROVED',
            timestamp: new Date('2024-07-24'),
            conversationTranscript: [{ speaker: 'user', text: 'I need 2 hours overtime', timestamp: new Date() }],
            intent: 'OVERTIME_REQUEST',
            summary: 'Overtime request for 2 hours - approved within limits',
            extractedData: { employeeId: 'AC78923', employeeName: 'Jean Tremblay', station: 'YYZ', workgroup: 'Ramp Services' },
            complianceStatus: 'PASSED',
            auditLog: 'OVERTIME|AC78923|2024-07-24|APPROVED',
            reasonBadge: 'AUTO_APPROVED',
            ruleChecks: [{ rule: 'Weekly OT Limit', result: 'PASS', details: '9/12 hours' }],
            systemStatus: [{ system: 'UnionCompliance', status: 'APPROVED' }]
        },
        {
            id: 'AC-8830',
            employeeName: 'Sarah Liu',
            employeeId: 'AC45678',
            type: 'OVERTIME_REQUEST',
            status: 'PENDING',
            timestamp: new Date('2024-07-26'),
            conversationTranscript: [
                { speaker: 'user', text: 'I need 3 hours of overtime for tomorrow', timestamp: new Date() },
                { speaker: 'ai', text: 'I see you have already used 12 out of 12 allowed hours this week. This request exceeds the Union Rule 4.2 limit. I am escalating this to HR for review.', timestamp: new Date() }
            ],
            intent: 'OVERTIME_REQUEST',
            summary: 'Overtime request for 3 hours - exceeds weekly limit, escalated to HR',
            extractedData: { employeeId: 'AC45678', employeeName: 'Sarah Liu', station: 'YVR', workgroup: 'Ramp Services' },
            complianceStatus: 'ESCALATED',
            auditLog: 'OVERTIME|AC45678|2024-07-26|ESCALATED',
            reasonBadge: 'OT_LIMIT_EXCEEDED',
            ruleChecks: [{ rule: 'Weekly OT Limit (Union Rule 4.2)', result: 'FAIL', details: '12/12 hours used - request would exceed limit' }],
            systemStatus: [
                { system: 'Union Compliance', status: 'CHECKED' },
                { system: 'HR Review', status: 'PENDING' }
            ]
        },
        {
            id: 'AC-8831',
            employeeName: 'Sarah Liu',
            employeeId: 'AC45678',
            type: 'TRAINING_RESCHEDULE',
            status: 'PENDING',
            timestamp: new Date('2024-07-26'),
            conversationTranscript: [
                { speaker: 'user', text: 'I need to reschedule my Safety Training from Dec 23 at 2 PM', timestamp: new Date() },
                { speaker: 'ai', text: 'I can help with that. What date and time would work better for you?', timestamp: new Date() },
                { speaker: 'user', text: 'Can we do Dec 24 at 10 AM instead?', timestamp: new Date() }
            ],
            intent: 'TRAINING_RESCHEDULE',
            summary: 'Training reschedule request - Safety Training from Dec 23 2PM to Dec 24 10AM',
            extractedData: { employeeId: 'AC45678', employeeName: 'Sarah Liu', station: 'YVR', workgroup: 'Ramp Services' },
            complianceStatus: 'PENDING',
            auditLog: 'TRAINING_RESCHEDULE|AC45678|2024-07-26|PENDING',
            reasonBadge: 'AWAITING_APPROVAL',
            ruleChecks: [{ rule: 'Reschedule Notice Period', result: 'PASS', details: 'Request made with sufficient notice' }],
            systemStatus: [
                { system: 'Training System', status: 'PENDING' },
                { system: 'HR Approval', status: 'PENDING' }
            ]
        }
    ];

    // Load from LocalStorage or use initial
    const loadTickets = () => {
        const saved = localStorage.getItem('ac_tickets');
        return saved ? deserializeDate(JSON.parse(saved)) : MOCK_TICKETS;
    };

    const loadAuth = () => {
        const saved = localStorage.getItem('ac_auth');
        return saved ? JSON.parse(saved) : { isAuthenticated: false, userId: null, userName: null, userRole: null };
    };

    const [tickets, setTickets] = useState<Ticket[]>(loadTickets);
    const [authState, setAuthState] = useState<AuthState>(loadAuth);

    // Sync state to LocalStorage
    useEffect(() => {
        localStorage.setItem('ac_tickets', JSON.stringify(tickets));
    }, [tickets]);

    useEffect(() => {
        localStorage.setItem('ac_auth', JSON.stringify(authState));
    }, [authState]);

    // Listen for storage changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'ac_tickets' && e.newValue) {
                setTickets(deserializeDate(JSON.parse(e.newValue)));
            }
            if (e.key === 'ac_auth' && e.newValue) {
                setAuthState(JSON.parse(e.newValue));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const addTicket = (ticket: Ticket) => {
        setTickets(prev => [ticket, ...prev]);
    };

    const updateTicketStatus = (id: string, status: 'PENDING' | 'APPROVED' | 'DENIED') => {
        setTickets(prev => prev.map(ticket =>
            ticket.id === id ? { ...ticket, status } : ticket
        ));
    };

    const login = (userId: string, userName: string, userRole: 'EMPLOYEE' | 'HR_PLANNER') => {
        setAuthState({
            isAuthenticated: true,
            userId,
            userName,
            userRole
        });
    };

    const logout = () => {
        setAuthState({
            isAuthenticated: false,
            userId: null,
            userName: null,
            userRole: null
        });
    };

    return (
        <SharedDataContext.Provider value={{ tickets, addTicket, updateTicketStatus, authState, login, logout }}>
            {children}
        </SharedDataContext.Provider>
    );
};
