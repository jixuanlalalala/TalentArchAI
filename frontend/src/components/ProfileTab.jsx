import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Shield,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  deactivateRecruiterAccount,
  getRecruiterProfile,
  updateRecruiterProfile,
} from '../services/profileService';

const profileFromUser = (user) => ({
  full_name: user?.user_metadata?.full_name || '',
  job_title: user?.user_metadata?.job_title || '',
  phone: user?.user_metadata?.phone || '',
});

const profileFromRecord = (record, user) =>
  record
    ? {
        full_name: record.name ?? user?.user_metadata?.full_name ?? '',
        job_title: record.job_title ?? '',
        phone: record.phone ?? '',
      }
    : profileFromUser(user);

const profilesMatch = (left, right) =>
  left.full_name === right.full_name &&
  left.job_title === right.job_title &&
  left.phone === right.phone;

export default function ProfileTab() {
  const { user, forgotPassword, clearLocalSession } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => profileFromUser(user));
  const [savedProfile, setSavedProfile] = useState(() => profileFromUser(user));
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isDirty = !profilesMatch(profile, savedProfile);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setError('');
      try {
        const storedProfile = await getRecruiterProfile();
        if (cancelled) return;
        const loadedProfile = profileFromRecord(storedProfile, user);
        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'The recruiter profile could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setProfile(savedProfile);
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    if (saving || loadingProfile || !isDirty) return;

    const normalizedProfile = {
      full_name: profile.full_name.trim(),
      job_title: profile.job_title.trim(),
      phone: profile.phone.trim(),
    };

    if (!normalizedProfile.full_name) {
      setError('Full name is required.');
      return;
    }
    if (normalizedProfile.full_name.length > 100) {
      setError('Full name must be 100 characters or fewer.');
      return;
    }
    if (normalizedProfile.job_title.length > 100) {
      setError('Job title must be 100 characters or fewer.');
      return;
    }
    if (normalizedProfile.phone.length > 40) {
      setError('Phone number must be 40 characters or fewer.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const persistedProfile = await updateRecruiterProfile({
        name: normalizedProfile.full_name,
        job_title: normalizedProfile.job_title,
        phone: normalizedProfile.phone,
      });
      if (!persistedProfile) {
        throw new Error('The recruiter profile could not be saved.');
      }

      const updatedProfile = profileFromRecord(persistedProfile, user);
      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);
      setMessage('Profile changes saved successfully.');
    } catch {
      setError('Profile changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (sendingPasswordReset || !user?.email) return;

    setSendingPasswordReset(true);
    setMessage('');
    setError('');
    try {
      const { error: resetError } = await forgotPassword(user.email);
      if (resetError) {
        setError(resetError.message || 'The password reset email could not be sent.');
        return;
      }
      setMessage('A secure password reset link has been sent to your email.');
    } catch {
      setError('The password reset email could not be sent. Please try again.');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const closeDeactivateModal = () => {
    if (!deactivating) setShowDeactivateModal(false);
  };

  const handleDeactivateAccount = async () => {
    if (deactivating) return;

    setDeactivating(true);
    setMessage('');
    setError('');
    try {
      await deactivateRecruiterAccount();
      const { error: signOutError } = await clearLocalSession();
      if (signOutError) {
        throw new Error('Your account was deactivated, but the local session could not be cleared.');
      }
      navigate('/login', { replace: true });
    } catch (deactivationError) {
      setError(
        deactivationError.message ||
          'The account could not be deactivated. Please try again.'
      );
      setShowDeactivateModal(false);
    } finally {
      setDeactivating(false);
    }
  };

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
            type="button"
            onClick={handleCancel}
            disabled={!isDirty || saving || loadingProfile}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            id="profile-save-btn"
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving || loadingProfile}
            className="bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
          {message}
        </div>
      ) : null}

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
            <label htmlFor="profile-full-name" className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Full Name
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={profile.full_name}
              onChange={(event) => updateField('full_name', event.target.value)}
              disabled={loadingProfile || saving}
              maxLength={100}
              autoComplete="name"
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1D5BF2]/15 focus:border-[#1D5BF2] transition-all font-semibold text-slate-800"
            />
          </div>

          {/** JOB TITLE */}
          <div className="space-y-1.5">
            <label htmlFor="profile-job-title" className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Job Title
            </label>
            <input
              id="profile-job-title"
              type="text"
              value={profile.job_title}
              onChange={(event) => updateField('job_title', event.target.value)}
              disabled={loadingProfile || saving}
              maxLength={100}
              autoComplete="organization-title"
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1D5BF2]/15 focus:border-[#1D5BF2] transition-all font-semibold text-slate-800"
            />
          </div>

          {/** EMAIL ADDRESS */}
          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              value={user?.email || ''}
              readOnly
              aria-readonly="true"
              autoComplete="email"
              className="w-full p-3.5 bg-slate-100 border border-slate-200/80 rounded-xl text-sm outline-none font-semibold text-slate-500 cursor-not-allowed"
            />
          </div>

          {/** PHONE NUMBER */}
          <div className="space-y-1.5">
            <label htmlFor="profile-phone" className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
              Phone Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={profile.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              disabled={loadingProfile || saving}
              maxLength={40}
              autoComplete="tel"
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
                <p className="text-xs text-slate-400 font-medium">Receive a secure reset link by email</p>
              </div>
            </div>
            <button
              id="btn-cfg-password"
              type="button"
              onClick={handlePasswordReset}
              disabled={sendingPasswordReset || !user?.email}
              className="text-xs font-bold text-[#1D5BF2] hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{sendingPasswordReset ? 'Sending...' : 'Change'}</span>
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
            Suspend account access while preserving your recruitment data
          </p>
        </div>
        <button
          id="profile-deactivate-btn"
          type="button"
          onClick={() => {
            setError('');
            setMessage('');
            setShowDeactivateModal(true);
          }}
          className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0"
        >
          Deactivate
        </button>
      </div>

      {showDeactivateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-account-title"
          aria-describedby="deactivate-account-description"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="deactivate-account-title"
                    className="text-lg font-extrabold text-slate-950"
                  >
                    Deactivate account?
                  </h3>
                  <p
                    id="deactivate-account-description"
                    className="mt-1 text-sm font-medium text-slate-500"
                  >
                    You will be signed out and unable to access TalentArch AI.
                    Your jobs, candidates, resumes, and reports will be preserved.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeactivateModal}
                disabled={deactivating}
                aria-label="Close deactivation confirmation"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeactivateModal}
                disabled={deactivating}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={deactivating}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  
  )}
