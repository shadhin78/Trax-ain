/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Layers, Sliders } from 'lucide-react';

interface SubjectEmptyStateProps {
  hasNoTracks: boolean;
  onNavigateToMasterConfig?: () => void;
}

export const SubjectEmptyState: React.FC<SubjectEmptyStateProps> = ({
  hasNoTracks,
  onNavigateToMasterConfig,
}) => {
  return (
    <div className="flex-1 flex min-h-[360px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.14] bg-transparent p-6 sm:p-12 text-center relative overflow-hidden group hover:border-[#6366F1]/40 transition-colors">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(99,102,241,0.15) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {hasNoTracks ? (
        <>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-[#131722]/50 text-[#64748B] mb-4 shadow-[0_0_24px_rgba(99,102,241,0.15)]">
            <BookOpen className="h-7 w-7 text-[#818CF8]" />
          </div>
          <h2 className="font-mono text-base sm:text-lg font-bold tracking-wide text-[#F8FAFC]">
            No subjects configured yet.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] max-w-md">
            The Subject page dynamically reads your academic hierarchy from Master Configuration. Create your Tracks, Programs, Subjects, and Chapters to see them here.
          </p>
          {onNavigateToMasterConfig && (
            <button
              onClick={onNavigateToMasterConfig}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.25)]"
            >
              <Sliders className="h-4 w-4 text-[#818CF8]" />
              <span>Go to Master Configuration</span>
            </button>
          )}
        </>
      ) : (
        <>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-[#131722]/50 text-[#64748B] mb-4">
            <Layers className="h-7 w-7 text-[#64748B]" />
          </div>
          <h2 className="font-mono text-base sm:text-lg font-bold tracking-wide text-[#F8FAFC]">
            No subjects configured in this scope.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] max-w-md">
            No subjects match the currently selected Track/Program or search filter. Create subjects in Master Configuration or clear your search.
          </p>
          {onNavigateToMasterConfig && (
            <button
              onClick={onNavigateToMasterConfig}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.15] bg-[#131722] text-xs font-mono text-[#F8FAFC] hover:border-[#6366F1] transition-all cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-[#818CF8]" />
              <span>Add Subject in Master Config</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
