/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Pencil, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowUpDown 
} from 'lucide-react';
import { ChapterCompletionRecord, Subject, Track, Program } from '../../../../types/academic';
import { 
  formatRecordDate, 
  formatRecordTime, 
  toDateInputValue, 
  toTimeInputValue, 
  combineDateAndTime 
} from './completionUtils';

interface CompletionRecordsSectionProps {
  records: ChapterCompletionRecord[];
  subjects: Subject[];
  tracks: Track[];
  programs: Program[];
  onUpdateRecord: (recordId: string, completedAt: string) => void;
}

export const CompletionRecordsSection: React.FC<CompletionRecordsSectionProps> = ({
  records,
  subjects,
  tracks,
  programs,
  onUpdateRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // latest first by default

  // Inline edit state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');

  // Quick lookup maps
  const trackMap = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);
  const programMap = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  // Filter & sort records
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r => {
        const subj = subjectMap.get(r.subjectId);
        const subjName = (subj?.name || '').toLowerCase();
        const chapNum = String(r.chapterNumber || '').toLowerCase();
        const title = (r.chapterTitle || '').toLowerCase();
        const topic = (r.topicName || '').toLowerCase();
        const dateStr = formatRecordDate(r.completedAt).toLowerCase();

        return (
          subjName.includes(q) ||
          chapNum.includes(q) ||
          title.includes(q) ||
          topic.includes(q) ||
          dateStr.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      const timeA = new Date(a.completedAt).getTime();
      const timeB = new Date(b.completedAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [records, searchQuery, sortOrder, subjectMap]);

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
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#131722]/40 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] space-y-3.5">
      {/* ── HEADER & CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#10B981]" />
          <h3 className="font-mono text-sm sm:text-base font-bold text-[#F8FAFC]">
            Record
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-semibold">
            {filteredRecords.length}
          </span>
        </div>

        {/* ── SEARCH & ORDER CONTROLS ── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-[#F8FAFC] placeholder-[#64748B] focus:border-[#6366F1] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="p-1.5 rounded-xl border border-white/[0.08] bg-black/40 text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.16] transition-colors cursor-pointer"
            title="Sort"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── RECORDS LIST ── */}
      {filteredRecords.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-white/[0.06] bg-[#0E121B]/50 font-mono">
          <p className="text-xs text-[#94A3B8]">
            No records found
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((record) => {
            const isEditing = editingRecordId === record.id;
            const program = programMap.get(record.programId);
            const subject = subjectMap.get(record.subjectId);
            const subjName = subject?.name || 'Subject';

            return (
              <div
                key={record.id}
                className="p-3 sm:p-3.5 rounded-2xl border border-white/[0.06] bg-[#0E121B]/60 hover:border-white/[0.14] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
              >
                {/* Left: Chapter & Subject Info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold text-[11px] shrink-0">
                      CH {record.chapterNumber}
                    </span>
                    <span className="font-semibold text-[#F8FAFC] truncate">
                      {record.topicName || record.chapterTitle || `Chapter ${record.chapterNumber}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] pl-0.5">
                    <span className="text-[#38BDF8] font-medium">{subjName}</span>
                    {program && (
                      <>
                        <span className="text-white/20">•</span>
                        <span>{program.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Date, Time & Editing Controls */}
                <div className="flex items-center gap-3 shrink-0">
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-black/60 border border-[#6366F1]/50">
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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => saveEdit(record)}
                          className="p-1.5 rounded-lg bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40 transition-colors cursor-pointer"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.08] transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <div className="text-[#F8FAFC] font-semibold text-xs">
                          {formatRecordDate(record.completedAt)}
                        </div>
                        <div className="text-[11px] text-[#38BDF8] mt-0.5">
                          {formatRecordTime(record.completedAt)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEdit(record)}
                        className="p-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/15 transition-all cursor-pointer"
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
};
