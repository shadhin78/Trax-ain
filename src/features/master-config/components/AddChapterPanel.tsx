/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  useAcademicHierarchy, 
  parseChapterNumber, 
  sortChaptersNumerically, 
  getNextAvailableChapterNumber,
  getChapterTopicDisplay
} from '../../../context/AcademicHierarchyContext';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  FileText,
  CheckCircle2
} from 'lucide-react';
import { Chapter, PriorityLevel } from '../../../types/academic';

interface AddChapterPanelProps {
  selectedTrackId: string;
  selectedProgramId: string;
  selectedSubjectId: string;
  onSelectTrackId: (id: string) => void;
  onSelectProgramId: (id: string) => void;
  onSelectSubjectId: (id: string) => void;
}

export const AddChapterPanel: React.FC<AddChapterPanelProps> = React.memo(({
  selectedTrackId,
  selectedProgramId,
  selectedSubjectId,
  onSelectTrackId,
  onSelectProgramId,
  onSelectSubjectId,
}) => {
  const {
    tracks,
    programs,
    subjects,
    chapters,
    createChapter,
    renameChapter,
    deleteChapter,
  } = useAcademicHierarchy();
  const { confirmDelete } = useDeleteConfirmation();

  // Form input state
  const [chapterNumber, setChapterNumber] = useState('');
  const [topicName, setTopicName] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit / delete chapter state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editTopic, setEditTopic] = useState('');

  // Auto-resolve effective cascading selections
  const effectiveTrackId = selectedTrackId && tracks.some(t => t.id === selectedTrackId)
    ? selectedTrackId
    : (tracks.length > 0 ? tracks[0].id : '');

  const availablePrograms = useMemo(() => {
    return programs.filter(p => p.trackId === effectiveTrackId);
  }, [programs, effectiveTrackId]);

  const effectiveProgramId = selectedProgramId && availablePrograms.some(p => p.id === selectedProgramId)
    ? selectedProgramId
    : (availablePrograms.length > 0 ? availablePrograms[0].id : '');

  const availableSubjects = useMemo(() => {
    return subjects.filter(s => s.programId === effectiveProgramId);
  }, [subjects, effectiveProgramId]);

  const effectiveSubjectId = selectedSubjectId && availableSubjects.some(s => s.id === selectedSubjectId)
    ? selectedSubjectId
    : (availableSubjects.length > 0 ? availableSubjects[0].id : '');

  // Keep parent selections synchronized if initial load was unselected
  useEffect(() => {
    if (!selectedTrackId && effectiveTrackId) {
      onSelectTrackId(effectiveTrackId);
    }
  }, [effectiveTrackId, selectedTrackId, onSelectTrackId]);

  useEffect(() => {
    if (effectiveTrackId && !selectedProgramId && effectiveProgramId) {
      onSelectProgramId(effectiveProgramId);
    }
  }, [effectiveProgramId, selectedProgramId, effectiveTrackId, onSelectProgramId]);

  useEffect(() => {
    if (effectiveProgramId && !selectedSubjectId && effectiveSubjectId) {
      onSelectSubjectId(effectiveSubjectId);
    }
  }, [effectiveSubjectId, selectedSubjectId, effectiveProgramId, onSelectSubjectId]);

  // Current chapters in the selected subject, always sorted numerically ascending
  const currentChapters = sortChaptersNumerically(
    chapters.filter(c => c.subjectId === effectiveSubjectId)
  );
  // Lowest available positive integer chapter number (fills missing gaps when chapters are deleted)
  const suggestedChapNum = getNextAvailableChapterNumber(currentChapters);

  // Cascading dropdown handlers
  const handleTrackChange = (newTrackId: string) => {
    onSelectTrackId(newTrackId);
    const nextProgs = programs.filter(p => p.trackId === newTrackId);
    if (nextProgs.length > 0) {
      onSelectProgramId(nextProgs[0].id);
      const nextSubjs = subjects.filter(s => s.programId === nextProgs[0].id);
      if (nextSubjs.length > 0) {
        onSelectSubjectId(nextSubjs[0].id);
      } else {
        onSelectSubjectId('');
      }
    } else {
      onSelectProgramId('');
      onSelectSubjectId('');
    }
  };

  const handleProgramChange = (newProgramId: string) => {
    onSelectProgramId(newProgramId);
    const nextSubjs = subjects.filter(s => s.programId === newProgramId);
    if (nextSubjs.length > 0) {
      onSelectSubjectId(nextSubjs[0].id);
    } else {
      onSelectSubjectId('');
    }
  };

  const handleSubjectChange = (newSubjectId: string) => {
    onSelectSubjectId(newSubjectId);
  };

  // Submit handler
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!effectiveTrackId) {
      setError('Please select or create a Track first.');
      return;
    }
    if (!effectiveProgramId) {
      setError('Please select or create a Program Link first.');
      return;
    }
    if (!effectiveSubjectId) {
      setError('Please select or create a Subject Link first.');
      return;
    }

    const rawNum = chapterNumber.trim() || String(suggestedChapNum);
    const parsedNum = parseChapterNumber(rawNum);
    if (parsedNum <= 0 || isNaN(parsedNum)) {
      setError('Chapter number must be a valid positive number.');
      return;
    }

    // Default topic is "Topic <no>" (e.g. Topic 1, Topic 2) if not specified
    const enteredTopic = topicName.trim();
    const cleanTopic = (!enteredTopic || enteredTopic.toLowerCase() === `chapter ${parsedNum}`.toLowerCase() || enteredTopic.toLowerCase() === `ch ${parsedNum}`.toLowerCase())
      ? `Topic ${parsedNum}`
      : enteredTopic;

    // Duplicate validation before creation within the same subject
    const isDuplicate = currentChapters.some(
      c => parseChapterNumber(c.chapterNumber) === parsedNum
    );
    if (isDuplicate) {
      setError(`Chapter ${parsedNum} already exists in this subject.`);
      return;
    }

    const res = createChapter(
      effectiveTrackId,
      effectiveProgramId,
      effectiveSubjectId,
      String(parsedNum),
      cleanTopic,
      cleanTopic,
      priority
    );

    if (!res.success) {
      setError(res.error || 'Failed to create chapter.');
    } else {
      const currentSubjectObj = subjects.find(s => s.id === effectiveSubjectId);
      const subjName = currentSubjectObj ? currentSubjectObj.name : 'Selected Subject';
      setSuccessMessage(`Chapter ${parsedNum} ("${cleanTopic}") created successfully under ${subjName}!`);
      setTopicName('');
      setPriority('none');

      // Update suggested chapter number for subsequent additions
      const nextCandidate = getNextAvailableChapterNumber([...currentChapters, res.chapter!]);
      setChapterNumber(String(nextCandidate));
    }
  };

  const handleStartEdit = (chap: Chapter) => {
    setEditingId(chap.id);
    setEditNumber(chap.chapterNumber);
    setEditTopic(getChapterTopicDisplay(chap));
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    setError(null);
    const rawNumber = editNumber.trim();
    if (!rawNumber) {
      setError('Chapter number cannot be empty.');
      return;
    }
    const parsedNum = parseChapterNumber(rawNumber);
    if (isNaN(parsedNum) || parsedNum <= 0) {
      setError('Chapter number must be a valid positive number.');
      return;
    }
    // Default topic is "Topic <no>" if not specified
    const enteredTopic = editTopic.trim();
    const cleanTopic = (!enteredTopic || enteredTopic.toLowerCase() === `chapter ${parsedNum}`.toLowerCase() || enteredTopic.toLowerCase() === `ch ${parsedNum}`.toLowerCase())
      ? `Topic ${parsedNum}`
      : enteredTopic;

    // Duplicate check excluding this chapter record itself
    const isDuplicate = currentChapters.some(
      c => c.id !== id && parseChapterNumber(c.chapterNumber) === parsedNum
    );
    if (isDuplicate) {
      setError(`Chapter ${parsedNum} already exists in this subject.`);
      return;
    }

    const res = renameChapter(id, String(parsedNum), cleanTopic);
    if (!res.success) {
      setError(res.error || 'Failed to update chapter.');
      return;
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* ── TOP CONTROLS ROW (FOLLOWING STRUCTURE FROM IMG) ── */}
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5">
          
          {/* 1. TRACK DROPDOWN */}
          <div className="lg:w-40 shrink-0 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              TRACK
            </label>
            <div className="relative">
              <select
                value={effectiveTrackId}
                onChange={(e) => handleTrackChange(e.target.value)}
                className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#10B981] focus:outline-none transition-colors cursor-pointer pr-9"
              >
                {tracks.length === 0 ? (
                  <option value="" className="bg-[#0B0D13] text-[#94A3B8]">-- No Tracks --</option>
                ) : (
                  tracks.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#0B0D13] text-[#F8FAFC]">{t.name}</option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94A3B8]">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 2. PROGRAM LINK DROPDOWN */}
          <div className="lg:w-40 shrink-0 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              PROGRAM LINK
            </label>
            <div className="relative">
              <select
                value={effectiveProgramId}
                onChange={(e) => handleProgramChange(e.target.value)}
                disabled={!effectiveTrackId || availablePrograms.length === 0}
                className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#10B981] focus:outline-none transition-colors cursor-pointer pr-9 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {availablePrograms.length === 0 ? (
                  <option value="" className="bg-[#0B0D13] text-[#94A3B8]">
                    {!effectiveTrackId ? '-- Track First --' : '-- No Programs --'}
                  </option>
                ) : (
                  availablePrograms.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0B0D13] text-[#F8FAFC]">{p.name}</option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94A3B8]">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 3. SUBJECT LINK DROPDOWN */}
          <div className="lg:w-44 shrink-0 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              SUBJECT LINK
            </label>
            <div className="relative">
              <select
                value={effectiveSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={!effectiveProgramId || availableSubjects.length === 0}
                className="w-full appearance-none h-11 px-3.5 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#10B981] focus:outline-none transition-colors cursor-pointer pr-9 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {availableSubjects.length === 0 ? (
                  <option value="" className="bg-[#0B0D13] text-[#94A3B8]">
                    {!effectiveProgramId ? '-- Program First --' : '-- No Subjects --'}
                  </option>
                ) : (
                  availableSubjects.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0B0D13] text-[#F8FAFC]">{s.name}</option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94A3B8]">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 4. NEW CHAPTER NO INPUT */}
          <div className="lg:w-28 shrink-0 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              NEW CHAPTER NO
            </label>
            <input
              type="text"
              value={chapterNumber}
              onChange={(e) => {
                setChapterNumber(e.target.value);
                if (error) setError(null);
              }}
              placeholder={`e.g. ${suggestedChapNum}`}
              className="w-full h-11 px-3 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs text-center placeholder:text-[#64748B] focus:border-[#10B981] focus:outline-none transition-colors"
            />
          </div>

          {/* 5. TOPIC NAME INPUT */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              TOPIC NAME
            </label>
            <input
              type="text"
              value={topicName}
              onChange={(e) => {
                setTopicName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={`Default: Topic ${chapterNumber.trim() || suggestedChapNum}`}
              className="w-full h-11 px-4 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs placeholder:text-[#64748B] focus:border-[#10B981] focus:outline-none transition-colors"
            />
          </div>

          {/* 6. CREATE BUTTON (VIBRANT EMERALD GREEN) */}
          <div className="shrink-0 space-y-1.5">
            <label className="hidden lg:block text-[11px] font-mono font-bold tracking-wider uppercase text-transparent select-none">
              &nbsp;
            </label>
            <button
              type="submit"
              className="w-full lg:w-auto h-11 px-7 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              CREATE
            </button>
          </div>

        </div>

        {/* ── OPTIONAL: PRIORITY TOGGLE ── */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] px-1">
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="inline-flex items-center gap-1.5 text-[#38BDF8] hover:underline cursor-pointer"
          >
            <span>{showMoreOptions ? '− Hide optional Priority' : '+ Optional: Chapter Priority'}</span>
          </button>
          {effectiveSubjectId && (
            <span className="text-[#64748B]">
              Adding to: <span className="text-[#F8FAFC] font-semibold">{subjects.find(s => s.id === effectiveSubjectId)?.name || 'Selected Subject'}</span>
            </span>
          )}
        </div>

        {/* Optional Priority field */}
        {showMoreOptions && (
          <div className="p-3.5 rounded-2xl border border-white/[0.1] bg-[#131722]/30 backdrop-blur-sm max-w-sm space-y-1 animate-in fade-in duration-150">
            <label className="block text-[10px] font-mono text-[#94A3B8]">
              CHAPTER PRIORITY (OPTIONAL)
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full h-10 px-3.5 rounded-xl border border-white/[0.12] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs focus:border-[#10B981] focus:outline-none"
            >
              <option value="none">Priority: None</option>
              <option value="high">Priority: High</option>
              <option value="medium">Priority: Medium</option>
              <option value="low">Priority: Low</option>
            </select>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 text-xs font-mono text-[#10B981] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl border border-[#F43F5E]/40 bg-[#F43F5E]/10 text-xs font-mono text-[#F43F5E] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* ── CONFIGURED CHAPTERS LIST UNDER SELECTED SUBJECT (TRANSPARENT THEME) ── */}
      <div className="space-y-3 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] px-1">
          <span>
            CHAPTERS UNDER SELECTED SUBJECT ({currentChapters.length})
          </span>
          <span>RENAME / DELETE</span>
        </div>

        {availableSubjects.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] bg-transparent">
            <FileText className="h-8 w-8 text-[#64748B] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-mono text-[#F8FAFC]">No subjects available</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Create a subject under the <strong className="text-[#F8FAFC]">add subject</strong> tab first.
            </p>
          </div>
        ) : currentChapters.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] bg-transparent">
            <FileText className="h-8 w-8 text-[#64748B] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-mono text-[#F8FAFC]">No chapters in this subject</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Use the control bar above to create chapter 1 for this subject.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentChapters.map((chap) => {
              const isEditing = editingId === chap.id;

              return (
                <div
                  key={chap.id}
                  className="p-3.5 rounded-xl border border-white/[0.08] bg-transparent hover:border-white/[0.18] transition-all"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          placeholder="Chapter #"
                          className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-[#10B981] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          placeholder="Topic Name"
                          className="sm:col-span-9 px-3 py-1.5 rounded-lg border border-[#10B981] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(chap.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#10B981]/20 text-[#10B981] font-mono text-xs hover:bg-[#10B981]/30 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Changes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-[#94A3B8] font-mono text-xs hover:bg-white/20 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/30">
                            Ch {chap.chapterNumber}
                          </span>
                          <span className="font-semibold text-sm text-[#F8FAFC] truncate">
                            {getChapterTopicDisplay(chap)}
                          </span>
                          {chap.priority && chap.priority !== 'none' && (
                            <span className={`px-2 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider ${
                              chap.priority === 'high' ? 'bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30' :
                              chap.priority === 'medium' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30' :
                              'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                            }`}>
                              {chap.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(chap)}
                          className="p-2 rounded-lg border border-white/[0.08] bg-[#131722] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/20 transition-colors cursor-pointer"
                          title="Edit Chapter"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const topicDisplay = getChapterTopicDisplay(chap);
                            const chapterLabel = `Chapter ${chap.chapterNumber}${topicDisplay && topicDisplay !== `Topic ${chap.chapterNumber}` ? ` (${topicDisplay})` : ''}`;
                            confirmDelete({
                              title: 'Confirm Delete',
                              itemType: 'Chapter',
                              itemName: chapterLabel,
                              message: `Are you sure you want to delete "${chapterLabel}"? This action cannot be undone.`,
                              onConfirm: () => {
                                deleteChapter(chap.id);
                              },
                            });
                          }}
                          className="p-2 rounded-lg border border-white/[0.08] bg-[#131722] text-[#94A3B8] hover:text-[#F43F5E] hover:border-[#F43F5E]/40 transition-colors cursor-pointer"
                          title="Delete Chapter"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
});

AddChapterPanel.displayName = 'AddChapterPanel';
