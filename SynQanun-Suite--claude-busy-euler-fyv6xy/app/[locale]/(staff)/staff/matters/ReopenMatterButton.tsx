'use client';

import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Reopen one closed legal matter. Drawn only for a partner — the register and
 * the file decide that with `canReopenMatter`, and the Server Action checks
 * again.
 *
 * What happened is announced through `onReopened` rather than shown here,
 * because on the Archive the row this button sits in leaves the list the
 * moment the register refreshes: a message inside it would vanish with it.
 * Errors stay here, beside the control that failed.
 */
export function ReopenMatterButton({
  reference,
  onReopened,
  size = 'sm',
}: {
  reference: string;
  onReopened?: (reference: string) => void;
  size?: 'sm' | 'md';
}) {
  const t = useTranslations('staffMatters.reopen');
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const reopen = () => {
    setError(null);
    startTransition(async () => {
      const { reopenMatter } = await import('./reopen-matter-action');
      const result = await reopenMatter(reference);
      if (result.ok) {
        onReopened?.(result.reference);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size={size}
        loading={pending}
        onClick={reopen}
        icon={<RotateCcw aria-hidden size={14} />}
        // The visible word is short; the name says which file.
        aria-label={t('label', { reference })}
        className="whitespace-nowrap"
      >
        {pending ? t('pending') : t('action')}
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-error">
          {t(`errors.${error}`)}
        </span>
      ) : null}
    </span>
  );
}

export default ReopenMatterButton;
