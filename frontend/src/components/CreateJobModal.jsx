/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Info,
  RotateCcw,
  X,
} from 'lucide-react';
import { checkJobDescriptionGuidance } from '../utils/jobDescriptionGuidance';
import {
  areMatchingPrioritiesValid,
  createDefaultMatchingPriorities,
  createDefaultRelativeImportance,
  IMPORTANCE_LEVELS,
  MATCHING_PRIORITY_FIELDS,
  matchingPriorityTotal,
  normalizeImportanceToPriorities,
} from '../utils/matchingPriorities';

export default function CreateJobModal({
  isOpen,
  onClose,
  onSubmit,
  jobForm,
  setJobForm
}) {
  const [isGuidancePopoverOpen, setIsGuidancePopoverOpen] = useState(false);
  const [isGuidanceVisible, setIsGuidanceVisible] = useState(false);
  const [arePrioritiesExpanded, setArePrioritiesExpanded] = useState(false);
  const [importanceSelections, setImportanceSelections] = useState(
    createDefaultRelativeImportance
  );
  const [prioritiesCustomized, setPrioritiesCustomized] = useState(false);
  const guidancePopoverRef = useRef(null);
  const guidancePopoverId = useId();

  const description = jobForm.description || '';
  const hasDescription = description.trim().length > 0;
  const matchingPriorities = jobForm.matchingPriorities ||
    createDefaultMatchingPriorities();
  const priorityTotal = matchingPriorityTotal(matchingPriorities);
  const prioritiesAreValid = areMatchingPrioritiesValid(matchingPriorities);
  const guidance = useMemo(
    () => checkJobDescriptionGuidance({
      description,
      weights: matchingPriorities,
    }),
    [description, matchingPriorities]
  );

  useEffect(() => {
    if (!isGuidancePopoverOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!guidancePopoverRef.current?.contains(event.target)) {
        setIsGuidancePopoverOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsGuidancePopoverOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGuidancePopoverOpen]);

  if (!isOpen) return null;

  const isMaxInvalid = jobForm.salaryMin !== '' && jobForm.salaryMax !== '' && Number(jobForm.salaryMax) < Number(jobForm.salaryMin);

  const formatWithCommas = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).replace(/\D/g, '');
    if (!str) return '';
    return Number(str).toLocaleString('en-US');
  };

  const handleClose = () => {
    setIsGuidancePopoverOpen(false);
    setIsGuidanceVisible(false);
    onClose();
  };

  const handleImportanceChange = (key, value) => {
    const nextSelections = {
      ...importanceSelections,
      [key]: value,
    };
    const normalizedPriorities =
      normalizeImportanceToPriorities(nextSelections);
    setImportanceSelections(nextSelections);
    setPrioritiesCustomized(true);
    setJobForm((current) => ({
      ...current,
      matchingPriorities: normalizedPriorities,
    }));
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
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(event) => {
            setIsGuidancePopoverOpen(false);
            onSubmit(event);
          }}
          className="p-6 space-y-4 overflow-y-auto max-h-[80vh] font-medium text-slate-700"
        >
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
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="job-form-description"
                className="block text-xs font-bold text-slate-400 tracking-wider uppercase"
              >
                Job Description
              </label>
              <div
                ref={guidancePopoverRef}
                className="relative"
                onMouseEnter={() => setIsGuidancePopoverOpen(true)}
                onMouseLeave={() => setIsGuidancePopoverOpen(false)}
                onFocus={() => setIsGuidancePopoverOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsGuidancePopoverOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  aria-label="Job description guidance"
                  aria-expanded={isGuidancePopoverOpen}
                  aria-controls={guidancePopoverId}
                  aria-describedby={
                    isGuidancePopoverOpen ? guidancePopoverId : undefined
                  }
                  onClick={() =>
                    setIsGuidancePopoverOpen((isOpenNow) => !isOpenNow)
                  }
                  className="flex items-center justify-center text-slate-400 hover:text-[#1D5BF2] focus:text-[#1D5BF2] focus:outline-none transition-colors cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {isGuidancePopoverOpen ? (
                  <div
                    id={guidancePopoverId}
                    role="tooltip"
                    className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-4rem)] rounded-xl border border-slate-200 bg-white p-3 text-left normal-case tracking-normal shadow-lg"
                  >
                    <p className="text-xs font-bold text-slate-800">
                      Writing a useful job description
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500">
                      For more comprehensive candidate matching, include relevant qualifications, hard skills, work experience, and soft skills. Only include requirements that apply to this role.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <textarea
              id="job-form-description"
              rows={4}
              required
              placeholder="Provide a brief overview of the role and responsibilities..."
              value={jobForm.description}
              onChange={(e) => {
                if (!hasDescription && e.target.value.trim()) {
                  setIsGuidanceVisible(false);
                }
                setJobForm(prev => ({ ...prev, description: e.target.value }));
              }}
              onBlur={() => {
                if (hasDescription) setIsGuidanceVisible(true);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 placeholder-slate-400 focus:border-[#1D5BF2] transition-all resize-none font-medium leading-relaxed"
            />

            {isGuidanceVisible && hasDescription ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-bold text-slate-700">
                  Job Description Guidance
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  <GuidanceItem
                    identified={guidance.criteria.workExperience}
                    identifiedText="Experience expectation identified"
                    unidentifiedText="Experience expectation not identified"
                  />
                  <GuidanceItem
                    identified={guidance.criteria.education}
                    identifiedText="Education requirement identified"
                    unidentifiedText="Education requirement not identified"
                  />
                  <GuidanceItem
                    identified={guidance.criteria.softSkills}
                    identifiedText="Soft-skill requirement identified"
                    unidentifiedText="Soft-skill requirement not identified"
                  />
                </div>
                <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-500">
                  Not every criterion is required. Only include requirements relevant to this job.
                </p>
                {guidance.consistencyWarnings.length > 0 ? (
                  <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                    {guidance.consistencyWarnings.map((warning) => (
                      <p
                        key={warning.criterion}
                        className="text-[10px] font-semibold leading-relaxed text-amber-700"
                      >
                        {warning.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Matching Priorities */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              aria-expanded={arePrioritiesExpanded}
              aria-controls="matching-priorities-fields"
              onClick={() => setArePrioritiesExpanded((expanded) => !expanded)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left cursor-pointer"
            >
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Customize Matching Priorities (Optional)
                </p>
                <p className="mt-1 text-[12px] font-medium text-slate-400">
                  {MATCHING_PRIORITY_FIELDS.map(
                    ({ key, label }) => `${label} ${matchingPriorities[key]}%`
                  ).join(' · ')}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  arePrioritiesExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {arePrioritiesExpanded ? (
              <div
                id="matching-priorities-fields"
                className="border-t border-slate-100 p-3"
              >
                <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                    {prioritiesCustomized
                      ? 'Using your relative-importance selections.'
                      : 'Using default priorities: Hard Skills 45% · Work Experience 30% · Education 15% · Soft Skills 10%. Change any importance level to customize.'}
                  </p>
                </div>

                <div className="space-y-2">
                  {MATCHING_PRIORITY_FIELDS.map(({ key, label }) => (
                    <fieldset
                      key={key}
                      className="rounded-lg border border-slate-100 p-2.5"
                    >
                      <legend className="sr-only">
                        {label} importance
                      </legend>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                          {label}
                        </span>
                        <span className="text-xs font-bold text-[#1D5BF2]">
                          {matchingPriorities[key]}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4" role="radiogroup" aria-label={`${label} importance`}>
                        {IMPORTANCE_LEVELS.map((level) => (
                          <div key={level.value} className="relative">
                            <input
                              id={`matching-priority-${key}-${level.value}`}
                              type="radio"
                              name={`matching-priority-${key}`}
                              value={level.value}
                              checked={importanceSelections[key] === level.value}
                              onChange={() =>
                                handleImportanceChange(key, level.value)
                              }
                              className="peer sr-only"
                            />
                            <label
                              htmlFor={`matching-priority-${key}-${level.value}`}
                              className={`flex min-h-8 items-center justify-center gap-1 rounded-md border px-1.5 py-1.5 text-[12px] font-bold transition-all cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[#1D5BF2]/40 peer-focus-visible:ring-offset-1 ${
                                importanceSelections[key] === level.value
                                  ? 'border-[#1D5BF2] bg-[#1D5BF2] text-white shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {importanceSelections[key] === level.value ? (
                                <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                              ) : null}
                              <span>{level.label}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div aria-live="polite">
                    <p className={`text-[12px] font-bold ${
                      prioritiesAreValid ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      Total: {priorityTotal}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportanceSelections(createDefaultRelativeImportance());
                      setPrioritiesCustomized(false);
                      setJobForm((current) => ({
                        ...current,
                        matchingPriorities: createDefaultMatchingPriorities(),
                      }));
                    }}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-[#1D5BF2] hover:text-blue-700 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset to Defaults
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isMaxInvalid || !prioritiesAreValid}
              className="bg-[#1D5BF2] hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/15 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GuidanceItem({ identified, identifiedText, unidentifiedText }) {
  const Icon = identified ? CheckCircle2 : Circle;

  return (
    <div className="flex items-start gap-1.5 text-[10px] font-semibold leading-relaxed text-slate-600">
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
          identified ? 'text-[#1D5BF2]' : 'text-slate-300'
        }`}
        aria-hidden="true"
      />
      <span>{identified ? identifiedText : unidentifiedText}</span>
    </div>
  );
}
