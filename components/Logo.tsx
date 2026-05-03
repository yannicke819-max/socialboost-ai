import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
        <Sparkles size={18} />
      </span>
      <span className="text-lg tracking-tight">
        SocialBoost <span className="text-brand-500">AI</span>
      </span>
    </Link>
  );
}
