/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion, Variants } from 'motion/react';
import { useAuthSync } from '../../context/AuthSyncContext';
import { AppRoute } from '../../types/navigation';
import { getValidRedirectDestination } from '../../lib/router';
import { XLogo } from '../../components/ui/XLogo';
import { Lock, Mail, AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

interface DedicatedLoginPageProps {
  onNavigate: (route: AppRoute) => void;
}

type AuthMode = 'login' | 'forgot' | 'reset-code';

/**
 * Dedicated Login Page for X-29.
 * Standalone authentication page with smooth, premium, controlled animations:
 * - Fluid entrance: subtle vertical drift, scale, and opacity
 * - Fast staggered reveal: Branding -> Heading -> Form
 * - Smooth input focus transitions and micro-interactions
 * - Subtle button hover lift and press damping
 * - Animated error message expand/collapse with AnimatePresence
 * - Intentional closing transition upon successful authentication or return
 * - Single-user security: only registered operators can access
 * - Firebase password reset flow: "Forgot Password?" email link & in-app confirmation
 * - Respects prefers-reduced-motion for complete accessibility
 */
const DedicatedLoginPageComponent: React.FC<DedicatedLoginPageProps> = ({ onNavigate }) => {
  const { user, authLoading, login, sendPasswordReset, confirmPasswordResetCode, verifyResetCode } = useAuthSync();
  const shouldReduceMotion = useReducedMotion();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // In-app Action Code state (when visiting with mode=resetPassword&oobCode=...)
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // Clean up any visible query string in the address bar while preserving destination in sessionStorage
  // or capturing password reset action codes if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        if (redirect) {
          sessionStorage.setItem('x29_redirect_destination', redirect);
        }

        const mode = searchParams.get('mode');
        const actionCode = searchParams.get('oobCode');

        if (mode === 'resetPassword' && actionCode) {
          setOobCode(actionCode);
          setAuthMode('reset-code');
          verifyResetCode(actionCode)
            .then((em) => {
              setAccountEmail(em);
              setEmail(em);
            })
            .catch(() => {
              setCodeError('This password reset link is invalid, expired, or has already been used.');
            });
        } else {
          window.history.replaceState(null, '', '/login/');
        }
      } catch {}
    }
  }, [verifyResetCode]);

  // Retrieve safe, validated redirect destination from session storage or query
  const getDestination = React.useCallback((): AppRoute => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('x29_redirect_destination');
        if (saved) {
          sessionStorage.removeItem('x29_redirect_destination');
          return getValidRedirectDestination(saved);
        }
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        if (redirect) {
          return getValidRedirectDestination(redirect);
        }
      } catch {}
    }
    return '/';
  }, []);

  // If already authenticated on mount, redirect to destination immediately
  useEffect(() => {
    if (user && !authLoading && !isExiting) {
      onNavigate(getDestination());
    }
  }, [user, authLoading, isExiting, onNavigate, getDestination]);

  const handleReturn = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onNavigate(getDestination());
    }, 180);
  };

  const handleOpenForgotPassword = () => {
    setResetEmail(email.trim());
    setResetError(null);
    setResetSuccess(false);
    setFormError(null);
    setCodeSuccessMsg(null);
    setAuthMode('forgot');
  };

  const handleBackToLogin = () => {
    setResetError(null);
    setCodeError(null);
    setFormError(null);
    setAuthMode('login');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCodeSuccessMsg(null);

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // Successful authentication -> smooth exit animation, then navigate to destination
      const destination = getDestination();
      setIsExiting(true);
      setTimeout(() => {
        onNavigate(destination);
      }, 180);
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
      setIsSubmitting(false);
    }
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

    setResetSubmitting(true);
    try {
      await sendPasswordReset(targetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : String(err);

      // Security requirement: Generic confirmation message on user-not-found to avoid revealing registration status
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
      setResetSubmitting(false);
    }
  };

  const handleSetNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    if (!oobCode) {
      setCodeError('Missing or invalid password reset code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setCodeError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setCodeError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setCodeSubmitting(true);
    try {
      await confirmPasswordResetCode(oobCode, newPassword);
      setCodeSuccessMsg('Password updated successfully! Please sign in with your new password.');
      setPassword('');
      setAuthMode('login');
      window.history.replaceState(null, '', '/login/');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : String(err);

      if (code === 'auth/expired-action-code' || msg.includes('expired')) {
        setCodeError('This password reset link has expired. Please request a new one.');
      } else if (code === 'auth/invalid-action-code' || msg.includes('invalid')) {
        setCodeError('This password reset link is invalid or has already been used.');
      } else if (code === 'auth/weak-password' || msg.includes('weak-password')) {
        setCodeError('Password must be at least 6 characters.');
      } else {
        setCodeError(msg || 'Failed to update password. Please try again.');
      }
    } finally {
      setCodeSubmitting(false);
    }
  };

  // Staggered animation variants
  const containerVariants: Variants = React.useMemo(() => ({
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 12,
      scale: shouldReduceMotion ? 1 : 0.985,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
        delayChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -10,
      scale: shouldReduceMotion ? 1 : 0.985,
      transition: {
        duration: 0.18,
        ease: [0.25, 1, 0.5, 1],
      },
    },
  }), [shouldReduceMotion]);

  const itemVariants: Variants = React.useMemo(() => ({
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.26,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  }), [shouldReduceMotion]);

  return (
    <div className="relative z-10 flex min-h-full min-h-dvh w-full max-w-full flex-col items-center justify-center p-4 sm:p-6 bg-transparent select-none overflow-hidden">
      
      {/* Top Left Floating Return Link */}
      <motion.div 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20"
        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -8 }}
        animate={isExiting ? { opacity: 0, x: shouldReduceMotion ? 0 : -8 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {user ? (
          <motion.button
            onClick={handleReturn}
            whileHover={!shouldReduceMotion ? { x: -2 } : undefined}
            whileTap={!shouldReduceMotion ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-transparent text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.2] transition-colors duration-200 cursor-pointer backdrop-blur-sm"
            aria-label="Return to application"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Return to Deck</span>
          </motion.button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-transparent text-xs font-mono text-[#94A3B8] backdrop-blur-sm select-none">
            <Lock className="h-3.5 w-3.5 text-[#6366F1]" />
            <span>Access Protected</span>
          </div>
        )}
      </motion.div>

      {/* ── CENTERED DEDICATED LOGIN CONTAINER ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isExiting ? 'exit' : 'visible'}
        className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-transparent p-6 sm:p-8 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.6)] space-y-6"
      >
        
        {/* 1. Brand Header */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center space-y-2">
          {/* Logo Glyph */}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.14] bg-[#1F2637]/50 shadow-[0_0_20px_rgba(99,102,241,0.25)] p-2 mb-1">
            {authMode === 'login' ? (
              <>
                <XLogo size={24} />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              </>
            ) : (
              <>
                <KeyRound className="h-6 w-6 text-[#6366F1]" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.9)]" />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-black tracking-widest text-[#F8FAFC]">
              TraX
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 rounded px-1.5 py-0.5">
              {authMode === 'login' ? 'Command Deck' : 'Recovery Protocol'}
            </span>
          </div>
        </motion.div>

        {/* 2. Heading */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
            {authMode === 'login' && 'System Login'}
            {authMode === 'forgot' && 'Reset Password'}
            {authMode === 'reset-code' && 'Set New Password'}
          </h1>

          <p className="text-xs text-[#94A3B8] max-w-xs">
            {authMode === 'login' && 'Authenticate to access and synchronize your personal operating deck.'}
            {authMode === 'forgot' && 'Enter your operator email address to receive a secure password reset link.'}
            {authMode === 'reset-code' && (accountEmail ? `Enter a new password for ${accountEmail}.` : 'Enter your new password below.')}
          </p>
        </motion.div>

        {/* ── MODE 1: LOGIN FORM ── */}
        {authMode === 'login' && (
          <>
            {/* Success Alert (e.g. from completed password reset) */}
            <AnimatePresence>
              {codeSuccessMsg && (
                <motion.div
                  key="code-success"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs font-mono text-[#10B981]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{codeSuccessMsg}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Alert */}
            <AnimatePresence>
              {formError && (
                <motion.div
                  key="login-error"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs font-mono text-[#F43F5E]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form variants={itemVariants} onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="font-mono text-xs text-[#94A3B8] block">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B] transition-colors duration-200 group-focus-within:text-[#6366F1]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@trax.internal"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 focus:outline-none transition-all duration-200"
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
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B] transition-colors duration-200 group-focus-within:text-[#6366F1]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={!isSubmitting && !shouldReduceMotion ? { y: -1, scale: 1.008 } : undefined}
                whileTap={!isSubmitting && !shouldReduceMotion ? { y: 0.5, scale: 0.99 } : undefined}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] transition-colors duration-200 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <span>Login to Operating Deck</span>
                )}
              </motion.button>
            </motion.form>
          </>
        )}

        {/* ── MODE 2: FORGOT PASSWORD ── */}
        {authMode === 'forgot' && (
          <>
            {/* Error Alert */}
            <AnimatePresence>
              {resetError && (
                <motion.div
                  key="reset-error"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs font-mono text-[#F43F5E]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {resetSuccess ? (
              <motion.div variants={itemVariants} className="space-y-4">
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
                  <motion.button
                    type="button"
                    onClick={handleBackToLogin}
                    whileHover={!shouldReduceMotion ? { y: -1, scale: 1.008 } : undefined}
                    whileTap={!shouldReduceMotion ? { y: 0.5, scale: 0.99 } : undefined}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] transition-colors duration-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Return to Login</span>
                  </motion.button>

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
              </motion.div>
            ) : (
              <motion.form variants={itemVariants} onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="font-mono text-xs text-[#94A3B8] block">
                    Operator Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B] transition-colors duration-200 group-focus-within:text-[#6366F1]" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="operator@trax.internal"
                      autoComplete="email"
                      required
                      className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={resetSubmitting}
                  whileHover={!resetSubmitting && !shouldReduceMotion ? { y: -1, scale: 1.008 } : undefined}
                  whileTap={!resetSubmitting && !shouldReduceMotion ? { y: 0.5, scale: 0.99 } : undefined}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] transition-colors duration-200 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {resetSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Sending Link...</span>
                    </span>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 py-2 text-center font-mono text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Login</span>
                </button>
              </motion.form>
            )}
          </>
        )}

        {/* ── MODE 3: IN-APP ACTION CODE (RESET PASSWORD LINK VISITATION) ── */}
        {authMode === 'reset-code' && (
          <>
            {/* Error Alert */}
            <AnimatePresence>
              {codeError && (
                <motion.div
                  key="code-error"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs font-mono text-[#F43F5E]">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{codeError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form variants={itemVariants} onSubmit={handleSetNewPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="font-mono text-xs text-[#94A3B8] block">
                  New Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B] transition-colors duration-200 group-focus-within:text-[#6366F1]" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="font-mono text-xs text-[#94A3B8] block">
                  Confirm New Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B] transition-colors duration-200 group-focus-within:text-[#6366F1]" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/[0.12] bg-transparent pl-10 pr-4 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={codeSubmitting}
                whileHover={!codeSubmitting && !shouldReduceMotion ? { y: -1, scale: 1.008 } : undefined}
                whileTap={!codeSubmitting && !shouldReduceMotion ? { y: 0.5, scale: 0.99 } : undefined}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 py-2.5 px-4 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] transition-colors duration-200 cursor-pointer disabled:opacity-50 mt-2"
              >
                {codeSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Updating Password...</span>
                  </span>
                ) : (
                  <span>Save New Password</span>
                )}
              </motion.button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 py-2 text-center font-mono text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel and Return to Login</span>
              </button>
            </motion.form>
          </>
        )}

        {/* Footer Technical Note */}
        <motion.div variants={itemVariants} className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[9.5px] font-mono text-[#64748B]">
          <span>TraX // {authMode === 'login' ? 'AUTH PROTOCOL' : 'RECOVERY PROTOCOL'}</span>
          <span>AUTHORIZED OPERATOR ONLY</span>
        </motion.div>

      </motion.div>

    </div>
  );
};

export const DedicatedLoginPage = React.memo(DedicatedLoginPageComponent);
DedicatedLoginPage.displayName = 'DedicatedLoginPage';
