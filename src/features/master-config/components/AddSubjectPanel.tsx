/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  ChevronDown, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';
import { PriorityLevel } from '../../../types/academic';

interface AddSubjectPanelProps {
  selectedTrackId: string;
  selectedProgramId: string;
  onSelectTrackId: (id: string) => void;
  onSelectProgramId: (id: string) => void;
}

interface BulkChapterItem {
  id: string;
  chapterNumber: string;
  title: string;
  priority: PriorityLevel;
}

export const AddSubjectPanel: React.FC<AddSubjectPanelProps> = React.memo(({
  selectedTrackId,
  selectedProgramId,
  onSelectTrackId,
  onSelectProgramId,
}) => {
  const { 
    tracks, 
    programs, 
    createSubject, 
    createSubjectWithChapters,
  } = useAcademicHierarchy();
  const { confirmDelete } = useDeleteConfirmation();

  // Form input state
  const [subjectName, setSubjectName] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [isBulkChapters, setIsBulkChapters] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsedChapters, setParsedChapters] = useState<BulkChapterItem[]>([]);
  
  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-resolve effective track and program selections
  const effectiveTrackId = selectedTrackId && tracks.some(t => t.id === selectedTrackId)
    ? selectedTrackId
    : (tracks.length > 0 ? tracks[0].id : '');

  const availablePrograms = useMemo(() => {
    return programs.filter(p => p.trackId === effectiveTrackId);
  }, [programs, effectiveTrackId]);

  const effectiveProgramId = selectedProgramId && availablePrograms.some(p => p.id === selectedProgramId)
    ? selectedProgramId
    : (availablePrograms.length > 0 ? availablePrograms[0].id : '');

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

  // Helper to parse line-by-line bulk text into structured chapters
  const parseLinesToChapters = (text: string): BulkChapterItem[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map((line, idx) => {
      // Auto-detect chapter numbers: e.g. "1. Title", "Ch 2: Title", "Chapter 3 - Title"
      const match = line.match(/^(?:(?:ch(?:apter)?\.?)\s*)?([0-9a-zA-Z]+)(?:[.:\-\)\s]+)(.*)$/i);
      let chapterNumber = String(idx + 1);
      let title = line;

      if (match && match[1] && match[2] && match[2].trim()) {
        chapterNumber = match[1].trim();
        title = match[2].trim();
      }

      return {
        id: `bulk_${idx}_${Date.now()}`,
        chapterNumber,
        title,
        priority: 'none' as PriorityLevel,
      };
    });
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    const parsed = parseLinesToChapters(text);
    setParsedChapters(parsed);
  };

  const handleLoadSample = () => {
    const sample = `1. Introduction to Financial Reporting
2. Conceptual Framework & Accounting Standards
3. Statement of Financial Position & Balance Sheet
4. Statement of Cash Flows & Disclosure Analysis`;
    setBulkText(sample);
    setParsedChapters(parseLinesToChapters(sample));
  };

  const handleClearBulk = () => {
    if (!bulkText && parsedChapters.length === 0) return;
    confirmDelete({
      title: 'Confirm Clear',
      itemName: 'Bulk Chapters',
      message: 'Are you sure you want to clear all entered bulk chapters? This action cannot be undone.',
      confirmLabel: 'Clear',
      onConfirm: () => {
        setBulkText('');
        setParsedChapters([]);
      },
    });
  };

  const handleAddEmptyRow = () => {
    const nextNum = String(parsedChapters.length + 1);
    setParsedChapters(prev => [
      ...prev,
      {
        id: `bulk_manual_${Date.now()}_${Math.random()}`,
        chapterNumber: nextNum,
        title: `Topic ${nextNum}`,
        priority: 'none',
      }
    ]);
  };

  const handleUpdateParsedRow = (index: number, field: keyof BulkChapterItem, value: string) => {
    setParsedChapters(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveParsedRow = (index: number) => {
    const row = parsedChapters[index];
    const rowName = row?.title?.trim() || `Chapter ${row?.chapterNumber || index + 1}`;
    confirmDelete({
      title: 'Confirm Remove',
      itemType: 'Chapter Row',
      itemName: rowName,
      message: `Are you sure you want to remove "${rowName}" from bulk chapters?`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        setParsedChapters(prev => prev.filter((_, i) => i !== index));
      },
    });
  };

  const handleTrackChange = (newTrackId: string) => {
    onSelectTrackId(newTrackId);
    const nextProgs = programs.filter(p => p.trackId === newTrackId);
    if (nextProgs.length > 0) {
      onSelectProgramId(nextProgs[0].id);
    } else {
      onSelectProgramId('');
    }
  };

  const handleProgramChange = (newProgramId: string) => {
    onSelectProgramId(newProgramId);
  };

  // Submit creation handler
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
    const cleanName = subjectName.trim();
    if (!cleanName) {
      setError('Please enter a Subject Name.');
      return;
    }

    const currentProgramObj = programs.find(p => p.id === effectiveProgramId);
    const progLabel = currentProgramObj ? currentProgramObj.name : 'Selected Program';

    if (isBulkChapters) {
      const validChapters = parsedChapters.filter(c => c.title.trim().length > 0);
      if (validChapters.length === 0) {
        setError('Bulk Chapters is enabled, but no chapters were entered. Please enter at least one chapter or uncheck BULK CHAPTERS.');
        return;
      }

      const res = createSubjectWithChapters(
        effectiveTrackId,
        effectiveProgramId,
        cleanName,
        validChapters.map(c => ({
          chapterNumber: c.chapterNumber.trim() || '1',
          title: c.title.trim(),
          priority: c.priority,
        })),
        priority
      );

      if (!res.success) {
        setError(res.error || 'Failed to create subject with chapters.');
      } else {
        setSuccessMessage(`Subject "${cleanName}" created with ${res.chaptersCount || validChapters.length} chapters under ${progLabel}!`);
        setSubjectName('');
        setBulkText('');
        setParsedChapters([]);
        setPriority('none');
      }
    } else {
      const res = createSubject(effectiveTrackId, effectiveProgramId, cleanName, priority);
      if (!res.success) {
        setError(res.error || 'Failed to create subject.');
      } else {
        setSuccessMessage(`Subject "${cleanName}" created successfully under ${progLabel}!`);
        setSubjectName('');
        setPriority('none');
      }
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* ── TOP CONTROLS ROW (FOLLOWING STRUCTURE FROM IMG) ── */}
      <form onSubmit={handleCreate} className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3">
          
          {/* 1. TRACK DROPDOWN */}
          <div className="lg:w-48 shrink-0 space-y-1.5">
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
          <div className="lg:w-48 shrink-0 space-y-1.5">
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

          {/* 3. NEW SUBJECT NAME INPUT */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#94A3B8]">
              NEW SUBJECT NAME
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => {
                setSubjectName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Financial Reporting"
              className="w-full h-11 px-4 rounded-xl border border-white/[0.14] bg-[#0E121B] text-[#F8FAFC] font-mono text-xs placeholder:text-[#64748B] focus:border-[#10B981] focus:outline-none transition-colors"
            />
          </div>

          {/* 4. BULK CHAPTERS TOGGLE BOX */}
          <div className="shrink-0 space-y-1.5">
            <label className="hidden lg:block text-[11px] font-mono font-bold tracking-wider uppercase text-transparent select-none">
              &nbsp;
            </label>
            <button
              type="button"
              onClick={() => setIsBulkChapters(!isBulkChapters)}
              className={`h-11 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2.5 select-none ${
                isBulkChapters
                  ? 'border-[#10B981] bg-[#10B981]/15 text-[#F8FAFC] shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                  : 'border-white/[0.14] bg-[#0E121B] text-[#CBD5E1] hover:border-white/[0.3] hover:text-[#F8FAFC]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${
                  isBulkChapters
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'border border-white/50 bg-white/5'
                }`}
              >
                {isBulkChapters && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="font-mono text-xs font-bold tracking-wider uppercase">
                BULK CHAPTERS
              </span>
            </button>
          </div>

          {/* 5. CREATE BUTTON (VIBRANT EMERALD GREEN) */}
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

        {/* ── EXPANDABLE BULK CHAPTERS BUILDER ── */}
        {isBulkChapters && (
          <div className="p-4 sm:p-5 rounded-2xl border border-[#10B981]/30 bg-[#131722]/35 backdrop-blur-sm space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#10B981]" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
                  BULK CHAPTERS BUILDER
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 font-semibold">
                  {parsedChapters.length} {parsedChapters.length === 1 ? 'Chapter' : 'Chapters'} Ready
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 rounded-lg border border-white/[0.12] bg-white/[0.04] text-[11px] font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08] transition-colors"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={handleClearBulk}
                  className="px-2.5 py-1 rounded-lg border border-white/[0.12] bg-white/[0.04] text-[11px] font-mono text-[#94A3B8] hover:text-[#F43F5E] hover:border-[#F43F5E]/30 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Line-by-line quick paste textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                <span>PASTE OR ENTER CHAPTERS (ONE CHAPTER PER LINE)</span>
                <span className="text-[#64748B]">Auto-numbers if no prefix</span>
              </div>
              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                placeholder={`Paste chapters here, for example:
1. Introduction to Financial Reporting | Overview
2. Statement of Financial Position | Balance Sheet
3. Statement of Cash Flows | Cash Flow Analysis
4. Revenue Recognition & Accounting Policies`}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.12] bg-[#0E121B]/90 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#10B981] focus:outline-none transition-colors resize-y"
              />
            </div>

            {/* Parsed chapters editor & preview */}
            {parsedChapters.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                  <span>CHAPTERS PREVIEW & EDIT ({parsedChapters.length})</span>
                  <button
                    type="button"
                    onClick={handleAddEmptyRow}
                    className="inline-flex items-center gap-1 text-[11px] text-[#10B981] hover:underline cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {parsedChapters.map((chap, idx) => (
                    <div
                      key={chap.id}
                      className="flex items-center gap-2 p-2 rounded-xl border border-white/[0.08] bg-[#0E121B]/70"
                    >
                      {/* Chapter Number */}
                      <div className="w-16 shrink-0">
                        <input
                          type="text"
                          value={chap.chapterNumber}
                          onChange={(e) => handleUpdateParsedRow(idx, 'chapterNumber', e.target.value)}
                          placeholder="Chap #"
                          className="w-full px-2 py-1 rounded-lg bg-[#131722] border border-white/[0.1] font-mono text-[11px] text-[#38BDF8] text-center focus:border-[#10B981] focus:outline-none"
                          title="Chapter Number"
                        />
                      </div>

                      {/* Chapter Title */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={chap.title}
                          onChange={(e) => handleUpdateParsedRow(idx, 'title', e.target.value)}
                          placeholder="Topic Name"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-white/[0.1] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
                        />
                      </div>

                      {/* Remove Row */}
                      <button
                        type="button"
                        onClick={() => handleRemoveParsedRow(idx)}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#F43F5E] hover:bg-white/[0.06] transition-colors shrink-0"
                        title="Remove chapter"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Subject Priority */}
            <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
              <span className="text-[11px] font-mono text-[#94A3B8]">
                SUBJECT PRIORITY:
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="px-3 py-1.5 rounded-lg border border-white/[0.12] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
              >
                <option value="none">Priority: None</option>
                <option value="high">Priority: High</option>
                <option value="medium">Priority: Medium</option>
                <option value="low">Priority: Low</option>
              </select>
            </div>
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
    </div>
  );
});

AddSubjectPanel.displayName = 'AddSubjectPanel';
