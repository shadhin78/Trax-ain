/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAcademicHierarchy } from '../../context/AcademicHierarchyContext';
import { AppRoute } from '../../types/navigation';

const AddChapterPanel = React.lazy(() =>
  import('./components/AddChapterPanel').then((m) => ({ default: m.AddChapterPanel }))
);
const AddSubjectPanel = React.lazy(() =>
  import('./components/AddSubjectPanel').then((m) => ({ default: m.AddSubjectPanel }))
);
const AddProgramPanel = React.lazy(() =>
  import('./components/AddProgramPanel').then((m) => ({ default: m.AddProgramPanel }))
);
const TracksPanel = React.lazy(() =>
  import('./components/TracksPanel').then((m) => ({ default: m.TracksPanel }))
);
const HierarchyPanel = React.lazy(() =>
  import('./components/HierarchyPanel').then((m) => ({ default: m.HierarchyPanel }))
);
const PriorityPanel = React.lazy(() =>
  import('./components/PriorityPanel').then((m) => ({ default: m.PriorityPanel }))
);
const ManageDataPanel = React.lazy(() =>
  import('./components/ManageDataPanel').then((m) => ({ default: m.ManageDataPanel }))
);

export type MasterConfigTab = 
  | 'add-chapter'
  | 'add-subject'
  | 'add-program'
  | 'tracks'
  | 'hierarchy'
  | 'priority'
  | 'manage-data';

interface TabConfig {
  id: MasterConfigTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'add-chapter', label: 'Add Chapter' },
  { id: 'add-subject', label: 'Add Subject' },
  { id: 'add-program', label: 'Add Program' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'priority', label: 'Priority' },
  { id: 'manage-data', label: 'Manage Data' },
];

interface MasterConfigViewProps {
  onNavigate?: (route: AppRoute) => void;
}

export const MasterConfigView: React.FC<MasterConfigViewProps> = React.memo(({ onNavigate }) => {
  // Default active tab is 'add-chapter'
  const [activeTab, setActiveTab] = useState<MasterConfigTab>('add-chapter');

  // Shared cascading selector state across panels
  const { tracks, programs, subjects, chapters } = useAcademicHierarchy();

  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Auto-clean stale selections if parent entities were deleted
  const validTrackId = tracks.some(t => t.id === selectedTrackId) ? selectedTrackId : '';
  const validProgramId = programs.some(p => p.id === selectedProgramId && p.trackId === validTrackId) ? selectedProgramId : '';
  const validSubjectId = subjects.some(s => s.id === selectedSubjectId && s.programId === validProgramId) ? selectedSubjectId : '';

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setSelectedProgramId(''); // Cascading reset
    setSelectedSubjectId('');
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedSubjectId(''); // Cascading reset
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* ── 1. MAIN TITLE ── */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F8FAFC]">
          Master Configuration
        </h1>
      </div>

      {/* ── 2. THIN HORIZONTAL DIVIDER LINE ── */}
      <div className="w-full border-b border-white/[0.12]" />

      {/* ── 3. ROW OF PILL BUTTONS ── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer border select-none
                ${
                  isActive
                    ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] font-semibold shadow-[0_0_16px_rgba(99,102,241,0.35)]'
                    : 'border-white/[0.12] bg-[#131722]/40 text-[#94A3B8] hover:border-white/[0.25] hover:bg-[#131722]/70 hover:text-[#F8FAFC]'
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 4. LARGE ROUNDED CARD FOR PANEL WORKSPACE ── */}
      <div className="flex-1 min-h-[460px] w-full rounded-3xl border border-white/[0.14] bg-transparent p-5 sm:p-7 lg:p-8 flex flex-col justify-start">
        <React.Suspense fallback={<div className="py-12 text-center text-xs font-mono text-[#94A3B8]">Loading panel...</div>}>
          {activeTab === 'add-chapter' && (
            <AddChapterPanel
              selectedTrackId={validTrackId}
              selectedProgramId={validProgramId}
              selectedSubjectId={validSubjectId}
              onSelectTrackId={handleSelectTrack}
              onSelectProgramId={handleSelectProgram}
              onSelectSubjectId={handleSelectSubject}
            />
          )}

          {activeTab === 'add-subject' && (
            <AddSubjectPanel
              selectedTrackId={validTrackId}
              selectedProgramId={validProgramId}
              onSelectTrackId={handleSelectTrack}
              onSelectProgramId={handleSelectProgram}
            />
          )}

          {activeTab === 'add-program' && (
            <AddProgramPanel
              selectedTrackId={validTrackId}
              onSelectTrackId={handleSelectTrack}
            />
          )}

          {activeTab === 'tracks' && (
            <TracksPanel />
          )}

          {activeTab === 'hierarchy' && (
            <HierarchyPanel onNavigateToTab={setActiveTab} />
          )}

          {activeTab === 'priority' && (
            <PriorityPanel
              selectedTrackId={validTrackId}
              selectedProgramId={validProgramId}
              selectedSubjectId={validSubjectId}
              onSelectTrackId={handleSelectTrack}
              onSelectProgramId={handleSelectProgram}
              onSelectSubjectId={handleSelectSubject}
            />
          )}

          {activeTab === 'manage-data' && (
            <ManageDataPanel />
          )}
        </React.Suspense>
      </div>
    </div>
  );
});

MasterConfigView.displayName = 'MasterConfigView';
