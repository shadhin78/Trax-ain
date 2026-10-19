/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  CheckSquare,
  Calendar,
  BookOpen,
  Gauge,
  Sliders,
  Trophy,
  CalendarCheck,
  User,
  X,
} from 'lucide-react';
import { AppRoute, NavItemConfig } from '../../types/navigation';
import { BackgroundMode } from '../../features/account/AccountView';
import { SyncStatusBar } from '../ui/SyncStatusBar';
import { useAuthSync } from '../../context/AuthSyncContext';

interface MenuNavBlockProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  backgroundMode?: BackgroundMode;
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

const MENU_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', title: 'Dashboard', route: '/', icon: LayoutDashboard },
  { id: 'analytics', title: 'Analytics', route: '/analytics/', icon: BarChart3 },
  { id: 'focus', title: 'Focus', route: '/focus/', icon: Target },
  { id: 'daily-actions', title: 'Daily Actions', route: '/daily-actions/', icon: CheckSquare },
  { id: 'daily-schedule', title: 'Daily Schedule', route: '/daily-schedule/', icon: Calendar },
  { id: 'subjects', title: 'Subjects', route: '/subjects/', icon: BookOpen },
  { id: 'pace-management', title: 'Pace Management', route: '/pace-management/', icon: Gauge },
  { id: 'master-config', title: 'Master Config', route: '/master-config/', icon: Sliders },
  { id: 'outcome', title: 'Outcome', route: '/outcome/', icon: Trophy },
  { id: 'exam-routine', title: 'Exam Routine', route: '/exam-routine/', icon: CalendarCheck },
];

/**
 * BLOCK 03 — Menu Navigation Block (Bottom-Left Quadrant)
 * Completely transparent background, position secured by borders.
 * Formatted directly according to diagram:
 * - "Navigation bar menu"
 * - "page name :"
 * - 1 to 10 numbered interactive items
 * - "Account page" at bottom
 */
export const MenuNavBlock: React.FC<MenuNavBlockProps> = ({
  currentRoute,
  onNavigate,
  onCloseMobile,
  isMobileDrawer = false,
}) => {
  const { syncStatus } = useAuthSync();
  const isAccountActive = currentRoute === '/account/';

  return (
    <nav
      data-block="menu-navigation"
      className="relative flex h-full w-full flex-col justify-between p-3.5 sm:p-4 bg-transparent select-none"
      aria-label="Sidebar Menu Navigation"
    >
      {/* ── HEADER OF MENU NAVIGATION BLOCK ── */}
      <div className="pb-3 border-b border-white/[0.08] mb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-wider text-[#F8FAFC] uppercase">
                Navigation bar menu
              </span>
              <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 rounded px-1.5 py-0.2 hidden sm:inline-block">
                menu navigation
              </span>
            </div>
            <span className="font-mono text-[10px] tracking-wide text-[#94A3B8] mt-0.5">
              page name :
            </span>
          </div>

          {/* Close button if rendered in mobile drawer */}
          {isMobileDrawer && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] bg-transparent text-[#94A3B8] hover:text-white"
              aria-label="Close Navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 10 MENU ITEMS NUMBERED 1 TO 10 (TRANSPARENT WITH BORDERS) ── */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 py-1">
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          const itemNumber = `${index + 1}.`;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.route);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`
                group relative flex w-full items-center px-3 py-2 rounded-xl text-xs font-medium tracking-wide
                transition-all duration-150 ease-out text-left border
                ${
                  isActive
                    ? 'border-[#6366F1] bg-[#6366F1]/15 text-[#F8FAFC] shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                    : 'border-white/[0.07] bg-transparent text-[#94A3B8] hover:border-white/[0.18] hover:text-[#F8FAFC] hover:bg-white/[0.02]'
                }
              `}
            >
              {/* Index Number column matching diagram ("1.", "2.", etc.) */}
              <span className={`font-mono text-[11px] w-5 shrink-0 ${isActive ? 'text-[#6366F1] font-bold' : 'text-[#64748B]'}`}>
                {itemNumber}
              </span>

              {/* Fixed icon container */}
              <div className="flex h-4 w-4 shrink-0 items-center justify-center ml-1">
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    isActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                  }`}
                />
              </div>

              {/* Title text */}
              <span className="ml-2.5 truncate font-medium text-left">
                {item.title}
              </span>

              {/* Active Indicator Pip */}
              {isActive && (
                <span
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,1)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── BOTTOM: ACCOUNT PAGE SECTION WITH SYNC BAR ── */}
      <div className="mt-auto pt-3 border-t border-white/[0.08]">
        <SyncStatusBar status={syncStatus} />
        <button
          onClick={() => {
            onNavigate('/account/');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`
            group relative flex w-full items-center px-3 py-2 rounded-xl text-xs font-medium tracking-wide
            transition-all duration-150 ease-out text-left border
            ${
              isAccountActive
                ? 'border-[#6366F1] bg-[#6366F1]/15 text-[#F8FAFC] shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                : 'border-white/[0.07] bg-transparent text-[#94A3B8] hover:border-white/[0.18] hover:text-[#F8FAFC] hover:bg-white/[0.02]'
            }
          `}
        >
          <div className="flex h-4 w-4 shrink-0 items-center justify-center">
            <User
              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                isAccountActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
              }`}
            />
          </div>

          <span className="ml-2.5 truncate font-medium text-left">
            Account page
          </span>

          {isAccountActive && (
            <span
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,1)]"
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* Quiet Technical Block Marker */}
      <div 
        className="hidden lg:block absolute bottom-1 right-2 font-mono text-[8.5px] uppercase tracking-widest text-[#64748B]/60 pointer-events-none"
        aria-hidden="true"
      >
        Block 03
      </div>
    </nav>
  );
};
