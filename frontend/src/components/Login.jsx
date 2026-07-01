import React, {useState} from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldAlert, X } from 'lucide-react';


const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const {signIn, forgotPassword} = useAuth();
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetError, setResetError] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};
        if (!email.trim()) newErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';
        if (!password) newErrors.password = 'Password is required';
        return newErrors;
    }

    const handleSubmit = async e => {
        e.preventDefault();
        setError("");
        setErrors({});

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }       

        setIsSubmitting(true);

        try {
            const { error } = await signIn(email, password);

            if (error) {
                setError(error.message);
            } else {
                navigate("/dashboard");
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setResetEmail("");
        setResetError("");
        setResetSuccess(false);
    };

    const handleForgotPasswordSubmit = async e => {
        e.preventDefault();
        setResetError("");
        setIsResetting(true);

        try {
            const { error } = await forgotPassword(resetEmail);
            if (error) {
                setResetError(error.message);
                return;
            } else {
                setResetSuccess(true);
            }
        } catch {
            setResetError("An error occurred. Please try again.");
        } finally {
            setIsResetting(false);
        }
    };

    const onSwitchToSignup = () => {
        navigate("/signup");
    };

    //login page
    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] font-sans overflow-hidden">
      {/* LEFT PANEL - Solid Royal Blue Hero Panel */}
      <div className="w-full md:w-[45%] bg-[#1d5bf2] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Abstract design element overlay */}
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-12 w-96 h-96 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Brand Logo */}
        <div className="z-10">
          <span className="text-2xl font-extrabold tracking-tight" id="login-logo">TalentArch AI</span>
        </div>

        {/* Mid section motivational messaging */}
        <div className="my-auto py-12 md:py-0 z-10 max-w-md">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            AI Resume Screening & Skill Matching
          </h1>
          <p className="text-xl text-white/80 leading-relaxed font-light">
           Your workforce, intelligently designed.
          </p>
        </div>

        {/* Footer legal credits
        <div className="text-white/60 text-xs font-light z-10 hidden md:block">
          © 2026 TalentArch AI. Architecting the future of human capital.
        </div> */}
      </div>

      {/* RIGHT PANEL - Clean off-white Form */}
      <div className="w-full md:w-[55%] flex items-center justify-center p-8 md:p-16 lg:p-24 bg-[#fcfdfe]">
        <div className="w-full max-w-md flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2" id="login-heading">
              Welcome Back
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Access your recruitment dashboard and AI insights
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* EMAIL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase">
                Email address
              </label>
              <div className={`relative flex items-center bg-slate-50 rounded-xl transition-all duration-200 border ${
                errors.email ? 'border-red-500' : 'border-slate-200 focus-within:border-[#1d5bf2] focus-within:ring-2 focus-within:ring-[#1d5bf2]/20'
              }`}>
                <div className="pl-4 pr-2 text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@company.design"
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
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase">
                  Password
                </label>
                <button
                  type="button"
                  id="login-forgot-password-trigger"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-[#1d5bf2] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className={`relative flex items-center bg-slate-50 rounded-xl transition-all duration-200 border ${
                errors.password ? 'border-red-500' : 'border-slate-200 focus-within:border-[#1d5bf2] focus-within:ring-2 focus-within:ring-[#1d5bf2]/20'
              }`}>
                <div className="pl-4 pr-2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-4 pr-12 bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400 text-sm tracking-wide"
                />
                <button
                  type="button"
                  id="login-toggle-password"
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

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] ${
                isSubmitting ? 'bg-[#1d5bf2]/80 cursor-wait' : 'bg-[#1d5bf2] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/25'
              }`}
              id="login-submit"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* FOOTER SWITCHER */}
          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            Don't have an account?{' '}
            <button
              id="login-to-signup"
              type="button"
              onClick={onSwitchToSignup}
              className="text-[#1d5bf2] hover:underline font-bold transition-all ml-1"
            >
              Sign up free
            </button>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative"
            id="forgot-password-modal"
          >
            {/* Close Button */}
            <button
              type="button"
              id="forgot-password-close"
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1" id="forgot-password-title">Reset Password</h3>
              </div>

              {resetSuccess ? (
                <div 
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3"
                  id="forgot-password-success-message"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Send successfully!</h4>
                    <p className="text-xs text-emerald-700/90 mt-1 leading-relaxed">
                      If an account exists with <strong>{resetEmail}</strong>, a recovery link will arrive in a few minutes. Check your spam foldering if absent.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase">
                      Enter Your Email
                    </label>
                    <div className={`relative flex items-center bg-slate-50 rounded-xl transition-all duration-200 border ${
                      resetError ? 'border-red-500' : 'border-slate-200 focus-within:border-[#1d5bf2] focus-within:ring-2 focus-within:ring-[#1d5bf2]/20'
                    }`}>
                      <div className="pl-4 pr-2 text-slate-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        id="forgot-password-email-input"
                        type="email"
                        placeholder="name@company.design"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full py-4 pr-4 bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400 text-sm"
                      />
                    </div>
                    {resetError && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1.5" id="forgot-password-error">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{resetError}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className={`w-full py-3 px-6 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      isResetting ? 'bg-[#1d5bf2]/80 cursor-wait' : 'bg-[#1d5bf2] hover:bg-blue-700'
                    }`}
                    id="forgot-password-submit"
                  >
                    {isResetting ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Dispatching...</span>
                      </div>
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  id="forgot-password-cancel"
                  onClick={closeForgotModal}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel and Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
}

export default Login;