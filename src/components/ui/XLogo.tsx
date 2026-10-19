/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface XLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

/**
 * X-29 Bespoke Geometric X Logo
 * A minimal, futuristic aerospace symbol constructed from intersecting faceted blades,
 * directional depth layering, precision aperture interlock, and emerald quantum core.
 */
export const XLogo: React.FC<XLogoProps> = ({
  size = 24,
  className = '',
  showGlow = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-label="TraX Emblem"
    >
      <defs>
        <linearGradient id="xBladeMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6366F1" />
          <stop offset="70%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        <linearGradient id="xBladeFacet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="40%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        <linearGradient id="xWingTR" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>

        <linearGradient id="xWingBL" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        <linearGradient id="xCoreEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {showGlow && (
          <filter id="xGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      <g filter={showGlow ? 'url(#xGlowFilter)' : undefined}>
        {/* Layer 1: Ambient Shadow Underpass */}
        <path 
          d="M 120 400 L 176 432 L 256 296 L 216 272 Z"
          fill="#1E1B4B"
          opacity="0.65"
        />

        {/* Layer 2: Top-Right Intersecting Aerodynamic Wing */}
        <path
          d="M 336 48 L 416 48 L 276 228 L 228 200 Z"
          fill="url(#xWingTR)"
        />
        <path
          d="M 336 48 L 416 48 L 388 76 L 316 76 Z"
          fill="#E0E7FF"
          opacity="0.5"
        />

        {/* Layer 3: Bottom-Left Intersecting Aerodynamic Wing */}
        <path
          d="M 96 464 L 176 464 L 236 292 L 188 264 Z"
          fill="url(#xWingBL)"
        />
        <path
          d="M 96 464 L 176 464 L 148 436 L 76 436 Z"
          fill="#818CF8"
          opacity="0.35"
        />

        {/* Layer 4: Primary Overpass Diagonal Fuselage */}
        <path
          d="M 96 48 L 192 48 L 416 464 L 320 464 Z"
          fill="url(#xBladeMain)"
        />
        <path
          d="M 144 48 L 192 48 L 368 464 L 320 464 Z"
          fill="url(#xBladeFacet)"
          opacity="0.55"
        />
        <path
          d="M 96 48 L 112 56 L 336 464 L 320 464 Z"
          fill="#FFFFFF"
          opacity="0.4"
        />

        {/* Precision Interlocking Center Nexus Aperture */}
        <polygon
          points="256,220 288,256 256,292 224,256"
          fill="#0B0D13"
          opacity="0.95"
        />
        <polygon
          points="256,220 288,256 256,292 224,256"
          fill="none"
          stroke="#6366F1"
          strokeWidth="3.5"
          opacity="0.85"
        />

        {/* Glowing Emerald Core Node */}
        <polygon
          points="256,236 272,256 256,276 240,256"
          fill="url(#xCoreEmerald)"
        />
        <circle cx="256" cy="256" r="3.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
};
