'use client';

import { cn } from '@/lib/utils';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Pure SVG sparkline. No package.
 *
 * The Y-axis auto-scales between min and max of the input. A faint baseline
 * is drawn at the value's mean to anchor the eye.
 */
export function Sparkline({
  values,
  width = 80,
  height = 22,
  className,
  ariaLabel,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={cn('text-fg-subtle', className)}
        aria-hidden
      />
    );
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const pts = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const meanY = height - ((values.reduce((a, b) => a + b, 0) / values.length - min) / range) * (height - 2) - 1;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('text-fg', className)}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      <line
        x1={0}
        x2={width}
        y1={meanY}
        y2={meanY}
        stroke="currentColor"
        strokeWidth={0.5}
        strokeOpacity={0.25}
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}
