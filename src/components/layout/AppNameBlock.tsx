/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, X } from 'lucide-react';
import { AppRoute } from '../../types/navigation';

interface AppNameBlockProps {
  onNavigate: (route: AppRoute) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

/**
 * BLOCK 01 — App Name Block (Top-Left Quadrant)
 * Completely transparent background, position secured by borders.
 * Displays app brand, live indicator, block marker, and mobile menu trigger.
 */
export const AppNameBlock: React.FC<AppNameBlockProps> = ({
  onNavigate,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  return (
    <div 
      data-block="app-name"
      className="relative flex h-full w-full items-center justify-between px-4 sm:px-6 py-3.5 bg-transparent select-none"
    >
      {/* Interactive App Name & Logo */}
      <button
        onClick={() => onNavigate('/')}
        className="group flex items-center gap-3 text-left focus:outline-none transition-transform active:scale-95"
        aria-label="TraX Home Dashboard"
      >
        {/* Logo Glyph */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-transparent backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:border-[#6366F1]/60 transition-colors">
          <span className="font-mono text-sm font-black tracking-tight text-[#6366F1]">T</span>
          <span className="font-mono text-[11px] font-bold text-[#F8FAFC]">X</span>
          {/* Subtle live indicator dot */}
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
        </div>

        {/* Brand Typography */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm sm:text-base font-black tracking-widest text-[#F8FAFC] group-hover:text-white transition-colors">
              TraX
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 rounded px-1.5 py-0.5 hidden sm:inline-block">
              App name
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-wider text-[#94A3B8] truncate">
            COMMAND DECK
          </span>
        </div>
      </button>

      {/* Mobile Menu Toggle Button (Visible only on < lg) */}
      <button
        onClick={onToggleMobileMenu}
        className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.12] bg-transparent text-[#94A3B8] hover:text-white hover:border-[#6366F1]/50 active:scale-95 transition-all focus:outline-none"
        aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
      </button>

      {/* Quiet Technical Corner Marker */}
      <div 
        className="hidden lg:block absolute bottom-1 right-2 font-mono text-[8.5px] uppercase tracking-widest text-[#64748B]/60 pointer-events-none"
        aria-hidden="true"
      >
        Block 01
      </div>
    </div>
  );
};
