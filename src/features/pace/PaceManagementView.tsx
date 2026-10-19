/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppRoute } from '../../types/navigation';
import { usePace } from './context/PaceContext';
import { GlobalBaselineCard } from './components/GlobalBaselineCard';
import { TopKpiMetricsRow } from './components/TopKpiMetricsRow';
import { CreatePaceTargetForm } from './components/CreatePaceTargetForm';
import { ActiveTimelinesSection } from './components/ActiveTimelinesSection';
import { PaceDeleteConfirmModal } from './components/modals/PaceDeleteConfirmModal';
import { PaceGoal } from './types';

const PaceTrendChartModal = React.lazy(() =>
  import('./components/modals/PaceTrendChartModal').then((m) => ({
    default: m.PaceTrendChartModal,
  }))
);

const PaceVelocityCandleModal = React.lazy(() =>
  import('./components/modals/PaceVelocityCandleModal').then((m) => ({
    default: m.PaceVelocityCandleModal,
  }))
);

const PaceGoalDetailsModal = React.lazy(() =>
  import('./components/modals/PaceGoalDetailsModal').then((m) => ({
    default: m.PaceGoalDetailsModal,
  }))
);

const PaceEditGoalModal = React.lazy(() =>
  import('./components/modals/PaceEditGoalModal').then((m) => ({
    default: m.PaceEditGoalModal,
  }))
);

interface PaceManagementViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const PaceManagementContent: React.FC<PaceManagementViewProps> = React.memo(() => {
  const { goals, globalGoal } = usePace();

  // Modal States
  const [trendModalGoal, setTrendModalGoal] = useState<PaceGoal | null>(null);
  const [candleModalGoal, setCandleModalGoal] = useState<PaceGoal | null>(null);
  const [detailsModalGoal, setDetailsModalGoal] = useState<PaceGoal | null>(null);
  const [editModalGoal, setEditModalGoal] = useState<PaceGoal | null>(null);
  const [deleteModalGoal, setDeleteModalGoal] = useState<PaceGoal | null>(null);

  return (
    <div className="w-full space-y-6 font-mono">
      {/* ── 0. GLOBAL BASELINE BANNER STRIP (CONNECTED TO GLOBAL PACE TIME RANGE) ── */}
      <GlobalBaselineCard />

      {/* ── 1. TOP 3 KPI STAT CARDS BANNER (LINKED TO GLOBAL PACE ONLY) ── */}
      <TopKpiMetricsRow 
        onOpenTrendModal={() => setTrendModalGoal(globalGoal)} 
      />

      {/* ── 2. CREATE PACE TARGET / BUNDLE BUILDER FORM ── */}
      <CreatePaceTargetForm />

      {/* ── 5. ACTIVE TIMELINES GRID ── */}
      <ActiveTimelinesSection
        onOpenTrend={(g) => setTrendModalGoal(g)}
        onOpenCandle={(g) => setCandleModalGoal(g)}
        onOpenDetails={(g) => setDetailsModalGoal(g)}
        onOpenEdit={(g) => setEditModalGoal(g)}
        onOpenDelete={(g) => setDeleteModalGoal(g)}
      />

      {/* ── 6. MODALS (LAZY LOADED & CONDITIONALLY MOUNTED) ── */}
      {trendModalGoal && (
        <React.Suspense fallback={null}>
          <PaceTrendChartModal
            goal={trendModalGoal}
            isOpen={Boolean(trendModalGoal)}
            onClose={() => setTrendModalGoal(null)}
          />
        </React.Suspense>
      )}

      {candleModalGoal && (
        <React.Suspense fallback={null}>
          <PaceVelocityCandleModal
            goal={candleModalGoal}
            isOpen={Boolean(candleModalGoal)}
            onClose={() => setCandleModalGoal(null)}
          />
        </React.Suspense>
      )}

      {detailsModalGoal && (
        <React.Suspense fallback={null}>
          <PaceGoalDetailsModal
            goal={detailsModalGoal}
            isOpen={Boolean(detailsModalGoal)}
            onClose={() => setDetailsModalGoal(null)}
            onOpenTrend={(g) => setTrendModalGoal(g)}
          />
        </React.Suspense>
      )}

      {editModalGoal && (
        <React.Suspense fallback={null}>
          <PaceEditGoalModal
            goal={editModalGoal}
            isOpen={Boolean(editModalGoal)}
            onClose={() => setEditModalGoal(null)}
          />
        </React.Suspense>
      )}

      {deleteModalGoal && (
        <PaceDeleteConfirmModal
          goal={deleteModalGoal}
          isOpen={Boolean(deleteModalGoal)}
          onClose={() => setDeleteModalGoal(null)}
        />
      )}
    </div>
  );
});

PaceManagementContent.displayName = 'PaceManagementContent';

export const PaceManagementView: React.FC<PaceManagementViewProps> = (props) => {
  return (
    <PaceManagementContent {...props} />
  );
};
