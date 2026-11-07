'use client';

import * as React from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Clock,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { exportExcelAction } from './generate-document-actions';

interface ExportExcelModalProps {
  engagementRef?: string;
  clientId?: string;
  clientName?: string;
}

export function ExportExcelModal({
  engagementRef,
  clientId,
  clientName,
}: ExportExcelModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [successDoc, setSuccessDoc] = React.useState<any | null>(null);

  // Form State
  const [exportType, setExportType] = React.useState<'client_statement' | 'invoices_ledger' | 'timesheet'>('client_statement');
  const [shareWithClient, setShareWithClient] = React.useState(true);

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
      const res = await exportExcelAction({
        export_type: exportType,
        matter_reference: engagementRef,
        client_id: clientId,
        is_firm_only: !shareWithClient,
      });

      if (res.ok && res.data) {
        setSuccessDoc(res.data);
        // Trigger browser download immediately through Next.js authenticated proxy
        const downloadUrl = `/api/docs/${res.data.id}/download`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        router.refresh();
      } else {
        setError(res.error || 'حدث خطأ أثناء تصدير ملف Excel');
      }
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<FileSpreadsheet aria-hidden size={15} className="text-emerald-600" />}
        onClick={() => setOpen(true)}
        className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
      >
        تصدير Excel (.xlsx)
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={successDoc ? 'تم استخراج وتصدير الجدول بنجاح' : 'تصدير جدول Excel رسمي (.xlsx)'}
        description={
          successDoc
            ? 'تم حفظ ملف Excel في النظام وتنزيله على جهازك.'
            : 'اختر نوع التقرير المالي أو الإداري لتصديره بتنسيق RTL مع الحسابات والجداول الرسمية.'
        }
      >
        {successDoc ? (
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">{successDoc.name}</p>
                <p className="text-xs text-emerald-700">
                  الحجم: {successDoc.size_label} • الحالة: محفوظ في سجل المستندات
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              تم بدء تحميل جدول البيانات. يمكن إعادة تنزيله في أي وقت من تبويب المستندات.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <a
                href={`/api/docs/${successDoc.id}/download`}
                download={successDoc.name}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
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
                      يتضمن كافة المطالبات، الفواتير، المبالغ المسددة، والرصيد التراكمي النهائي المستحق.
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
                      جدول تفصيلي بأرقام الفواتير، تواريخ الإصدار والاستحقاق، ضريبة القيمة المضافة، وحالة السداد.
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
                      حصر شامل لجميع الساعات المسجلة بالمؤقت، اسم المحامي، معدل الساعة، وبيان الإجراء.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sharing toggle */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={shareWithClient}
                  onChange={(e) => setShareWithClient(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                />
                مشاركة التقرير في بوابة الموكل ليتمكن من تنزيله
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={close} disabled={pending}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={pending}
                icon={pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {pending ? 'جاري التصدير والحفظ...' : 'تصدير وحفظ ملف Excel (.xlsx)'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
