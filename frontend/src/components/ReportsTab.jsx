import React, { useEffect } from "react";
import { SlidersHorizontal, Download, FileText, Users, Check } from 'lucide-react';

export default function ReportsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/** Sidebar Left Column */}
      <div className="lg:col-span-4 space-y-6">
        {/** Active Job Postings section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Active Job Postings
          </h3>

          {/** If no job found, eg. jobs.length === 0 */}
          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs font-medium text-slate-400">
            No active job postings. Create a job first to view matching candidates.
          </div>

          {/** If job found */}
          <div className="space-y-2">
            <button
              className="w-full text-left p-4 rounded-xl transition-all border flex flex-col gap-1.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <h4 className="font-extrabold text-sm leading-snug">
                {/**job.title*/} random job
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block">
              {/**count */}Applicants {/**job.location */}
            </span>
            </button>
          </div>
        </div>

        {/** Include in Report Section (Checkboxes) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Include in Report
          </h3>

          {/** Candidate Name always include in the report */}
          <div className="space-y-3 font-medium">
            <label className="flex items-center gap-3 text-sm text-slate-500 opacity-80 cursor-not-allowed">
              <div className="w-5 h-5 bg-[#1D5BF2] text-white rounded flex items-center justify-center border border-[#1D5BF2]">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Candidate Name</span>
            </label>

            {/** Email */}
            <label className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#1D5BF2] cursor-pointer">
              <input 
                id="checkbox-email"
                type="checkbox"
                className="w-5 h-5 rounded border-slate-200 text-[#1D5BF2] focus:ring-[#1D5BF2]"
              />
              <span>Email</span>
            </label>

            {/** Phone */}
            <label className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#1D5BF2] cursor-pointer">
              <input 
                id="checkbox-phone"
                type="checkbox"
                className="w-5 h-5 rounded border-slate-200 text-[#1D5BF2] focus:ring-[#1D5BF2]"
              />
              <span>Phone</span>
            </label>

            {/** Match Score */}
            <label className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#1D5BF2] cursor-pointer">
              <input 
                id="checkbox-score"
                type="checkbox"
                className="w-5 h-5 rounded border-slate-200 text-[#1D5BF2] focus:ring-[#1D5BF2]"
              />
              <span>Match Score</span>
            </label>

            {/** Short Summary */}
            <label className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#1D5BF2] cursor-pointer">
              <input 
                id="checkbox-summary"
                type="checkbox"
                className="w-5 h-5 rounded border-slate-200 text-[#1D5BF2] focus:ring-[#1D5BF2]"
              />
              <span>Short Summary</span>
            </label>

            {/** Gap Analysis */}
            <label className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#1D5BF2] cursor-pointer">
              <input 
                id="checkbox-gaps"
                type="checkbox"
                className="w-5 h-5 rounded border-slate-200 text-[#1D5BF2] focus:ring-[#1D5BF2]"
              />
              <span>Gap Analysis</span>
            </label>
          </div>
        </div>
      </div>

      {/** Main Content Right Column */}
      <div className="lg:col-span-8 space-y-6">

        {/** Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Report Focus
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5" id="report-focus-title">
              Candidate Comparison: {/**jobtitle else*/} No Job Selected
            </h3>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto">
            <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Match Score (Highest)</span>
            </div>

            <button 
              id="download-report-btn"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Report</span>
            </button>
          </div>
        </div>


        {/** Candidates Comparison Table */}
        {/** If no job found found */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center" id="report-no-job-state">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-slate-700">
            No Job Posting Chosen
          </h4>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Create a job posting and assign candidates to generate candidate reports
          </p>
        </div>

        {/** If job found but no candidates */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center" id="report-empty-state">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
          <h4 className="text-lg font-bold text-slate-700">
            No Candidates Assigned
          </h4>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            There are currently no candidates assigned to this job.
          </p>
        </div>

        {/** If job found and candidates available */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="report-results-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">                    
                  <th className="px-6 py-4.5">Candidate</th>
                  <th className="px-6 py-4.5">Email Address</th>
                  <th className="px-6 py-4.5">Phone</th>
                  <th className="px-6 py-4.5">Match Score</th>
                  <th className="px-6 py-4.5">Summary</th>
                  <th className="px-6 py-4.5">Gap Analysis</th>
                  <th className="px-6 py-4.5">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  {/** Candidate */}
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1D5BF2] border border-blue-100 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        initial name
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 leading-tight">
                          name
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          title
                        </p>
                      </div>
                    </div>
                  </td>

                  {/** Email */}
                  <td className="px-6 py-4.5 text-slate-500 font-mono font-medium">
                    abd@email
                  </td>

                  {/** Phone */}
                  <td className="px-6 py-4.5 text-slate-500 font-mono font-medium">
                    112334545536
                  </td>

                  {/** Match Score */}
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                        {/* <div 
                        className={`h-full rounded-full ${
                                        score >= 80 ? 'bg-emerald-500' :
                                        score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                      }`}
                                      style={{ width: '100%' }}
                        /> */}
                      </div>
                      {/* <span className={`font-mono font-bold text-xs ${
                                    score >= 80 ? 'text-emerald-600' :
                                    score >= 60 ? 'text-amber-600' : 'text-rose-600'
                                  }`}>
                                    {score}%
                      </span> */}
                    </div>
                  </td>

                  {/** Short Summary */}
                  <td className="px-6 py-4.5 text-slate-500 font-medium max-w-xs truncate">
                    random summary
                  </td>

                  {/** Gap analysis */}
                  <td className="px-6 py-4.5 max-w-xs">
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                      Fully Matched
                    </span>
                    {/** or */}
                    <span className="text-rose-500 font-mono text-[10px] block truncate">
                      Missing: Missing skills
                    </span>
                  </td>

                  {/** Status */}
                  <td className="px-6 py-4.5 text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold font-mono uppercase tracking-wider">
                      shortlist or under review or other
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>



      </div>
    </div>
  
  )}
