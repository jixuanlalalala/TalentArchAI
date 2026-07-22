/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, ChevronDown } from 'lucide-react';

export default function CreateJobModal({
  isOpen,
  onClose,
  onSubmit,
  jobForm,
  setJobForm
}) {
  if (!isOpen) return null;

  const isMaxInvalid = jobForm.salaryMin !== '' && jobForm.salaryMax !== '' && Number(jobForm.salaryMax) < Number(jobForm.salaryMin);

  const formatWithCommas = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).replace(/\D/g, '');
    if (!str) return '';
    return Number(str).toLocaleString('en-US');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="create-job-modal">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">
            Create New Job Posting
          </h3>
          <button
            id="close-create-job-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh] font-medium text-slate-700">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Job Title
            </label>
            <input
              id="job-form-title"
              type="text"
              required
              placeholder="e.g. Senior Frontend Engineer"
              value={jobForm.title}
              onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 placeholder-slate-400 focus:border-[#1D5BF2] transition-all font-semibold"
            />
          </div>

          {/* Salary & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col justify-between">
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
                Salary Range
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold select-none pointer-events-none">
                    RM
                  </span>
                  <input
                    id="job-form-salary-min"
                    type="text"
                    placeholder="Min"
                    value={formatWithCommas(jobForm.salaryMin)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      const numValue = rawValue === '' ? '' : Number(rawValue);
                      setJobForm(prev => ({ ...prev, salaryMin: numValue }));
                    }}
                    className="w-full pl-11 pr-3 py-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-none text-sm text-slate-800 placeholder-slate-400 focus:border-[#1D5BF2] transition-all font-semibold"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400 px-0.5 select-none shrink-0">to</span>
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold select-none pointer-events-none">
                    RM
                  </span>
                  <input
                    id="job-form-salary-max"
                    type="text"
                    placeholder="Max"
                    value={formatWithCommas(jobForm.salaryMax)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      const numValue = rawValue === '' ? '' : Number(rawValue);
                      setJobForm(prev => ({ ...prev, salaryMax: numValue }));
                    }}
                    className={`w-full pl-11 pr-3 py-3 bg-slate-50 border rounded-xl outline-none text-sm text-slate-800 placeholder-slate-400 transition-all font-semibold ${
                      isMaxInvalid 
                        ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 text-rose-600' 
                        : 'border-slate-200/80 focus:border-[#1D5BF2]'
                    }`}
                  />
                </div>
              </div>
              {isMaxInvalid && (
                <p className="text-[10px] text-rose-500 font-bold leading-tight" id="salary-error-alert">
                  Max salary cannot be less than min
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
                Type
              </label>
              <div className="relative">
                <select
                  id="job-form-type"
                  value={jobForm.type}
                  onChange={(e) => setJobForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-none text-sm text-slate-800 focus:border-[#1D5BF2] transition-all appearance-none cursor-pointer"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Location & Required Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
                Location
              </label>
              <input
                id="job-form-location"
                type="text"
                placeholder="e.g. Kajang, Selangor"
                value={jobForm.location}
                onChange={(e) => setJobForm(prev => ({ ...prev, location: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-none text-sm text-slate-800 placeholder-slate-400 focus:border-[#1D5BF2] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
                Required Skills (comma separated)
              </label>
              <input
                id="job-form-skills"
                type="text"
                placeholder="React, Tailwind, Node.js"
                value={jobForm.skills}
                onChange={(e) => setJobForm(prev => ({ ...prev, skills: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-none text-sm text-slate-800 placeholder-slate-400 focus:border-[#1D5BF2] transition-all font-mono text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Job Description
            </label>
            <textarea
              id="job-form-description"
              rows={4}
              placeholder="Provide a brief overview of the role and responsibilities..."
              value={jobForm.description}
              onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 placeholder-slate-400 focus:border-[#1D5BF2] transition-all resize-none font-medium leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isMaxInvalid}
              className="bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/15 transition-all cursor-pointer"
            >
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
