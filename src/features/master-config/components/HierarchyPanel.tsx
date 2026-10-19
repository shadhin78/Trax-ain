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
import { 
  FolderTree, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  BookOpen, 
  FileText,
  Plus
} from 'lucide-react';
import { MasterConfigTab } from '../MasterConfigView';

interface HierarchyPanelProps {
  onNavigateToTab?: (tab: MasterConfigTab) => void;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = ({ onNavigateToTab }) => {
  const { tracks, programs, subjects, chapters } = useAcademicHierarchy();

  // Initially expand all tracks if they exist
  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tracks.forEach(t => { initial[t.id] = true; });
    return initial;
  });
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    programs.forEach(p => { initial[p.id] = true; });
    return initial;
  });
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const toggleTrack = (id: string) => {
    setExpandedTracks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProgram = (id: string) => {
    setExpandedPrograms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const tMap: Record<string, boolean> = {};
    const pMap: Record<string, boolean> = {};
    const sMap: Record<string, boolean> = {};
    tracks.forEach(t => { tMap[t.id] = true; });
    programs.forEach(p => { pMap[p.id] = true; });
    subjects.forEach(s => { sMap[s.id] = true; });
    setExpandedTracks(tMap);
    setExpandedPrograms(pMap);
    setExpandedSubjects(sMap);
  };

  const collapseAll = () => {
    setExpandedTracks({});
    setExpandedPrograms({});
    setExpandedSubjects({});
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50 text-center font-mono">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider block">Tracks</span>
          <span className="text-lg font-bold text-[#F8FAFC]">{tracks.length}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50 text-center font-mono">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider block">Programs</span>
          <span className="text-lg font-bold text-[#6366F1]">{programs.length}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50 text-center font-mono">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider block">Subjects</span>
          <span className="text-lg font-bold text-[#38BDF8]">{subjects.length}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#131722]/50 text-center font-mono">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider block">Chapters</span>
          <span className="text-lg font-bold text-[#10B981]">{chapters.length}</span>
        </div>
      </div>

      {/* ── AUTHORITATIVE ACADEMIC HIERARCHY TREE ── */}
      <div className="space-y-3">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] px-1">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-[#6366F1]" />
            <span className="font-bold tracking-wider text-[#F8FAFC]">
              AUTHORITATIVE ACADEMIC HIERARCHY TREE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-white/20">·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] hover:underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Tree Content */}
        {tracks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-white/[0.12] bg-transparent">
            <FolderTree className="h-10 w-10 text-[#64748B] mx-auto mb-3 opacity-40" />
            <h3 className="font-mono text-sm font-bold text-[#F8FAFC]">Empty Academic Hierarchy</h3>
            <p className="mt-1 text-xs text-[#94A3B8] max-w-sm mx-auto">
              No tracks, programs, subjects, or chapters created yet. Use the tabs above to manually build your hierarchy.
            </p>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('tracks')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#6366F1]/50 bg-[#6366F1]/20 font-mono text-xs text-[#F8FAFC] hover:bg-[#6366F1]/30 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#6366F1]" />
                <span>Create First Track</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 p-4 rounded-2xl border border-white/[0.08] bg-[#131722]/40 backdrop-blur-sm">
            {tracks.map((track) => {
              const isTrackOpen = !!expandedTracks[track.id];
              const tPrograms = programs.filter(p => p.trackId === track.id);

              return (
                <div key={track.id} className="border-l-2 border-[#6366F1]/50 pl-3 py-1 space-y-1">
                  {/* Track Node */}
                  <div
                    onClick={() => toggleTrack(track.id)}
                    className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors select-none"
                  >
                    {isTrackOpen ? (
                      <ChevronDown className="h-4 w-4 text-[#6366F1]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                    )}
                    <span className="font-mono text-xs text-[#6366F1] font-bold">TRACK:</span>
                    <span className="font-semibold text-sm text-[#F8FAFC]">{track.name}</span>
                    <span className="ml-auto text-[10px] font-mono text-[#94A3B8]">
                      {tPrograms.length} Programs
                    </span>
                  </div>

                  {/* Programs under Track */}
                  {isTrackOpen && (
                    <div className="ml-4 pl-3 border-l border-white/10 space-y-1 mt-1">
                      {tPrograms.length === 0 ? (
                        <div className="text-xs font-mono text-[#64748B] py-1">
                          └── No programs created under this track
                        </div>
                      ) : (
                        tPrograms.map((prog) => {
                          const isProgOpen = !!expandedPrograms[prog.id];
                          const pSubjects = subjects.filter(s => s.programId === prog.id);

                          return (
                            <div key={prog.id} className="space-y-1">
                              {/* Program Node */}
                              <div
                                onClick={() => toggleProgram(prog.id)}
                                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors select-none"
                              >
                                {isProgOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-[#38BDF8]" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                                )}
                                <span className="font-mono text-[11px] text-[#38BDF8]">PROGRAM:</span>
                                <span className="font-medium text-xs text-[#F8FAFC]">{prog.name}</span>
                                <span className="ml-auto text-[10px] font-mono text-[#94A3B8]">
                                  {pSubjects.length} Subjects
                                </span>
                              </div>

                              {/* Subjects under Program */}
                              {isProgOpen && (
                                <div className="ml-4 pl-3 border-l border-white/10 space-y-1">
                                  {pSubjects.length === 0 ? (
                                    <div className="text-xs font-mono text-[#64748B] py-1">
                                      └── No subjects under this program
                                    </div>
                                  ) : (
                                    pSubjects.map((subj) => {
                                      const isSubjOpen = !!expandedSubjects[subj.id];
                                      const sChapters = sortChaptersNumerically(chapters.filter(c => c.subjectId === subj.id));

                                      return (
                                        <div key={subj.id} className="space-y-1">
                                          {/* Subject Node */}
                                          <div
                                            onClick={() => toggleSubject(subj.id)}
                                            className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors select-none"
                                          >
                                            {isSubjOpen ? (
                                              <ChevronDown className="h-3 w-3 text-[#10B981]" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
                                            )}
                                            <span className="font-mono text-[10px] text-[#10B981]">SUBJECT:</span>
                                            <span className="font-medium text-xs text-[#F8FAFC]">{subj.name}</span>
                                            <span className="ml-auto text-[10px] font-mono text-[#94A3B8]">
                                              {sChapters.length} Chapters
                                            </span>
                                          </div>

                                          {/* Chapters under Subject */}
                                          {isSubjOpen && (
                                            <div className="ml-4 pl-3 border-l border-white/10 space-y-1">
                                              {sChapters.length === 0 ? (
                                                <div className="text-xs font-mono text-[#64748B] py-1">
                                                  └── No chapters under this subject
                                                </div>
                                              ) : (
                                                sChapters.map((chap) => (
                                                  <div
                                                    key={chap.id}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 px-2 rounded text-xs font-mono hover:bg-white/[0.04]"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[#6366F1]">Ch {chap.chapterNumber}:</span>
                                                      <span className="text-[#F8FAFC]">{getChapterTopicDisplay(chap)}</span>
                                                    </div>
                                                    {chap.priority && chap.priority !== 'none' && (
                                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                                                        chap.priority === 'high' 
                                                          ? 'bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30'
                                                          : chap.priority === 'medium'
                                                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                                                          : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                                      }`}>
                                                        {chap.priority}
                                                      </span>
                                                    )}
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
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
