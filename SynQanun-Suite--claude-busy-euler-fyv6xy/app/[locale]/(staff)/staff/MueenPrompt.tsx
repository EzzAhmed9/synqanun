'use client';

import * as React from 'react';
import { ArrowRight, Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { MUEEN_HANDOFF_KEY } from './mueen-handoff';

/**
 * The معين tile's prompt box: a question, two suggestion chips, and a round
 * mic button. DEMO-ONLY, and it says so beneath itself.
 *
 *  · Asking opens the Digest with the question already asked. The question
 *    travels in sessionStorage, not the URL — see ScriptedChat's `handoffKey`.
 *  · The chips are questions the Digest has scripted answers for, so a click
 *    lands on an answer rather than on "I do not have anything on that".
 *  · The mic does nothing. It is `aria-disabled` with its reason as its label,
 *    rather than a live-looking control that silently ignores the reader.
 *
 * AN AI SURFACE (design.md §2): legal-navy controls, no syn-red and no tenant
 * action colour anywhere on it.
 */
export function MueenPrompt({ matterRef }: { matterRef: string | null }) {
  const t = useTranslations('staffDashboard.prompt');
  const router = useRouter();
  const [draft, setDraft] = React.useState('');
  const inputId = React.useId();

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    try {
      window.sessionStorage.setItem(MUEEN_HANDOFF_KEY, trimmed);
    } catch {
      // Storage blocked: the Digest still opens, without the question.
    }
    router.push('/staff/ai/digest');
  };

  const chips = [t('chipToday'), ...(matterRef ? [t('chipMatter', { ref: matterRef })] : [])];

  return (
    <div className="mt-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          {t('label')}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-pill border border-legal-navy/25 bg-white px-5 text-body text-gray-900 outline-none placeholder:text-gray-500 focus:border-legal-navy"
        />
        <button
          type="submit"
          aria-label={t('send')}
          className={cn(buttonClasses({ variant: 'ai', size: 'lg' }), 'h-12 w-12 shrink-0 rounded-pill px-0')}
        >
          <ArrowRight aria-hidden size={18} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          aria-disabled="true"
          aria-label={t('mic')}
          title={t('mic')}
          onClick={(event) => event.preventDefault()}
          className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-pill border border-legal-navy/25 bg-white text-legal-navy"
        >
          <Mic aria-hidden size={18} />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => ask(chip)}
            className="rounded-pill border border-legal-navy/25 bg-white px-3.5 py-1.5 text-caption font-medium text-legal-navy hover:bg-legal-navy/5"
          >
            <bdi>{chip}</bdi>
          </button>
        ))}
      </div>

      <p className="mt-3 text-caption text-gray-600">{t('demo')}</p>
    </div>
  );
}

export default MueenPrompt;
