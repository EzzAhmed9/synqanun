import { demoFirm } from './firm';
import type { ClockTime } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/messages.ts — the recorded channel between the client and the
 * lawyers on their files.
 *
 * design.md §11 item 6 puts this inside the client portal's scope. It is
 * correspondence with the firm, not the firm's internal discussion about the
 * client — those are two different collections, and only this one is ever
 * queried for a portal session.
 *
 * WHAT THIS IS NOT CALLED
 * ---------------------------------------------------------------------------
 * The dashboard export headed the Arabic card "المراسلات الآمنة" — "secure
 * correspondence" — against an English card headed simply "Messages", and the
 * Messages export goes considerably further: "Legally Privileged & Confidential
 * Attorney-Client Communication (SHA-256 Encrypted)", "Encrypted Transport (TLS
 * 1.3)", "تشفير كامل من طرف إلى طرف" (end-to-end encryption), a "قناة آمنة"
 * chip beside the page title, an "Audit Reference: #SEC-4410-COMM", and a send
 * button reading "Send Privileged Message".
 *
 * None of it is earned. Track A has no authentication, no encryption at rest or
 * in transit beyond whatever the host provides, no audit log, and no privilege
 * model. Asserting attorney-client privilege over a channel is also a LEGAL
 * claim, not a UI label — it is the one thing on this screen that a client might
 * actually rely on. Both languages say "Messages", and the screen claims
 * nothing about how the message travels.
 *
 * THREADS CARRY THEIR MESSAGES
 * ---------------------------------------------------------------------------
 * The thread used to hold `preview`, `sentDaysAgo` and `sentAt` as its own
 * fields, because the dashboard card only ever showed the latest line. A
 * conversation view needs the exchange itself, so `messages` is the record now
 * and all three of those are DERIVED from its last entry in lib/mock-api.ts.
 * Same reason an invoice's total is the sum of its line items: a summary stored
 * beside the thing it summarises is a summary free to disagree with it.
 *
 * TIMESTAMPS
 * ---------------------------------------------------------------------------
 * `sentAt` is a wall-clock time in the FIRM's zone paired with a relative day,
 * not an instant. See lib/format.ts for the distinction and why it is enforced
 * here rather than left to each screen.
 *
 * The firm is not restated; `firmId` points at fixtures/firm.ts.
 */

/** One message in a thread. */
export interface Message {
  id: string;
  /**
   * Which side sent it.
   *
   * Two values, not a sender id, because the client portal only ever shows a
   * conversation between ONE client and the firm. Who at the firm holds the
   * thread is a property of the thread (`senderName`), and the portal has no
   * business rendering the firm's internal hand-offs between colleagues.
   */
  from: 'firm' | 'client';
  body: Record<Locale, string>;
  /** Days before the tenant's today. 0 means today. */
  sentDaysAgo: number;
  /** Wall-clock time in the tenant's zone. */
  sentAt: ClockTime;
}

export interface MessageThread {
  id: string;
  firmId: string;
  /*
   * No client id here, and none needed.
   *
   * A thread hangs off an engagement (`engagementRef` below), and the
   * engagement names the client - fixtures/matters.ts, fixtures/projects.ts.
   * This row used to carry a `clientAccountId` of its own, which was a second
   * record of the same fact and free to disagree with the first. Derive,
   * don't store.
   */

  /** Who at the firm holds this thread, per locale. */
  senderName: Record<Locale, string>;
  /** Their role on this file, per locale — not their firm rank. */
  senderRole: Record<Locale, string>;

  subject: Record<Locale, string>;

  /** Matter or project the thread hangs off. */
  engagementRef: string;

  /** The exchange, oldest first. Its last entry drives the thread's summary. */
  messages: Message[];

  unread: boolean;
}

// MOCK: replace with GET /api/messages — tenant-scoped and client-scoped
// server-side. Unread state is per-account and must be stored per-account, not
// derived from a flag on the thread the way this fixture does it; two people at
// the same client organisation do not share one read cursor. Track A.5.
export const demoMessageThreads: MessageThread[] = [
  {
    id: 'msg-8821',
    firmId: demoFirm.id,
    senderName: { en: 'Mansoor Al-Farooq', ar: 'منصور الفاروق' },
    senderRole: { en: 'Lead counsel', ar: 'المحامي المسؤول' },
    subject: {
      en: 'Hearing preparation and attendance',
      ar: 'التحضير للجلسة والحضور',
    },
    engagementRef: 'MAT-2201',
    unread: true,
    messages: [
      {
        id: 'm-8821-1',
        from: 'firm',
        body: {
          en: 'The hearing is listed and we have the bundle lodged. I will send the witness timeline once it is settled with the Registry.',
          ar: 'تم تحديد موعد الجلسة وإيداع الحافظة. سأرسل الجدول الزمني للشهود فور اعتماده لدى قلم المحكمة.',
        },
        sentDaysAgo: 2,
        sentAt: '15:40',
      },
      {
        id: 'm-8821-2',
        from: 'client',
        body: {
          en: 'Understood. Do you need anyone from our side to attend in person, or is counsel attendance sufficient?',
          ar: 'مفهوم. هل تحتاجون حضور أحد من طرفنا شخصيًا، أم يكفي حضور هيئة الدفاع؟',
        },
        sentDaysAgo: 1,
        sentAt: '09:05',
      },
      {
        id: 'm-8821-3',
        from: 'firm',
        body: {
          en: 'The witness timeline is attached. Please read it through before our next call so we can confirm who attends in person.',
          ar: 'مرفق الجدول الزمني للشهود. يُرجى مراجعته قبل اتصالنا القادم لنؤكد من سيحضر شخصيًا.',
        },
        sentDaysAgo: 0,
        sentAt: '11:30',
      },
    ],
  },
  {
    id: 'msg-8814',
    firmId: demoFirm.id,
    senderName: { en: 'Huda Al-Mansoor', ar: 'هدى المنصور' },
    senderRole: { en: 'Counsel', ar: 'محامية' },
    subject: {
      en: 'Draft disclosure for your approval',
      ar: 'مسودة الإفصاح لاعتمادكم',
    },
    // Pairs with MAT-3088's "draft disclosure pending your approval" status —
    // the thing that needs the client and the message about it are the same
    // thing, so they say the same thing.
    engagementRef: 'MAT-3088',
    unread: true,
    messages: [
      {
        id: 'm-8814-1',
        from: 'firm',
        body: {
          en: 'We have finished reconciling the royalty figures against the audit sample. One schedule still needs your sign-off.',
          ar: 'انتهينا من مطابقة أرقام العوائد مع عينة التدقيق. ما زال أحد الجداول بحاجة إلى اعتمادكم.',
        },
        sentDaysAgo: 3,
        sentAt: '13:15',
      },
      {
        id: 'm-8814-2',
        from: 'firm',
        body: {
          en: 'The royalty schedule is ready for your approval before we file it with the court.',
          ar: 'جدول العوائد جاهز لاعتمادكم قبل إيداعه لدى المحكمة.',
        },
        sentDaysAgo: 1,
        sentAt: '16:05',
      },
    ],
  },
  {
    id: 'msg-8802',
    firmId: demoFirm.id,
    senderName: { en: 'Rana Al-Khatib', ar: 'رنا الخطيب' },
    senderRole: { en: 'Responsible lead', ar: 'المسؤولة عن المشروع' },
    subject: {
      en: 'Shareholder resolution for signature',
      ar: 'قرار الشركاء للتوقيع',
    },
    engagementRef: 'PRJ-4410',
    unread: false,
    messages: [
      {
        id: 'm-8802-1',
        from: 'firm',
        body: {
          en: 'The revised shareholder resolution is in your documents, incorporating the board comments on the transfer.',
          ar: 'قرار الشركاء المعدّل متاح في مستنداتكم، وقد روعيت فيه ملاحظات مجلس الإدارة بشأن النقل.',
        },
        sentDaysAgo: 4,
        sentAt: '10:15',
      },
      {
        id: 'm-8802-2',
        from: 'client',
        body: {
          en: 'I have read clause 4.2 on the transfer timeline. Does the registry filing have to happen at the same time, or can it follow?',
          ar: 'اطلعت على البند 4.2 الخاص بالجدول الزمني للنقل. هل يلزم أن يتم الإيداع لدى السجل في الوقت نفسه، أم يمكن أن يليه؟',
        },
        sentDaysAgo: 4,
        sentAt: '10:33',
      },
      {
        id: 'm-8802-3',
        from: 'firm',
        body: {
          en: 'It can follow. We file once the resolution is signed, and the foreign investment dossier goes in after that.',
          ar: 'يمكن أن يليه. نودع فور توقيع القرار، ثم يُرفع ملف الاستثمار الأجنبي بعد ذلك.',
        },
        sentDaysAgo: 4,
        sentAt: '10:42',
      },
    ],
  },
  {
    id: 'msg-8790',
    firmId: demoFirm.id,
    senderName: { en: 'Dalia Al-Sabah', ar: 'داليا الصباح' },
    senderRole: { en: 'Corporate manager', ar: 'مديرة الشؤون المؤسسية' },
    subject: {
      en: 'Articles of association filed',
      ar: 'تم إيداع عقد التأسيس',
    },
    engagementRef: 'PRJ-3902',
    unread: false,
    messages: [
      {
        id: 'm-8790-1',
        from: 'firm',
        body: {
          en: 'The registrar has acknowledged the filing. The certificate follows once it is issued.',
          ar: 'أقرّ المسجّل باستلام الإيداع، وستصلكم الشهادة فور صدورها.',
        },
        sentDaysAgo: 4,
        sentAt: '09:20',
      },
    ],
  },
  {
    id: 'msg-8771',
    firmId: demoFirm.id,
    senderName: { en: 'Salma Al-Hashemi', ar: 'سلمى الهاشمي' },
    senderRole: { en: 'Lead counsel', ar: 'المحامية المسؤولة' },
    subject: {
      en: 'Memorial filed with the tribunal',
      ar: 'إيداع المذكرة لدى هيئة التحكيم',
    },
    engagementRef: 'MAT-1940',
    unread: false,
    messages: [
      {
        id: 'm-8771-1',
        from: 'firm',
        body: {
          en: 'The statement of claim went in this morning. The tribunal will set the procedural calendar next.',
          ar: 'أُودعت صحيفة الدعوى صباح اليوم. ستحدد هيئة التحكيم الجدول الإجرائي تاليًا.',
        },
        sentDaysAgo: 12,
        sentAt: '08:45',
      },
      {
        id: 'm-8771-2',
        from: 'client',
        body: {
          en: 'Thank you. Please send the procedural calendar as soon as it is issued.',
          ar: 'شكرًا لكم. يُرجى إرسال الجدول الإجرائي فور صدوره.',
        },
        sentDaysAgo: 11,
        sentAt: '17:20',
      },
    ],
  },
];
