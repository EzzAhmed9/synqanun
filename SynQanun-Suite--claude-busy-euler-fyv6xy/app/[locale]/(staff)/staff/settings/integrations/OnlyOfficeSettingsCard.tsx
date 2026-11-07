'use client';

import * as React from 'react';
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Terminal,
  Save,
  Loader2,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '@/components/ui';
import {
  getOnlyOfficeStatusAction,
  configureOnlyOfficeAction,
} from '@/app/[locale]/(staff)/staff/register/generate-document-actions';

interface OnlyOfficeSettingsCardProps {
  locale?: string;
}

export function OnlyOfficeSettingsCard({ locale = 'ar' }: OnlyOfficeSettingsCardProps) {
  const [loading, setLoading] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{
    ok: boolean;
    serverUrl?: string;
    hasJwt?: boolean;
    isConnected?: boolean;
    details?: string;
    dockerCommand?: string;
  } | null>(null);

  const [serverUrl, setServerUrl] = React.useState('http://localhost:8080');
  const [jwtSecret, setJwtSecret] = React.useState('');
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedDocker, setCopiedDocker] = React.useState(false);

  // Fetch status on mount
  const checkStatus = React.useCallback(async (isTest = false) => {
    if (isTest) setTesting(true);
    else setLoading(true);
    setMessage(null);

    try {
      const res = await getOnlyOfficeStatusAction();
      if (res) {
        setStatus(res);
        if (res.serverUrl) setServerUrl(res.serverUrl);
        if (isTest) {
          if (res.isConnected) {
            setMessage({ type: 'success', text: 'تم فحص الاتصال: خادم OnlyOffice متصل ومستعد للعمل بنجاح!' });
          } else {
            setMessage({ type: 'error', text: res.details || 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الحاوية أو الخدمة.' });
          }
        }
      }
    } catch {
      if (isTest) {
        setMessage({ type: 'error', text: 'فشل فحص الاتصال بالخادم.' });
      }
    } finally {
      setLoading(false);
      setTesting(false);
    }
  }, []);

  React.useEffect(() => {
    checkStatus(false);
  }, [checkStatus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await configureOnlyOfficeAction({
        server_url: serverUrl,
        jwt_secret: jwtSecret.trim() ? jwtSecret.trim() : undefined,
      });

      if (res.ok) {
        setMessage({ type: 'success', text: res.message || 'تم حفظ إعدادات خادم OnlyOffice بنجاح.' });
        await checkStatus(false);
      } else {
        setMessage({ type: 'error', text: res.error || 'تعذر حفظ الإعدادات.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ الإعدادات.' });
    } finally {
      setSaving(false);
    }
  };

  const dockerCommand = status?.dockerCommand || 'docker run -i -t -d -p 8080:80 --restart=always onlyoffice/documentserver';

  const copyCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2500);
  };

  return (
    <Card padding="lg" className="border-blue-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
            <Server aria-hidden size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-sans text-title font-bold text-gray-900">
                OnlyOffice Docs — خادم محرر المستندات الداخلي (On-Premises)
              </h2>
            </div>
            <p className="mt-0.5 text-caption text-gray-600">
              تثبيت خادم محرر وثائق مخصص على خوادم العميل الداخلية لفتح وتعديل ملفات Word (.docx) و Excel (.xlsx) مباشرة من المتصفح بأمان وخصوصية 100%.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <Badge tone="neutral">
              <Loader2 size={12} className="animate-spin mr-1 inline" /> جاري الفحص...
            </Badge>
          ) : status?.isConnected ? (
            <Badge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 inline-block" />
              متصل ويعمل بنجاح
            </Badge>
          ) : (
            <Badge tone="neutral">
              <AlertTriangle size={12} className="text-amber-600 mr-1 inline" />
              غير متصل (يتطلب تشغيل الخادم)
            </Badge>
          )}
        </div>
      </div>

      {/* Status banner & messages */}
      {message && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Feature & Specs Highlights */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Pros */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-950">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>المميزات الرئيسية:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-emerald-900 leading-relaxed">
            <li><strong>مجاني تماماً:</strong> من خلال النسخة المجتمعية الرسمية (Community Edition).</li>
            <li><strong>أمان وخصوصية 100%:</strong> لا تخرج المستندات والبيانات من خوادم المكتب إطلاقاً.</li>
            <li><strong>واجهة Microsoft Word:</strong> تجربة عربية كاملة RTL مطابقة لبرامج Office.</li>
            <li><strong>دعم كامل للملفات:</strong> مذكرات الدفاع (.docx) وجداول الحسابات (.xlsx).</li>
          </ul>
        </div>

        {/* Cons & Specs */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Info size={16} className="text-amber-600" />
            <span>الاشتراطات والحدود الفنية:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-900 leading-relaxed">
            <li><strong>خادم مستقل:</strong> يتطلب تشغيل خادم Document Server بجانب النظام (عبر Docker).</li>
            <li><strong>حد التزامن المجاني:</strong> النسخة المجانية تدعم حتى <strong>20 مستخدماً</strong> يقومون بالتعديل في نفس اللحظة.</li>
            <li><strong>ترخيص Enterprise:</strong> متاح في حال الرغبة في دعم عدد غير محدود من المحامين بالتزامن.</li>
          </ul>
        </div>
      </div>

      {/* Docker Quick Start Command Box */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/90 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
            <Terminal size={15} className="text-gray-600" />
            أمر التشغيل السريع عبر Docker (على السيرفر الداخلي):
          </span>
          <span className="text-[11px] text-gray-500 font-mono">Port: 8080</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-900 p-2.5 text-xs text-emerald-400 font-mono shadow-inner" dir="ltr">
          <span className="truncate select-all">{dockerCommand}</span>
          <button
            type="button"
            onClick={copyCommand}
            className="ml-3 flex shrink-0 items-center gap-1 rounded bg-gray-800 px-2.5 py-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
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
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="mt-5 space-y-4 border-t border-gray-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رابط خادم OnlyOffice Document Server (URL):
            </label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8080 أو IP الخادم الداخلي"
              required
              className="w-full text-xs font-mono"
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              الرابط الافتراضي المحلي هو <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:8080</code> أو رابط شبكة المكتب الداخلية.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              مفتاح التوقيع المشترك (JWT Secret) — اختياري:
            </label>
            <Input
              type="password"
              value={jwtSecret}
              onChange={(e) => setJwtSecret(e.target.value)}
              placeholder={status?.hasJwt ? '•••••••••••• (مفتاح محفوظ)' : 'اتركه فارغاً إذا كان الخادم بدون JWT'}
              className="w-full text-xs font-mono"
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              في حال تفعيل توقيع الرموز الأمنية JWT في إعدادات OnlyOffice.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              icon={saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الخادم'}
            </Button>

            <Button
              variant="secondary"
              type="button"
              onClick={() => checkStatus(true)}
              disabled={testing}
              icon={testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            >
              {testing ? 'جاري فحص الاتصال...' : 'فحص الاتصال بالخادم'}
            </Button>
          </div>

          <a
            href="https://helpcenter.onlyoffice.com/installation/docs-community-install-docker.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
          >
            <span>دليل التثبيت الرسمي لـ OnlyOffice Docs</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </form>
    </Card>
  );
}
