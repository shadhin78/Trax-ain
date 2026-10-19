/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuthSync } from '../../context/AuthSyncContext';
import { AppRoute } from '../../types/navigation';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';

interface LoginViewProps {
  onNavigate: (route: AppRoute) => void;
}

/**
 * Login Page for X-29.
 * Handles user authentication exclusively:
 * - Email & Password login for the authorized user
 * - Single-user access: No registration or sign-up UI
 * - Forgot Password reset email request via Firebase Auth
 * - 100% transparent visual styling preserving the underlying spatial grid
 * - Direct return to application upon successful authentication
 */
export const LoginView: React.FC<LoginViewProps> = ({ onNavigate }) => {
  const { user, login, sendPasswordReset } = useAuthSync();

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // Successful authentication -> return directly to application
      onNavigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential') ||
        msg.includes('invalid-email')
      ) {
        setFormError('Invalid email or password. Please verify your credentials and try again.');
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenForgotPassword = () => {
    setResetEmail(email.trim());
    setResetError(null);
    setResetSuccess(false);
    setFormError(null);
    setIsForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setResetError(null);
    setFormError(null);
    setIsForgotPassword(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(targetEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordReset(targetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : String(err);

      // Generic confirmation message on user-not-found to avoid revealing registration status
      if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
        setResetSuccess(true);
      } else if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
        setResetError('Invalid email format. Please check the address and try again.');
      } else if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
        setResetError('Too many password reset requests. Please wait a few moments before trying again.');
      } else if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
        setResetError('Network connection issue. Please check your internet connection and try again.');
      } else {
        setResetError(msg || 'Unable to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // If already authenticated, show status and direct return link
  if (user) {
    return (
      <div className="w-full max-w-md mx-auto my-12 rounded-2xl border border-white/[0.1] bg-transparent p-6 sm:p-8 backdrop-blur-sm text-center space-y-4">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl border border-white/[0.12] bg-transparent text-[#10B981]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="font-mono text-base sm:text-lg font-bold text-[#F8FAFC]">
          Already Authenticated
        </h2>
        <p className="text-xs text-[#94A3B8]">
          You are currently signed in as <span className="text-[#F8FAFC] font-semibold">{user.email}</span>.
        </p>
        <button
          onClick={() => onNavigate('/')}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/30 hover:border-[#6366F1] active:scale-[0.98] transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-6 sm:my-10 rounded-2xl border border-white/[0.1] bg-transparent p-6 sm:p-8 backdrop-blur-sm text-[#F8FAFC] space-y-6">
      
      {/* ── HEADER ── */}
      <div className="space-y-1.5 text-left">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#6366F1]">
          {isForgotPassword ? <KeyRound className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          <span>{isForgotPassword ? 'Password Recovery' : 'Private Command Deck Access'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
          {isForgotPassword ? 'Reset Password' : 'User Login'}
        </h1>
        <p className="text-xs text-[#94A3B8]">
          {isForgotPassword
            ? 'Enter your operator email address to receive a secure password reset link.'
            : 'Enter your authorized email and password to access and synchronize your personal operating deck.'}
        </p>
      </div>

      {/* ── FORGOT PASSWORD VIEW ── */}
      {isForgotPassword ? (
        <>
          {resetError && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs font-mono text-[#F43F5E]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-left">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981] mt-0.5" />
                <div className="space-y-1.5 text-xs">
                  <p className="font-mono font-bold text-[#F8FAFC]">Check your email</p>
                  <p className="text-[#94A3B8] leading-relaxed">
                    If an account exists for <span className="font-mono text-[#F8FAFC] break-all">{resetEmail}</span>, a password reset link has been sent. Please check your inbox and spam folder.
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Follow the link in the email to set your new password, then return here to log in.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] transition-colors duration-200 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetSuccess(false);
                    setResetError(null);
                  }}
                  className="w-full py-2 text-center font-mono text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Send to a different email address
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="font-mono text-xs text-[#94A3B8] block">
                  Operator Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="operator@trax.internal"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                {resetLoading ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 py-2 text-center font-mono text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Login</span>
              </button>
            </form>
          )}
        </>
      ) : (
        /* ── LOGIN FORM (EMAIL + PASSWORD ONLY, NO SIGN UP) ── */
        <>
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs font-mono text-[#F43F5E]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="font-mono text-xs text-[#94A3B8] block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs text-[#94A3B8] block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="font-mono text-[11px] text-[#818CF8] hover:text-[#A5B4FC] transition-colors cursor-pointer focus:outline-none focus-visible:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Login to Operating Deck</span>
              )}
            </button>
          </form>
        </>
      )}

      {/* ── FOOTER NOTICE ── */}
      <div className="pt-2 border-t border-white/[0.08] text-[10px] font-mono text-[#64748B] text-center">
        <span>TraX SECURE AUTHENTICATION · SINGLE AUTHORIZED USER</span>
      </div>

    </div>
  );
};
