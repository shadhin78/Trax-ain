/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  useAcademicHierarchy, 
  sortChaptersNumerically,
  getChapterTopicDisplay 
} from '../../../context/AcademicHierarchyContext';
import { PriorityLevel } from '../../../types/academic';
import { Bookmark } from 'lucide-react';

interface PriorityPanelProps {
  selectedTrackId: string;
  selectedProgramId: string;
  selectedSubjectId: string;
  onSelectTrackId: (id: string) => void;
  onSelectProgramId: (id: string) => void;
  onSelectSubjectId: (id: string) => void;
}

export const PriorityPanel: React.FC<PriorityPanelProps> = ({
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
    setSubjectPriority,
    setChapterPriority,
  } = useAcademicHierarchy();

  const [activeMode, setActiveMode] = useState<'subjects' | 'chapters'>('subjects');

  const availablePrograms = programs.filter(p => p.trackId === selectedTrackId);
  const availableSubjects = subjects.filter(s => s.programId === selectedProgramId);
  const availableChapters = sortChaptersNumerically(chapters.filter(c => c.subjectId === selectedSubjectId));

  const priorityOptions: { value: PriorityLevel; label: string; badgeClass: string }[] = [
    { value: 'high', label: 'High Priority', badgeClass: 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40' },
    { value: 'medium', label: 'Medium Priority', badgeClass: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40' },
    { value: 'low', label: 'Low Priority', badgeClass: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40' },
    { value: 'none', label: 'No Priority', badgeClass: 'bg-white/10 text-[#94A3B8] border-white/10' },
  ];

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Mode Switcher: Subjects vs Chapters */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-full border border-white/[0.1] bg-[#0E121B]/80 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveMode('subjects')}
            className={`
              px-4 py-1.5 rounded-full font-mono text-xs transition-all
              ${activeMode === 'subjects' 
                ? 'bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' 
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'}
            `}
          >
            Subject Priorities
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('chapters')}
            className={`
              px-4 py-1.5 rounded-full font-mono text-xs transition-all
              ${activeMode === 'chapters' 
                ? 'bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' 
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'}
            `}
          >
            Chapter Priorities
          </button>
        </div>
      </div>

      {/* Cascading Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Track */}
        <div className="p-3 rounded-xl border border-white/[0.1] bg-[#131722]/40 space-y-1.5">
          <label className="text-[10px] font-mono text-[#94A3B8]">1. TRACK</label>
          <select
            value={selectedTrackId}
            onChange={(e) => {
              onSelectTrackId(e.target.value);
              onSelectProgramId('');
              onSelectSubjectId('');
            }}
            className="w-full px-2.5 py-2 rounded-lg border border-white/[0.12] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:outline-none"
          >
            <option value="">-- Choose Track --</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Program */}
        <div className="p-3 rounded-xl border border-white/[0.1] bg-[#131722]/40 space-y-1.5">
          <label className="text-[10px] font-mono text-[#94A3B8]">2. PROGRAM</label>
          <select
            value={selectedProgramId}
            onChange={(e) => {
              onSelectProgramId(e.target.value);
              onSelectSubjectId('');
            }}
            disabled={!selectedTrackId}
            className="w-full px-2.5 py-2 rounded-lg border border-white/[0.12] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:outline-none disabled:opacity-40"
          >
            <option value="">-- Choose Program --</option>
            {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Subject (required only in chapters mode) */}
        {activeMode === 'chapters' && (
          <div className="p-3 rounded-xl border border-white/[0.1] bg-[#131722]/40 space-y-1.5">
            <label className="text-[10px] font-mono text-[#94A3B8]">3. SUBJECT</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => onSelectSubjectId(e.target.value)}
              disabled={!selectedProgramId}
              className="w-full px-2.5 py-2 rounded-lg border border-white/[0.12] bg-[#0E121B] font-mono text-xs text-[#F8FAFC] focus:outline-none disabled:opacity-40"
            >
              <option value="">-- Choose Subject --</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Subject Priority List */}
      {activeMode === 'subjects' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] px-1">
            <span>SUBJECTS IN PROGRAM ({availableSubjects.length})</span>
            <span>ASSIGN PRIORITY</span>
          </div>

          {!selectedProgramId ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] text-xs font-mono text-[#94A3B8]">
              Select a Track and Program above to manage subject priorities.
            </div>
          ) : availableSubjects.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] text-xs font-mono text-[#94A3B8]">
              No subjects found in this program.
            </div>
          ) : (
            <div className="space-y-2">
              {availableSubjects.map((subj) => (
                <div
                  key={subj.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50"
                >
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-[#6366F1]" />
                    <span className="font-semibold text-sm text-[#F8FAFC]">
                      {subj.name}
                    </span>
                  </div>

                  {/* Priority selector pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {priorityOptions.map((opt) => {
                      const isActive = (subj.priority || 'none') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSubjectPriority(subj.id, opt.value)}
                          className={`
                            px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all
                            ${isActive ? opt.badgeClass : 'border-white/[0.06] bg-[#0E121B]/40 text-[#64748B] hover:text-[#94A3B8]'}
                          `}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chapter Priority List */}
      {activeMode === 'chapters' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] px-1">
            <span>CHAPTERS IN SUBJECT ({availableChapters.length})</span>
            <span>ASSIGN PRIORITY</span>
          </div>

          {!selectedSubjectId ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] text-xs font-mono text-[#94A3B8]">
              Select Track, Program, and Subject above to manage chapter priorities.
            </div>
          ) : availableChapters.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.12] text-xs font-mono text-[#94A3B8]">
              No chapters found in this subject.
            </div>
          ) : (
            <div className="space-y-2">
              {availableChapters.map((chap) => (
                <div
                  key={chap.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#6366F1]">Ch {chap.chapterNumber}</span>
                      <span className="font-medium text-xs text-[#F8FAFC]">{getChapterTopicDisplay(chap)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {priorityOptions.map((opt) => {
                      const isActive = (chap.priority || 'none') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setChapterPriority(chap.id, opt.value)}
                          className={`
                            px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all
                            ${isActive ? opt.badgeClass : 'border-white/[0.06] bg-[#0E121B]/40 text-[#64748B] hover:text-[#94A3B8]'}
                          `}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
