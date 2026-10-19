/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';

interface SpatialBackgroundProps {
  children?: React.ReactNode;
  enableParallax?: boolean;
  enableAutoAnimation?: boolean;
  intensity?: 'subtle' | 'standard' | 'high';
  mode?: 'grid' | 'transparent';
}

/**
 * Reusable full-width spatial environment background for Project-X / X-29.
 * High-density technical grid (16px base) with auto-animations,
 * atmospheric depth, and edge-to-edge full monitor fit.
 */
export const SpatialBackground: React.FC<SpatialBackgroundProps> = ({
  children,
  enableParallax = true,
  enableAutoAnimation = true,
  intensity = 'standard',
  mode = 'transparent',
}) => {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Monitor screen size and accessibility motion preferences
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', checkViewport);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Subtle cursor parallax depth (desktop only)
  useEffect(() => {
    if (isMobile || prefersReducedMotion || !enableParallax) return;

    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMousePos({ x, y });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [isMobile, prefersReducedMotion, enableParallax]);

  // Parallax offsets calculated smoothly
  const parallaxTransform = useMemo(() => {
    if (isMobile || prefersReducedMotion || !enableParallax) {
      return {
        grid: 'translate(0px, 0px)',
      };
    }

    const multiplier = intensity === 'high' ? 1.4 : intensity === 'subtle' ? 0.6 : 1.0;
    const deltaX = (mousePos.x - 0.5) * 18 * multiplier;
    const deltaY = (mousePos.y - 0.5) * 18 * multiplier;

    return {
      grid: `translate(${(-deltaX * 0.45).toFixed(1)}px, ${(-deltaY * 0.45).toFixed(1)}px)`,
    };
  }, [mousePos, isMobile, prefersReducedMotion, enableParallax, intensity]);

  return (
    <div className="relative w-full max-w-full h-full h-dvh bg-[#0B0D13] text-[#F8FAFC] overflow-hidden selection:bg-[#6366F1]/30 selection:text-white">
      {/* ── ENVIRONMENT LAYER (FULL MONITOR EDGE-TO-EDGE SPATIAL GRID) ── */}
      <div
        className="fixed inset-0 w-full max-w-full h-full pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Deep Atmospheric Base Glow with Ambient Pulse (Desktop / non-mobile only) */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${enableAutoAnimation && !prefersReducedMotion && !isMobile ? 'animate-ambient-pulse' : ''}`}
          style={{
            background: isMobile
              ? 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.05) 0%, rgba(11, 13, 19, 0) 70%)'
              : 'radial-gradient(circle 900px at 50% 35%, rgba(99, 102, 241, 0.065) 0%, rgba(16, 185, 129, 0.018) 35%, rgba(11, 13, 19, 0) 80%)',
          }}
        />

        {/* Single Base Spatial Grid (16px base grid area) with Continuous Drift Animation on desktop */}
        <div
          className={`
            absolute inset-[-64px] spatial-grid-base transition-transform duration-300 ease-out
            ${mode === 'grid' ? 'opacity-100' : 'opacity-90'}
            ${enableAutoAnimation && !prefersReducedMotion && !isMobile ? 'animate-grid-drift' : ''}
          `}
          style={{
            transform: parallaxTransform.grid,
            maskImage: mode === 'grid'
              ? 'radial-gradient(ellipse 98% 90% at 50% 50%, black 55%, transparent 98%)'
              : 'radial-gradient(ellipse 95% 85% at 50% 50%, black 45%, transparent 95%)',
            WebkitMaskImage: mode === 'grid'
              ? 'radial-gradient(ellipse 98% 90% at 50% 50%, black 55%, transparent 98%)'
              : 'radial-gradient(ellipse 95% 85% at 50% 50%, black 45%, transparent 95%)',
          }}
        />

        {/* Auto-Animation Sweeping Radar Scan Beam across Full Monitor (desktop only to prevent mobile GPU battery drain) */}
        {enableAutoAnimation && !prefersReducedMotion && !isMobile && (
          <div
            className="absolute top-0 bottom-0 w-[30vw] animate-radar-sweep pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.02) 40%, rgba(99, 102, 241, 0.06) 80%, rgba(255, 255, 255, 0.12) 98%, transparent 100%)',
              filter: 'blur(1px)',
            }}
          />
        )}

        {/* Layer 4: Horizon Depth Gradient & Edge Fogging */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(11, 13, 19, 0.15) 0%, rgba(11, 13, 19, 0) 25%, rgba(11, 13, 19, 0.3) 75%, rgba(11, 13, 19, 0.88) 100%)',
          }}
        />

        {/* Full-Width Horizon Calibration Line */}
        <div
          className="absolute top-[32%] left-0 right-0 h-[1px] opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 15%, rgba(99,102,241,0.18) 50%, rgba(255,255,255,0.05) 85%, transparent 100%)',
          }}
        />
      </div>

      {/* ── FOREGROUND LAYER (EDGE-TO-EDGE FULL MONITOR CONTAINER) ── */}
      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};
