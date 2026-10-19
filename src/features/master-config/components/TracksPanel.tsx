/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Check, X, Layers, AlertTriangle } from 'lucide-react';
import { Track } from '../../../types/academic';

export const TracksPanel: React.FC = () => {
  const { tracks, createTrack, renameTrack, deleteTrack, reorderTracks, programs, subjects, chapters } = useAcademicHierarchy();
  const { confirmDelete } = useDeleteConfirmation();
  const [trackName, setTrackName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = createTrack(trackName);
    if (!res.success) {
      setError(res.error || 'Failed to create track.');
    } else {
      setTrackName('');
    }
  };

  const handleStartEdit = (track: Track) => {
    setEditingId(track.id);
    setEditName(track.name);
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    const res = renameTrack(id, editName);
    if (!res.success) {
      setError(res.error || 'Failed to rename track.');
    } else {
      setEditingId(null);
      setEditName('');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newTracks = [...tracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTracks.length) return;
    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIndex];
    newTracks[targetIndex] = temp;
    reorderTracks(newTracks);
  };

  const getChildCount = (trackId: string) => {
    const pCount = programs.filter(p => p.trackId === trackId).length;
    const sCount = subjects.filter(s => s.trackId === trackId).length;
    const cCount = chapters.filter(c => c.trackId === trackId).length;
    return { programs: pCount, subjects: sCount, chapters: cCount };
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Create Track Form */}
      <form onSubmit={handleCreate} className="p-4 rounded-2xl border border-white/[0.1] bg-[#131722]/40 backdrop-blur-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="Enter Track Name (e.g. Science, Engineering, Business)..."
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.12] bg-[#0E121B]/80 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Track</span>
          </button>
        </div>
        {error && (
          <p className="text-xs font-mono text-[#F43F5E] flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </form>

      {/* Tracks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] px-1">
          <span>CONFIGURED TRACKS ({tracks.length})</span>
          <span>REORDER / RENAME / DELETE</span>
        </div>

        {tracks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] bg-transparent">
            <Layers className="h-8 w-8 text-[#64748B] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-mono text-[#F8FAFC]">No tracks created yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Create your first Track above to begin configuring your academic hierarchy.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, idx) => {
              const counts = getChildCount(track.id);
              const isEditing = editingId === track.id;

              return (
                <div
                  key={track.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50 hover:border-white/[0.18] transition-all"
                >
                  {/* Left: Reorder Controls + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Move track up"
                        className="p-1 rounded hover:bg-white/10 text-[#94A3B8] disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === tracks.length - 1}
                        aria-label="Move track down"
                        className="p-1 rounded hover:bg-white/10 text-[#94A3B8] disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#6366F1] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(track.id)}
                          className="p-1.5 rounded-lg bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-white/10 text-[#94A3B8] hover:bg-white/20"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#6366F1]">#{idx + 1}</span>
                          <span className="font-semibold text-sm text-[#F8FAFC] truncate">
                            {track.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-[#94A3B8]">
                          <span>{counts.programs} Programs</span>
                          <span>·</span>
                          <span>{counts.subjects} Subjects</span>
                          <span>·</span>
                          <span>{counts.chapters} Chapters</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(track)}
                        className="p-2 rounded-lg border border-white/[0.08] bg-[#131722] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/20 transition-colors cursor-pointer"
                        title="Rename Track"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          confirmDelete({
                            title: 'Confirm Delete',
                            itemType: 'Track',
                            itemName: track.name,
                            message: `Are you sure you want to delete "${track.name}"? This action cannot be undone. All dependent programs, subjects, and chapters will also be deleted.`,
                            onConfirm: () => {
                              deleteTrack(track.id);
                            },
                          });
                        }}
                        className="p-2 rounded-lg border border-white/[0.08] bg-[#131722] text-[#94A3B8] hover:text-[#F43F5E] hover:border-[#F43F5E]/40 transition-colors cursor-pointer"
                        title="Delete Track (Cascading)"
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
