
import React from 'react';
import { SessionRecord, Language } from '../types';

interface Props {
  history: SessionRecord[];
  lang: Language;
}

export const ActivityLog: React.FC<Props> = ({ history, lang }) => {
  const isEN = lang === 'EN';
  
  if (history.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isEN ? 'Transaction History' : 'Historique des transactions'}</h2>
          <p className="text-xs font-bold text-gray-900 mt-1">{isEN ? 'Recent Session Logs' : 'Journaux de session récents'}</p>
        </div>
        <div className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
          {history.length} {isEN ? 'Records' : 'Dossiers'}
        </div>
      </div>

      <div className="space-y-3">
        {history.map((record) => (
          <div key={record.id} className="group p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#DA291C]/30 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full ${record.compliance === 'PASSED' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">
                  {record.intent.replace('_', ' ')}
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-700 leading-relaxed line-clamp-2 italic mb-3">
              "{record.summary}"
            </p>
            <div className="pt-3 border-t border-gray-200/50">
              <p className="text-[9px] font-mono text-gray-400 truncate opacity-60">
                AUDIT: {record.audit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
