import { cn } from '@/lib/utils';

/**
 * Boost Meter — SVG arc gauge for Confidence Score.
 * Amber-only by design (business signal). Animated stroke-dashoffset.
 */
export function BoostMeter({
  value,
  size = 120,
  label,
  className,
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size / 2 + 12}
        viewBox={`0 0 ${size} ${size / 2 + 12}`}
        className="overflow-visible"
        aria-label={`Boost Score ${clamped}/100`}
      >
        {/* Track */}
        <path
          d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--border-strong))"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--amber))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (Math.PI * (100 - tick)) / 100;
          const x1 = size / 2 + radius * Math.cos(angle);
          const y1 = size / 2 - radius * Math.sin(angle);
          const x2 = size / 2 + (radius + 4) * Math.cos(angle);
          const y2 = size / 2 - (radius + 4) * Math.sin(angle);
          return (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--fg-subtle))"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div className="-mt-8 text-center">
        <p className="font-display text-4xl text-fg">{clamped}</p>
        {label && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
