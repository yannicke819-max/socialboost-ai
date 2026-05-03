import Link from 'next/link';

export function Logo({
  href = '/',
  size = 'md',
}: {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const wordSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const dotSize =
    size === 'sm' ? 'h-1 w-1' : size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5';

  return (
    <Link
      href={href}
      className="group inline-flex items-baseline font-display tracking-tight text-fg"
      aria-label="SocialBoost AI — home"
    >
      <span className={wordSize}>SocialBoost</span>
      <span className={`${wordSize} italic text-fg-muted`}>.ai</span>
      <span
        className={`ml-1.5 inline-block ${dotSize} rounded-full bg-amber transition-transform group-hover:scale-125`}
        aria-hidden
      />
    </Link>
  );
}
