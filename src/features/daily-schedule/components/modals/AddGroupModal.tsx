/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Check } from 'lucide-react';
import { useDailySchedule } from '../../context/DailyScheduleContext';
import { RoutineCategoryItem } from '../../types';
import { ROUTINE_CATEGORIES } from './AddBlockModal';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGroup: (
    name: string,
    color: string,
    targetHours?: number,
    categories?: string[],
    categoryDetails?: RoutineCategoryItem[]
  ) => void;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onAddGroup,
}) => {
  const { activeRoutine, categories } = useDailySchedule();
  const [name, setName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedCategories([]);
      setIsNameManuallyEdited(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Calculate live hours for categories based on the user's added blocks in the active routine
  const categoryStatsList = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; icon: string; count: number }>();

    // 1. Populate configured routine categories
    const availableCategories = categories && categories.length > 0 ? categories : ROUTINE_CATEGORIES;
    availableCategories.forEach((cat) => {
      map.set(cat.name.toLowerCase(), {
        name: cat.name,
        hours: 0,
        icon: cat.icon,
        count: 0,
      });
    });

    // 2. Aggregate hours from blocks in the active routine
    (activeRoutine?.blocks || []).forEach((b) => {
      if (b.category) {
        const norm = b.category.trim().toLowerCase();
        const existing = map.get(norm) || {
          name: b.category.trim(),
          hours: 0,
          icon: '📌',
          count: 0,
        };
        const duration = b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1);
        existing.hours += duration;
        existing.count += 1;
        map.set(norm, existing);
      }
    });

    // 3. Sort: categories with hours > 0 appear first at the top
    return Array.from(map.values()).sort((a, b) => {
      if (a.hours > 0 && b.hours === 0) return -1;
      if (b.hours > 0 && a.hours === 0) return 1;
      if (a.hours !== b.hours) return b.hours - a.hours;
      return a.name.localeCompare(b.name);
    });
  }, [activeRoutine?.blocks]);

  // Toggle category checkbox
  const toggleCategory = (catName: string) => {
    const isChecked = selectedCategories.includes(catName);
    const updated = isChecked
      ? selectedCategories.filter((c) => c !== catName)
      : [...selectedCategories, catName];

    setSelectedCategories(updated);

    // Auto-suggest group name if user hasn't typed a custom name yet
    if (!isNameManuallyEdited && !name.trim() && !isChecked) {
      setName(catName.toUpperCase());
    }
  };

  // Live total hours of checked categories
  const totalGroupHours = useMemo(() => {
    let sum = 0;
    selectedCategories.forEach((catName) => {
      const found = categoryStatsList.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (found) {
        sum += found.hours;
      }
    });
    return Math.round(sum * 10) / 10;
  }, [selectedCategories, categoryStatsList]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName =
      name.trim() || (selectedCategories.length > 0 ? selectedCategories.join(' & ').toUpperCase() : '');
    if (!finalName) return;

    const details: RoutineCategoryItem[] = selectedCategories.map((catName) => {
      const found = categoryStatsList.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      return {
        id: catName.toLowerCase(),
        name: found?.name || catName,
        icon: found?.icon || '📌',
        hours: found ? Math.round(found.hours * 10) / 10 : 0,
      };
    });

    // Automatically derive theme color from first category or default blue
    const firstMatched = ROUTINE_CATEGORIES.find(
      (c) => c.name.toLowerCase() === selectedCategories[0]?.toLowerCase()
    );
    const assignedColor = firstMatched?.color || '#3B82F6';

    onAddGroup(finalName, assignedColor, totalGroupHours, selectedCategories, details);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-group-modal-title"
      className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/[0.12] bg-[#0E1320]/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] relative my-auto scrollbar-thin scrollbar-thumb-white/10 md:animate-in md:fade-in-0 md:zoom-in-95 md:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ROW ── */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#18233C] border border-[#2563EB]/40 flex items-center justify-center text-[#3B82F6] shadow-[0_0_14px_rgba(59,130,246,0.25)]">
              <FolderPlus className="h-5 w-5 stroke-[2.5]" />
            </div>

            <div>
              <h3
                id="add-group-modal-title"
                className="text-lg sm:text-xl font-bold text-[#F8FAFC] tracking-tight"
              >
                Add Routine Group
              </h3>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-wider uppercase mt-0.5">
                GROUP YOUR ROUTINE CATEGORIES
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-9 w-9 rounded-xl bg-[#1E2538] hover:bg-[#28324D] border border-white/[0.08] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── FORM ── */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4.5 sm:space-y-5">
          {/* 1. GROUP NAME */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              GROUP NAME:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsNameManuallyEdited(true);
              }}
              placeholder="e.g. STUDY, WORK, HEALTH"
              className="w-full h-12 px-4 rounded-xl border border-white/[0.1] bg-[#141A28] font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] placeholder:text-white/20 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none"
              autoFocus
            />
          </div>

          {/* 2. CHOOSE CATEGORIES CHECKBOX LIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                CHOOSE CATEGORIES:
              </label>
              <span className="text-[10px] font-bold text-[#64748B]">
                {selectedCategories.length} Selected
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {categoryStatsList.map((cat) => {
                const isChecked = selectedCategories.includes(cat.name);
                const hasHours = cat.hours > 0;

                return (
                  <div
                    key={cat.name}
                    onClick={() => toggleCategory(cat.name)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                      isChecked
                        ? 'border-[#3B82F6] bg-[#18233C] shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                        : 'border-white/[0.08] bg-[#141A28] hover:border-white/20 hover:bg-[#1A2234]'
                    }`}
                  >
                    {/* Left: Checkbox + Icon + Category Name */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-[#2563EB] border-[#3B82F6]'
                            : 'border-white/20 bg-[#0B0F19]'
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs sm:text-sm font-bold text-[#F8FAFC] tracking-wide">
                          {cat.name}
                        </span>
                      </div>
                    </div>

                    {/* Right: Hours Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black tracking-wider ${
                          hasHours ? 'text-[#38BDF8]' : 'text-[#64748B]'
                        }`}
                      >
                        {cat.hours.toFixed(1)} hr
                      </span>
                      {hasHours && (
                        <span className="text-[10px] text-[#94A3B8] hidden sm:inline">
                          ({cat.count} {cat.count === 1 ? 'slot' : 'slots'})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. TOTAL GROUP TIME SUMMARY */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-[#18233C]/80 to-[#1e1b4b]/60 border border-[#3B82F6]/30 shadow-[0_0_16px_rgba(59,130,246,0.15)]">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase">
              TOTAL GROUP TIME:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-[#38BDF8] tracking-wide">
                {totalGroupHours.toFixed(1)} hr
              </span>
              <span className="text-[10px] font-bold text-[#64748B]">
                ({selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'})
              </span>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="border-t border-white/[0.08] pt-2" />

          {/* ── ACTION BUTTONS ── */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border border-white/[0.08] bg-[#1E2538] hover:bg-[#28324D] text-[#94A3B8] hover:text-white text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={!name.trim() && selectedCategories.length === 0}
              className="h-11 px-7 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-[#3B82F6]/50 md:hover:scale-[1.01]"
            >
              <span>ADD GROUP</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
