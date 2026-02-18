import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { X, Mail, Eye, EyeOff, CloudOff } from 'lucide-react';
import type { AuthError } from '@supabase/supabase-js';

interface AuthModalProps {
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const AuthModal = ({ onClose, showToast }: AuthModalProps) => {
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuthError = (error: AuthError | null): string => {
    if (!error) return '';
    if (error.message.includes('Invalid login')) return 'Invalid email or password';
    if (error.message.includes('already registered')) return 'An account with this email already exists';
    if (error.message.includes('Password')) return 'Password must be at least 6 characters';
    if (error.message.includes('valid email')) return 'Please enter a valid email address';
    return error.message;
  };

  const signInWithEmail = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(handleAuthError(error));
    } else {
      onClose();
      showToast('Welcome back!', 'success');
    }
  };

  const signUpWithEmail = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(handleAuthError(error));
    } else {
      onClose();
      showToast('Account created! Check your email to confirm.', 'success');
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(handleAuthError(error));
      setAuthLoading(false);
    }
    // OAuth redirects — loading state clears on page reload
  };

  const handleClose = () => {
    onClose();
    setAuthError('');
  };

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-[#F4F2EA] rounded-[28px] shadow-2xl w-full max-w-md p-8 overflow-hidden">
        {/* Close */}
        <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:bg-[#D5D3C9] transition-colors">
          <X className="w-4 h-4 text-[#6E6A60]" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {authMode === 'sign_in' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-[#6E6A60]">
            {authMode === 'sign_in' ? 'Sign in to sync your recipes across devices' : 'Save your recipes, meal plans & shopping lists to the cloud'}
          </p>
        </div>

        {!isSupabaseConfigured() ? (
          <div className="text-center py-6">
            <CloudOff className="w-12 h-12 text-[#6E6A60] mx-auto mb-4" />
            <p className="text-sm text-[#6E6A60] mb-2 font-medium">Cloud Sync Not Configured</p>
            <p className="text-xs text-[#6E6A60] leading-relaxed">
              To enable user accounts, add your Supabase project URL and anon key to the <code className="bg-[#E8E6DC] px-1.5 py-0.5 rounded text-[#8B7355] font-mono text-[11px]">.env</code> file in the app directory.
            </p>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              onClick={signInWithGoogle}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-[#E8E6DC] hover:border-[#8B7355] bg-white text-sm font-semibold text-[#1A1A1A] transition-all duration-200 mb-5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-[#E8E6DC]" />
              <span className="text-[11px] text-[#6E6A60] font-medium uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#E8E6DC]" />
            </div>

            {/* Email Form */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6A60]" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border-2 border-[#E8E6DC] focus:border-[#8B7355] outline-none text-sm text-[#1A1A1A] placeholder:text-[#6E6A60]/50 transition-colors"
                />
              </div>
              <div className="relative">
                <input
                  type={authShowPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  onKeyDown={(e) => e.key === 'Enter' && (authMode === 'sign_in' ? signInWithEmail() : signUpWithEmail())}
                  className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white border-2 border-[#E8E6DC] focus:border-[#8B7355] outline-none text-sm text-[#1A1A1A] placeholder:text-[#6E6A60]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setAuthShowPassword(!authShowPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6E6A60] hover:text-[#1A1A1A]"
                >
                  {authShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {authError && (
              <p className="text-xs text-red-500 text-center mb-3">{authError}</p>
            )}

            {/* Submit */}
            <button
              onClick={authMode === 'sign_in' ? signInWithEmail : signUpWithEmail}
              disabled={authLoading || !authEmail || !authPassword}
              className="w-full py-3.5 rounded-2xl bg-[#8B7355] text-white font-semibold text-sm hover:bg-[#6B5740] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mb-4"
            >
              {authLoading ? 'Please wait...' : authMode === 'sign_in' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Toggle mode */}
            <p className="text-center text-xs text-[#6E6A60]">
              {authMode === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setAuthMode(authMode === 'sign_in' ? 'sign_up' : 'sign_in'); setAuthError(''); }}
                className="text-[#8B7355] font-semibold hover:text-[#6B5740]"
              >
                {authMode === 'sign_in' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
