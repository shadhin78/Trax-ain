/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FloatingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: 'flat' | 'standard' | 'elevated' | 'high';
  accentBorder?: 'none' | 'primary' | 'focus' | 'success' | 'warning';
  interactive?: boolean;
  className?: string;
}

/**
 * Standard floating surface component for Project-X / X-29.
 * Visually sits above the infinite spatial grid using precise elevation,
 * soft occlusion shadows, and hairline borders.
 */
export const FloatingCard: React.FC<FloatingCardProps> = ({
  children,
  elevation = 'standard',
  accentBorder = 'none',
  interactive = true,
  className = '',
  ...props
}) => {
  const getElevationStyle = () => {
    switch (elevation) {
      case 'flat':
        return 'bg-[#131722]/85 border-[#1F2637] shadow-sm';
      case 'elevated':
        return 'bg-[#151a27]/95 border-[#1F2637] shadow-[0_20px_45px_-8px_rgba(0,0,0,0.85)]';
      case 'high':
        return 'bg-[#171d2b] border-[rgba(255,255,255,0.1)] shadow-[0_28px_60px_-10px_rgba(0,0,0,0.9)]';
      case 'standard':
      default:
        return 'bg-[#131722]/92 border-[#1F2637] shadow-[0_16px_36px_-8px_rgba(0,0,0,0.75)]';
    }
  };

  const getAccentBorderStyle = () => {
    switch (accentBorder) {
      case 'primary':
        return 'border-l-2 border-l-[#6366F1]';
      case 'focus':
        return 'border-l-2 border-l-[#F59E0B]';
      case 'success':
        return 'border-l-2 border-l-[#10B981]';
      case 'warning':
        return 'border-l-2 border-l-[#F43F5E]';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div
      className={`
        relative rounded-xl border backdrop-blur-md transition-all duration-200 ease-out
        ${getElevationStyle()}
        ${getAccentBorderStyle()}
        ${interactive ? 'hover:-translate-y-0.5 hover:border-[#2b354c] hover:shadow-[0_22px_45px_-8px_rgba(0,0,0,0.85),0_0_1px_rgba(255,255,255,0.1)]' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Specular hairline highlight along top border */}
      <div 
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.08)] to-transparent pointer-events-none rounded-t-xl" 
        aria-hidden="true" 
      />
      {children}
    </div>
  );
};
