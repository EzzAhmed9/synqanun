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
} from 'lucide-react';
import { Button, Field, Input, Modal, Textarea, Checkbox } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { generateWordAction } from './generate-document-actions';

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
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(reset, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        const downloadUrl = `http://127.0.0.1:8000${res.data.download_url}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        router.refresh();
      } else {
        setError(res.error || 'حدث خطأ أثناء توليد المستند');
      }
    });
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
        title={successDoc ? 'تم توليد المستند وحفظه بنجاح' : 'توليد وصياغة مستند Word رسمي (.docx)'}
        description={
          successDoc
            ? 'تم حفظ المستند تلقائياً في قاعدة البيانات وسيرفر الموقع وربطه بملف القضية.'
            : 'اختر النموذج وصيغة الوثيقة القانونية، وسيتم إنشاؤها بتنسيق عربي كامل (RTL) وحفظها بالنظام.'
        }
      >
        {successDoc ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">{successDoc.name}</p>
                <p className="text-xs text-emerald-700">
                  الحجم: {successDoc.size_label} • الحالة: محفوظ في ملف القضية {engagementRef}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              بدأ تنزيل الملف في جهازك آلياً. يظهر الملف أيضاً في قائمة المستندات أدناه وبوابة الموكل.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <a
                href={`http://127.0.0.1:8000${successDoc.download_url}`}
                download={successDoc.name}
                className="inline-flex items-center gap-2 rounded-md bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-action-hover"
              >
                <Download size={16} />
                تنزيل الملف مرة أخرى
              </a>
              <Button variant="secondary" onClick={close}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 pt-0">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
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
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
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
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
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
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
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
              <Button
                variant="primary"
                type="submit"
                disabled={pending || !title.trim()}
                icon={pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              >
                {pending ? 'جاري الصياغة والحفظ...' : 'توليد وحفظ ملف Word (.docx)'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
