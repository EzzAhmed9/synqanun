'use client';

import * as React from 'react';
import { Clock, Play, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, buttonClasses, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { formatDuration, useUIState } from '@/components/providers/UIStateProvider';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { logTime } from '@/app/[locale]/(staff)/staff/time/log-time-action';
import { getActiveMattersForTimer, type ActiveMatterOption } from '@/app/[locale]/(staff)/staff/time/get-matters-action';

export function TimerLogModal() {
  const t = useTranslations('logTime');
  const locale = useLocale();
  const router = useRouter();

  const { timer, discardTimer, closeTimerModal, resetTimer, startTimer } = useUIState();

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [doneData, setDoneData] = React.useState<{ minutes: number; matterRef: string } | null>(null);

  const [engagements, setEngagements] = React.useState<{ value: string; label: string }[]>([
    {
      value: 'MAT-2201',
      label:
        locale === 'ar'
          ? 'MAT-2201 — نزاع عقد التوزيع الحصري مع شركة الشرق الأوسط للتجارة'
          : 'MAT-2201 — Exclusive Distribution Agreement Dispute',
    },
    {
      value: 'MAT-2202',
      label:
        locale === 'ar'
          ? 'MAT-2202 — تحكيم مشارطة إيجار سفن الشحن وتلف البضائع البحرية'
          : 'MAT-2202 — Maritime Charterparty & Cargo Damage Arbitration',
    },
    {
      value: 'MAT-2203',
      label:
        locale === 'ar'
          ? 'MAT-2203 — إعادة هيكلة الحوكمة واستيفاء متطلبات ترخيص البيئة التشريعية'
          : 'MAT-2203 — Corporate Governance Restructuring',
    },
    {
      value: 'MAT-2204',
      label:
        locale === 'ar'
          ? 'MAT-2204 — طعن ضريبة القيمة المضافة وفروق الفحص المالي'
          : 'MAT-2204 — VAT Assessment Dispute',
    },
    {
      value: 'MAT-2205',
      label: locale === 'ar' ? 'MAT-2205 — الشركة المتحدة' : 'MAT-2205 — United Company',
    },
  ]);

  const [engagementRef, setEngagementRef] = React.useState('');
  const [hours, setHours] = React.useState('0');
  const [minutes, setMinutes] = React.useState('1');
  const [on, setOn] = React.useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = React.useState('');
  const [billable, setBillable] = React.useState<boolean | null>(true);

  // Sync with timer state when modal opens
  React.useEffect(() => {
    if (timer.modalOpen) {
      const totalMins = Math.max(1, Math.round(timer.elapsedSeconds / 60));
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setHours(String(h));
      setMinutes(String(m > 0 ? m : 1));
      setEngagementRef(timer.matterRef || 'MAT-2201');
      setOn(new Date().toISOString().slice(0, 10));
      setDescription('');
      setBillable(true);
      setError(null);
      setDoneData(null);
    }
  }, [timer.modalOpen, timer.elapsedSeconds, timer.matterRef]);

  // Fetch live active matters from database via Server Action
  React.useEffect(() => {
    if (!timer.modalOpen) return;
    getActiveMattersForTimer()
      .then((items) => {
        if (items && items.length > 0) {
          const formatted = items.map((e) => ({
            value: e.value,
            label: `${e.value} — ${e.label[locale as 'ar' | 'en'] || e.label.ar || e.label.en || e.value}`,
          }));
          setEngagements(formatted);
          setEngagementRef((prev) => {
            if (timer.matterRef && formatted.some((m) => m.value === timer.matterRef)) {
              return timer.matterRef;
            }
            if (prev && formatted.some((m) => m.value === prev)) {
              return prev;
            }
            return formatted[0].value;
          });
        }
      })
      .catch((err) => {
        console.error('Error loading matters:', err);
      });
  }, [timer.modalOpen, locale, timer.matterRef]);

  if (!timer.modalOpen) return null;

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const selectedFile = engagementRef || 'MAT-2201';
    if (!selectedFile) {
      setError(locale === 'ar' ? 'يرجى اختيار المسألة القانونية.' : 'Please select a legal matter.');
      return;
    }
    if (totalMinutes <= 0) {
      setError(locale === 'ar' ? 'يرجى إدخال مدة عمل صحيحة.' : 'Please enter a valid duration.');
      return;
    }

    const finalDescription =
      description.trim() ||
      (locale === 'ar'
        ? 'متابعة العمل القانوني وصياغة المذكرات ومراجعة الملف'
        : 'Legal work review and pleadings drafting');

    startTransition(async () => {
      const res = await logTime({
        engagementRef: selectedFile,
        on,
        minutes: totalMinutes,
        description: finalDescription,
        billable: billable !== false,
      });

      if (res.ok) {
        setDoneData({ minutes: totalMinutes, matterRef: selectedFile });
        resetTimer();
        router.refresh();
      } else {
        setError(res.error ? (t(`errors.${res.error}` as any) || res.error) : (locale === 'ar' ? 'تعذر تسجيل الوقت' : 'Failed to log time'));
      }
    });
  };

  return (
    <Modal
      open={timer.modalOpen}
      onClose={closeTimerModal}
      title={locale === 'ar' ? 'تسجيل الوقت المسجّل بالمؤقت' : 'Log Time Recorded by Timer'}
      description={
        locale === 'ar'
          ? 'تم إيقاف المؤقت. يمكنك مراجعة الوقت المنجز واختيار الملف وتوثيق العمل لحفظه في سجل الفوترة.'
          : 'Timer stopped. Review recorded duration, select matter, and save to billing ledger.'
      }
      size="md"
    >
      {doneData ? (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-body">
                {locale === 'ar' ? 'تم تسجيل وقت العمل بنجاح' : 'Time Recorded Successfully'}
              </p>
              <p className="mt-0.5 text-caption text-emerald-700">
                {locale === 'ar'
                  ? `أُضيف ${doneData.minutes} دقيقة إلى رصيد الساعات غير المفوترة للملف ${doneData.matterRef} في قاعدة البيانات.`
                  : `Added ${doneData.minutes} minutes to unbilled WIP for ${doneData.matterRef} in PostgreSQL database.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Link
              href="/staff/billing"
              className={buttonClasses({ variant: 'secondary', size: 'md' })}
              onClick={closeTimerModal}
            >
              {locale === 'ar' ? 'فتح دفتر الفوترة' : 'Open Billing'}
            </Link>
            <Button variant="primary" size="md" onClick={closeTimerModal}>
              {locale === 'ar' ? 'تم وإغلاق' : 'Done & Close'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Recorded Duration Banner */}
          <div className="flex items-center justify-between rounded-card border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2 text-caption text-gray-600">
              <Clock size={16} className="text-gray-500" />
              <span>{locale === 'ar' ? 'الوقت المحتسب بالمؤقت:' : 'Recorded Timer Duration:'}</span>
            </div>
            <div className="font-mono text-title font-medium text-legal-navy">
              {formatDuration(timer.elapsedSeconds)}
            </div>
          </div>

          {/* Legal Matter / Engagement Selector */}
          <Field
            htmlFor="timer-engagement-select"
            label={locale === 'ar' ? 'المسألة القانونية (الملف)' : t('fileLabel')}
            hint={locale === 'ar' ? 'اختر القضية المراد قيد ساعات العمل عليها' : 'Select legal matter to log time against'}
          >
            <Select
              id="timer-engagement-select"
              value={engagementRef}
              onChange={(e) => {
                setEngagementRef(e.target.value);
                setError(null);
              }}
              className="text-gray-900 font-medium bg-white"
            >
              {engagements.map((item) => (
                <option key={item.value} value={item.value} className="text-gray-900 bg-white py-1.5">
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Date and Duration Fields */}
          <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
            <Field
              htmlFor="timer-date"
              label={locale === 'ar' ? 'تاريخ العمل' : t('dateLabel')}
            >
              <Input
                id="timer-date"
                type="date"
                value={on}
                onChange={(e) => setOn(e.target.value)}
              />
            </Field>

            <Field
              htmlFor="timer-minutes"
              label={locale === 'ar' ? 'المدة المحتسبة' : t('durationLabel')}
              hint={locale === 'ar' ? 'ساعات ودقائق قابلة للتعديل' : 'Hours and minutes'}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="timer-hours"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="pe-8"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-caption text-gray-500">
                    {t('hoursSuffix')}
                  </span>
                </div>
                <div className="relative flex-1">
                  <Input
                    id="timer-minutes"
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="pe-8"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-caption text-gray-500">
                    {t('minutesSuffix')}
                  </span>
                </div>
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field
            htmlFor="timer-description"
            label={locale === 'ar' ? 'بيان ما تم إنجازه (الوصف)' : t('descriptionLabel')}
            hint={locale === 'ar' ? 'النص الذي سيظهر في الفاتورة وكشف حساب العميل' : t('descriptionHint')}
          >
            <Textarea
              id="timer-description"
              rows={3}
              placeholder={
                locale === 'ar'
                  ? 'مثال: مراجعة المستندات وتقرير الخبير، صياغة مذكرة الدفاع، حضور الجلسة...'
                  : t('descriptionPlaceholder')
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {/* Billable Choice */}
          <Field label={locale === 'ar' ? 'هل العمل قابل للفوترة والتحميل على العميل؟' : t('billableLabel')}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillable(true)}
                className={`rounded-card border p-3 text-start transition-colors ${
                  billable === true
                    ? 'border-legal-navy bg-legal-navy/5 text-legal-navy font-medium shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-body font-medium">
                  {locale === 'ar' ? 'نعم — قابل للفوترة' : t('billableYes')}
                </div>
                <div className="mt-0.5 text-caption text-gray-500">
                  {locale === 'ar' ? 'يُدرج في كشف أتعاب العميل ويُحتسب في الفواتير.' : t('billableYesHint')}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setBillable(false)}
                className={`rounded-card border p-3 text-start transition-colors ${
                  billable === false
                    ? 'border-legal-navy bg-legal-navy/5 text-legal-navy font-medium shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-body font-medium">
                  {locale === 'ar' ? 'لا — غير قابل للفوترة' : t('billableNo')}
                </div>
                <div className="mt-0.5 text-caption text-gray-500">
                  {locale === 'ar' ? 'يُوثّق في ملف القضية دون مطالبة العميل بمبلغ.' : t('billableNoHint')}
                </div>
              </button>
            </div>
          </Field>

          {error ? (
            <p className="rounded bg-rose-50 p-2.5 text-caption font-medium text-rose-700">{error}</p>
          ) : null}

          {/* Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={discardTimer}
              className="text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} className="me-1.5" />
              {locale === 'ar' ? 'تجاهل وتصفير المؤقت' : 'Discard & Reset'}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  closeTimerModal();
                  startTimer();
                }}
              >
                <Play size={14} className="me-1.5" />
                {locale === 'ar' ? 'استئناف المؤقت' : 'Resume Timer'}
              </Button>
              <Button type="submit" variant="primary" loading={pending}>
                {locale === 'ar' ? 'تسجيل وحفظ في الفوترة' : t('submit')}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default TimerLogModal;
