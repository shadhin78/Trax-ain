/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  useAcademicHierarchy, 
  sortChaptersNumerically,
  getChapterTopicDisplay 
} from '../../context/AcademicHierarchyContext';
import { AppRoute } from '../../types/navigation';
import { Track, Program, Subject, Chapter } from '../../types/academic';
import { GlobalMetricsDeck } from './components/GlobalMetricsDeck';
import { FilterScopeDeck } from './components/FilterScopeDeck';
import { SubjectProgressSection } from './components/SubjectProgressSection';
import { SubjectResultsSection } from './components/SubjectResultsSection';
import { ActiveSubjectDetail } from './components/ActiveSubjectDetail';
import { SubjectEmptyState } from './components/SubjectEmptyState';

const ChapterCompletionDatabaseModal = React.lazy(() =>
  import('./components/ChapterCompletionDatabaseModal').then(m => ({
    default: m.ChapterCompletionDatabaseModal,
  }))
);

interface SubjectPageViewProps {
  onNavigate?: (route: AppRoute) => void;
}

/**
 * X-29 — Subject Page View
 * Architecture & Data Flow:
 * 1. Global Metrics Deck (workspace KPIs & overview)
 * 2. Subject Progress Overview (expandable progress overview)
 * 3. Filter Hierarchy (Independent Track and Program scope controls)
 * 4. Subject Results (Organized by Program rows with [ ENTIRE ... ] and Subject capsule pills matching reference image format)
 * 5. Subject Details:
 *    - In Entire Program mode: displays all subjects inside the program SEPARATELY (never merging chapters together).
 *    - In Single Subject mode: displays the selected subject with its chapters.
 *
 * Strict Rule: Selecting any subject pill or [ ENTIRE ... ] never alters the Track or Program filter values.
 */
export const SubjectPageView: React.FC<SubjectPageViewProps> = React.memo(({ onNavigate }) => {
  const { 
    tracks, 
    programs, 
    subjects, 
    chapters, 
    tasks,
    setChapterStatus,
    toggleChapterCompletion,
    createTask,
    toggleTaskCompletion,
    deleteTask 
  } = useAcademicHierarchy();

  // ── 1. FILTER HIERARCHY STATE (TRACK & PROGRAM SCOPE) ──
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── 2. ACTIVE SUBJECT DRILL-DOWN (INDEPENDENT FROM FILTER CONTROLS) ──
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // ── 2B. INDEPENDENT SUBJECT CARD EXPAND / COLLAPSE STATE ──
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<string>>(() => new Set());

  // ── 2C. CHAPTER COMPLETION DATABASE POPUP MODAL STATE ──
  const [isCompletionDatabaseOpen, setIsCompletionDatabaseOpen] = useState<boolean>(false);

  const handleToggleExpandSubject = (subjectId: string) => {
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

  // Global metric calculations (excluding skipped chapters)
  const activeChapters = chapters.filter(c => !c.isSkipped && c.status !== 'skipped');
  const totalChapters = activeChapters.length;
  const completedChapters = activeChapters.filter(c => c.completed || c.status === 'completed').length;
  const globalCompletionPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  // ── 3. DYNAMIC FILTERING LOGIC (Track → Program + Search) ──
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      // Track filter
      if (selectedTrackFilter !== 'all' && subject.trackId !== selectedTrackFilter) {
        return false;
      }
      // Program filter
      if (selectedProgramFilter !== 'all' && subject.programId !== selectedProgramFilter) {
        return false;
      }
      // Search filter across Subject name, Chapter numbers, and Topic names
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesSubject = subject.name.toLowerCase().includes(query);
        if (matchesSubject) return true;

        const subjectChapters = chapters.filter(c => c.subjectId === subject.id);
        const matchesAnyChapter = subjectChapters.some((c) => {
          const numMatch = String(c.chapterNumber).toLowerCase().includes(query);
          const topicMatch = getChapterTopicDisplay(c).toLowerCase().includes(query);
          const titleMatch = (c.title || '').toLowerCase().includes(query);
          return numMatch || topicMatch || titleMatch;
        });

        if (!matchesAnyChapter) return false;
      }

      return true;
    });
  }, [subjects, chapters, selectedTrackFilter, selectedProgramFilter, searchQuery]);

  // ── 4. RESOLVE EFFECTIVE SELECTION (SUBJECT OR ENTIRE PROGRAM) ──
  const effectiveSubjectId = useMemo(() => {
    if (selectedSubjectId && selectedSubjectId !== 'all') {
      if (selectedSubjectId.startsWith('entire_')) {
        const progId = selectedSubjectId.replace('entire_', '');
        if (programs.some(p => p.id === progId)) {
          return selectedSubjectId;
        }
      }
      if (filteredSubjects.some(s => s.id === selectedSubjectId)) {
        return selectedSubjectId;
      }
    }

    // Default: No single subject selected -> returns null so all filtered subjects are shown
    return null;
  }, [selectedSubjectId, filteredSubjects, programs]);

  // Resolve subjects to display SEPARATELY (never merging chapters across subjects)
  const activeSubjectsToDisplay = useMemo<Subject[]>(() => {
    // When no subject is selected or "all", show ALL filtered subjects
    if (!effectiveSubjectId) {
      return filteredSubjects;
    }

    // Entire Program mode: show all subjects inside this program SEPARATELY
    if (effectiveSubjectId.startsWith('entire_')) {
      const progId = effectiveSubjectId.replace('entire_', '');
      const progSubjects = filteredSubjects.filter(s => s.programId === progId);
      if (progSubjects.length > 0) return progSubjects;
      return subjects.filter(s => s.programId === progId);
    }

    // Single subject mode
    const found = filteredSubjects.find(s => s.id === effectiveSubjectId);
    if (found) return [found];

    const foundOverall = subjects.find(s => s.id === effectiveSubjectId);
    if (foundOverall) return [foundOverall];

    return [];
  }, [effectiveSubjectId, filteredSubjects, subjects]);

  // Active Program context (when viewing an entire program)
  const activeProgram = useMemo(() => {
    if (!effectiveSubjectId) return undefined;
    if (effectiveSubjectId.startsWith('entire_')) {
      const progId = effectiveSubjectId.replace('entire_', '');
      return programs.find(p => p.id === progId);
    }
    const subj = subjects.find(s => s.id === effectiveSubjectId);
    return subj ? programs.find(p => p.id === subj.programId) : undefined;
  }, [effectiveSubjectId, programs, subjects]);

  // Filter Hierarchy Handlers
  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackFilter(trackId);
    setSelectedProgramFilter('all');
    setSelectedSubjectId(null);
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedProgramFilter(programId);
    setSelectedSubjectId(null);
  };

  const handleResetFilters = () => {
    setSelectedTrackFilter('all');
    setSelectedProgramFilter('all');
    setSearchQuery('');
    setSelectedSubjectId(null);
  };

  // Subject Card / Pill Selection Handler (STRICTLY PRESERVES FILTER HIERARCHY)
  const handleSelectSubject = (subjectId: string) => {
    if (subjectId === 'all') {
      setSelectedSubjectId(null);
      return;
    }

    if (subjectId.startsWith('entire_')) {
      setSelectedSubjectId(subjectId);
    } else {
      if (selectedSubjectId === subjectId) {
        // Toggling the already selected subject capsule pill
        handleToggleExpandSubject(subjectId);
      } else {
        setSelectedSubjectId(subjectId);
        // Expand the freshly selected subject card
        setExpandedSubjectIds(prev => {
          const next = new Set(prev);
          next.add(subjectId);
          return next;
        });
      }
    }
  };

  const handleNavigateToMasterConfig = () => {
    if (onNavigate) {
      onNavigate('/master-config/');
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 pb-12">
      {/* ── 1. GLOBAL OVERVIEW & METRICS DECK ── */}
      <GlobalMetricsDeck
        totalChapters={totalChapters}
        completedChapters={completedChapters}
        completionPercent={globalCompletionPercent}
        totalSubjects={subjects.length}
        totalTracks={tracks.length}
        onNavigateToMasterConfig={handleNavigateToMasterConfig}
        onOpenCompletionDatabase={() => setIsCompletionDatabaseOpen(true)}
      />

      {/* ── 2. SUBJECT PROGRESS DROPDOWN (DISPLAY ONLY OVERVIEW) ── */}
      {tracks.length > 0 && (
        <SubjectProgressSection
          tracks={tracks}
          programs={programs}
          subjects={subjects}
          chapters={chapters}
          selectedTrackFilter={selectedTrackFilter}
          selectedProgramFilter={selectedProgramFilter}
        />
      )}

      {/* ── 3. MAIN WORKSPACE / EMPTY STATES ── */}
      {tracks.length === 0 ? (
        /* Empty State 1: Fresh workspace with zero tracks */
        <SubjectEmptyState
          hasNoTracks={true}
          onNavigateToMasterConfig={handleNavigateToMasterConfig}
        />
      ) : (
        /* Workspace when tracks exist */
        <div className="space-y-6">
          {/* ── 3A. ENLARGED PROMINENT FILTER HIERARCHY CONTROLS ── */}
          <FilterScopeDeck
            tracks={tracks}
            programs={programs}
            selectedTrackId={selectedTrackFilter}
            selectedProgramId={selectedProgramFilter}
            searchQuery={searchQuery}
            totalFilteredSubjects={filteredSubjects.length}
            totalSubjects={subjects.length}
            onSelectTrack={handleSelectTrack}
            onSelectProgram={handleSelectProgram}
            onSearchChange={setSearchQuery}
            onResetFilters={handleResetFilters}
          />

          {/* ── 3B. SUBJECT RESULTS (Matches Reference Layout Structural Format) ── */}
          {filteredSubjects.length === 0 ? (
            /* Empty State 2: Tracks configured but no subjects match the scope */
            <SubjectEmptyState
              hasNoTracks={false}
              onNavigateToMasterConfig={handleNavigateToMasterConfig}
            />
          ) : (
            <div className="space-y-6">
              <SubjectResultsSection
                tracks={tracks}
                programs={programs}
                subjects={filteredSubjects}
                chapters={chapters}
                selectedSubjectId={effectiveSubjectId}
                onSelectSubject={handleSelectSubject}
                selectedTrackFilter={selectedTrackFilter}
                selectedProgramFilter={selectedProgramFilter}
              />

              {/* ── 3C. SUBJECT DETAILS: SEPARATELY RENDERED SUBJECTS (NO MERGING CHAPTERS) ── */}
              {activeSubjectsToDisplay.length > 0 && (
                <div className="space-y-6 pt-1">
                  {/* Entire Program summary header when showing multiple subjects in a program */}
                  {effectiveSubjectId?.startsWith('entire_') && activeProgram && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs font-mono text-[#94A3B8]">
                      <div className="flex items-center gap-2">
                        <span>
                          Program Scope: <strong className="text-[#38BDF8]">{activeProgram.name}</strong>
                        </span>
                        <span className="text-white/20">•</span>
                        <span>
                          Showing <strong className="text-[#F8FAFC]">{activeSubjectsToDisplay.length}</strong> subjects separately
                        </span>
                      </div>
                      <div>
                        {activeSubjectsToDisplay.reduce((acc, s) => acc + chapters.filter(c => c.subjectId === s.id && !c.isSkipped && c.status !== 'skipped').length, 0)} Total Chapters across {activeSubjectsToDisplay.length} Subjects
                      </div>
                    </div>
                  )}

                  {/* All Subjects mode summary header */}
                  {!effectiveSubjectId && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs font-mono text-[#94A3B8]">
                      <div className="flex items-center gap-2">
                        <span>
                          Scope: <strong className="text-[#818CF8]">All Subjects</strong>
                        </span>
                        <span className="text-white/20">•</span>
                        <span>
                          Showing <strong className="text-[#F8FAFC]">{activeSubjectsToDisplay.length}</strong> subjects below
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>
                          {activeSubjectsToDisplay.reduce((acc, s) => acc + chapters.filter(c => c.subjectId === s.id && !c.isSkipped && c.status !== 'skipped').length, 0)} Total Chapters across {activeSubjectsToDisplay.length} Subjects
                        </span>
                        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSubjectIds(new Set(activeSubjectsToDisplay.map(s => s.id)));
                            }}
                            className="text-[11px] text-[#38BDF8] hover:underline cursor-pointer"
                          >
                            Expand All
                          </button>
                          <span className="text-white/20">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSubjectIds(new Set());
                            }}
                            className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                          >
                            Collapse All
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render each subject separately with its own chapters */}
                  {activeSubjectsToDisplay.map((subj) => {
                    const subjTrack = tracks.find(t => t.id === subj.trackId);
                    const subjProgram = programs.find(p => p.id === subj.programId);
                    const subjChapters = sortChaptersNumerically(
                      chapters.filter(c => c.subjectId === subj.id)
                    );
                    const subjTasks = tasks.filter(t => t.subjectId === subj.id);

                    const isExpanded = expandedSubjectIds.has(subj.id);

                    return (
                      <ActiveSubjectDetail
                        key={subj.id}
                        subject={subj}
                        track={subjTrack}
                        program={subjProgram}
                        chapters={subjChapters}
                        tasks={subjTasks}
                        isExpanded={isExpanded}
                        onToggleExpand={() => handleToggleExpandSubject(subj.id)}
                        onToggleChapterCompletion={toggleChapterCompletion}
                        onSetChapterStatus={setChapterStatus}
                        onCreateTask={createTask}
                        onToggleTask={toggleTaskCompletion}
                        onDeleteTask={deleteTask}
                        onNavigateToMasterConfig={handleNavigateToMasterConfig}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 4. CHAPTER COMPLETION DATABASE POPUP MODAL ── */}
      {isCompletionDatabaseOpen && (
        <React.Suspense fallback={null}>
          <ChapterCompletionDatabaseModal
            isOpen={isCompletionDatabaseOpen}
            onClose={() => setIsCompletionDatabaseOpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
});

SubjectPageView.displayName = 'SubjectPageView';
