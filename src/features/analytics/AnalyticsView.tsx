/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppRoute } from '../../types/navigation';
import { XCommitmentsRadarChart } from './components/XCommitmentsRadarChart';
import { FocusMatrixHeatmap } from './components/FocusMatrixHeatmap';
import { VisualAnalysisSection } from './components/VisualAnalysisSection';

interface AnalyticsViewProps {
  onNavigate?: (route: AppRoute) => void;
}

/**
 * X-29 — Analytics Page View
 * Houses THE X COMMITMENTS radial habit radar, Focus Matrix Heatmap, and Visual Analysis trends.
 */
export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#focus-matrix-heatmap') {
      const el = document.getElementById('focus-matrix-heatmap');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  }, []);

  return (
    <div className="w-full space-y-8">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Analytics
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              Real-Time Telemetry
            </span>
          </div>
          <p className="mt-1 text-xs font-mono text-[#94A3B8]">
            Academic Progress Telemetry • Daily Commitment Radar & Visual Trend Analytics
          </p>
        </div>
      </div>

      {/* ── 1. THE X COMMITMENTS RADIAL HABIT RADAR ── */}
      <XCommitmentsRadarChart onNavigate={onNavigate} />

      {/* ── 2. FOCUS MATRIX HEATMAP ── */}
      <FocusMatrixHeatmap />

      {/* ── 3. VISUAL ANALYSIS (PROGRAM COMPLETION TREND & DAILY ACTIONS MONTH) ── */}
      <VisualAnalysisSection />
    </div>
  );
};

