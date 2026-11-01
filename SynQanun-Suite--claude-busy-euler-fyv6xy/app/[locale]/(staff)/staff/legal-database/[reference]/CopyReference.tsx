'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

/**
 * Copy the entry's reference.
 *
 * ===========================================================================
 * THE ONE ACTION ON THIS SCREEN THAT IS COMPLETELY REAL
 * ===========================================================================
 * It writes to the clipboard, which happens locally and asserts nothing about
 * anything leaving the building. No §5.1 question arises.
 *
 * WHAT IT COPIES IS THE WHOLE REASON IT IS SAFE. The export's version of this
 * button puts "[2021] UAE Fed. Dec.-Law 32 / CL-UAE-2021-0032 — Article 71" on
 * the clipboard: a real instrument, in a real citation format, attached to text
 * a design tool wrote. That is one keystroke from a pleading.
 *
 * This copies "SAMPLE-0001", which is not a citation format any reporter uses
 * anywhere, and which disqualifies itself in whatever document it lands in.
 * fixtures/legal-database.ts chose that reference format precisely so that the
 * dangerous action stops being dangerous.
 *
 * ===========================================================================
 * AND IT REPORTS FAILURE
 * ===========================================================================
 * `navigator.clipboard` rejects on an insecure origin and when permission is
 * refused. The export's version catches the rejection and shows a success
 * message anyway ("Selected citation ready"), which is the smallest possible
 * version of the lie this project keeps refusing: a control that reports
 * success for something that did not happen.
 */
export function CopyReference({ reference }: { reference: string }) {
  const t = useTranslations('lawReader');
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle');

  React.useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setState('copied');
    } catch {
      // Says so, rather than claiming it worked. See the header.
      setState('failed');
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={copy}
        icon={
          state === 'copied' ? (
            <Check aria-hidden size={15} className="text-success" />
          ) : (
            <Copy aria-hidden size={15} />
          )
        }
      >
        {t('copyReference')}
      </Button>
      {state !== 'idle' ? (
        <span
          role="status"
          className={state === 'copied' ? 'text-caption text-gray-600' : 'text-caption text-error'}
        >
          {state === 'copied' ? t('copied') : t('copyFailed')}
        </span>
      ) : null}
    </span>
  );
}

export default CopyReference;
