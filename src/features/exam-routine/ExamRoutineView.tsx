/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExamRoutineProvider, useExamRoutine, useOptionalExamRoutine } from './context/ExamRoutineContext';
import { ExamCountdownBanner } from './components/ExamCountdownBanner';
import { ExamRoutineHeader } from './components/ExamRoutineHeader';
import { ExamSessionCard } from './components/ExamSessionCard';
import { AddSessionModal } from './components/modals/AddSessionModal';
import { AddExamSubjectModal } from './components/modals/AddExamSubjectModal';
import { ExamSession, ExamSubject } from './types';
import { CalendarCheck, Plus } from 'lucide-react';
import { AppRoute } from '../../types/navigation';

interface ExamRoutineViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const ExamRoutineContent: React.FC<ExamRoutineViewProps> = React.memo(() => {
  const { filteredSessions, sessions } = useExamRoutine();

  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [activeSessionForSubject, setActiveSessionForSubject] = useState<ExamSession | null>(null);
  const [editingSubject, setEditingSubject] = useState<ExamSubject | null>(null);

  const handleOpenAddSession = () => {
    setEditingSession(null);
    setIsAddSessionOpen(true);
  };

  const handleEditSession = (session: ExamSession) => {
    setEditingSession(session);
    setIsAddSessionOpen(true);
  };

  const handleAddSubjectToSession = (session: ExamSession) => {
    setActiveSessionForSubject(session);
    setEditingSubject(null);
    setIsAddSubjectOpen(true);
  };

  const handleEditSubjectInSession = (session: ExamSession, subject: ExamSubject) => {
    setActiveSessionForSubject(session);
    setEditingSubject(subject);
    setIsAddSubjectOpen(true);
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-16 font-mono">
      {/* ── 1. TOP LIVE COUNTDOWN BANNER (MATCHING SCREENSHOT) ── */}
      <ExamCountdownBanner />

      {/* ── 2. MAIN EXAM ROUTINE & TIMETABLE CONTAINER (TRANSPARENT WITH LEGACY THEME) ── */}
      <div className="w-full rounded-[28px] border border-white/[0.08] bg-transparent p-5 sm:p-7 lg:p-8 space-y-6 font-mono">
        {/* Header & Filter Switch */}
        <ExamRoutineHeader onOpenAddSession={handleOpenAddSession} />

        {/* Sessions Deck */}
        {sessions.length === 0 ? (
          /* Clean empty state (NO DEMO DATA) */
          <div className="py-20 flex flex-col items-center justify-center text-center rounded-[24px] border border-dashed border-white/[0.08] bg-transparent">
            <div className="h-14 w-14 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <CalendarCheck className="h-7 w-7" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wider uppercase">
              NO EXAM SESSIONS SCHEDULED
            </h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mt-1.5 leading-relaxed">
              Create an exam routine session to manage upcoming test dates, venues, study pacing, and real-time live countdowns.
            </p>
            <button
              type="button"
              onClick={handleOpenAddSession}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-black tracking-wider transition-all duration-150 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] border border-[#FB7185] md:hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>CREATE FIRST SESSION</span>
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          /* Filter/Search empty state */
          <div className="py-16 text-center rounded-[24px] border border-dashed border-white/[0.08] bg-transparent">
            <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">
              NO MATCHING EXAM SESSIONS FOUND
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              Try adjusting your search query or switching the status filter tab.
            </p>
          </div>
        ) : (
          /* Session Cards List */
          <div className="space-y-6">
            {filteredSessions.map((session) => (
              <ExamSessionCard
                key={session.id}
                session={session}
                onEditSession={handleEditSession}
                onAddSubject={handleAddSubjectToSession}
                onEditSubject={handleEditSubjectInSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {isAddSessionOpen && (
        <AddSessionModal
          isOpen={isAddSessionOpen}
          onClose={() => setIsAddSessionOpen(false)}
          editingSession={editingSession}
        />
      )}

      {isAddSubjectOpen && (
        <AddExamSubjectModal
          isOpen={isAddSubjectOpen}
          onClose={() => setIsAddSubjectOpen(false)}
          session={activeSessionForSubject}
          editingSubject={editingSubject}
        />
      )}
    </div>
  );
});

ExamRoutineContent.displayName = 'ExamRoutineContent';

export const ExamRoutineView: React.FC<ExamRoutineViewProps> = (props) => {
  const existingContext = useOptionalExamRoutine();
  if (existingContext) {
    return <ExamRoutineContent {...props} />;
  }
  return (
    <ExamRoutineProvider>
      <ExamRoutineContent {...props} />
    </ExamRoutineProvider>
  );
};

