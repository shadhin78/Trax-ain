/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running as an installed PWA or not installable on current desktop, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`
          group flex items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#131722]/60 backdrop-blur-md
          text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#6366F1]/60 hover:bg-[#131722]/85 active:scale-95 transition-all
          focus:outline-none focus:ring-1 focus:ring-[#6366F1]
          ${compact ? 'h-10 px-2.5 text-xs font-mono' : 'px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-mono'}
        `}
        title="Install TraX Web App"
        aria-label="Install TraX Web App"
      >
        <Download className="h-4 w-4 text-[#6366F1] group-hover:scale-110 transition-transform" />
        <span className="font-semibold tracking-wider">INSTALL</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className={`
            group flex items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#131722]/60 backdrop-blur-md
            text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#6366F1]/60 hover:bg-[#131722]/85 active:scale-95 transition-all
            focus:outline-none
            ${compact ? 'h-10 px-2.5 text-xs font-mono' : 'px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-mono'}
          `}
          title="Install TraX on iOS"
          aria-label="Install TraX on iOS"
        >
          <Share className="h-4 w-4 text-[#6366F1]" />
          <span className="font-semibold tracking-wider">INSTALL</span>
        </button>

        {showIOSModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-menu-backdrop"
            onClick={() => setShowIOSModal(false)}
          >
            <div 
              className="flex flex-col w-full max-w-sm rounded-3xl border border-white/[0.12] bg-[#131722] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC]">
                  INSTALL TraX ON IOS
                </span>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="py-4 space-y-3 font-mono text-xs text-[#94A3B8]">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F2637] text-[10px] font-bold text-[#6366F1]">1</span>
                  <p>Tap the <strong className="text-[#F8FAFC]">Share</strong> button in Safari toolbar at the bottom.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F2637] text-[10px] font-bold text-[#6366F1]">2</span>
                  <p>Scroll down and select <strong className="text-[#F8FAFC]">Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F2637] text-[10px] font-bold text-[#6366F1]">3</span>
                  <p>Tap <strong className="text-[#F8FAFC]">Add</strong> in the top-right corner to install.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full rounded-2xl bg-[#6366F1]/20 border border-[#6366F1]/50 py-2.5 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/30 transition-colors"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
