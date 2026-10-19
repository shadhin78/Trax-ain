/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Pencil, 
  Check, 
  X, 
  Calendar, 
  Clock 
} from 'lucide-react';
import { ChapterCompletionRecord, Subject, Track, Program } from '../../../../types/academic';
import { 
  formatRecordDate, 
  formatRecordTime, 
  toDateInputValue, 
  toTimeInputValue, 
  combineDateAndTime 
} from './completionUtils';
import { parseChapterNumber } from '../../../../context/AcademicHierarchyContext';

interface CompletedChaptersBySubjectSectionProps {
  records: ChapterCompletionRecord[];
  subjects: Subject[];
  tracks: Track[];
  programs: Program[];
  onUpdateRecord: (recordId: string, completedAt: string) => void;
}

export const CompletedChaptersBySubjectSection: React.FC<CompletedChaptersBySubjectSectionProps> = ({
  records,
  subjects,
  tracks,
  programs,
  onUpdateRecord,
}) => {
  // Track open/collapsed folders
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<string>>(() => new Set());
  // Inline edit state for records
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');

  // Map tracks & programs for instant O(1) lookup
  const trackMap = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);
  const programMap = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);

  // STRICT RULE: Only subjects with AT LEAST ONE completed chapter appear. Subjects with 0 must NOT appear.
  const activeSubjectsWithCompletions = useMemo(() => {
    // Collect all unique subject IDs that have records
    const subjectIdsWithRecords = new Set(records.map(r => r.subjectId));

    // Filter matching subjects from workspace
    const filtered = subjects.filter(s => subjectIdsWithRecords.has(s.id));

    // Also support any records whose subject might be known only through records
    const knownSubjectIds = new Set(filtered.map(s => s.id));
    const extraRecords = records.filter(r => !knownSubjectIds.has(r.subjectId));
    const extraSubjectMap = new Map<string, ChapterCompletionRecord[]>();
    extraRecords.forEach(r => {
      const list = extraSubjectMap.get(r.subjectId) || [];
      list.push(r);
      extraSubjectMap.set(r.subjectId, list);
    });

    const fallbackSubjects: Subject[] = Array.from(extraSubjectMap.entries()).map(([subjId, recs]) => ({
      id: subjId,
      name: recs[0]?.chapterTitle ? `Subject (${subjId.slice(0, 6)})` : 'Subject',
      trackId: recs[0]?.trackId || '',
      programId: recs[0]?.programId || '',
      order: 999,
      createdAt: recs[0]?.completedAt || new Date().toISOString(),
    }));

    return [...filtered, ...fallbackSubjects];
  }, [records, subjects]);

  const toggleFolder = (subjectId: string) => {
    setExpandedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedSubjectIds(new Set(activeSubjectsWithCompletions.map(s => s.id)));
  };

  const handleCollapseAll = () => {
    setExpandedSubjectIds(new Set());
  };

  const startEdit = (record: ChapterCompletionRecord) => {
    setEditingRecordId(record.id);
    setEditDate(toDateInputValue(record.completedAt));
    setEditTime(toTimeInputValue(record.completedAt));
  };

  const cancelEdit = () => {
    setEditingRecordId(null);
    setEditDate('');
    setEditTime('');
  };

  const saveEdit = (record: ChapterCompletionRecord) => {
    if (!editDate) return;
    const newIso = combineDateAndTime(editDate, editTime, record.completedAt);
    onUpdateRecord(record.id, newIso);
    setEditingRecordId(null);
    setEditDate('');
    setEditTime('');
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#131722]/40 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] space-y-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-[#38BDF8]" />
          <h3 className="font-mono text-sm sm:text-base font-bold text-[#F8FAFC]">
            Subjects
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8]">
            {activeSubjectsWithCompletions.length}
          </span>
        </div>

        {activeSubjectsWithCompletions.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* ── FOLDER / DROPDOWN DIRECTORY ── */}
      {activeSubjectsWithCompletions.length === 0 ? (
        <div className="p-6 text-center rounded-2xl border border-white/[0.06] bg-[#0E121B]/50 font-mono">
          <p className="text-xs text-[#94A3B8]">
            No completed subjects
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSubjectsWithCompletions.map((subject) => {
            const isExpanded = expandedSubjectIds.has(subject.id);
            const track = trackMap.get(subject.trackId);
            const program = programMap.get(subject.programId);

            // Filter and sort completion records for this subject
            const subjectRecords = records
              .filter(r => r.subjectId === subject.id)
              .sort((a, b) => parseChapterNumber(a.chapterNumber) - parseChapterNumber(b.chapterNumber));

            return (
              <div
                key={subject.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 transition-all overflow-hidden"
              >
                {/* ── SUBJECT FOLDER HEADER BUTTON ── */}
                <button
                  type="button"
                  onClick={() => toggleFolder(subject.id)}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer select-none"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                      isExpanded
                        ? 'border-[#38BDF8]/40 bg-[#38BDF8]/20 text-[#38BDF8]'
                        : 'border-white/[0.1] bg-white/[0.05] text-[#94A3B8]'
                    }`}>
                      {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                          {subject.name}
                        </h4>
                        <span className="font-mono text-xs text-[#38BDF8]">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>

                      {/* Breadcrumb Hierarchy */}
                      <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-[#94A3B8] mt-0.5">
                        <span className="text-[#6366F1]">{track ? track.name : 'Track'}</span>
                        <span className="text-white/20">→</span>
                        <span className="text-[#818CF8]">{program ? program.name : 'Program'}</span>
                        <span className="text-white/20">→</span>
                        <span className="text-[#38BDF8] font-medium">{subject.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-semibold">
                      {subjectRecords.length}
                    </span>
                    <div className="text-white/40">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {/* ── EXPANDED FOLDER CONTENT: CHAPTER LIST ── */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 pt-1 border-t border-white/[0.06] space-y-2.5 bg-black/20 animate-in fade-in duration-150">
                    {subjectRecords.map((rec) => {
                      const isEditing = editingRecordId === rec.id;

                      return (
                        <div
                          key={rec.id}
                          className="p-3 rounded-xl border border-white/[0.06] bg-[#131722]/50 hover:border-white/[0.12] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs"
                        >
                          {/* Chapter Identification */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold text-[11px] shrink-0">
                              CH {rec.chapterNumber}
                            </span>
                            <span className="font-semibold text-[#F8FAFC] truncate">
                              {rec.topicName || rec.chapterTitle || `Chapter ${rec.chapterNumber}`}
                            </span>
                          </div>

                          {/* Completion Date / Time & Edit Action */}
                          <div className="flex items-center gap-3 shrink-0">
                            {isEditing ? (
                              /* Inline Editing Mode */
                              <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-black/60 border border-[#6366F1]/40">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="bg-black/40 border border-white/[0.1] rounded px-2 py-0.5 text-xs text-[#F8FAFC] font-mono focus:border-[#6366F1] outline-none"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-[#94A3B8]" />
                                  <input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="bg-black/40 border border-white/[0.1] rounded px-2 py-0.5 text-xs text-[#F8FAFC] font-mono focus:border-[#6366F1] outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(rec)}
                                  className="p-1 rounded bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 border border-[#10B981]/40 transition-colors cursor-pointer"
                                  title="Save"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="p-1 rounded bg-white/[0.05] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              /* Standard Display Mode */
                              <div className="flex items-center gap-2.5">
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-[#F8FAFC] font-semibold text-[11px]">
                                    <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                                    <span>{formatRecordDate(rec.completedAt)}</span>
                                  </div>
                                  <div className="text-[10px] text-[#94A3B8]">
                                    {formatRecordTime(rec.completedAt)}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => startEdit(rec)}
                                  className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/15 transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
