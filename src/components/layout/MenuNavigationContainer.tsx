/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Compass,
} from 'lucide-react';
import { AppRoute, NavItemConfig } from '../../types/navigation';

interface MenuNavigationContainerProps {
  currentRoute: AppRoute;
  currentTitle: string;
  onNavigate: (route: AppRoute) => void;
}

export const MENU_ITEMS: NavItemConfig[] = [
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
  { id: 'account', title: 'Account', route: '/account/', icon: User },
];

/**
 * 4. Menu Navigation Container
 * Complete navigation inside ONE separate transparent container.
 * Includes all 11 pages (including Account).
 * The menu items keep their current design exactly.
 * The parent container is an invisible, fully transparent floating boundary.
 */
export const MenuNavigationContainer: React.FC<MenuNavigationContainerProps> = ({
  currentRoute,
  currentTitle,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeItem = MENU_ITEMS.find((item) => item.route === currentRoute);
  const ActiveIcon = activeItem ? activeItem.icon : Compass;

  return (
    <div
      ref={containerRef}
      id="menu-navigation-container"
      data-container="navigation"
      className="relative shrink-0 bg-transparent flex items-center"
    >
      {/* Navigation Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center justify-between gap-3 rounded-full px-4 py-2.5 transition-all duration-200 focus:outline-none border border-white/[0.08] bg-[#131722]/40 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#6366F1]/50 hover:bg-[#131722]/70 cursor-pointer"
        aria-label="Navigation menu"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F2637]/80 border border-white/[0.1] shadow-inner">
            <ActiveIcon className="h-3.5 w-3.5 text-[#6366F1]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC] group-hover:text-white">
              NAVIGATION
            </span>
            <span className="font-mono text-[9px] tracking-wider text-[#94A3B8]">
              {currentTitle}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-[#94A3B8] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#6366F1]' : 'group-hover:text-[#F8FAFC]'
          }`}
        />
      </button>

      {/* Floating Dropdown Navigation Container holding all 11 items */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2.5 z-50 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-1.5 p-2 rounded-3xl border border-white/[0.1] bg-[#131722]/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-menu-modal"
          role="menu"
          aria-label="Navigation Pages"
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => {
                  onNavigate(item.route);
                  setIsOpen(false);
                }}
                className={`
                  group relative flex w-full items-center px-4 py-2.5 rounded-full text-xs font-medium tracking-wide
                  transition-all duration-200 ease-out text-left border cursor-pointer
                  ${
                    isActive
                      ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] shadow-[0_0_18px_rgba(99,102,241,0.35),0_8px_20px_rgba(0,0,0,0.4)]'
                      : 'border-white/[0.08] bg-[#131722]/60 text-[#94A3B8] hover:border-white/[0.2] hover:bg-[#181f2f] hover:text-[#F8FAFC] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]'
                  }
                `}
              >
                {/* Fixed-width Icon container for strict column alignment */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                    }`}
                  />
                </div>

                {/* Menu Item Label */}
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
        </div>
      )}
    </div>
  );
};
