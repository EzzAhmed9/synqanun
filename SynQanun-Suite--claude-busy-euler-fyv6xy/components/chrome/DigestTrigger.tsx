'use client';

import { AudioLines } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface DigestTriggerProps {
  onOpen?: () => void;
  /** Show a navy dot when there is an unheard briefing waiting. */
  hasUpdate?: boolean;
  className?: string;
}

/**
 * Opens the Digest — SynQanun's spoken briefing.
 *
 * The Digest is an AI surface, so it is legal-navy, not syn-red. design.md §2:
 * "Navy is for the AI's actions… This split is load-bearing: a user should be
 * able to tell, by colour alone, whether something came from them or from the
 * AI." §7 restates the inverse as the most important rule in the file. A red
 * Digest button would be a design-system bug, not a styling preference.
 *
 * Batch 0 builds the trigger only. BUILD_PLAN.md puts the Digest conversation
 * interface in Batch 5, and §5 describes what it becomes: "a scripted
 * conversation (2-3 branching paths) with a real waveform animation, not actual
 * speech recognition."
 */
export function DigestTrigger({ onOpen, hasUpdate = false, className }: DigestTriggerProps) {
  const t = useTranslations('common');

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('digest')}
      title={t('digest')}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-sm',
        'text-legal-navy hover:bg-legal-navy/8',
        className
      )}
    >
      <AudioLines aria-hidden size={18} />
      {hasUpdate ? (
        // Positioned with a logical property so the dot stays on the outer
        // corner in both LTR and RTL.
        <span
          aria-hidden
          className="absolute top-1.5 inline-block h-1.5 w-1.5 rounded-pill bg-legal-navy"
          style={{ insetInlineEnd: '0.375rem' }}
        />
      ) : null}
    </button>
  );
}

export default DigestTrigger;
