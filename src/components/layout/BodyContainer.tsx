/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';

interface BodyContainerProps {
  currentRoute: AppRoute;
}

/**
 * 3. Body Container
 * Dedicated body container for X-29.
 *
 * Requirements:
 * - Fully transparent
 * - No background
 * - No visible fill
 * - No unnecessary border
 * - Independent from header/navigation
 * - Full available content area
 * - Completely blank except for the existing breadcrumbs
 * - Do NOT add titles, placeholder text, cards, or page content
 */
export const BodyContainer: React.FC<BodyContainerProps> = ({ currentRoute }) => {
  return (
    <main
      id="body-container"
      data-container="body"
      className="flex-1 w-full min-w-0 bg-transparent p-4 sm:p-6 lg:p-8"
    >
      {/* Breadcrumbs only — completely blank otherwise */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-[#94A3B8]">
        <span>TraX</span>
        <span aria-hidden="true">/</span>
        <span className="text-[#6366F1] truncate">{currentRoute}</span>
      </div>
    </main>
  );
};
