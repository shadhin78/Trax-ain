/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Edit2, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useDailySchedule } from '../context/DailyScheduleContext';
import { RoutineCategory } from '../types';

const EMOJI_PRESETS = [
  '📚', '💼', '🚗', '🏋️', '😴', '🍽️',
  '👤', '🧘', '📋', '💻', '🎯', '🎨',
  '🎵', '🏃', '⚡', '🎮', '☕', '📖',
  '🔬', '🩺', '🛒', '🧹', '🎬', '💡',
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: RoutineCategory | null;
  onSave: (data: { name: string; icon: string; color: string }) => Promise<void>;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setIcon(categoryToEdit.icon || '📌');
      } else {
        setName('');
        setIcon('📚');
      }
    }
  }, [isOpen, categoryToEdit]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        icon: icon.trim() || '📌',
        color: categoryToEdit?.color || '#3B82F6',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] border border-white/[0.12] bg-[#0E1320]/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] relative overflow-hidden my-auto md:animate-in md:fade-in-0 md:zoom-in-95 md:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-xl shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              {icon}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC] tracking-tight">
                {categoryToEdit ? 'Edit Category' : 'Create Category'}
              </h3>
              <p className="text-[10px] text-[#64748B] font-bold tracking-wider uppercase mt-0.5">
                ROUTINE CATEGORY SYSTEM
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-[#1E2538] hover:bg-[#28324D] border border-white/[0.08] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form without color picker */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category Name */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              CATEGORY NAME:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coding, Gym, Reading..."
              className="w-full h-11 px-4 rounded-xl border border-white/[0.1] bg-[#141A28] font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] placeholder:text-white/20 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none"
              autoFocus
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              CHOOSE ICON / EMOJI:
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 rounded-xl bg-[#141A28] border border-white/[0.08] max-h-40 overflow-y-auto">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer ${
                    icon === emoji
                      ? 'bg-[#3B82F6]/30 border-2 border-[#3B82F6] scale-105'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Custom Emoji Input */}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Custom:</span>
              <input
                type="text"
                value={icon}
                maxLength={4}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Type emoji"
                className="w-16 h-7 px-2 text-center rounded-lg border border-white/[0.1] bg-[#141A28] text-xs font-bold text-white focus:border-[#3B82F6] outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-white/[0.1] bg-[#141A28] hover:bg-[#1E2538] text-xs font-bold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_16px_rgba(37,99,235,0.4)] border border-[#3B82F6]"
            >
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export const CategoryManagementCard: React.FC = React.memo(() => {
  const { categories, activeRoutine, addCategory, updateCategory, deleteCategory } = useDailySchedule();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<RoutineCategory | null>(null);

  // Compute active usage for each category in the current routine
  const categoryStats = useMemo(() => {
    const rawBlocks = activeRoutine?.blocks || [];
    return categories.map((cat) => {
      const matchingBlocks = rawBlocks.filter(
        (b) => b.category && b.category.trim().toLowerCase() === cat.name.trim().toLowerCase()
      );
      const totalHours = matchingBlocks.reduce(
        (acc, b) => acc + (b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1)),
        0
      );
      return {
        ...cat,
        blockCount: matchingBlocks.length,
        hours: Math.round(totalHours * 10) / 10,
      };
    });
  }, [categories, activeRoutine?.blocks]);

  const handleOpenAdd = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: RoutineCategory) => {
    setCategoryToEdit(cat);
    setIsModalOpen(true);
  };

  const handleDelete = async (cat: RoutineCategory) => {
    if (window.confirm(`Delete category "${cat.name}"? Existing blocks with this category will be preserved.`)) {
      await deleteCategory(cat.id);
    }
  };

  const handleSaveCategory = async (data: { name: string; icon: string; color: string }) => {
    if (categoryToEdit) {
      await updateCategory(categoryToEdit.id, data);
    } else {
      await addCategory(data);
      setIsOpen(true); // Automatically expand dropdown to show newly added category
    }
  };

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── DROPDOWN HEADER ROW ── */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Dropdown Chevron Toggle */}
          <div className="p-1 rounded-lg bg-white/[0.04] text-[#94A3B8] group-hover:text-white transition-colors shrink-0">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-[#60A5FA]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
            )}
          </div>

          <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA] shrink-0">
            <Tag className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wider uppercase truncate">
                CATEGORY MANAGEMENT
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.08] text-[#94A3B8] shrink-0">
                {categoryStats.length}
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5 truncate">
              {isOpen ? 'CREATE, EDIT & DELETE CATEGORIES' : 'CLICK TO EXPAND CATEGORIES'}
            </p>
          </div>
        </div>

        {/* + CATEGORY BUTTON (Single Plus, No extra plus icon) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAdd();
          }}
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-[#3B82F6]/50 bg-[#2563EB]/20 hover:bg-[#2563EB]/40 text-[#60A5FA] hover:text-white text-[10px] font-bold tracking-wider transition-colors cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)] md:hover:scale-[1.02] active:scale-95 shrink-0 ml-2"
        >
          <span>+ CATEGORY</span>
        </button>
      </div>

      {/* ── DROPDOWN CONTENT (CATEGORIES LIST) ── */}
      {isOpen && (
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-2 max-h-[380px] overflow-y-auto pr-1 md:animate-in md:fade-in-0 md:duration-150">
          {categoryStats.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-2xl">
              <p className="text-xs text-[#64748B] font-bold uppercase tracking-wider">
                NO CATEGORIES CONFIGURED
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-3 px-3 py-1.5 rounded-lg bg-[#2563EB]/20 text-[#60A5FA] text-[11px] font-bold hover:bg-[#2563EB]/35 transition-colors cursor-pointer"
              >
                + Create Category
              </button>
            </div>
          ) : (
            categoryStats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-white/[0.06] bg-[#131722]/70 hover:bg-[#131722] hover:border-white/[0.12] transition-all group"
              >
                {/* Left: Icon + Name + Hours Badge (No color dot) */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-base shrink-0">
                    {cat.icon || '📌'}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs sm:text-[13px] font-bold text-[#F8FAFC] truncate block">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-bold tracking-wider mt-0.5">
                      <span className="text-[#38BDF8]">
                        {cat.hours} {cat.hours === 1 ? 'hr' : 'hrs'}
                      </span>
                      <span>•</span>
                      <span>
                        {cat.blockCount} {cat.blockCount === 1 ? 'block' : 'blocks'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    title="Edit Category"
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#60A5FA] hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    title="Delete Category"
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F43F5E] hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCategoryToEdit(null);
          }}
          categoryToEdit={categoryToEdit}
          onSave={handleSaveCategory}
        />
      )}
    </div>
  );
});

CategoryManagementCard.displayName = 'CategoryManagementCard';
