/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LucideIcon } from 'lucide-react';

export type CanonicalAppRoute =
  | '/'
  | '/analytics/'
  | '/focus/'
  | '/daily-actions/'
  | '/monthly-target-setup/'
  | '/daily-schedule/'
  | '/subjects/'
  | '/pace-management/'
  | '/master-config/'
  | '/outcome/'
  | '/exam/'
  | '/exam-routine/'
  | '/account/'
  | '/login/'
  | '/dashboard/';

export type AppRoute = CanonicalAppRoute | `${CanonicalAppRoute}#${string}`;

export interface NavItemConfig {
  id: string;
  title: string;
  route: AppRoute;
  icon: LucideIcon;
  badge?: string;
}
