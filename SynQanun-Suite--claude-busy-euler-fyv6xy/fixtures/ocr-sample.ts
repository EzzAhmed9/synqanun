/**
 * fixtures/ocr-sample.ts — a scanned document to try OCR with, and the text it
 * actually says.
 *
 * public/samples/ocr-sample-scan.pdf is two IMAGE-ONLY pages, as a scanner
 * produces: page 1 in Arabic, page 2 in English. They were rendered from the
 * lines below (Noto Naskh Arabic and Noto Serif, 30px on an A4 page at 150
 * dpi), then put through what an office scanner does to paper: a slight skew
 * (0.6° and −0.45°), blur, sensor noise, dust and uneven lamp light, and JPEG
 * compression (scripts/ocr-sample/). The two pages are also published as JPEGs
 * for trying the image path.
 *
 * Both pages say, in their own heading, that they are a test scan and not a
 * real document. The firm and client names are the demo tenant's own.
 *
 * `truth` is the ground truth the reading is measured against — see
 * docs/ocr-accuracy.md for how, and the figures.
 */
export const OCR_SAMPLE = {
  pdf: '/samples/ocr-sample-scan.pdf',
  pages: { ar: '/samples/ocr-sample-scan-ar.jpg', en: '/samples/ocr-sample-scan-en.jpg' },
  fileName: 'ocr-sample-scan.pdf',
  truth: {
    ar: [
      'ميزان القانونية',
      'نموذج مسح ضوئي لاختبار التعرف الضوئي على الحروف',
      'ليس مستندًا حقيقيًا',
      'التاريخ: 12 أكتوبر 2026',
      'إلى: شركة الخليج القابضة',
      'الموضوع: موعد اجتماع مراجعة الملف',
      'تحية طيبة وبعد،',
      'نود إعلامكم بأن اجتماع مراجعة الملف سيُعقد يوم الأحد الموافق',
      '18 أكتوبر 2026 الساعة العاشرة صباحًا في مقر المكتب بالرياض.',
      'نرجو التكرم بإحضار نسخة من العقد الأصلي والمراسلات ذات الصلة،',
      'وتأكيد الحضور قبل يوم الخميس بالرد على هذا الخطاب.',
      'وتفضلوا بقبول فائق الاحترام والتقدير،',
      'منصور الفاروق',
      'شريك',
    ],
    en: [
      'Meezan Legal',
      'Sample scan for OCR testing',
      'Not a real document',
      'Date: 12 October 2026',
      'To: Gulf Holdings',
      'Subject: File review meeting',
      'Dear Sirs,',
      'We write to confirm that the file review meeting will take place',
      'on Sunday 18 October 2026 at 10:00 at our office in Riyadh.',
      'Please bring a copy of the original agreement and the related',
      'correspondence, and confirm your attendance by Thursday.',
      'Yours faithfully,',
      'Mansoor Al-Farooq',
      'Partner',
    ],
  },
} as const;
