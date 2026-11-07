'use client';

import * as React from 'react';
import {
  FileText,
  FileSpreadsheet,
  X,
  Maximize2,
  Minimize2,
  Server,
  ShieldCheck,
  Download,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { getOnlyOfficeConfigAction } from '@/app/[locale]/(staff)/staff/register/generate-document-actions';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (placeholderId: string, config: any) => any;
    };
  }
}

interface OnlyOfficeEditorModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName?: string;
  documentKind?: 'docx' | 'xlsx' | string;
  onSaved?: () => void;
}

export function OnlyOfficeEditorModal({
  open,
  onClose,
  documentId,
  documentName,
  documentKind = 'docx',
  onSaved,
}: OnlyOfficeEditorModalProps) {
  const [loading, setLoading] = React.useState(true);
  const [serverUrl, setServerUrl] = React.useState('http://localhost:8080');
  const [docDetails, setDocDetails] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [serverOffline, setServerOffline] = React.useState(false);
  const [copiedDocker, setCopiedDocker] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // References to preserve state across renders without touching React virtual DOM
  const editorInstanceRef = React.useRef<any>(null);
  const mountWrapperRef = React.useRef<HTMLDivElement>(null);
  const initializedDocIdRef = React.useRef<string | null>(null);
  const isInitializingRef = React.useRef<boolean>(false);
  const onSavedRef = React.useRef(onSaved);

  // Keep onSavedRef up to date without triggering re-render/re-init
  React.useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const isExcel = (documentKind || docDetails?.kind) === 'xlsx';

  // Load configuration and initialize editor safely
  const initEditor = React.useCallback(async () => {
    if (!documentId || isInitializingRef.current) return;
    isInitializingRef.current = true;
    setLoading(true);
    setError(null);
    setServerOffline(false);

    try {
      // 1. Fetch document & editor config from backend
      const res = await getOnlyOfficeConfigAction(documentId);
      if (!res.ok || !res.config) {
        throw new Error(res.error || 'تعذر جلب إعدادات محرر OnlyOffice للمستند.');
      }

      const activeServerUrl = (res.serverUrl || 'http://localhost:8080').replace(/\/$/, '');
      setServerUrl(activeServerUrl);
      setDocDetails(res.document);

      // 2. Load OnlyOffice Docs API Script
      const scriptUrl = `${activeServerUrl}/web-apps/apps/api/documents/api.js`;

      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (!existingScript) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptUrl;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => {
            setServerOffline(true);
            reject(new Error(`تعذر الاتصال بخادم OnlyOffice على الرابط: ${activeServerUrl}`));
          };
          document.head.appendChild(script);
        });
      }

      // 3. Prepare DOM Container safely
      if (window.DocsAPI && window.DocsAPI.DocEditor) {
        // Destroy previous instance if any
        if (editorInstanceRef.current && typeof editorInstanceRef.current.destroyEditor === 'function') {
          try {
            editorInstanceRef.current.destroyEditor();
          } catch {}
          editorInstanceRef.current = null;
        }

        // Generate unique inner ID and inject completely unmanaged DOM node
        const placeholderId = `onlyoffice_frame_${Math.random().toString(36).substring(2, 9)}`;
        if (mountWrapperRef.current) {
          mountWrapperRef.current.innerHTML = `<div id="${placeholderId}" style="width:100%;height:100%;"></div>`;
        }

        const editorConfig = {
          ...res.config,
          events: {
            onAppReady: () => {
              setLoading(false);
            },
            onDocumentStateChange: (event: any) => {
              // In OnlyOffice API: event.data is true while typing (dirty), false when autosaved (clean)
              if (event?.data === false) {
                try {
                  onSavedRef.current?.();
                } catch (e) {
                  console.warn('onSaved notice:', e);
                }
              }
            },
            onError: (event: any) => {
              console.error('OnlyOffice editor error event:', event);
              if (event?.data?.errorDescription) {
                setError(event.data.errorDescription);
              }
            },
          },
        };

        // Instantiate DocEditor
        setTimeout(() => {
          try {
            editorInstanceRef.current = new window.DocsAPI!.DocEditor(placeholderId, editorConfig);
            initializedDocIdRef.current = documentId;
            setLoading(false);
          } catch (initErr: any) {
            console.error('Failed to instantiate DocEditor:', initErr);
            setError(initErr.message || 'حدث خطأ أثناء تشغيل محرر المستندات.');
            setLoading(false);
          } finally {
            isInitializingRef.current = false;
          }
        }, 100);
      } else {
        setServerOffline(true);
        setLoading(false);
        isInitializingRef.current = false;
      }
    } catch (err: any) {
      console.warn('OnlyOffice init notice:', err);
      setServerOffline(true);
      setError(err.message || 'خادم OnlyOffice غير متاح حالياً.');
      setLoading(false);
      isInitializingRef.current = false;
    }
  }, [documentId]);

  React.useEffect(() => {
    if (open) {
      // Only initialize if not already mounted for this documentId
      if (initializedDocIdRef.current !== documentId) {
        initEditor();
      }
    } else {
      // Cleanup editor on close
      if (editorInstanceRef.current && typeof editorInstanceRef.current.destroyEditor === 'function') {
        try {
          editorInstanceRef.current.destroyEditor();
        } catch {}
        editorInstanceRef.current = null;
      }
      if (mountWrapperRef.current) {
        mountWrapperRef.current.innerHTML = '';
      }
      initializedDocIdRef.current = null;
      isInitializingRef.current = false;
      setLoading(true);
    }
  }, [open, documentId, initEditor]);

  if (!open) return null;

  const dockerCommand = 'docker run -i -t -d -p 8080:80 --restart=always onlyoffice/documentserver';

  const copyCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2500);
  };

  const downloadDirectCopy = () => {
    const a = document.createElement('a');
    a.href = `/api/docs/${documentId}/download`;
    a.download = documentName || docDetails?.name || 'document.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-xs transition-all animate-in fade-in"
      dir="rtl"
    >
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isExcel ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isExcel ? <FileSpreadsheet size={20} /> : <FileText size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">
              {documentName || docDetails?.name || 'محرر المستندات — OnlyOffice Docs'}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <ShieldCheck size={13} className="text-emerald-600" />
                استضافة ذاتية On-Premises (بياناتك لا تخرج من الخادم)
              </span>
              <span>•</span>
              <span className="text-gray-400">امتداد {isExcel ? '.xlsx' : '.docx'}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {serverOffline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
              <AlertTriangle size={13} className="text-amber-600" />
              الخادم الداخلي بحاجة لتشغيل
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              متصل بخادم OnlyOffice
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={downloadDirectCopy}
            icon={<Download size={15} />}
            className="text-gray-600 hover:text-gray-900"
          >
            تنزيل نسخة
          </Button>

          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title={isFullScreen ? 'تصغير' : 'ملء الشاشة'}
          >
            {isFullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700"
            title="إغلاق"
          >
            <X size={19} />
          </button>
        </div>
      </header>

      {/* Main Canvas Area - DOM elements remain constant, no dynamic insertBefore */}
      <main className="relative flex-1 overflow-hidden bg-gray-100">
        {/* Isolated OnlyOffice Frame Container */}
        <div
          ref={mountWrapperRef}
          className="h-full w-full"
          style={{ visibility: serverOffline ? 'hidden' : 'visible' }}
        />

        {/* Loading Spinner Overlay - Controlled via CSS, never unmounted */}
        <div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/95 transition-opacity duration-200 ${
            loading && !serverOffline ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Loader2 size={36} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-700">جاري تحميل وتجهيز محرر OnlyOffice الداخلي...</p>
          <p className="text-xs text-gray-400">يتم تحميل أدوات التنسيق ودعم اللغة العربية RTL</p>
        </div>

        {/* Server Offline / Configuration Guidance Fallback */}
        <div
          className={`absolute inset-0 z-30 flex h-full w-full items-center justify-center p-6 bg-gray-50 transition-opacity duration-200 ${
            serverOffline ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
          }`}
        >
          <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-7 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Server size={26} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-gray-900">
                    خادم محرر المستندات الداخلي (OnlyOffice Document Server)
                  </h4>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    مجاني 100% (Community Edition)
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  منصة <strong>OnlyOffice Docs</strong> تتيح لك فتح وتعديل مذكرات الدفاع والعقود وجداول Excel مباشرة من داخل المتصفح،
                  مع الحفاظ على <strong>الخصوصية التامة 100%</strong> لأن المستندات لا تخرج إلى أي سيرفرات سحابية خارجية (Microsoft أو Google).
                </p>

                <div className="mt-4 rounded-lg bg-amber-50/80 border border-amber-200 p-3.5 text-xs text-amber-900">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-700" />
                    الخادم غير متصل حالياً على الرابط: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">{serverUrl}</code>
                  </p>
                  <p className="mt-1 text-amber-800">
                    لتشغيل خادم OnlyOffice محلياً على جهازك أو خادم المكتب الداخلي، انسخ وشغّل الأمر التالي عبر Docker:
                  </p>
                </div>

                {/* Docker Command Box */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-900 p-3 text-xs text-emerald-400 font-mono shadow-inner" dir="ltr">
                  <span className="truncate select-all">{dockerCommand}</span>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="ml-3 flex shrink-0 items-center gap-1 rounded bg-gray-800 px-2.5 py-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-white"
                    title="نسخ الأمر"
                  >
                    {copiedDocker ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Actions inside guidance */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={initEditor}
                      icon={<RefreshCw size={14} />}
                    >
                      إعادة فحص الاتصال
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={downloadDirectCopy}
                      icon={<Download size={14} />}
                    >
                      تنزيل نسخة Word الآن
                    </Button>
                  </div>

                  <Button variant="secondary" size="sm" onClick={onClose}>
                    إغلاق
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
