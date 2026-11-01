'use client';

import * as React from 'react';
import { CalendarPlus, CreditCard, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import type { ConsultationAvailability } from '@/lib/mock-api';
import { BookCallModal } from '../BookCallModal';
import { UploadDocumentModal } from '../UploadDocumentModal';

/**
 * The three standing actions a client comes to the portal to perform.
 *
 * NOT BUTTONS IN A FORM
 * ---------------------------------------------------------------------------
 * There is no <form> on this screen, deliberately. The Client Gateway shipped a
 * form with no `onSubmit`, which meant submitting it performed a full-page GET
 * and put the typed email and password in the query string. A row of actions
 * has no reason to be a form at all, so it is not one, and there is nothing
 * here that can serialise anything into the URL.
 *
 * "Pay a bill" is a <Link> because it has a real destination. "Upload a
 * document" and "Book a call" open the two modals Batch 3 built. All three now
 * lead somewhere; nothing in this strip is a button with nothing behind it.
 *
 * This became a Client Component when the upload modal landed: the pills need
 * their own open state. It holds no data of its own beyond the availability it
 * is handed, all of which is plain strings and numbers.
 *
 * WHY AVAILABILITY IS A PROP AND ENGAGEMENTS ARE NOT
 * ---------------------------------------------------------------------------
 * The engagement list went into the portal context because the upload modal
 * opens from four unrelated screens, and threading one list through four of
 * them is how one ends up stale. Book-a-call opens from here alone, so its data
 * is fetched by the page that renders this strip and passed down. Putting it in
 * the layout would make every route in the portal pay for a fetch that one modal
 * on one screen uses. When a second trigger appears — the engagement detail is
 * the obvious candidate — it moves to the context the way engagements did.
 */

// design.md §4: secondary styling — gray-50 fill, gray-200 border, gray-700
// text. Pill-shaped here rather than the Button component's 8px radius because
// this is a filter-style action strip, not the screen's primary action. There
// is no syn-red button on this screen: nothing on a dashboard is THE one main
// action, and §4 spends red once per view or not at all.
const ACTION_CLASSES =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-pill border border-gray-200 bg-gray-50 ' +
  'px-4 text-body text-gray-700 transition-colors hover:bg-gray-100 hover:border-gray-300 ' +
  'max-tablet:min-h-11';

export function QuickActions({ availability }: { availability: ConsultationAvailability }) {
  const t = useTranslations('dashboard.quickActions');
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);

  return (
    <nav aria-label={t('label')} className="flex flex-wrap items-center gap-2">
      <Link href="/invoices" className={ACTION_CLASSES}>
        <CreditCard aria-hidden size={16} strokeWidth={1.8} className="text-gray-500" />
        {t('payBill')}
      </Link>

      <button type="button" className={ACTION_CLASSES} onClick={() => setUploadOpen(true)}>
        <Upload aria-hidden size={16} strokeWidth={1.8} className="text-gray-500" />
        {t('uploadDocument')}
      </button>
      {/* No engagement preselected — opened from the dashboard, the client has
          not said which file it belongs to yet. */}
      <UploadDocumentModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <button type="button" className={ACTION_CLASSES} onClick={() => setCallOpen(true)}>
        <CalendarPlus aria-hidden size={16} strokeWidth={1.8} className="text-gray-500" />
        {t('bookCall')}
      </button>
      {/* No engagement preselected — opened from the dashboard, the client has
          not said what the call is about yet. */}
      <BookCallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        availability={availability}
      />
    </nav>
  );
}

export default QuickActions;
