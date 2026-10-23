import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Mail, User, Building, LogIn, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [college, setCollege] = useState('');
  const [academicRole, setAcademicRole] = useState('undergraduate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toast = useToast();
  const modalRef = useRef(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const user = await authService.signInWithEmail(email, password);
        toast.success(`Welcome back, ${user.displayName || user.email}!`);
        onClose();
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const user = await authService.signUpWithEmail(email, password, {
          displayName: displayName.trim() || email.split('@')[0],
          college: college.trim(),
          academicRole,
          role: 'student'
        });
        toast.success(`Account created successfully! Welcome, ${user.displayName}.`);
        onClose();
      } else if (mode === 'forgot') {
        const res = await authService.sendPasswordReset(email);
        toast.info(res.message);
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await authService.signInWithGoogle();
      toast.success(`Signed in with Google as ${user.displayName}!`);
      onClose();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    const guest = authService.continueAsGuest();
    toast.info(`Continuing in offline guest mode (${guest.displayName}).`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#151926] rounded-2xl border border-[#ECE8E1] dark:border-[#232A3D] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#ECE8E1] dark:border-[#232A3D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] dark:bg-[#1E1B4B] flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8]">
              {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-sm font-bold text-[#1F2433] dark:text-[#F1F5F9]">
                {mode === 'signin' && 'Sign In to Quantech'}
                {mode === 'signup' && 'Create Your Learner Account'}
                {mode === 'forgot' && 'Reset Your Password'}
              </h2>
              <p className="text-[11px] text-[#4A5168] dark:text-[#94A3B8]">
                {mode === 'signin' && 'Access your personalized learning state and circuits'}
                {mode === 'signup' && 'Track progress, unlock topics, and retain certifications'}
                {mode === 'forgot' && 'Enter your email to receive recovery instructions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#4A5168] hover:text-[#1F2433] dark:hover:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#1F2433] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle (Sign In / Register) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#151926] text-[#4F46E5] dark:text-[#818CF8] shadow-xs'
                  : 'text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#151926] text-[#4F46E5] dark:text-[#818CF8] shadow-xs'
                  : 'text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FDECEC] dark:bg-[#7F1D1D]/30 border border-[#DC2626]/20 text-[#DC2626] dark:text-[#F87171] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                Full Name / Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#4A5168] dark:text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Ada Lovelace"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#4A5168] dark:text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="name@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9]">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-[10px] text-[#4F46E5] dark:text-[#818CF8] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4A5168] dark:text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  College / Affiliation
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-[#4A5168] dark:text-[#94A3B8] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="VTU Institute"
                    value={college}
                    onChange={e => setCollege(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  Role
                </label>
                <select
                  value={academicRole}
                  onChange={e => setAcademicRole(e.target.value)}
                  className="w-full py-2 px-2.5 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="school_student">School (K-12)</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="postgraduate">Postgraduate</option>
                  <option value="phd_researcher">PhD / Researcher</option>
                  <option value="faculty">Faculty</option>
                  <option value="industry_engineer">Industry Engineer</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </>
            ) : (
              <span>Send Reset Instructions</span>
            )}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className="w-full text-center text-xs text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9]"
            >
              Back to Sign In
            </button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#ECE8E1] dark:border-[#232A3D]" />
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-[#4A5168] dark:text-[#94A3B8]">
                  Or continue with
                </span>
                <div className="grow border-t border-[#ECE8E1] dark:border-[#232A3D]" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="py-2 px-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] hover:bg-[#FBFAF7] dark:hover:bg-[#1F2433] text-xs font-semibold text-[#1F2433] dark:text-[#F1F5F9] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleGuestContinue}
                  disabled={loading}
                  className="py-2 px-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] hover:bg-[#FBFAF7] dark:hover:bg-[#1F2433] text-xs font-semibold text-[#1F2433] dark:text-[#F1F5F9] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Guest Mode</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
