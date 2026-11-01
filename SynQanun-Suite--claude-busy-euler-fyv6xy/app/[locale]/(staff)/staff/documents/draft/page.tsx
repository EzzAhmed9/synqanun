import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { DocumentDraftCanvas } from './DocumentDraftCanvas';

export const dynamic = 'force-dynamic';

export default async function DocumentDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ matter?: string; template?: string; auto_open?: string }>;
}) {
  const { locale } = await params;
  const { matter, template, auto_open } = await searchParams;
  setRequestLocale(locale);

  return (
    <DocumentDraftCanvas
      initialMatter={matter || 'MAT-2201'}
      initialTemplate={template || 'pleading'}
      autoOpenWord={auto_open === 'word'}
      locale={locale}
    />
  );
}
