
import React from 'react';
import { TRANSLATIONS } from '../constants';
import { Language, WorkflowStep } from '../types';

interface Props {
  lang: Language;
  steps: WorkflowStep[];
  isProcessing: boolean;
}

export const BackendVisualizer: React.FC<Props> = ({ lang, steps, isProcessing }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-full">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t.backendOrch}</h2>
      <div className="space-y-3">
        {steps.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-200">
            <p className="text-[10px] font-bold uppercase tracking-widest">No active transaction</p>
          </div>
        )}
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex items-center p-3 rounded-xl border transition-all ${
              step.completed ? 'bg-green-50 border-green-200' : 
              step.system.includes('HITL') ? 'bg-amber-50 border-amber-200 animate-pulse' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-3 ${
              step.completed ? 'bg-green-500' : 
              step.system.includes('HITL') ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-gray-300'
            }`} />
            <div className="flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{step.system}</p>
              <p className="text-xs font-bold text-gray-800">{step.action}</p>
            </div>
            {step.completed ? (
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : step.system.includes('HITL') ? (
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : null}
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-center pt-4">
            <div className="animate-pulse flex space-x-2">
              <div className="h-1.5 w-1.5 bg-[#DA291C] rounded-full"></div>
              <div className="h-1.5 w-1.5 bg-[#DA291C] rounded-full"></div>
              <div className="h-1.5 w-1.5 bg-[#DA291C] rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
