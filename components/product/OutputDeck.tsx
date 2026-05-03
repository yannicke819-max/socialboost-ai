import { Linkedin, Instagram, Music2, Twitter } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { cn } from '@/lib/utils';

type Platform = 'linkedin' | 'instagram' | 'x' | 'tiktok';

type DeckCard = {
  platform: Platform;
  format: string;
  preview: string;
  score: number;
};

const PLATFORM_META: Record<
  Platform,
  { label: string; Icon: typeof Linkedin; color: string }
> = {
  linkedin: { label: 'LinkedIn', Icon: Linkedin, color: 'text-[#0A66C2]' },
  instagram: { label: 'Instagram', Icon: Instagram, color: 'text-[#E1306C]' },
  x: { label: 'X', Icon: Twitter, color: 'text-fg' },
  tiktok: { label: 'TikTok', Icon: Music2, color: 'text-fg' },
};

export function OutputDeck({
  cards,
  className,
}: {
  cards: ReadonlyArray<DeckCard>;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {cards.map((card, i) => {
        const meta = PLATFORM_META[card.platform];
        const Icon = meta.Icon;
        return (
          <div
            key={`${card.platform}-${i}`}
            className="group relative flex flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-4 shadow-soft transition hover:border-border-strong"
            style={{
              animation: `fade-up 0.5s ease-out ${i * 80}ms both`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-md bg-bg-muted',
                    meta.color,
                  )}
                  aria-hidden
                >
                  <Icon size={14} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {meta.label}
                </span>
              </div>
              <ConfidenceBadge score={card.score} />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {card.format}
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">{card.preview}</p>
          </div>
        );
      })}
    </div>
  );
}
