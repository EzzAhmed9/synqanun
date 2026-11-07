'use client';

import * as React from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Scale,
  FileSignature,
  FileCheck,
  Loader2,
  Upload,
  ExternalLink,
  Server,
} from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { OnlyOfficeEditorModal } from '@/components/editor/OnlyOfficeEditorModal';
import { useRouter } from '@/lib/i18n/navigation';
import { generateWordAction, uploadUpdatedDocxAction } from './generate-document-actions';

interface GenerateLegalDocModalProps {
  engagementRef: string;
  engagementTitle: string;
  clientName?: string;
  opposingParty?: string;
  venue?: string;
  caseNumber?: string;
}

export function GenerateLegalDocModal({
  engagementRef,
  engagementTitle,
  clientName,
  opposingParty,
  venue,
  caseNumber,
}: GenerateLegalDocModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [successDoc, setSuccessDoc] = React.useState<any | null>(null);
  const [isUploadingUpdated, setIsUploadingUpdated] = React.useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = React.useState<string | null>(null);
  const [onlyOfficeOpen, setOnlyOfficeOpen] = React.useState(false);

  // Form State
  const [templateType, setTemplateType] = React.useState<'pleading' | 'contract' | 'memo'>('pleading');
  const [title, setTitle] = React.useState(`مذكرة دفاع في ${engagementTitle}`);
  const [clientRole, setClientRole] = React.useState('المستأنف ضده / المدعي');
  const [opposing, setOpposing] = React.useState(opposingParty || '');
  const [court, setCourt] = React.useState(venue || 'محكمة استئناف القاهرة - الدائرة التجارية');
  const [caseNum, setCaseNum] = React.useState(caseNumber || `${engagementRef}/2026`);
  const [shareWithClient, setShareWithClient] = React.useState(true);

  // Update default title when template type changes
  React.useEffect(() => {
    if (templateType === 'pleading') {
      setTitle(`مذكرة دفاع في ${engagementTitle}`);
    } else if (templateType === 'contract') {
      setTitle(`عقد خدمات وأتعاب قانونية - ${engagementRef}`);
    } else {
      setTitle(`تكليف قانوني رسمي وتفويض - ${engagementRef}`);
    }
  }, [templateType, engagementTitle, engagementRef]);

  const reset = () => {
    setError(null);
    setSuccessDoc(null);
    setUploadSuccessMsg(null);
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(reset, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadSuccessMsg(null);

    startTransition(async () => {
      const res = await generateWordAction({
        matter_reference: engagementRef,
        template_type: templateType,
        title,
        court_name: court,
        case_number: caseNum,
        client_role: clientRole,
        opposing_party: opposing,
        is_firm_only: !shareWithClient,
      });

      if (res.ok && res.data) {
        setSuccessDoc(res.data);
        // Trigger browser download immediately
        const downloadUrl = `/api/docs/${res.data.id}/download`;
        try {
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = res.data.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (dlErr) {
          console.warn('Auto download error:', dlErr);
        }

        // Open OnlyOffice directly in-browser
        setOnlyOfficeOpen(true);
        router.refresh();
      } else {
        setError(res.error || 'حدث خطأ أثناء توليد المستند');
      }
    });
  };

  // Upload edited .docx file
  const handleUploadUpdatedDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !successDoc?.id) return;

    setIsUploadingUpdated(true);
    setError(null);
    setUploadSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadUpdatedDocxAction(successDoc.id, formData);
      if (res.ok && res.data) {
        setUploadSuccessMsg('تم رفع وحفظ النسخة المعدلة في القضية بنجاح! ✅');
        router.refresh();
      } else {
        setError(res.error || 'تعذر رفع الملف المحدث.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع المستند.');
    } finally {
      setIsUploadingUpdated(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<FileText aria-hidden size={15} className="text-blue-600" />}
        onClick={() => setOpen(true)}
        className="border-blue-200 text-blue-800 hover:bg-blue-50"
      >
        صياغة مستند Word (.docx)
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={successDoc ? 'محرر المستندات — تم إنشاء المستند بنجاح' : 'صياغة مستند جديد (OnlyOffice Docs)'}
        description={
          successDoc
            ? 'تم حفظ المستند في القضية وجاهز للتعديل المباشر في المتصفح أو التنزيل.'
            : 'اختر النموذج وصيغة الوثيقة القانونية، وسيتم فتح محرر OnlyOffice الداخلي فوراً للتعديل والحفظ التلقائي.'
        }
      >
        {successDoc ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800 border border-emerald-200">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">{successDoc.name}</p>
                <p className="text-xs text-emerald-700">
                  الحجم: {successDoc.size_label} • القضية: {engagementRef} • الحالة: محفوظ بالنظام ✅
                </p>
              </div>
            </div>

            {uploadSuccessMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* OnlyOffice In-Browser Direct Edit Action */}
            <button
              type="button"
              onClick={() => setOnlyOfficeOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-3.5 text-sm font-bold text-white hover:from-emerald-800 hover:to-teal-900 transition-all shadow-sm cursor-pointer"
            >
              <Server size={18} />
              <span>🖥️ فتح وتعديل فوري في محرر OnlyOffice الداخلي (On-Premises)</span>
            </button>

            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-800">
                💡 التعديل والمزامنة المباشرة:
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                يمكنك التعديل مباشرة عبر محرر OnlyOffice الداخلي أعلاه، وسيتم حفظ كافة التغييرات تلقائياً في ملف القضية دون مغادرة الموقع. كما يمكنك رفع نسخة معدلة يدوياً إن أردت:
              </p>

              {/* Upload Edited Copy */}
              <label className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer">
                {isUploadingUpdated ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري رفع النسخة المعدلة...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>📤 رفع النسخة المعدلة وحفظها في القضية</span>
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
                href={`/api/docs/${successDoc.id}/download`}
                download={successDoc.name}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
              >
                <Download size={14} />
                تنزيل نسخة من المستند مرة أخرى (Download a copy)
              </a>
            </div>

            <div className="flex justify-between items-center gap-3 pt-2">
              <a
                href="https://word.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0078D4] hover:underline"
              >
                التبديل إلى نافذة Microsoft Word
                <ExternalLink size={13} />
              </a>

              <Button variant="secondary" onClick={close}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 pt-0">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">نوع النموذج القانوني:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('pleading')}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all cursor-pointer ${
                    templateType === 'pleading'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Scale size={20} className={templateType === 'pleading' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">مذكرة دفاع ودفوع</span>
                  <span className="text-[10px] text-gray-500">للمحاكم واللجان</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('contract')}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all cursor-pointer ${
                    templateType === 'contract'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileSignature size={20} className={templateType === 'contract' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">عقد خدمات وأتعاب</span>
                  <span className="text-[10px] text-gray-500">اتفاقية تمثيل قانوني</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('memo')}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all cursor-pointer ${
                    templateType === 'memo'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileCheck size={20} className={templateType === 'memo' ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-xs font-bold">تكليف وتفويض رسمي</span>
                  <span className="text-[10px] text-gray-500">خطاب تمثيل رسمي</span>
                </button>
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">عنوان المستند:</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-sm"
              />
            </div>

            {templateType === 'pleading' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">المحكمة / الجهة القضائية:</label>
                  <Input
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">رقم القضية / القيد:</label>
                  <Input
                    value={caseNum}
                    onChange={(e) => setCaseNum(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">صفة الموكل في الدعوى:</label>
                  <Input
                    value={clientRole}
                    onChange={(e) => setClientRole(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">اسم الخصم (الطرف الآخر):</label>
                  <Input
                    value={opposing}
                    onChange={(e) => setOpposing(e.target.value)}
                    placeholder="الطرف الخصم..."
                    className="w-full text-xs"
                  />
                </div>
              </div>
            ) : null}

            {/* Sharing toggle */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={shareWithClient}
                  onChange={(e) => setShareWithClient(e.target.checked)}
                  className="rounded border-gray-300 text-action focus:ring-action"
                />
                مشاركة المستند فوراً في بوابة الموكل (Client Portal)
              </label>
              <p className="mt-1 text-[11px] text-gray-500 pe-5">
                عند تفعيل هذا الخيار، سيتمكن الموكل من مطالعة وتنزيل المستند من حسابه في الموقع.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={close} disabled={pending}>
                إلغاء
              </Button>
              <button
                type="submit"
                disabled={pending || !title.trim()}
                style={{ backgroundColor: '#107c41', color: '#ffffff' }}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {pending ? <Loader2 size={16} className="animate-spin text-white" /> : <FileText size={16} className="text-white" />}
                <span>فتح ملف وورد جديد</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* OnlyOffice In-Browser Editor Modal */}
      {successDoc && (
        <OnlyOfficeEditorModal
          open={onlyOfficeOpen}
          onClose={() => setOnlyOfficeOpen(false)}
          documentId={successDoc.id}
          documentName={successDoc.name || title}
          documentKind="docx"
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
