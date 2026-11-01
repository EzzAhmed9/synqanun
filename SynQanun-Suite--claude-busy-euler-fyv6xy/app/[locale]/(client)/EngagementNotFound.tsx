import { FileQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';

/**
 * Shown when an engagement reference does not resolve.
 *
 * A real 404 status — the URL names something that is not there — but rendered
 * INSIDE the client portal's layout rather than as the bare application 404.
 * Next.js nests `not-found.tsx` within the layouts above it, so the sidebar and
 * footer stay, and a client who followed a stale link can navigate on instead
 * of hitting a dead end and reaching for the back button.
 *
 * Centred, which design.md §5 permits precisely here: "centering is reserved
 * for empty states and modals only".
 *
 * MOCK: in Track A this only fires for a reference no fixture holds. Once
 * engagements are scoped to the signed-in client, it is also what a client sees
 * when they ask for one that exists but is not theirs — deliberately the same
 * response, since a distinct "you are not allowed" would confirm the engagement
 * exists. Track A.5.
 */
export function EngagementNotFound({
  namespace,
  backHref,
}: {
  /** 'matters.detail' or 'projects.detail'. */
  namespace: string;
  backHref: string;
}) {
  const t = useTranslations(namespace);

  return (
    <main className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-6 py-16">
      <Card padding="lg" className="w-full max-w-[420px] text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-gray-500">
          <FileQuestion aria-hidden size={22} strokeWidth={1.8} />
        </span>

        <h1 className="font-display text-heading text-gray-700">{t('notFound')}</h1>
        <p className="mt-2 text-body text-gray-600">{t('notFoundBody')}</p>

        <div className="mt-6">
          <Link href={backHref}>
            <Button variant="secondary">{t('back')}</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

export default EngagementNotFound;
