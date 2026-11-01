'use client';

import * as React from 'react';
import { Info, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Where "Join in Teams" goes on a meeting — a PLACEHOLDER SLOT, and labelled
 * as one: "Teams connection: demo". The client asked for it on the calendar
 * and on legal matters (October 2026); there is no Teams integration behind it.
 *
 * ===========================================================================
 * WHAT IT DOES AND DOES NOT DO
 * ===========================================================================
 * Nothing is fetched, no link is opened, and no Microsoft service is called.
 * Pressing the button does not pretend to join: it says, beside itself, that
 * Teams is not connected in this demo and that the meeting link will appear
 * here once the firm connects it. A real button with an honest answer, rather
 * than a disabled one that leaves the reader to guess why.
 *
 * ===========================================================================
 * NO TEAMS LOGO
 * ===========================================================================
 * The icon is a plain video glyph, not Microsoft's mark: reproducing a
 * third-party trademark in a client demo is not this product's call to make,
 * and its purple is not one of the tenant's tokens (design.md §10.2). The word
 * "Teams" names the service; the glyph says what kind of control it is.
 *
 * Neutral chrome only: gray, the tenant's `secondary` button, a neutral badge.
 * It is the firm's meeting, not an AI surface, so no legal-navy; and it is not
 * the page's main action, so not the `primary` fill.
 */
export function TeamsJoinSlot({
  meetingTitle,
  className,
}: {
  /** For the button's accessible name, which says which meeting. */
  meetingTitle: string;
  className?: string;
}) {
  const t = useTranslations('meetings.teams');
  const [explained, setExplained] = React.useState(false);

  return (
    <div
      data-slot="teams-join"
      className={cn('rounded-card border border-dashed border-gray-300 bg-gray-50 p-3', className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Video aria-hidden size={15} />}
          aria-label={t('label', { title: meetingTitle })}
          aria-expanded={explained}
          onClick={() => setExplained(true)}
        >
          {t('join')}
        </Button>
        <Badge tone="neutral" icon={<Info aria-hidden size={12} />}>
          {t('demo')}
        </Badge>
      </div>
      {/* Polite and always present, so the answer is announced when it appears. */}
      <p aria-live="polite" className={explained ? 'mt-2 text-caption text-gray-600' : 'sr-only'}>
        {explained ? t('note') : ''}
      </p>
    </div>
  );
}

export default TeamsJoinSlot;
