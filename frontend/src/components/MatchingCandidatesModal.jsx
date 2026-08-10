/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bot, X } from 'lucide-react';

export default function MatchingCandidatesModal({
  isOpen,
  onClose,
  onAddCandidates,
  matchingCandidates = [],
  isAdding = false,
  error = ''
}) {
  if (!isOpen) return null;

  const avatarColors = [
    'bg-indigo-100 text-indigo-700 border border-indigo-200/60',
    'bg-orange-100 text-orange-700 border border-orange-200/60',
    'bg-blue-100 text-blue-700 border border-blue-200/60',
    'bg-emerald-100 text-emerald-700 border border-emerald-200/60'
  ];

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="matching-candidates-modal">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-7 flex flex-col space-y-5 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button X */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full cursor-pointer absolute top-6 right-6"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-[#1D5BF2] border border-blue-100 rounded-2xl flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {matchingCandidates.length} Existing Candidates Found
            </h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              TalentArch found {matchingCandidates.length} existing candidate{matchingCandidates.length !== 1 ? 's' : ''} in your talent pool that may be relevant to this job. Would you like to add them for AI analysis?
            </p>
          </div>
        </div>

        {/* Suggested Candidates Container */}
        <div className="bg-[#F8FAFC] border border-slate-100 p-4 rounded-2xl space-y-3">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
            SUGGESTED CANDIDATES
          </span>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {matchingCandidates.map((cand, idx) => {
              const colorClass = avatarColors[idx % avatarColors.length];
              const score = Number.isFinite(cand.preliminary_relevance)
                ? cand.preliminary_relevance
                : null;
              
              return (
                <div
                  key={cand.id || idx}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full ${colorClass} font-mono font-bold text-xs flex items-center justify-center shrink-0`}>
                      {getInitials(cand.name)}
                    </div>
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {cand.name}
                    </span>
                  </div>

                  <span className="bg-emerald-100/80 text-emerald-700 font-extrabold font-mono text-xs px-2.5 py-1 rounded-full shrink-0">
                    {score === null ? '--' : `${score}%`} Relevance
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="text-sm font-semibold text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold py-3 px-5 rounded-xl transition-all cursor-pointer text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onAddCandidates(matchingCandidates)}
            disabled={isAdding}
            className="w-1/2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold py-3 px-5 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add Candidates'}
          </button>
        </div>

      </div>
    </div>
  );
}
