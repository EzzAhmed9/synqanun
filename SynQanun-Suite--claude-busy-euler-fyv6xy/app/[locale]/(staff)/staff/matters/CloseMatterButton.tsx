'use client';

import * as React from 'react';
import { Archive } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';

export function CloseMatterButton({
  reference,
  onClosed,
  size = 'sm',
}: {
  reference: string;
  onClosed?: (reference: string) => void;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const close = () => {
    setError(null);
    startTransition(async () => {
      const { closeMatter } = await import('./close-matter-action');
      const result = await closeMatter(reference);
      if (result.ok) {
        onClosed?.(result.reference);
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
        onClick={close}
        icon={<Archive aria-hidden size={14} />}
        className="whitespace-nowrap text-gray-700 hover:text-error hover:border-error/40"
      >
        {pending ? 'جاري الأرشفة...' : 'أرشفة / إغلاق المسألة'}
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-error">
          تعذر أرشفة المسألة
        </span>
      ) : null}
    </span>
  );
}
