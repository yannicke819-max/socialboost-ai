'use client';

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      // navigator.clipboard is available in modern browsers and the Vercel preview env.
      // Fall back silently to a hidden textarea if not.
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort — never throw to UI
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg',
        className,
      )}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}
