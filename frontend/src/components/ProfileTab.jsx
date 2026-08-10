import React from 'react'
import { User, SlidersHorizontal, Bell, Shield, Globe, ChevronRight, Plus } from 'lucide-react';

export default function ProfileTab() {
  return (
    <div className="space-y-6">
      {/** Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5" id="profile-header-container">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight" id="profile-title">
            Profile Settings
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your personal profile and account credentials
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="profile-cancel-btn"
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="profile-save-btn"
            className="bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/** CARD 1 : PERSONAL INFORMATION */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6" id="profile-personal-card">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D5BF2] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Personal Information</h3>
            <p className="text-xs text-slate-400 font-medium">Update profiles and contact variables.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-medium text-slate-700">
          {/** FULL NAME */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Full Name
            </label>
            <input 
              id="profile-full-name"
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1D5BF2]/15 focus:border-[#1D5BF2] transition-all font-semibold text-slate-800"
            />
          </div>

          {/** JOB TITLE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Job Title
            </label>
            <input 
              id="profile-job-title"
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1D5BF2]/15 focus:border-[#1D5BF2] transition-all font-semibold text-slate-800"
            />
          </div>

          {/** EMAIL ADDRESS */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Email Address
            </label>
            <input 
              id="profile-email"
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1D5BF2]/15 focus:border-[#1D5BF2] transition-all font-semibold text-slate-800"
            />
          </div>

          {/** PHONE NUMBER */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Phone Number
            </label>
            <input 
              id="profile-phone"
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1D5BF2]/15 focus:border-[#1D5BF2] transition-all font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/** CARD 2: ACCOUNT SETTINGS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="profile-settings-card">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#1D5BF2] flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Account Settings
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Manage preferences
            </p>
          </div>
        </div>

        {/** Sublist */}
        <div className="divide-y divide-slate-100">


          {/**Update Password */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1D5BF2] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5"/>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Update Password
                </h4>
                <p className="text-xs text-slate-400 font-medium">Last changed 45 days</p>
              </div>
            </div>
            <button
              id="btn-cfg-password"
              className="text-xs font-bold text-[#1D5BF2] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Change</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/** CARD 3: DEACTIVATE ACCOUNT */}
      <div className="bg-white rounded-2xl border-l-4 border-l-rose-500 border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="profile-deactivate-card">
        <div>
          <h4 className="text-sm font-extrabold text-slate-950">Deactivate account</h4>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Temporary suspension of your access and data visibility
          </p>
        </div>
        <button
          id="profile-deactivate-btn"
          className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0"
        >
          Deactivate
        </button>
      </div>
    </div>
  
  )}
