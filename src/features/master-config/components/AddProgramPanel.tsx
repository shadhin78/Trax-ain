/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { Edit2, Trash2, Check, X, AlertTriangle, Layers, ChevronDown } from 'lucide-react';
import { Program } from '../../../types/academic';

interface AddProgramPanelProps {
  selectedTrackId: string;
  onSelectTrackId: (id: string) => void;
}

export const AddProgramPanel: React.FC<AddProgramPanelProps> = ({
  selectedTrackId,
  onSelectTrackId,
}) => {
  const { tracks, programs, createProgram, renameProgram, deleteProgram, subjects, chapters } = useAcademicHierarchy();
  const { confirmDelete } = useDeleteConfirmation();
  const [programName, setProgramName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Auto-select first track if none selected and tracks exist
  const effectiveTrackId = selectedTrackId || (tracks.length > 0 ? tracks[0].id : '');

  // Available programs for currently selected track
  const currentPrograms = programs.filter(p => p.trackId === effectiveTrackId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!effectiveTrackId) {
      setError('Please select or create a Track first.');
      return;
    }
    const res = createProgram(effectiveTrackId, programName);
    if (!res.success) {
      setError(res.error || 'Failed to create program.');
    } else {
      setProgramName('');
    }
  };

  const handleStartEdit = (program: Program) => {
    setEditingId(program.id);
    setEditName(program.name);
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    const res = renameProgram(id, editName);
    if (!res.success) {
      setError(res.error || 'Failed to rename program.');
    } else {
      setEditingId(null);
      setEditName('');
    }
  };

  const getProgramCounts = (programId: string) => {
    const sCount = subjects.filter(s => s.programId === programId).length;
    const cCount = chapters.filter(c => c.programId === programId).length;
    return { subjects: sCount, chapters: cCount };
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* ── SUBTITLE HEADER (MATCHING WIREFRAME IMAGE) ── */}
      <div className="text-left pb-1">
        <p className="text-xs sm:text-sm font-sans text-[#94A3B8]">
          Add a completely new Program bracket to any track.
        </p>
      </div>

      {/* ── 3-COLUMN ROW: TRACK DROPDOWN · NEW PROGRAM NAME · CREATE PROGRAM BUTTON (TRANSPARENT THEME) ── */}
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          
          {/* 1. TRACK DROPDOWN */}
          <div className="sm:col-span-4 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              TRACK
            </label>
            <div className="relative">
              <select
                value={effectiveTrackId}
                onChange={(e) => onSelectTrackId(e.target.value)}
                className="w-full appearance-none px-4 py-3 rounded-xl border border-white/[0.14] bg-transparent text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] focus:outline-none transition-colors cursor-pointer pr-10"
              >
                {tracks.length === 0 ? (
                  <option value="" className="bg-[#0B0D13] text-[#94A3B8]">
                    No tracks available
                  </option>
                ) : (
                  tracks.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                      {t.name}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#94A3B8]">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 2. NEW PROGRAM NAME INPUT */}
          <div className="sm:col-span-5 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              NEW PROGRAM NAME
            </label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g. Honours, Year 1"
              className="w-full px-4 py-3 rounded-xl border border-white/[0.14] bg-transparent text-[#F8FAFC] font-mono text-xs placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
            />
          </div>

          {/* 3. CREATE PROGRAM (SAVE) BUTTON */}
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              CREATE PROGRAM
            </button>
          </div>

        </div>

        {error && (
          <p className="text-xs font-mono text-[#F43F5E] flex items-center gap-1.5 pt-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </form>

      {/* ── CONFIGURED PROGRAMS LIST (TRANSPARENT THEME) ── */}
      <div className="space-y-3 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] px-1">
          <span>PROGRAMS UNDER SELECTED TRACK ({currentPrograms.length})</span>
          <span>RENAME / DELETE</span>
        </div>

        {tracks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] bg-transparent">
            <Layers className="h-8 w-8 text-[#64748B] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-mono text-[#F8FAFC]">No tracks created yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Please create a Track in the <strong className="text-[#F8FAFC]">Tracks</strong> panel first.
            </p>
          </div>
        ) : currentPrograms.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] bg-transparent">
            <Layers className="h-8 w-8 text-[#64748B] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-mono text-[#F8FAFC]">No programs in this track</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Use the form above to add your first program under this track.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentPrograms.map((prog, idx) => {
              const counts = getProgramCounts(prog.id);
              const isEditing = editingId === prog.id;

              return (
                <div
                  key={prog.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-transparent hover:border-white/[0.18] hover:bg-white/[0.02] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#6366F1] bg-transparent font-mono text-xs text-[#F8FAFC] focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(prog.id)}
                          className="p-1.5 rounded-lg bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 cursor-pointer"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-white/10 text-[#94A3B8] hover:bg-white/20 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#6366F1]">#{idx + 1}</span>
                          <span className="font-semibold text-sm text-[#F8FAFC] truncate">
                            {prog.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-[#94A3B8]">
                          <span>{counts.subjects} Subjects</span>
                          <span>·</span>
                          <span>{counts.chapters} Chapters</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(prog)}
                        className="p-2 rounded-lg border border-white/[0.08] bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/20 transition-colors cursor-pointer"
                        title="Rename Program"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          confirmDelete({
                            title: 'Confirm Delete',
                            itemType: 'Program',
                            itemName: prog.name,
                            message: `Are you sure you want to delete "${prog.name}"? This action cannot be undone. All dependent subjects and chapters will also be deleted.`,
                            onConfirm: () => {
                              deleteProgram(prog.id);
                            },
                          });
                        }}
                        className="p-2 rounded-lg border border-white/[0.08] bg-transparent text-[#94A3B8] hover:text-[#F43F5E] hover:border-[#F43F5E]/40 transition-colors cursor-pointer"
                        title="Delete Program (Cascading)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
