/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { CompletionCard } from './CompletionCard';
import { CompletionStatusModal } from './CompletionStatusModal';
import { AppRoute } from '../../../types/navigation';

interface TrackCompletionSectionProps {
  onNavigate?: (route: AppRoute) => void;
}

const TRACK_COLOR_PALETTE = [
  '#38BDF8', // Sky / Blue (e.g. CA)
  '#8B5CF6', // Purple / Violet (e.g. BBA)
  '#10B981', // Emerald / Green
  '#F43F5E', // Rose / Coral
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
];

export function getTrackColor(name: string, index: number): string {
  const lower = name.toLowerCase();
  if (lower.includes('ca')) return '#38BDF8';
  if (lower.includes('bba')) return '#8B5CF6';
  return TRACK_COLOR_PALETTE[index % TRACK_COLOR_PALETTE.length];
}

/**
 * Track Completion Section for Dashboard
 * Displays overall progress for all enrolled study tracks dynamically from academic hierarchy.
 */
export const TrackCompletionSection: React.FC<TrackCompletionSectionProps> = ({ onNavigate }) => {
  const { tracks, programs, subjects, chapters } = useAcademicHierarchy();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const trackMetrics = useMemo(() => {
    // Sort tracks according to canonical order
    const sortedTracks = [...tracks].sort((a, b) => a.order - b.order);

    return sortedTracks.map((track, idx) => {
      const trackPrograms = programs.filter((p) => p.trackId === track.id);
      const trackProgramIds = new Set(trackPrograms.map((p) => p.id));

      const trackSubjects = subjects.filter(
        (s) => s.trackId === track.id || trackProgramIds.has(s.programId)
      );
      const trackSubjectIds = new Set(trackSubjects.map((s) => s.id));

      // Active non-skipped chapters belonging to this track
      const trackChapters = chapters.filter(
        (c) =>
          (c.trackId === track.id ||
            trackProgramIds.has(c.programId) ||
            trackSubjectIds.has(c.subjectId)) &&
          !c.isSkipped &&
          c.status !== 'skipped'
      );

      const totalChapters = trackChapters.length;
      const completedChapters = trackChapters.filter(
        (c) => c.completed || c.status === 'completed'
      ).length;

      const percentage =
        totalChapters > 0
          ? Math.round((completedChapters / totalChapters) * 100)
          : 0;

      const color = getTrackColor(track.name, idx);

      return {
        id: track.id,
        name: track.name,
        completedChapters,
        totalChapters,
        percentage,
        color,
      };
    });
  }, [tracks, programs, subjects, chapters]);

  if (tracks.length === 0) {
    return (
      <section className="space-y-3 font-mono">
        <div className="space-y-1">
          <h3 className="font-mono text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#CBD5E1]">
            TRACK COMPLETION
          </h3>
          <p className="font-mono text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
            OVERALL PROGRESS FOR ALL ENROLLED STUDY TRACKS
          </p>
        </div>
        <div className="w-full py-8 text-center rounded-[24px] border border-dashed border-white/[0.08] bg-[#0B0F19]/30 text-[#64748B] text-xs font-mono">
          NO ENROLLED STUDY TRACKS DETECTED
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 font-mono">
      {/* ── HEADER ── */}
      <div className="space-y-1">
        <h3 className="font-mono text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#CBD5E1]">
          TRACK COMPLETION
        </h3>
        <p className="font-mono text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
          OVERALL PROGRESS FOR ALL ENROLLED STUDY TRACKS
        </p>
      </div>

      {/* ── CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {trackMetrics.map((track) => (
          <CompletionCard
            key={track.id}
            id={track.id}
            name={track.name}
            completedChapters={track.completedChapters}
            totalChapters={track.totalChapters}
            percentage={track.percentage}
            color={track.color}
            onProgressClick={() => setSelectedTrackId(track.id)}
          />
        ))}
      </div>

      {/* ── COMPLETION STATUS BREAKDOWN MODAL ── */}
      {selectedTrackId && (
        <CompletionStatusModal
          isOpen={true}
          onClose={() => setSelectedTrackId(null)}
          target={{ type: 'track', id: selectedTrackId }}
          onNavigate={onNavigate}
        />
      )}
    </section>
  );
};
