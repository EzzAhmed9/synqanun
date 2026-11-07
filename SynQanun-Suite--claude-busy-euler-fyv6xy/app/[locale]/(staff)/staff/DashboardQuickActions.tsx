'use client';

import * as React from 'react';
import {
  FilePlus2,
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Scale,
  FileSignature,
  FileCheck,
  Receipt,
  Clock,
  Briefcase,
  Loader2,
  ExternalLink,
  Upload,
  ArrowRight,
  Server,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Input, Modal } from '@/components/ui';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { OnlyOfficeEditorModal } from '@/components/editor/OnlyOfficeEditorModal';
import {
  generateWordAction,
  exportExcelAction,
  openWordOnlineAction,
  uploadUpdatedDocxAction,
} from './register/generate-document-actions';
import { getActiveMattersForTimer, type ActiveMatterOption } from './time/get-matters-action';

export function DashboardQuickActions() {
  const t = useTranslations('staffDashboard.actions');
  const locale = useLocale();
  const router = useRouter();

  // Modals state
  const [draftOpen, setDraftOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [matters, setMatters] = React.useState<ActiveMatterOption[]>([]);
  const [loadingMatters, setLoadingMatters] = React.useState(false);

  // Transitions & Loaders
  const [isOpeningWordOnline, setIsOpeningWordOnline] = React.useState(false);
  const [isOpeningOnlyOffice, setIsOpeningOnlyOffice] = React.useState(false);
  const [isUploadingUpdated, setIsUploadingUpdated] = React.useState(false);
  const [pendingReport, startReportTransition] = React.useTransition();

  // OnlyOffice In-Browser Editor State
  const [onlyOfficeOpen, setOnlyOfficeOpen] = React.useState(false);
  const [onlyOfficeDoc, setOnlyOfficeDoc] = React.useState<{ id: string; name: string; kind?: string } | null>(null);

  // Errors & Success
  const [draftError, setDraftError] = React.useState<string | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = React.useState<any | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = React.useState<string | null>(null);

  // Active Word Session inside Draft Modal
  const [wordOnlineSession, setWordOnlineSession] = React.useState<{
    docId: string;
    docName: string;
    webUrl: string;
    matterRef: string;
    downloadUrl: string;
  } | null>(null);
  const [syncedPreview, setSyncedPreview] = React.useState<string | null>(null);

  // Draft form state
  const [selectedMatter, setSelectedMatter] = React.useState('MAT-2201');
  const [templateType, setTemplateType] = React.useState<'pleading' | 'contract' | 'assignment'>('pleading');
  const [draftTitle, setDraftTitle] = React.useState('مذكرة دفاع في نزاع القضية');
  const [shareDraft, setShareDraft] = React.useState(true);

  // Report form state
  const [reportMatter, setReportMatter] = React.useState('MAT-2201');
  const [exportType, setExportType] = React.useState<'client_statement' | 'invoices_ledger' | 'timesheet'>('client_statement');
  const [shareReport, setShareReport] = React.useState(true);

  // Load matters on mount
  React.useEffect(() => {
    let mounted = true;
    setLoadingMatters(true);
    getActiveMattersForTimer().then((opts) => {
      if (mounted) {
        setMatters(opts);
        if (opts.length > 0 && !selectedMatter) {
          setSelectedMatter(opts[0].value);
          setReportMatter(opts[0].value);
        }
        setLoadingMatters(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Update title when matter or template changes
  React.useEffect(() => {
    const current = matters.find((m) => m.value === selectedMatter);
    const mTitle = current?.label.ar || selectedMatter;
    if (templateType === 'pleading') {
      setDraftTitle(`مذكرة دفاع في ${mTitle}`);
    } else if (templateType === 'contract') {
      setDraftTitle(`عقد خدمات وأتعاب قانونية - ${selectedMatter}`);
    } else {
      setDraftTitle(`تكليف قانوني رسمي وتفويض - ${selectedMatter}`);
    }
  }, [selectedMatter, templateType, matters]);

  // Helper to persist Word doc in PostgreSQL & Disk
  const generateAndSaveDocument = async () => {
    return await generateWordAction({
      matter_reference: selectedMatter,
      template_type: templateType,
      title: draftTitle,
      is_firm_only: !shareDraft,
    });
  };

  // 1. Action: Generate doc, Download copy, & Open in Microsoft Word Tab
  const handleOpenWordOnlineFromModal = async () => {
    setDraftError(null);
    setSyncSuccessMsg(null);
    setSyncedPreview(null);
    setIsOpeningWordOnline(true);

    try {
      // Step 1: Save document in PostgreSQL & Disk
      const saveRes = await generateAndSaveDocument();
      if (!saveRes.ok || !saveRes.data) {
        throw new Error(saveRes.error || 'تعذر إنشاء المستند في النظام.');
      }

      const docId = saveRes.data.id;
      const docName = saveRes.data.name;
      const docDownloadUrl = `/api/docs/${docId}/download`;

      // Step 2: Trigger browser download of the copy (Download a copy)
      try {
        const a = document.createElement('a');
        a.href = docDownloadUrl;
        a.download = docName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (dlErr) {
        console.warn('Auto download error, user can click manual download:', dlErr);
      }

      // Step 3: Open Microsoft Word in a new browser tab
      let targetWordUrl = 'https://word.new';
      try {
        const onlineRes = await openWordOnlineAction(docId);
        if (onlineRes.ok && onlineRes.data?.webUrl) {
          targetWordUrl = onlineRes.data.webUrl;
        }
      } catch {
        // Fallback to word.new
      }
      window.open(targetWordUrl, '_blank', 'noopener,noreferrer');

      // Step 4: Transition modal to active editing / upload state
      setWordOnlineSession({
        docId,
        docName,
        webUrl: targetWordUrl,
        matterRef: selectedMatter,
        downloadUrl: docDownloadUrl,
      });

      router.refresh();
    } catch (err: any) {
      setDraftError(err.message || 'حدث خطأ أثناء فتح Word.');
    } finally {
      setIsOpeningWordOnline(false);
    }
  };

  // 1.b. Action: Generate Word Document & Launch in OnlyOffice On-Premises Editor
  const handleOpenOnlyOfficeDraft = async () => {
    setIsOpeningOnlyOffice(true);
    setDraftError(null);
    try {
      const genRes = await generateWordAction({
        matter_reference: selectedMatter,
        template_type: templateType,
        title: draftTitle,
        is_firm_only: !shareDraft,
      });

      if (!genRes.ok || !genRes.data) {
        throw new Error(genRes.error || 'تعذر توليد المستند.');
      }

      setOnlyOfficeDoc({
        id: genRes.data.id,
        name: genRes.data.name,
        kind: 'docx',
      });
      setDraftOpen(false);
      setOnlyOfficeOpen(true);
      router.refresh();
    } catch (err: any) {
      setDraftError(err.message || 'حدث خطأ أثناء فتح OnlyOffice.');
    } finally {
      setIsOpeningOnlyOffice(false);
    }
  };

  // 2. Action: Upload updated .docx to save into the case
  const handleUploadUpdatedDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wordOnlineSession?.docId) return;

    setIsUploadingUpdated(true);
    setDraftError(null);
    setSyncSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadUpdatedDocxAction(wordOnlineSession.docId, formData);
      if (res.ok && res.data) {
        setSyncSuccessMsg('تم رفع وحفظ النسخة المعدلة في الموقع وقاعدة بيانات القضية بنجاح! ✅');
        if (res.data.preview_text) {
          setSyncedPreview(res.data.preview_text);
        }
        router.refresh();
      } else {
        setDraftError(res.error || 'تعذر رفع الملف المحدث.');
      }
    } catch (err: any) {
      setDraftError(err.message || 'حدث خطأ أثناء رفع المستند.');
    } finally {
      setIsUploadingUpdated(false);
      e.target.value = '';
    }
  };

  // 3. Action: Excel Report Export
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);

    startReportTransition(async () => {
      const res = await exportExcelAction({
        export_type: exportType,
        matter_reference: reportMatter,
        is_firm_only: !shareReport,
      });

      if (res.ok && res.data) {
        setReportSuccess(res.data);
        const downloadUrl = `/api/docs/${res.data.id}/download`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        router.refresh();
      } else {
        setReportError(res.error || 'حدث خطأ أثناء تصدير التقرير.');
      }
    });
  };

  return (
    <>
      {/* 1. Executive Navigation Bar: 2 Main Buttons */}
      <nav aria-label={t('label')} className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          icon={<FilePlus2 aria-hidden size={15} />}
          onClick={() => {
            setDraftError(null);
            setSyncSuccessMsg(null);
            setSyncedPreview(null);
            setWordOnlineSession(null);
            setDraftOpen(true);
          }}
        >
          {t('draft')}
        </Button>

        <Button
          variant="secondary"
          className="border-legal-navy/25 bg-legal-navy/5 text-legal-navy hover:bg-legal-navy/10"
          icon={<FeatherMark aria-hidden height={16} />}
          onClick={() => {
            setReportSuccess(null);
            setReportError(null);
            setReportOpen(true);
          }}
        >
          {t('report')}
        </Button>
      </nav>

      {/* 2. Modal: صياغة مستند Word */}
      <Modal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        title={
          wordOnlineSession
            ? 'المستند مفتوح للتحرير في Microsoft Word'
            : 'صياغة مستند جديد في Microsoft Word'
        }
        description={
          wordOnlineSession
            ? 'تم فتح نافذة Word في تبويب جديد وتنزيل نسخة على جهازك. بعد الانتهاء من التعديل، ارفع النسخة المعدلة هنا لحفظها نهائياً.'
            : 'اختر القضية واضغط لفتح Word في تبويب جديد وتنزيل نسخة من المستند للبدء في الصياغة.'
        }
      >
        {/* State A: Word is currently open */}
        {wordOnlineSession ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            {/* Status Header */}
            <div className="rounded-xl border border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0078D4] text-white shadow-xs">
                  <FileText size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="font-bold text-sm text-gray-900">
                      تم فتح Microsoft Word في التبويب الجديد 🌐
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    الملف: <span className="font-mono font-bold text-blue-900">{wordOnlineSession.docName}</span> • القضية: <span className="font-bold text-gray-800">{wordOnlineSession.matterRef}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Success / Error alerts */}
            {syncSuccessMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}

            {draftError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{draftError}</span>
              </div>
            )}

            {/* Save & Upload Action Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-800">
                  💡 خطوات التعديل والحفظ في القضية:
                </p>
                <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside pe-2">
                  <li>قم بكتابة وتنسيق مذكرتك في نافذة Microsoft Word المفتوحة.</li>
                  <li>من قائمة Word، اضغط <span className="font-semibold text-gray-800">File &gt; Save As &gt; Download a Copy</span> (تنزيل نسخة).</li>
                  <li>ارفع النسخة المعدلة هنا لحفظها وتحديثها فوراً في ملف القضية وقاعدة البيانات.</li>
                </ol>
              </div>

              {/* Upload Button */}
              <label className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer">
                {isUploadingUpdated ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري رفع وحفظ النسخة المعدلة...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>📤 رفع النسخة المعدلة وحفظها في الموقع</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleUploadUpdatedDocx}
                  disabled={isUploadingUpdated}
                />
              </label>

              {/* Re-download button */}
              <a
                href={wordOnlineSession.downloadUrl}
                download={wordOnlineSession.docName}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
              >
                <Download size={14} />
                تنزيل نسخة من المستند مرة أخرى (Download a copy)
              </a>

              {/* Preview of saved text if available */}
              {syncedPreview && (
                <div className="rounded-lg border border-emerald-300 bg-white p-3 text-right space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      آخر نص تم حفظه من المستند:
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">محفوظ بنجاح ✅</span>
                  </div>
                  <div className="rounded bg-emerald-50/60 p-2 font-sans font-medium text-gray-900 text-xs whitespace-pre-wrap border border-emerald-100">
                    {syncedPreview}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <a
                  href={wordOnlineSession.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0078D4] hover:underline"
                >
                  التبديل إلى نافذة Microsoft Word
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setOnlyOfficeDoc({
                      id: wordOnlineSession.docId,
                      name: wordOnlineSession.docName,
                      kind: 'docx',
                    });
                    setDraftOpen(false);
                    setOnlyOfficeOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  <Server size={13} />
                  <span>التبديل إلى محرر OnlyOffice الداخلي</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/staff/matters/${wordOnlineSession.matterRef}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  عرض في صفحة القضية
                  <ArrowRight size={13} className="rotate-180" />
                </Link>
                <Button variant="secondary" onClick={() => setDraftOpen(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* State B: Clean, Simple Form to Pick Matter & Launch Word */
          <div className="flex flex-col gap-4 p-6 pt-0">
            {draftError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <AlertCircle size={18} className="shrink-0" />
                <span>{draftError}</span>
              </div>
            )}

            {/* Matter selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">المسألة القانونية / القضية:</label>
              <select
                value={selectedMatter}
                onChange={(e) => setSelectedMatter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm focus:border-action focus:outline-none"
              >
                {matters.length > 0 ? (
                  matters.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.value} — {m.label.ar}
                    </option>
                  ))
                ) : (
                  <option value="MAT-2201">MAT-2201 — نزاع عقد التوريد التجاري</option>
                )}
              </select>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">نوع النموذج القانوني:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('pleading')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-center transition-all cursor-pointer ${
                    templateType === 'pleading'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Scale size={18} className={templateType === 'pleading' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">مذكرة دفاع ودفوع</span>
                  <span className="text-[10px] text-gray-500">للمحاكم واللجان</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('contract')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-center transition-all cursor-pointer ${
                    templateType === 'contract'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileSignature size={18} className={templateType === 'contract' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">عقد اتفاق وأتعاب</span>
                  <span className="text-[10px] text-gray-500">اتفاقية تمثيل قانوني</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('assignment')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-center transition-all cursor-pointer ${
                    templateType === 'assignment'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileCheck size={18} className={templateType === 'assignment' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">تكليف وتفويض رسمي</span>
                  <span className="text-[10px] text-gray-500">خطاب تمثيل رسمي</span>
                </button>
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">عنوان المذكرة / المستند:</label>
              <Input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                required
                className="w-full text-sm font-medium"
              />
            </div>

            {/* Client Share Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shareDraft"
                checked={shareDraft}
                onChange={(e) => setShareDraft(e.target.checked)}
                className="rounded border-gray-300 text-action focus:ring-action"
              />
              <label htmlFor="shareDraft" className="text-xs text-gray-700 cursor-pointer">
                مشاركة المستند مع الموكل في بوابته (Client Portal)
              </label>
            </div>

            {/* PRIMARY BUTTON: Launch Word Editor */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleOpenOnlyOfficeDraft}
                disabled={isOpeningOnlyOffice}
                style={{ backgroundColor: '#107c41', color: '#ffffff' }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isOpeningOnlyOffice ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>جاري فتح ملف وورد جديد...</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} className="text-white" />
                    <span>فتح ملف وورد جديد</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. Modal: تقرير إكسل Excel (.xlsx) */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={reportSuccess ? 'تم تصدير وحفظ تقرير Excel بنجاح' : 'تصدير كشف حساب وتقارير Excel (.xlsx)'}
        description={
          reportSuccess
            ? 'تم حفظ الملف في قاعدة البيانات وبدء تنزيله بتنسيق رسمي يدعم اليمين لليسار (RTL).'
            : 'اختر نوع التقرير المالي والقضية المطلوبة لتوليد جدول Excel فوري وحفظه بالنظام.'
        }
      >
        {reportSuccess ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">{reportSuccess.name}</p>
                <p className="text-xs text-emerald-700">
                  الحجم: {reportSuccess.size_label} • القضية: {reportMatter}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOnlyOfficeDoc({
                    id: reportSuccess.id,
                    name: reportSuccess.name,
                    kind: 'xlsx',
                  });
                  setReportOpen(false);
                  setOnlyOfficeOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                <Server size={14} />
                <span>فتح وتعديل في OnlyOffice Sheets (.xlsx)</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/docs/${reportSuccess.id}/download`}
                  download={reportSuccess.name}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download size={14} />
                  تنزيل نسخة
                </a>
                <Button variant="secondary" onClick={() => setReportOpen(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReportSubmit} className="flex flex-col gap-4 p-6 pt-0">
            {reportError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">المسألة القانونية / القضية:</label>
              <select
                value={reportMatter}
                onChange={(e) => setReportMatter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-action focus:outline-none"
              >
                {matters.length > 0 ? (
                  matters.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.value} — {m.label.ar}
                    </option>
                  ))
                ) : (
                  <option value="MAT-2201">MAT-2201 — نزاع عقد التوريد التجاري</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">نوع كشف الحساب المطلوب:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportType('client_statement')}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    exportType === 'client_statement'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Receipt size={18} />
                  <span>كشف حساب موكل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('invoices_ledger')}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    exportType === 'invoices_ledger'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileSpreadsheet size={18} />
                  <span>سجل الفواتير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('timesheet')}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    exportType === 'timesheet'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock size={18} />
                  <span>ساعات العمل</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="shareReport"
                checked={shareReport}
                onChange={(e) => setShareReport(e.target.checked)}
                className="rounded border-gray-300 text-action focus:ring-action"
              />
              <label htmlFor="shareReport" className="text-xs text-gray-700 cursor-pointer">
                مشاركة التقرير مع العميل في بوابته
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button type="button" variant="secondary" onClick={() => setReportOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={pendingReport}
                className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                icon={pendingReport ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              >
                {pendingReport ? 'جاري التصدير...' : 'تصدير وحفظ Excel (.xlsx)'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* OnlyOffice In-Browser Editor Modal */}
      {onlyOfficeDoc && (
        <OnlyOfficeEditorModal
          open={onlyOfficeOpen}
          onClose={() => {
            setOnlyOfficeOpen(false);
            setOnlyOfficeDoc(null);
          }}
          documentId={onlyOfficeDoc.id}
          documentName={onlyOfficeDoc.name}
          documentKind={onlyOfficeDoc.kind || 'docx'}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
