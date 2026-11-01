import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/transcripts.ts — sample minutes for two of the firm's own meetings.
 *
 * ===========================================================================
 * THIS IS THE ONE FIXTURE IN THE PROJECT THAT INVENTS ITS OWN CONTENT
 * ===========================================================================
 * Everywhere else, inventing readable content has been refused: the legal
 * database's provisions are Lorem Ipsum, the documents have no bodies, the
 * canvas marks up a placeholder. BUILD_PLAN.md §5 makes exactly one exception,
 * and this is it — "Meeting transcripts/minutes: static realistic sample
 * content tied to the demo's fixture meetings."
 *
 * The exception is narrow, and it is narrow for a reason that is worth being
 * precise about. A statutory provision is a CLAIM: somebody can act on it and
 * be wrong. A sentence somebody said in a meeting room is not a claim about the
 * world — it is a record of a conversation — and a transcript reader with no
 * transcript in it demonstrates nothing at all. So the content exists.
 *
 * ===========================================================================
 * WHAT THE DIALOGUE MAY AND MAY NOT CONTAIN
 * ===========================================================================
 * The exception covers the FORM of a conversation, not permission to put
 * anything into somebody's mouth. Every turn below is ADMINISTRATIVE: who holds
 * what, what is outstanding, who picks something up, when the next step is.
 *
 * None of it contains:
 *   · a statute, an article number, a regulation or a case;
 *   · a legal conclusion, an opinion or advice a reader could act on;
 *   · a sum of money, a percentage or an absolute date;
 *   · a person or organisation that is not already in these fixtures.
 *
 * That line is not squeamishness. A demo transcript that has a partner saying
 * "Article 71 requires thirty days' notice" is the legal database's invented
 * provision again, with the added authority of having been said out loud by a
 * named lawyer — and this time there is no Lorem Ipsum to disqualify it on
 * sight. The Stitch export does precisely this: its transcript has speakers
 * citing UAE Civil Code Articles 390 and 559, DIFC Law No. 5 of 2018 and DIAC
 * Rules 2022 Article 14, none of which anybody said and none of which say what
 * the export says they say.
 *
 * ===========================================================================
 * INTERNAL MEETINGS ONLY, AND THAT IS A CONSTRAINT RATHER THAN AN OVERSIGHT
 * ===========================================================================
 * `demoFirmEvents` holds client meetings too, and the export's transcript is of
 * one. There is no transcript for a client meeting here because a transcript
 * attributes every turn to a speaker, and this product has no roster for anyone
 * outside the firm: `demoClientTeam` covers the one client with a portal, and
 * the other four have no named people at all. So a client meeting's transcript
 * would have to either invent the people on the other side of the table, or
 * label half its turns "client representative" — which is not a transcript, it
 * is a redaction with the firm's half left in.
 *
 * Every speaker below is an id into `demoStaff`, so a name is resolved in one
 * place and a transcript cannot go on calling somebody by a name the roster has
 * changed.
 *
 * ===========================================================================
 * AND ONLY MEETINGS THAT HAVE ALREADY HAPPENED
 * ===========================================================================
 * Both events below are in the past (`inDays < 0`). A transcript of a meeting
 * that has not started is incoherent, and it is the kind of incoherence a
 * relative-offset fixture makes easy to ship — see fixtures/engagements.ts on
 * why nothing here states a fixed date.
 *
 * ===========================================================================
 * THE TWO ROWS ARE CHOSEN SO THE PERMISSION GATE IS REACHABLE
 * ===========================================================================
 * Minutes of an internal meeting are readable by the people who were in the
 * room and nobody else. `evt-08` includes the signed-in partner and `evt-05`
 * does not, so one transcript opens and the other answers 404 — see
 * `staff.meetingTranscript` in lib/mock-api.ts for why it is a 404 and not an
 * explanation.
 *
 * MOCK: in production minutes are a document on the matter file, written by
 * whoever took them, with an author and a revision history. Nothing here was
 * recorded, transcribed or generated: there is no meeting recorder in this
 * product, and the screen says so permanently rather than in a footnote. Track
 * A.5 at the earliest, and a real transcription service is Track B
 * (BUILD_PLAN.md §6).
 */

/** One thing one person said. */
export interface TranscriptTurn {
  /**
   * Seconds from the start of the meeting.
   *
   * An offset, not a clock time. The event carries the wall-clock start
   * (fixtures/practice.ts) and the reader adds the two, so a transcript cannot
   * disagree with the calendar about when the meeting was.
   *
   * Must be strictly ascending within a transcript and must fall inside the
   * meeting's length. Both are checked — a turn at 01:12:00 of a 45-minute
   * meeting is the version-history dates mistake in a different fixture.
   */
  atSeconds: number;
  /** An id into `demoStaff`. Never a name. */
  speakerId: string;
  /**
   * What they said, in both languages.
   *
   * THE SAME CONVERSATION, NOT TWO CONVERSATIONS. The Stitch export shipped an
   * English transcript and an Arabic transcript of the same meeting with
   * different speakers saying different things — the same failure as its
   * statute, which gave one citation two different texts. A meeting happened
   * once; this is that meeting in the reader's language.
   */
  text: Record<Locale, string>;
}

export interface MeetingTranscript {
  /** An id into `demoFirmEvents`. The meeting is not restated here. */
  eventId: string;
  turns: TranscriptTurn[];
}

export const demoMeetingTranscripts: MeetingTranscript[] = [
  {
    /*
     * Internal case conference, the day after the client kick-off.
     *
     * Four people are in the room and three of them speak. The fourth is the
     * legal secretary, and she is in the attendee list rather than the
     * transcript on purpose: "who was in the meeting" and "who is in the
     * minutes" are different lists, and a reader who assumes the second is the
     * first concludes that somebody was not there.
     */
    eventId: 'evt-08',
    turns: [
      {
        atSeconds: 0,
        speakerId: 'stf-001',
        text: {
          en: 'Right — this is the follow-up to yesterday. I want to know what we are waiting on and who is holding it.',
          ar: 'حسناً — هذه متابعة لاجتماع الأمس. أريد أن أعرف ما ننتظره ومن يتولّاه.',
        },
      },
      {
        atSeconds: 42,
        speakerId: 'stf-004',
        text: {
          en: 'Three things are still with the client. The employment contracts for the two claimants, the payroll records for the period, and the internal grievance file.',
          ar: 'ثلاثة أمور ما زالت عند الموكل: عقود العمل الخاصة بالمُدّعيين، وسجلات الرواتب للفترة، وملف الشكوى الداخلي.',
        },
      },
      {
        atSeconds: 118,
        speakerId: 'stf-001',
        text: {
          en: 'Did they give you a date?',
          ar: 'هل حدّدوا موعداً؟',
        },
      },
      {
        atSeconds: 131,
        speakerId: 'stf-004',
        text: {
          en: 'They said before the end of the week. I do not have it in writing.',
          ar: 'قالوا قبل نهاية الأسبوع. لكن ليس لديّ ذلك كتابةً.',
        },
      },
      {
        atSeconds: 185,
        speakerId: 'stf-001',
        text: {
          en: 'Put it in writing today and copy me. If it slips, I would rather know on the day than at the end of the week.',
          ar: 'ثبّتي ذلك كتابةً اليوم وضعيني في نسخة. وإن تأخّر، أفضّل أن أعرف في يومه لا في نهاية الأسبوع.',
        },
      },
      {
        atSeconds: 260,
        speakerId: 'stf-003',
        text: {
          en: 'I have started the chronology from what we already hold. It stops at the point the grievance was raised, because nothing after that is on the file yet.',
          ar: 'بدأتُ بإعداد التسلسل الزمني مما لدينا بالفعل. وهو يتوقّف عند تقديم الشكوى، لأن ما بعدها ليس في الملف بعد.',
        },
      },
      {
        atSeconds: 348,
        speakerId: 'stf-001',
        text: {
          en: 'Leave the gap visible in the draft. I would rather see where it stops than read around it.',
          ar: 'اتركي الفراغ ظاهراً في المسودّة. أن أرى أين تتوقّف أفضل من أن أقرأ من حولها.',
        },
      },
      {
        atSeconds: 422,
        speakerId: 'stf-003',
        text: {
          en: 'Understood. I will mark the gaps rather than smooth them over.',
          ar: 'مفهوم. سأُشير إلى الفراغات بدلاً من تجاوزها.',
        },
      },
      {
        atSeconds: 495,
        speakerId: 'stf-004',
        text: {
          en: 'One more thing. The client asked who their point of contact is while I am away next week.',
          ar: 'أمر آخر. سأل الموكل عن جهة الاتصال لديه أثناء غيابي الأسبوع المقبل.',
        },
      },
      {
        atSeconds: 570,
        speakerId: 'stf-001',
        text: {
          en: 'Fatima picks it up. Put that in the same note, so they are not guessing.',
          ar: 'تتولّاها فاطمة. اذكري ذلك في المذكّرة نفسها، حتى لا يبقى الأمر تخميناً.',
        },
      },
      {
        atSeconds: 700,
        speakerId: 'stf-001',
        text: {
          en: 'Anything else? Then we pick this up when the documents land.',
          ar: 'هل من شيء آخر؟ إذن نعود إلى الملف حين تصل المستندات.',
        },
      },
    ],
  },

  {
    /*
     * Evidence bundle walkthrough. The signed-in partner is NOT in the room,
     * which is the whole reason this row exists: without it the attendee gate
     * would be code nobody could reach.
     */
    eventId: 'evt-05',
    turns: [
      {
        atSeconds: 0,
        speakerId: 'stf-003',
        text: {
          en: 'We are going through the bundle as it stands. Noor — what is in it at the moment?',
          ar: 'نراجع الحافظة بوضعها الحالي. نور، ما الموجود فيها الآن؟',
        },
      },
      {
        atSeconds: 35,
        speakerId: 'stf-006',
        text: {
          en: 'Sections one to four are complete and paginated. Section five is waiting on the two documents the client has not sent.',
          ar: 'الأقسام من الأول إلى الرابع مكتملة ومُرقّمة الصفحات. والقسم الخامس ينتظر المستندين اللذين لم يُرسلهما الموكل.',
        },
      },
      {
        atSeconds: 110,
        speakerId: 'stf-005',
        text: {
          en: 'The index still lists them, so the pagination will move once they arrive.',
          ar: 'الفهرس ما زال يذكرهما، لذا سيتغيّر ترقيم الصفحات عند وصولهما.',
        },
      },
      {
        atSeconds: 160,
        speakerId: 'stf-003',
        text: {
          en: 'Then nothing in section five gets a page number until they are in. Leave it out of the index rather than reserving numbers for it.',
          ar: 'إذن لا ترقيم لأي صفحة في القسم الخامس قبل وصولهما. ويُترك القسم خارج الفهرس بدلاً من حجز أرقام له.',
        },
      },
      {
        atSeconds: 245,
        speakerId: 'stf-006',
        text: {
          en: 'That changes the running total on the cover sheet.',
          ar: 'هذا يغيّر المجموع على صفحة الغلاف.',
        },
      },
      {
        atSeconds: 292,
        speakerId: 'stf-003',
        text: {
          en: 'The cover sheet goes last. Huda — check the copies against the originals as they come in, not afterwards.',
          ar: 'صفحة الغلاف في النهاية. هدى، تحقّقي من مطابقة الصور للأصول عند وصول كل مستند، لا بعد ذلك.',
        },
      },
      {
        atSeconds: 390,
        speakerId: 'stf-005',
        text: {
          en: 'I will log each one as I check it.',
          ar: 'سأُسجّل كل مستند عند التحقّق منه.',
        },
      },
    ],
  },
];

/** The transcript of a meeting, or undefined. No meeting is required to have one. */
export function transcriptFor(eventId: string): MeetingTranscript | undefined {
  return demoMeetingTranscripts.find((row) => row.eventId === eventId);
}
