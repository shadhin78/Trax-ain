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
import { XLogo } from '../ui/XLogo';
import { SyncStatusBar } from '../ui/SyncStatusBar';
import { useAuthSync } from '../../context/AuthSyncContext';

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
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
 * Container 3 — Navigation / Menu Container for X-29.
 * Position: Below the App Name area, fixed on left side, full available vertical height.
 * Transparent background (no card background, no solid fill).
 * Contains all 10 menu items and Account item pinned at bottom with Sync Bar directly above it.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { syncStatus } = useAuthSync();
  const isAccountActive = currentRoute === '/account/';
  const baseStyle =
    'border-white/[0.08] bg-[#131722]/40 text-[#94A3B8] hover:border-white/[0.2] hover:bg-[#131722]/75 hover:text-[#F8FAFC]';

  return (
    <>
      {/* ── MOBILE NAVIGATION DRAWER & BACKDROP ── */}
      {isOpenMobile && (
        <>
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity duration-200 touch-none"
            aria-hidden="true"
          />
          <aside
            id="navigation-container-mobile"
            className="fixed top-0 bottom-0 left-0 z-50 flex w-60 max-w-[80vw] flex-col bg-[#0B0D13]/95 backdrop-blur-md p-4 transition-transform duration-300 ease-out lg:hidden touch-auto"
          >
            {/* Top Close Bar */}
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F2637] border border-white/[0.1] p-1">
                  <XLogo size={18} />
                </div>
                <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC]">
                  NAVIGATION
                </span>
              </div>
              <button
                onClick={onCloseMobile}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#131722] text-[#94A3B8] hover:text-[#F8FAFC] active:scale-95"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Middle: 10 Nav buttons */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1 py-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.route;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.route);
                      onCloseMobile();
                    }}
                    className={`
                      group relative flex w-full items-center px-4 py-2.5 rounded-full text-xs font-medium tracking-wide
                      transition-all duration-200 ease-out text-left border
                      ${
                        isActive
                          ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] shadow-[0_0_18px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.4)]'
                          : `${baseStyle} hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]`
                      }
                    `}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                          isActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                        }`}
                      />
                    </div>
                    <span className="ml-3 truncate font-medium text-left">
                      {item.title}
                    </span>
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,1)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sync status bar strictly above Account button */}
            <div className="mt-auto pt-3 shrink-0">
              <SyncStatusBar status={syncStatus} />
              <button
                onClick={() => {
                  onNavigate('/account/');
                  onCloseMobile();
                }}
                className={`
                  group relative flex w-full items-center px-4 py-2.5 rounded-full text-xs font-medium tracking-wide
                  transition-all duration-200 ease-out text-left border
                  ${
                    isAccountActive
                      ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] shadow-[0_0_18px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.4)]'
                      : `${baseStyle} hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]`
                  }
                `}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <User
                    className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                      isAccountActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                    }`}
                  />
                </div>
                <span className="ml-3 truncate font-medium text-left">
                  Account
                </span>
                {isAccountActive && (
                  <span
                    className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,1)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── CONTAINER 3: NAVIGATION / MENU CONTAINER (DESKTOP) ── */}
      <aside
        id="navigation-container"
        data-container="navigation"
        className="hidden lg:flex w-60 shrink-0 h-full flex-col p-4 bg-transparent overflow-hidden"
      >
        {/* ── MIDDLE: 10 FLOATING CAPSULE BUTTONS WITH STRICT [ ICON ] TEXT ALIGNMENT ── */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-1 py-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.route);
                }}
                className={`
                  group relative flex w-full items-center px-4 py-2.5 rounded-full text-xs font-medium tracking-wide
                  transition-all duration-200 ease-out text-left border
                  ${
                    isActive
                      ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] shadow-[0_0_18px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.4)]'
                      : `${baseStyle} hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]`
                  }
                `}
              >
                {/* Fixed-width Icon container for absolute column alignment */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                    }`}
                  />
                </div>

                {/* Text always starts at the exact same horizontal offset */}
                <span className="ml-3 truncate font-medium text-left">
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
        </nav>

        {/* ── BOTTOM: SYNC STATUS BAR & ACCOUNT CAPSULE BUTTON ── */}
        <div className="mt-auto pt-3 shrink-0">
          <SyncStatusBar status={syncStatus} />
          <button
            onClick={() => {
              onNavigate('/account/');
            }}
            className={`
              group relative flex w-full items-center px-4 py-2.5 rounded-full text-xs font-medium tracking-wide
              transition-all duration-200 ease-out text-left border
              ${
                isAccountActive
                  ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] shadow-[0_0_18px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.4)]'
                  : `${baseStyle} hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]`
              }
            `}
          >
            {/* Fixed-width Icon container matching the menu items above */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <User
                className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                  isAccountActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                }`}
              />
            </div>

            <span className="ml-3 truncate font-medium text-left">
              Account
            </span>

            {isAccountActive && (
              <span
                className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,1)]"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
