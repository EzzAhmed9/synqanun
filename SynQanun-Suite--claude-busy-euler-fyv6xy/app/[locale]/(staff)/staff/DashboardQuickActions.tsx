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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input, Modal } from '@/components/ui';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { useRouter } from '@/lib/i18n/navigation';
import { generateWordAction, exportExcelAction } from './register/generate-document-actions';
import { getActiveMattersForTimer, type ActiveMatterOption } from './time/get-matters-action';

export function DashboardQuickActions() {
  const t = useTranslations('staffDashboard.actions');
  const router = useRouter();

  // Modals state
  const [draftOpen, setDraftOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [matters, setMatters] = React.useState<ActiveMatterOption[]>([]);
  const [loadingMatters, setLoadingMatters] = React.useState(false);

  // Transitions
  const [pendingDraft, startDraftTransition] = React.useTransition();
  const [pendingReport, startReportTransition] = React.useTransition();
  const [draftError, setDraftError] = React.useState<string | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [draftSuccess, setDraftSuccess] = React.useState<any | null>(null);
  const [reportSuccess, setReportSuccess] = React.useState<any | null>(null);

  // Draft form state
  const [selectedMatter, setSelectedMatter] = React.useState('MAT-2201');
  const [templateType, setTemplateType] = React.useState<'pleading' | 'contract' | 'memo'>('pleading');
  const [draftTitle, setDraftTitle] = React.useState('مذكرة دفاع في دعوى النزاع التجاري لعقد التوزيع');
  const [court, setCourt] = React.useState('محكمة استئناف القاهرة - الدائرة التجارية');
  const [clientRole, setClientRole] = React.useState('المستأنف ضده / المدعي');
  const [opposing, setOpposing] = React.useState('شركة الشرق الأوسط للتجارة');
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

  const handleDraftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDraftError(null);

    startDraftTransition(async () => {
      const res = await generateWordAction({
        matter_reference: selectedMatter,
        template_type: templateType,
        title: draftTitle,
        court_name: court,
        client_role: clientRole,
        opposing_party: opposing,
        is_firm_only: !shareDraft,
      });

      if (res.ok && res.data) {
        setDraftSuccess(res.data);
        const downloadUrl = `http://127.0.0.1:8000${res.data.download_url}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        router.refresh();
      } else {
        setDraftError(res.error || 'حدث خطأ أثناء صياغة المستند');
      }
    });
  };

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
        const downloadUrl = `http://127.0.0.1:8000${res.data.download_url}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        router.refresh();
      } else {
        setReportError(res.error || 'حدث خطأ أثناء تصدير التقرير');
      }
    });
  };

  return (
    <>
      <nav aria-label={t('label')} className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          icon={<FilePlus2 aria-hidden size={15} />}
          onClick={() => {
            setDraftSuccess(null);
            setDraftError(null);
            setDraftOpen(true);
          }}
        >
          {t('draft')}
        </Button>

        <Button
          variant="secondary"
          className="border-legal-navy/25 bg-legal-navy/5 text-legal-navy hover:bg-legal-navy/10"
          icon={<FeatherMark aria-hidden size={15} />}
          onClick={() => {
            setReportSuccess(null);
            setReportError(null);
            setReportOpen(true);
          }}
        >
          {t('report')}
        </Button>
      </nav>

      {/* 1. Modal: صياغة مستند Word (.docx) */}
      <Modal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        title={draftSuccess ? 'تم توليد وحفظ المستند بنجاح' : 'صياغة وتوليد مستند Word رسمي (.docx)'}
        description={
          draftSuccess
            ? 'تم حفظ المستند في قاعدة البيانات وسيرفر المكتب وبدأ تنزيله على جهازك.'
            : 'اختر المسألة القانونية ونوع النموذج وسيتم توليده بتنسيق عربي رسمي (RTL) وحفظه فوراً.'
        }
      >
        {draftSuccess ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">{draftSuccess.name}</p>
                <p className="text-xs text-emerald-700">
                  الحجم: {draftSuccess.size_label} • القضية: {selectedMatter}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              تم بدء تحميل الملف آلياً. يظهر المستند أيضاً في صفحة القضية وبوابة الموكل.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <a
                href={`http://127.0.0.1:8000${draftSuccess.download_url}`}
                download={draftSuccess.name}
                className="inline-flex items-center gap-2 rounded-md bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-action-hover"
              >
                <Download size={16} />
                تنزيل الملف مرة أخرى
              </a>
              <Button variant="secondary" onClick={() => setDraftOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDraftSubmit} className="flex flex-col gap-4 p-6 pt-0">
            {draftError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="shrink-0" />
                <span>{draftError}</span>
              </div>
            )}

            {/* Matter selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">المسألة القانونية / القضية:</label>
              <select
                value={selectedMatter}
                onChange={(e) => setSelectedMatter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-action focus:outline-none"
              >
                {matters.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} — {m.label.ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Template selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">نوع النموذج القانوني:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('pleading')}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                    templateType === 'pleading'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
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
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                    templateType === 'contract'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileSignature size={18} className={templateType === 'contract' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">عقد تقديم خدمات</span>
                  <span className="text-[10px] text-gray-500">اتفاقية تمثيل وأتعاب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('memo')}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                    templateType === 'memo'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileCheck size={18} className={templateType === 'memo' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">تكليف وتفويض</span>
                  <span className="text-[10px] text-gray-500">خطاب رسمي</span>
                </button>
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">عنوان المستند:</label>
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                required
                className="w-full text-sm"
              />
            </div>

            {templateType === 'pleading' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">المحكمة المختصة:</label>
                  <Input value={court} onChange={(e) => setCourt(e.target.value)} className="w-full text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">صفة الموكل:</label>
                  <Input value={clientRole} onChange={(e) => setClientRole(e.target.value)} className="w-full text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">الطرف الخصم:</label>
                  <Input value={opposing} onChange={(e) => setOpposing(e.target.value)} className="w-full text-xs" />
                </div>
              </div>
            )}

            {/* Sharing toggle */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={shareDraft}
                  onChange={(e) => setShareDraft(e.target.checked)}
                  className="rounded border-gray-300 text-action focus:ring-action"
                />
                مشاركة المستند فوراً في بوابة الموكل (Client Portal)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setDraftOpen(false)} disabled={pendingDraft}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={pendingDraft || !draftTitle.trim()}
                icon={pendingDraft ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              >
                {pendingDraft ? 'جاري الصياغة والحفظ...' : 'توليد وحفظ ملف Word (.docx)'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 2. Modal: اطلب تقريرًا / تصدير Excel (.xlsx) */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={reportSuccess ? 'تم استخراج وتصدير التقرير بنجاح' : 'اطلب تقريرًا — تصدير جدول Excel (.xlsx)'}
        description={
          reportSuccess
            ? 'تم حفظ ملف Excel في النظام وتنزيله على جهازك.'
            : 'اختر نوع التقرير والمسألة القانونية لتصدير جدول بيانات رسمي بتنسيق RTL.'
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
            <p className="text-sm text-gray-600">
              تم بدء تحميل جدول البيانات. يمكن إعادة تنزيله في أي وقت من سجل المستندات.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <a
                href={`http://127.0.0.1:8000${reportSuccess.download_url}`}
                download={reportSuccess.name}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Download size={16} />
                تنزيل الملف مرة أخرى
              </a>
              <Button variant="secondary" onClick={() => setReportOpen(false)}>
                إغلاق
              </Button>
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-emerald-600 focus:outline-none"
              >
                {matters.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} — {m.label.ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">نوع التقرير المالي / الإداري:</label>
              <div className="flex flex-col gap-2">
                <label
                  onClick={() => setExportType('client_statement')}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    exportType === 'client_statement'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    checked={exportType === 'client_statement'}
                    onChange={() => setExportType('client_statement')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Briefcase size={16} className="text-emerald-700" />
                      كشف حساب مالي للموكل (Statement of Account)
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      جدول بالمطالبات، المبالغ المسددة، والرصيد النهائي المستحق.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setExportType('invoices_ledger')}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    exportType === 'invoices_ledger'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    checked={exportType === 'invoices_ledger'}
                    onChange={() => setExportType('invoices_ledger')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Receipt size={16} className="text-emerald-700" />
                      سجل فواتير ومطالبات القضية (Invoices Ledger)
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      أرقام الفواتير، تواريخ الاستحقاق، ضريبة القيمة المضافة، وحالة السداد.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setExportType('timesheet')}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    exportType === 'timesheet'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    checked={exportType === 'timesheet'}
                    onChange={() => setExportType('timesheet')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Clock size={16} className="text-emerald-700" />
                      تقرير ساعات العمل والمطالبات (Timesheet & Work Claims)
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      حصر كامل لساعات المحامين المسجلة بالمؤقت، معدل الساعة، والإجمالي.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setReportOpen(false)} disabled={pendingReport}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={pendingReport}
                icon={pendingReport ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {pendingReport ? 'جاري التصدير والحفظ...' : 'تصدير وحفظ ملف Excel (.xlsx)'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
