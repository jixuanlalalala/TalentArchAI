import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Network, User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';


const SignUp = () => {
    const { signUp } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        if (!fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!email.trim()) newErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';
        if (!password) newErrors.password = 'Password is required';
        if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        return newErrors;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError(null);
        
        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: signUpError } = await signUp(email, password, fullName);

            if (signUpError) {
                setError(signUpError.message);
            } else {
                setSuccess(true);
                navigate('/login');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-green-700 mb-4">Success!</h2>
                    <p className="text-green-600">Check your email to verify your account.</p>
                </div>
            </div>
        );
    }

    return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] font-sans overflow-hidden">
      {/* LEFT PANEL - Solid Royal Blue with Features */}
      <div className="w-full md:w-[45%] bg-[#1d5bf2] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle abstract background art/waves */}
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-12 w-96 h-96 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Brand Logo */}
        <div className="z-10">
          <span className="text-2xl font-extrabold tracking-tight" id="signup-logo">TalentArch AI</span>
        </div>

        {/* Middle Feature Cards */}
        <div className="my-auto py-12 md:py-0 z-10 max-w-md">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Feature Card 1: Predictive Hiring */}
            <div 
              className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-60 shadow-lg cursor-pointer hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200"
              id="feature-predictive"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Predictive Hiring</h3>
                <p className="text-xs text-white/80 leading-relaxed font-light">
                  AI-driven insights that forecast candidate success.
                </p>
              </div>
            </div>

            {/* Feature Card 2: Team Synergy */}
            <div 
              className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-60 shadow-lg cursor-pointer hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200"
              id="feature-synergy"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Team Synergy</h3>
                <p className="text-xs text-white/80 leading-relaxed font-light">
                  Measure how new talent matches with your job descriptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info/creds
        <div className="text-white/60 text-xs font-light z-10 hidden md:block">
          © 2026 TalentArch AI. Architecting the future of human capital.
        </div> */}
      </div>

      {/* RIGHT PANEL - Clean off-white Form */}
      <div className="w-full md:w-[55%] flex items-center justify-center p-8 md:p-16 lg:p-24 bg-[#fcfdfe]">
        <div className="w-full max-w-md flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2" id="signup-heading">
              Design your future.
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Join the architectural engine for modern recruitment.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* FULL NAME */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase">
                Full Name
              </label>
              <div className={`relative flex items-center bg-slate-50 rounded-xl transition-all duration-200 border ${
                errors.fullName ? 'border-red-500' : 'border-slate-200 focus-within:border-[#1d5bf2] focus-within:ring-2 focus-within:ring-[#1d5bf2]/20'
              }`}>
                <div className="pl-4 pr-2 text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Alex Sterling"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-4 pr-4 bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400 text-sm"
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>
              )}
            </div>

            {/* WORK EMAIL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase">
                Work Email
              </label>
              <div className={`relative flex items-center bg-slate-50 rounded-xl transition-all duration-200 border ${
                errors.email ? 'border-red-500' : 'border-slate-200 focus-within:border-[#1d5bf2] focus-within:ring-2 focus-within:ring-[#1d5bf2]/20'
              }`}>
                <div className="pl-4 pr-2 text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="alex@company.design"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-4 pr-4 bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400 text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium">{errors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase">
                Password
              </label>
              <div className={`relative flex items-center bg-slate-50 rounded-xl transition-all duration-200 border ${
                errors.password ? 'border-red-500' : 'border-slate-200 focus-within:border-[#1d5bf2] focus-within:ring-2 focus-within:ring-[#1d5bf2]/20'
              }`}>
                <div className="pl-4 pr-2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-4 pr-12 bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400 text-sm tracking-wide"
                />
                <button
                  type="button"
                  id="signup-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium">{errors.password}</p>
              )}
            </div>

            {/* CREATE ACCOUNT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] ${
                isSubmitting ? 'bg-[#1d5bf2]/80 cursor-wait' : 'bg-[#1d5bf2] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/25'
              }`}
              id="signup-submit"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* FOOTER SWITCHER */}
          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#1d5bf2] hover:underline font-bold transition-all ml-1"
            >
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;