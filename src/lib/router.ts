/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { AppRoute } from '../types/navigation';

export const VALID_ROUTES: AppRoute[] = [
  '/',
  '/analytics/',
  '/focus/',
  '/daily-actions/',
  '/monthly-target-setup/',
  '/daily-schedule/',
  '/subjects/',
  '/pace-management/',
  '/master-config/',
  '/outcome/',
  '/exam-routine/',
  '/account/',
  '/login/',
];

export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard/': 'Dashboard',
  '/analytics/': 'Analytics',
  '/focus/': 'Focus',
  '/daily-actions/': 'Daily Actions',
  '/monthly-target-setup/': 'Monthly Target Set Up',
  '/daily-schedule/': 'Daily Schedule',
  '/subjects/': 'Subjects',
  '/pace-management/': 'Pace Management',
  '/master-config/': 'Master Configuration',
  '/outcome/': 'Outcome',
  '/exam/': 'Exam Routine',
  '/exam-routine/': 'Exam Routine',
  '/account/': 'Account',
  '/login/': 'Login',
};

/**
 * Public routes accessible without authentication.
 * All other routes are protected by default.
 */
export const PUBLIC_ROUTES: AppRoute[] = ['/login/'];

export function isPublicRoute(route: string): boolean {
  const normalized = normalizePath(route);
  return (PUBLIC_ROUTES as string[]).includes(normalized);
}

export function isProtectedRoute(route: string): boolean {
  return !isPublicRoute(route);
}

/**
 * Safely parses and validates an internal redirect destination to prevent open-redirect vulnerabilities.
 * Rejects external URLs, protocol-relative links, javascript URIs, and redirects to login itself.
 */
export function getValidRedirectDestination(candidate: string | null | undefined): AppRoute {
  if (!candidate) return '/';

  let target = candidate.trim();
  if (!target) return '/';

  // Prevent protocol or protocol-relative open redirects (e.g. "https://...", "//evil.com", "javascript:...")
  if (
    target.startsWith('//') || 
    target.includes('://') || 
    target.toLowerCase().startsWith('javascript:') || 
    target.toLowerCase().startsWith('data:') ||
    target.toLowerCase().startsWith('vbscript:')
  ) {
    return '/';
  }

  // Ensure leading slash
  if (!target.startsWith('/')) {
    target = `/${target}`;
  }

  // Extract path without query parameters or hash for route matching
  const [cleanPath] = target.split(/[?#]/);
  const normalized = normalizePath(cleanPath);

  // Never redirect back to login
  if (normalized === '/login/') {
    return '/';
  }

  if ((VALID_ROUTES as string[]).includes(normalized)) {
    return normalized;
  }

  return '/';
}

/**
 * Normalizes an arbitrary pathname into a valid AppRoute.
 * - '/' is canonical for Dashboard.
 * - Any '/dashboard' or '/dashboard/' request cleanly resolves to '/'.
 * - Other valid pages enforce trailing slash (e.g. '/analytics' -> '/analytics/').
 * - Unknown routes fall back to '/'.
 */
export function normalizePath(path: string): AppRoute {
  if (!path) return '/';
  let clean = path.trim();

  // Extract hash and query parameters before normalizing
  const hashIndex = clean.indexOf('#');
  if (hashIndex !== -1) clean = clean.substring(0, hashIndex);
  const queryIndex = clean.indexOf('?');
  if (queryIndex !== -1) clean = clean.substring(0, queryIndex);

  clean = clean.trim();

  // Root or dashboard variations always resolve to '/'
  if (clean === '' || clean === '/' || clean === '/dashboard' || clean === '/dashboard/') {
    return '/';
  }

  // Alias /exam to /exam-routine/
  if (clean === '/exam' || clean === '/exam/') {
    return '/exam-routine/';
  }

  // Enforce trailing slash for subpages
  if (!clean.endsWith('/')) {
    clean = `${clean}/`;
  }

  if ((VALID_ROUTES as string[]).includes(clean)) {
    return clean as AppRoute;
  }

  return '/';
}

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/';
  });

  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Sync route and ensure URL matches normalized route on initial load
  useEffect(() => {
    const rawPath = window.location.pathname;
    const initial = normalizePath(rawPath);

    if (rawPath !== initial) {
      window.history.replaceState(null, '', initial + window.location.search + window.location.hash);
    }
    setCurrentRoute(initial);

    const handlePopState = () => {
      const popped = normalizePath(window.location.pathname);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentRoute(popped);
        setIsTransitioning(false);
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((targetRoute: AppRoute | string) => {
    let clean = targetRoute;
    let hash = '';
    let search = '';

    const hashIndex = clean.indexOf('#');
    if (hashIndex !== -1) {
      hash = clean.substring(hashIndex);
      clean = clean.substring(0, hashIndex);
    }

    const queryIndex = clean.indexOf('?');
    if (queryIndex !== -1) {
      search = clean.substring(queryIndex);
      clean = clean.substring(0, queryIndex);
    }

    const normalized = normalizePath(clean);
    const fullTarget = normalized + search + hash;

    if (normalized === currentRoute && !search) {
      // On same route without new query parameters: update hash and smoothly scroll
      if (hash) {
        window.history.pushState(null, '', fullTarget);
        const targetId = hash.replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      return;
    }

    // Trigger smooth transition
    setIsTransitioning(true);

    // Update browser URL
    window.history.pushState(null, '', fullTarget);

    // Coordinate page change animation (approx 180ms)
    setTimeout(() => {
      setCurrentRoute(normalized);
      if (hash) {
        // Scroll target element into view smoothly after page render
        setTimeout(() => {
          const targetId = hash.replace('#', '');
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      } else {
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const bodyContainer = document.getElementById('body-container');
        if (bodyContainer) {
          bodyContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      setIsTransitioning(false);
    }, 180);
  }, [currentRoute]);

  return {
    currentRoute,
    currentTitle: ROUTE_TITLES[currentRoute] || 'Dashboard',
    navigate,
    isTransitioning,
  };
}
