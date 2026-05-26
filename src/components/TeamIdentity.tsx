import { getTeamVisual } from '@/lib/teamVisuals';

interface TeamIdentityProps {
  name: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  className?: string;
}

export default function TeamIdentity({ name, align = 'left', size = 'sm', className = '' }: TeamIdentityProps) {
  const visual = getTeamVisual(name);
  const isRight = align === 'right';
  const markSize = size === 'md' ? 'w-8 h-8 text-xl' : 'w-6 h-6 text-base';
  const textSize = size === 'md' ? 'text-sm sm:text-base' : 'text-sm';
  const base = 'inline-flex items-center gap-1.5 min-w-0';
  const direction = isRight ? 'flex-row-reverse justify-end text-right' : 'justify-start text-left';
  const rootClass = [base, direction, className].filter(Boolean).join(' ');
  const markClass = [
    'shrink-0 inline-flex items-center justify-center rounded-full',
    markSize,
  ].join(' ');

  return (
    <span className={rootClass} title={visual.label}>
      <span className={markClass} aria-label={visual.label}>
        {visual.kind === 'crest' ? (
          <img src={visual.value} alt={visual.label} className="w-full h-full object-contain p-0.5" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className="leading-none select-none">{visual.value}</span>
        )}
      </span>
      <span className={['font-bold text-white truncate', textSize].join(' ')}>{name}</span>
    </span>
  );
}
