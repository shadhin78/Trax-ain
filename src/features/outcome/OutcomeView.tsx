/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppRoute } from '../../types/navigation';
import { OutcomeHeader } from './components/OutcomeHeader';
import { ResultsTrendChart } from './components/ResultsTrendChart';
import { LoggedResultsSection } from './components/LoggedResultsSection';
import { PassFreezeConfigSection } from './components/PassFreezeConfigSection';
import { ProgramResult } from './types';

const AddResultModal = React.lazy(() =>
  import('./components/modals/AddResultModal').then((m) => ({
    default: m.AddResultModal,
  }))
);

interface OutcomeViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const OutcomeContent: React.FC<OutcomeViewProps> = React.memo(() => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ProgramResult | null>(null);

  const handleOpenAdd = () => {
    setEditingResult(null);
    setIsAddModalOpen(true);
  };

  const handleEditResult = (result: ProgramResult) => {
    setEditingResult(result);
    setIsAddModalOpen(true);
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-16 font-mono">
      {/* ── 1. HEADER WITH TITLE, ADD BUTTON & PROGRAM FILTER PILLS ── */}
      <OutcomeHeader onOpenAddModal={handleOpenAdd} />

      {/* ── 2. RESULTS & PERFORMANCE TREND DUAL-BAR CHART ── */}
      <ResultsTrendChart />

      {/* ── 3. LOGGED RESULTS CARDS GRID ── */}
      <LoggedResultsSection onEditResult={handleEditResult} />

      {/* ── 4. PASS / FREEZE CONFIGURATION SECTION ── */}
      <PassFreezeConfigSection />

      {/* ── MODALS (LAZY LOADED & CONDITIONALLY MOUNTED) ── */}
      {isAddModalOpen && (
        <React.Suspense fallback={null}>
          <AddResultModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            editingResult={editingResult}
          />
        </React.Suspense>
      )}
    </div>
  );
});

OutcomeContent.displayName = 'OutcomeContent';

export const OutcomeView: React.FC<OutcomeViewProps> = (props) => {
  return <OutcomeContent {...props} />;
};
