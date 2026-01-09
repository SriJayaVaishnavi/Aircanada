
import React from 'react';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

export const MetricsDashboard: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t.metrics}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">{t.callsHandled}</p>
          <p className="text-2xl font-bold text-[#001E62]">47</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">{t.chatSessions}</p>
          <p className="text-2xl font-bold text-[#001E62]">32</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">{t.avgTime}</p>
          <p className="text-xl font-bold text-[#001E62]">2.3m <span className="text-xs text-green-600">↓72%</span></p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">{t.autoResolved}</p>
          <p className="text-2xl font-bold text-[#2E7D32]">89%</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">{t.compliancePass}</p>
          <p className="text-2xl font-bold text-[#2E7D32]">100%</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">CSAT</p>
          <p className="text-2xl font-bold text-[#00A0DC]">4.7/5</p>
        </div>
      </div>
    </div>
  );
};
