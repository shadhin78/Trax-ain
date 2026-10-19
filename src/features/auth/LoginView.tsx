/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuthSync } from '../../context/AuthSyncContext';
import { AppRoute } from '../../types/navigation';
import { Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onNavigate: (route: AppRoute) => void;
}

/**
 * Dedicated Login Page for X-29.
 * Handles user authentication exclusively:
 * - Email & Password login for the authorized user
 * - No registration, sign-up, or account-creation UI
 * - 100% transparent visual styling preserving the underlying spatial grid
 * - Direct return to application upon successful authentication
 */
export const LoginView: React.FC<LoginViewProps> = ({ onNavigate }) => {
  const { user, login } = useAuthSync();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
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
          <Lock className="h-3 w-3" />
          <span>Private Command Deck Access</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
          User Login
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Enter your authorized email and password to access and synchronize your personal operating deck.
        </p>
      </div>

      {/* ── ERROR ALERT ── */}
      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs font-mono text-[#F43F5E]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* ── LOGIN FORM (EMAIL + PASSWORD ONLY, NO SIGN UP) ── */}
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
          <label className="font-mono text-xs text-[#94A3B8] block">
            Password
          </label>
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

      {/* ── FOOTER NOTICE ── */}
      <div className="pt-2 border-t border-white/[0.08] text-[10px] font-mono text-[#64748B] text-center">
        <span>TraX SECURE AUTHENTICATION · SINGLE AUTHORIZED USER</span>
      </div>

    </div>
  );
};
