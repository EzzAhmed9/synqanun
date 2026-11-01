'use client';

import * as React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import { WorkspaceHome } from './WorkspaceHome';

/**
 * What a client sees when something in this locale's tree throws.
 *
 * WHY THIS FILE DID NOT EXIST AND SHOULD HAVE
 * ---------------------------------------------------------------------------
 * There was no error boundary anywhere in the app. An unhandled exception fell
 * through to Next's built-in page: unstyled, untranslated, outside the portal,
 * and in development a stack trace. For an Arabic-speaking client that is a
 * screen in the wrong language with no way back; in production it is a blank
 * wall on a portal holding their legal files.
 *
 * WHAT IT DELIBERATELY DOES NOT SAY
 * ---------------------------------------------------------------------------
 * Not the message, not the stack, not a support code. `error.message` from a
 * server component can carry anything the throwing code put in it — a query
 * fragment, a path, an id — and this screen is the one place in the product
 * most likely to be screenshotted and emailed onward. Next already redacts
 * server messages in production for exactly this reason; showing the digest
 * instead would be a reference number with nothing behind it, since there is no
 * logging service to look it up in.
 *
 * MOCK: `digest` is what a real deployment correlates with its logs, so the
 * production version reports it to an error tracker HERE and shows the client a
 * short reference tied to that report. Until something is listening, a code on
 * screen is theatre. Track B owns the tracker (BUILD_PLAN.md §6); the reporting
 * call is Track A.5.
 *
 * `reset()` re-renders the segment, which is genuinely worth offering: most of
 * what can throw in this prototype is a transient fetch, and retrying is
 * cheaper than a full reload.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  React.useEffect(() => {
    // MOCK: the real version reports to the error tracker. Logging to the
    // console is what a prototype can honestly do — it keeps the failure
    // visible to whoever is running the demo without putting anything on
    // screen for a client to misread.
    console.error('[SynQanun] Unhandled error', error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-6 py-16">
      {/* Centred — design.md §5 allows it for empty states and modals, and this
          is the empty-state shape. */}
      <Card padding="lg" className="w-full max-w-[460px] text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill border border-error/25 bg-error/10 text-error">
          <AlertTriangle aria-hidden size={22} strokeWidth={1.8} />
        </span>

        <h1 className="font-display text-heading text-gray-700">{t('unexpected.title')}</h1>
        <p className="mt-2 text-body text-gray-600">{t('unexpected.body')}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {/* The one syn-red action: retrying is the human's own move, and it
              is the one most likely to work. design.md §2. */}
          <Button variant="primary" onClick={reset} icon={<RotateCw aria-hidden size={15} />}>
            {t('unexpected.retry')}
          </Button>

          {/* Where the reader was, not where the portal is. This used to be a
              hard link to /dashboard, which sent a partner out of the firm's
              workspace and into a client's — see WorkspaceHome. */}
          <WorkspaceHome />
        </div>
      </Card>
    </main>
  );
}
