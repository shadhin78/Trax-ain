/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  useAcademicHierarchy, 
  sortChaptersNumerically, 
  getChapterTopicDisplay 
} from '../../../context/AcademicHierarchyContext';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { ChevronDown, Check, AlertCircle, Trash2, Edit3 } from 'lucide-react';

export type EditEntityType = 'Track' | 'Program' | 'Subject' | 'Chapter';

export interface DashboardHeaderSettings {
  topTag: string;
  mainTitle: string;
  subtitle: string;
}

const DASHBOARD_HEADERS_KEY = 'x29_dashboard_headers';

export const ManageDataPanel: React.FC = () => {
  const {
    tracks,
    programs,
    subjects,
    chapters,
    renameTrack,
    deleteTrack,
    renameProgram,
    deleteProgram,
    renameSubject,
    deleteSubject,
    renameChapter,
    deleteChapter,
  } = useAcademicHierarchy();

  const { confirmDelete } = useDeleteConfirmation();
  const { appData, updateAppData } = useAuthSync();

  // ─────────────────────────────────────────────────────────────
  // 1. SAFELY RENAME OR DELETE EXISTING ITEMS STATE
  // ─────────────────────────────────────────────────────────────
  const [editType, setEditType] = useState<EditEntityType>('Subject');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-select valid Track
  useEffect(() => {
    if (tracks.length > 0 && (!selectedTrackId || !tracks.some(t => t.id === selectedTrackId))) {
      setSelectedTrackId(tracks[0].id);
    }
  }, [tracks, selectedTrackId]);

  // Available programs under selected track
  const availablePrograms = useMemo(() => {
    return programs.filter(p => p.trackId === selectedTrackId);
  }, [programs, selectedTrackId]);

  useEffect(() => {
    if (availablePrograms.length > 0 && (!selectedProgramId || !availablePrograms.some(p => p.id === selectedProgramId))) {
      setSelectedProgramId(availablePrograms[0].id);
    } else if (availablePrograms.length === 0) {
      setSelectedProgramId('');
    }
  }, [availablePrograms, selectedProgramId]);

  // Available subjects under selected program
  const availableSubjects = useMemo(() => {
    return subjects.filter(s => s.programId === selectedProgramId);
  }, [subjects, selectedProgramId]);

  useEffect(() => {
    if (availableSubjects.length > 0 && (!selectedSubjectId || !availableSubjects.some(s => s.id === selectedSubjectId))) {
      setSelectedSubjectId(availableSubjects[0].id);
    } else if (availableSubjects.length === 0) {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  // Available chapters under selected subject
  const availableChapters = useMemo(() => {
    return sortChaptersNumerically(chapters.filter(c => c.subjectId === selectedSubjectId));
  }, [chapters, selectedSubjectId]);

  // Synchronize selectedItemId and current name based on editType
  useEffect(() => {
    if (editType === 'Track') {
      const activeTrack = tracks.find(t => t.id === selectedTrackId);
      if (activeTrack) {
        setSelectedItemId(activeTrack.id);
        setNewName(activeTrack.name);
      } else {
        setSelectedItemId('');
        setNewName('');
      }
    } else if (editType === 'Program') {
      const activeProg = availablePrograms.find(p => p.id === selectedItemId) || availablePrograms[0];
      if (activeProg) {
        setSelectedItemId(activeProg.id);
        setNewName(activeProg.name);
      } else {
        setSelectedItemId('');
        setNewName('');
      }
    } else if (editType === 'Subject') {
      const activeSubj = availableSubjects.find(s => s.id === selectedItemId) || availableSubjects[0];
      if (activeSubj) {
        setSelectedItemId(activeSubj.id);
        setNewName(activeSubj.name);
      } else {
        setSelectedItemId('');
        setNewName('');
      }
    } else if (editType === 'Chapter') {
      const activeChap = availableChapters.find(c => c.id === selectedItemId) || availableChapters[0];
      if (activeChap) {
        setSelectedItemId(activeChap.id);
        setNewName(activeChap.title);
      } else {
        setSelectedItemId('');
        setNewName('');
      }
    }
  }, [editType, selectedTrackId, selectedProgramId, selectedSubjectId]);

  const handleSelectItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    if (editType === 'Track') {
      const item = tracks.find(t => t.id === itemId);
      if (item) setNewName(item.name);
    } else if (editType === 'Program') {
      const item = availablePrograms.find(p => p.id === itemId);
      if (item) setNewName(item.name);
    } else if (editType === 'Subject') {
      const item = availableSubjects.find(s => s.id === itemId);
      if (item) setNewName(item.name);
    } else if (editType === 'Chapter') {
      const item = availableChapters.find(c => c.id === itemId);
      if (item) setNewName(item.title);
    }
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanName = newName.trim();
    if (!selectedItemId) {
      setFeedback({ type: 'error', message: 'Please select an item to rename.' });
      return;
    }
    if (!cleanName) {
      setFeedback({ type: 'error', message: 'Name / title cannot be empty.' });
      return;
    }

    if (editType === 'Track') {
      const res = renameTrack(selectedItemId, cleanName);
      if (res.success) {
        setFeedback({ type: 'success', message: `Track successfully renamed to "${cleanName}".` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to rename track.' });
      }
    } else if (editType === 'Program') {
      const res = renameProgram(selectedItemId, cleanName);
      if (res.success) {
        setFeedback({ type: 'success', message: `Program successfully renamed to "${cleanName}".` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to rename program.' });
      }
    } else if (editType === 'Subject') {
      const res = renameSubject(selectedItemId, cleanName);
      if (res.success) {
        setFeedback({ type: 'success', message: `Subject successfully renamed to "${cleanName}".` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to rename subject.' });
      }
    } else if (editType === 'Chapter') {
      const currentChap = chapters.find(c => c.id === selectedItemId);
      const res = renameChapter(selectedItemId, currentChap?.chapterNumber || '1', cleanName);
      if (res.success) {
        setFeedback({ type: 'success', message: `Chapter successfully renamed to "${cleanName}".` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to rename chapter.' });
      }
    }
  };

  const handleDelete = () => {
    if (!selectedItemId) {
      setFeedback({ type: 'error', message: 'Please select an item to delete.' });
      return;
    }

    const currentItem = (
      editType === 'Track' ? tracks.find(t => t.id === selectedItemId) :
      editType === 'Program' ? availablePrograms.find(p => p.id === selectedItemId) :
      editType === 'Subject' ? availableSubjects.find(s => s.id === selectedItemId) :
      editType === 'Chapter' ? availableChapters.find(c => c.id === selectedItemId) :
      null
    );

    let deletedName = newName;
    if (!deletedName && currentItem) {
      if (editType === 'Chapter') {
        const chap = currentItem as any;
        const topic = getChapterTopicDisplay(chap);
        deletedName = `Chapter ${chap.chapterNumber}${topic && topic !== `Topic ${chap.chapterNumber}` ? ` (${topic})` : ''}`;
      } else {
        deletedName = (currentItem as any).name || selectedItemId;
      }
    }
    if (!deletedName) {
      deletedName = selectedItemId;
    }

    const cascadeMessage = (editType === 'Track' || editType === 'Program' || editType === 'Subject')
      ? ' All dependent items under it will also be deleted.'
      : '';

    confirmDelete({
      title: 'Confirm Delete',
      itemType: editType,
      itemName: deletedName,
      message: `Are you sure you want to delete ${editType} "${deletedName}"? This action cannot be undone.${cascadeMessage}`,
      onConfirm: () => {
        if (editType === 'Track') {
          deleteTrack(selectedItemId);
          setSelectedItemId('');
          setNewName('');
          setFeedback({ type: 'success', message: `Track "${deletedName}" and its children deleted.` });
        } else if (editType === 'Program') {
          deleteProgram(selectedItemId);
          setSelectedItemId('');
          setNewName('');
          setFeedback({ type: 'success', message: `Program "${deletedName}" and its children deleted.` });
        } else if (editType === 'Subject') {
          deleteSubject(selectedItemId);
          setSelectedItemId('');
          setNewName('');
          setFeedback({ type: 'success', message: `Subject "${deletedName}" and its chapters deleted.` });
        } else if (editType === 'Chapter') {
          deleteChapter(selectedItemId);
          setSelectedItemId('');
          setNewName('');
          setFeedback({ type: 'success', message: `Chapter "${deletedName}" deleted.` });
        }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 2. UPDATE MAIN DASHBOARD TITLES AND SUBHEADINGS STATE
  // ─────────────────────────────────────────────────────────────
  const [topTag, setTopTag] = useState<string>('TraX');
  const [mainTitle, setMainTitle] = useState<string>('TraX Dashboard');
  const [subtitle, setSubtitle] = useState<string>('');
  const [headersFeedback, setHeadersFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_HEADERS_KEY);
      if (saved) {
        const parsed: DashboardHeaderSettings = JSON.parse(saved);
        if (parsed.topTag) setTopTag(parsed.topTag);
        if (parsed.mainTitle) setMainTitle(parsed.mainTitle);
        if (parsed.subtitle) setSubtitle(parsed.subtitle);
      }
    } catch {
      // Use defaults
    }
  }, []);

  const handleUpdateHeaders = (e: React.FormEvent) => {
    e.preventDefault();
    setHeadersFeedback(null);
    const settings: DashboardHeaderSettings = {
      topTag: topTag.trim() || 'TraX',
      mainTitle: mainTitle.trim() || 'TraX Dashboard',
      subtitle: subtitle.trim(),
    };

    try {
      localStorage.setItem(DASHBOARD_HEADERS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('x29_dashboard_headers_updated', { detail: settings }));
      updateAppData({
        customData: {
          dashboardHeaders: settings,
        },
      }, { immediate: true, section: 'dashboardHeaders' });
      setHeadersFeedback('Dashboard headers updated successfully!');
      setTimeout(() => setHeadersFeedback(null), 3500);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto py-2">
      
      {/* ── ROW 1: SAFELY RENAME OR DELETE EXISTING ITEMS ── */}
      <div className="space-y-2">
        <div className="text-left">
          <p className="text-xs sm:text-sm font-sans text-[#94A3B8]">
            Safely rename or delete existing items.
          </p>
        </div>

        <form onSubmit={handleRename} className="space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5">
            
            {/* 1. EDIT TYPE */}
            <div className="lg:w-36 shrink-0 space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                EDIT TYPE
              </label>
              <div className="relative">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as EditEntityType)}
                  className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] focus:outline-none transition-colors cursor-pointer pr-9"
                >
                  <option value="Subject" className="bg-[#0B0D13] text-[#F8FAFC]">Subject</option>
                  <option value="Chapter" className="bg-[#0B0D13] text-[#F8FAFC]">Chapter</option>
                  <option value="Program" className="bg-[#0B0D13] text-[#F8FAFC]">Program</option>
                  <option value="Track" className="bg-[#0B0D13] text-[#F8FAFC]">Track</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
            </div>

            {/* 2. TRACK (OR TRACK FILTER) */}
            <div className="lg:w-36 shrink-0 space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                TRACK
              </label>
              <div className="relative">
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  disabled={tracks.length === 0}
                  className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] focus:outline-none transition-colors cursor-pointer pr-9 disabled:opacity-40"
                >
                  {tracks.length === 0 ? (
                    <option value="" className="bg-[#0B0D13] text-[#94A3B8]">No tracks</option>
                  ) : (
                    tracks.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
            </div>

            {/* 3. PROGRAM FILTER (FOR PROGRAM, SUBJECT, CHAPTER) */}
            {editType !== 'Track' && (
              <div className="lg:w-36 shrink-0 space-y-1.5">
                <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                  PROGRAM FILTER
                </label>
                <div className="relative">
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    disabled={availablePrograms.length === 0}
                    className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] focus:outline-none transition-colors cursor-pointer pr-9 disabled:opacity-40"
                  >
                    {availablePrograms.length === 0 ? (
                      <option value="" className="bg-[#0B0D13] text-[#94A3B8]">No programs</option>
                    ) : (
                      availablePrograms.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                </div>
              </div>
            )}

            {/* 4. SELECT ITEM (OR SUBJECT FILTER FOR CHAPTER) */}
            {editType === 'Chapter' && (
              <div className="lg:w-36 shrink-0 space-y-1.5">
                <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                  SUBJECT FILTER
                </label>
                <div className="relative">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    disabled={availableSubjects.length === 0}
                    className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] focus:outline-none transition-colors cursor-pointer pr-9 disabled:opacity-40"
                  >
                    {availableSubjects.length === 0 ? (
                      <option value="" className="bg-[#0B0D13] text-[#94A3B8]">No subjects</option>
                    ) : (
                      availableSubjects.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                </div>
              </div>
            )}

            {/* 5. SELECT ITEM (THE TARGET ITEM BEING RENAMED/DELETED) */}
            <div className="lg:w-40 shrink-0 space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                SELECT ITEM
              </label>
              <div className="relative">
                <select
                  value={selectedItemId}
                  onChange={(e) => handleSelectItemChange(e.target.value)}
                  className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] focus:outline-none transition-colors cursor-pointer pr-9"
                >
                  {editType === 'Track' ? (
                    tracks.length === 0 ? (
                      <option value="">No items</option>
                    ) : (
                      tracks.map(t => (
                        <option key={t.id} value={t.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                          {t.name}
                        </option>
                      ))
                    )
                  ) : editType === 'Program' ? (
                    availablePrograms.length === 0 ? (
                      <option value="">No items</option>
                    ) : (
                      availablePrograms.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                          {p.name}
                        </option>
                      ))
                    )
                  ) : editType === 'Subject' ? (
                    availableSubjects.length === 0 ? (
                      <option value="">No items</option>
                    ) : (
                      availableSubjects.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                          {s.name}
                        </option>
                      ))
                    )
                  ) : (
                    availableChapters.length === 0 ? (
                      <option value="">No items</option>
                    ) : (
                      availableChapters.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0B0D13] text-[#F8FAFC]">
                          Ch {c.chapterNumber}: {getChapterTopicDisplay(c)}
                        </option>
                      ))
                    )
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
            </div>

            {/* 6. NEW NAME / TITLE */}
            <div className="flex-1 min-w-[140px] space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                NEW NAME / TITLE
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                }}
                placeholder="Enter new name..."
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
              />
            </div>

            {/* 7. ACTION BUTTONS: RENAME & DELETE */}
            <div className="flex items-center gap-2 pt-1 lg:pt-0">
              <button
                type="submit"
                className="h-11 px-5 rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#F59E0B]/35 hover:border-[#F59E0B] active:scale-[0.98] transition-all cursor-pointer shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
              >
                RENAME
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-11 px-5 rounded-xl border border-[#F43F5E]/60 bg-[#F43F5E]/20 font-mono text-xs font-bold text-[#F43F5E] hover:bg-[#F43F5E]/35 hover:border-[#F43F5E] active:scale-[0.98] transition-all cursor-pointer shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
              >
                DELETE
              </button>
            </div>

          </div>

          {/* Feedback message */}
          {feedback && (
            <div className={`p-3 rounded-xl border font-mono text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                : 'border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#F43F5E]'
            }`}>
              {feedback.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-[#10B981]" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-[#F43F5E]" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </form>
      </div>

      {/* ── ROW 2: UPDATE MAIN DASHBOARD TITLES AND SUBHEADINGS ── */}
      <div className="space-y-2 pt-2">
        <div className="text-left">
          <p className="text-xs sm:text-sm font-sans text-[#94A3B8]">
            Update the main dashboard titles and subheadings.
          </p>
        </div>

        <form onSubmit={handleUpdateHeaders} className="space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5">
            
            {/* 1. TOP TAG */}
            <div className="lg:w-48 shrink-0 space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                TOP TAG
              </label>
              <input
                type="text"
                value={topTag}
                onChange={(e) => setTopTag(e.target.value)}
                placeholder="TraX"
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
              />
            </div>

            {/* 2. MAIN TITLE */}
            <div className="lg:w-64 shrink-0 space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                MAIN TITLE
              </label>
              <input
                type="text"
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                placeholder="TraX Dashboard"
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
              />
            </div>

            {/* 3. SUBTITLE */}
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
                SUBTITLE
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Study Tracker Dashboard"
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors"
              />
            </div>

            {/* 4. UPDATE HEADERS BUTTON */}
            <div className="pt-1 lg:pt-0">
              <button
                type="submit"
                className="h-11 px-6 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.98] transition-all cursor-pointer shrink-0 shadow-[0_0_16px_rgba(99,102,241,0.25)]"
              >
                UPDATE HEADERS
              </button>
            </div>

          </div>

          {/* Feedback message */}
          {headersFeedback && (
            <div className="p-3 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 font-mono text-xs text-[#10B981] flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-[#10B981]" />
              <span>{headersFeedback}</span>
            </div>
          )}
        </form>
      </div>

    </div>
  );
};
