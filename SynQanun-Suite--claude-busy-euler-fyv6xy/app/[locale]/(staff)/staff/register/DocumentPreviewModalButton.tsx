'use client';

import * as React from 'react';
import { Eye, Loader2, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

interface DocumentPreviewModalButtonProps {
  documentId: string;
  documentName: string;
  matterRef?: string;
  timeFormatted?: string | null;
  locale?: string;
}

export function DocumentPreviewModalButton({
  documentId,
  documentName,
  matterRef,
  timeFormatted,
  locale = 'ar',
}: DocumentPreviewModalButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{
    id: string;
    name: string;
    title: string;
    paragraphs: string[];
    time_formatted?: string;
    timeFormatted?: string;
    updated_at?: string;
  } | null>(null);

  const fetchPreview = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/docs/${documentId}/preview`);
      if (!res.ok) throw new Error('تعذر تحميل معاينة المستند');
      const json = await res.json();
      setData(json);
      if (!silent) setOpen(true);
    } catch (err: any) {
      setError(err.message || 'خطأ في جلب المستند');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auto-sync whenever the user switches back from Word Online tab to this tab
  React.useEffect(() => {
    if (!open) return;
    const handleFocus = () => {
      fetchPreview(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [open, documentId]);

  return (
    <>
      <button
        type="button"
        onClick={() => fetchPreview(false)}
        disabled={loading}
        title="معاينة محتوى وتوقيعات المستند داخل الموقع مباشرة (مع مزامنة فورية من Word Online)"
        className="inline-flex h-8 items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-blue-700 transition-colors cursor-pointer"
      >
        {loading ? <Loader2 size={13} className="animate-spin text-blue-600" /> : <Eye size={13} className="text-gray-600" />}
        <span>معاينة في الموقع</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={data?.title || documentName}
        description={`الملف: ${documentName} ${(data?.timeFormatted || data?.time_formatted || timeFormatted) ? `• 🕒 آخر حفظ ومزامنة: الساعة ${data?.timeFormatted || data?.time_formatted || timeFormatted}` : ''}`}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/${locale}/staff/documents/draft?matter=${matterRef || 'MAT-2201'}&doc_id=${documentId}&auto_open=word`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0078D4] px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                <span>✏️ متابعة التعديل في Word Online</span>
                <ExternalLink size={13} />
              </a>

              <button
                type="button"
                onClick={() => fetchPreview(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                title="سحب آخر تعديل قمت به في Word Online الآن"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRefreshing ? 'جارٍ المزامنة من Word...' : '🔄 تحديث من Word'}</span>
              </button>

              <a
                href={`/api/docs/${documentId}/download`}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download size={13} />
                <span>تحميل .docx</span>
              </a>
            </div>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
          </div>
        }
      >
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4" dir="rtl">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {isRefreshing && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 animate-pulse">
              <Loader2 size={13} className="animate-spin" />
              <span>جارٍ مزامنة آخر التعديلات المكتوبة في Microsoft Word Online...</span>
            </div>
          )}

          {data && data.paragraphs && data.paragraphs.length > 0 ? (
            <div className="space-y-3 font-sans leading-relaxed text-gray-800 text-sm bg-white p-6 rounded-lg border border-gray-200 shadow-inner">
              {data.paragraphs.map((p, idx) => {
                const isSignature = p.includes('التوقيع') || p.includes('وكيل الموكل') || p.includes('الأستاذ /');
                const isTitle = idx === 0 || p.startsWith('مذكرة') || p.startsWith('عقد') || p.startsWith('أولاً') || p.startsWith('ثانياً');
                
                return (
                  <p
                    key={idx}
                    className={`whitespace-pre-line text-right ${
                      isSignature
                        ? 'font-bold text-gray-900 border-r-4 border-legal-navy pr-3 my-4 bg-gray-50/70 p-2 rounded'
                        : isTitle
                        ? 'font-bold text-legal-navy text-base pt-2'
                        : 'text-gray-700'
                    }`}
                  >
                    {p}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-xs">
              لا توجد فقرات للعرض
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
