
import React from 'react';
import { Language } from '../types';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
}

export const LanguageToggle: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div className="flex bg-gray-200 rounded-lg p-1">
      <button
        onClick={() => onChange('EN')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          current === 'EN' ? 'bg-white text-[#DA291C] shadow-sm' : 'text-gray-600'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange('FR')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          current === 'FR' ? 'bg-white text-[#DA291C] shadow-sm' : 'text-gray-600'
        }`}
      >
        FR
      </button>
    </div>
  );
};
