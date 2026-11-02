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
  Save,
  Undo,
  Redo,
  Sparkles,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Loader2,
  Printer,
  Cloud,
  Eye,
  RefreshCw,
  Upload,
  Settings,
  X,
  Share2,
} from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import {
  generateWordAction,
  openWordOnlineAction,
  syncFromWordOnlineAction,
  uploadUpdatedDocxAction,
  getMicrosoftStatusAction,
  getMicrosoftAuthUrlAction,
  disconnectMicrosoftAction,
} from '../../register/generate-document-actions';
import { getActiveMattersForTimer, type ActiveMatterOption } from '../../time/get-matters-action';

interface DocumentDraftCanvasProps {
  initialMatter?: string;
  initialTemplate?: string;
  autoOpenWord?: boolean;
  initialDocId?: string;
  locale: string;
}

const TEMPLATE_PRESETS = {
  pleading: {
    title: 'مـذكـرة بـدفـاع ودفـوع شـكـلـيـة ومـوضـوعـيـة',
    court: 'محكمة استئناف القاهرة - الدائرة التجارية (الاستئنافية)',
    circuit: 'الدائرة السابعة تجاري',
    caseNumber: '1428 / قيد تجاري استئناف 2026',
    clientRole: 'المستأنف ضده (المدعى عليه)',
    opposing: 'شركة الشرق الأوسط للتجارة الدولية ش.م.م.',
    body: `أولاً: وقائع النزاع الموضوعية:
تخلص وقائع النزاع الماثل في قيام موكلنا بالتعاقد والمباشرة القانونية استناداً إلى عقد التوزيع والوكالة التجارية المبرم بين الطرفين والمودع أصله بحافظة المستندات.
وحيث إن الطرف الخصم قد امتنع دون مسوغ قانوني أو مبرر مشروع عن الوفاء بالتزاماته التعاقدية التوريدية، وسعى للإضرار العمدي بالمركز المالي لموكلنا والإخلال ببنود التوريد المتفق عليها.
الأمر الذي حدا بموكلنا إلى إقامة دعواه الماثلة، حمايةً لحقوقه المادية والتعويضية، وتطبيقاً لقواعد العدالة واستقرار المعاملات التجارية.

ثانياً: الدفوع والأسانيد القانونية الجوهرية:
1. الدفع بالمسؤولية العقدية وثبوت الإخلال التعاقدي الجسيم:
إعمالاً لنص المادة 147 والمادة 157 من القانون المدني، والتي قررت أن: "العقد شريعة المتعاقدين، فلا يجوز نقضه ولا تعديله إلا باتفاق الطرفين، أو للأسباب التي يقررها القانون".
2. الدفع بعدم جواز استناد الخصم بالدفع بعدم التنفيذ:
لكونه هو البادئ بالإخلال الفوري بالعقد والامتناع عن تسليم الحصص المقررة.
3. ثبوت أركان التعويض (الخطأ، الضرر المحقق، وعلاقة السببية المباشرة):
ثبوتاً يقيناً مستفاداً من أوراق الدعوى وتقرير لجنة الفحص والتدقيق المرفقة.
وحيث استقر قضاء محكمة النقض على أن: "استخلاص الخطأ الموجب للمسؤولية العقدية والضرر وعلاقة السببية بينهما من سلطة محكمة الموضوع ما دامت بنت قضاءها على أسباب سائغة تكفي لحمله ولها أصلها الثابت بالأوراق".

ثالثاً: الطلبات الختامية:
بناءً عليه - يلتمس الموكل من عدالة المحكمة الموقرة:
أصلياً: القضاء بإلزام المدعى عليه بكافة الطلبات الواردة بصحيفة افتتاح الدعوى، مع إلزامه بالتعويض الجابر للأضرار المادية والأدبية، والمصروفات ومقابل أتعاب المحاماة الفعلية عملاً بنص المادة 184 مرافعات.
احتياطياً: ندب خبير حسابي مقيد بالجدول لتحقيق عناصر الإخلال وحساب قيمة الأرباح الفائتة والخسائر اللاحقة بالموكل.`,
  },
  contract: {
    title: 'عـقـد اتـفـاق وتـقـديـم خـدمـات وأتـعـاب قـانـونـيـة',
    court: 'مكتب ميزان للمحاماة والاستشارات القانونية',
    circuit: 'إدارة العقود والتمويل التجاري',
    caseNumber: 'AGR-2026-LEG-019',
    clientRole: 'الطرف الأول (الموكل)',
    opposing: 'الطرف الثاني (المحامي الوكيل)',
    body: `الديباجة والتمهيد:
إنه في يوم الأحد الموافق 2026/11/01م، قد تم الاتفاق والتراضي بين كل من:
1. شركة الخليج القابضة للتجارة والاستثمار - ويمثلها في التوقيع رئيس مجلس الإدارة (الطرف الأول - الموكل).
2. مكتب ميزان للمحاماة والاستشارات القانونية - ويمثله الشريك المسؤول الأستاذ/ منصور الفاروق (الطرف الثاني - المحامي).
وبعد أن أقر الطرفان بأهليتهما القانونية والصفة المعتبرة للتعاقد، اتفقا على البنود الآتية:

البند الأول: موضوع التمثيل القانوني:
يكلف الطرف الأول الطرف الثاني بمباشرة كافة الإجراءات القضائية والاستشارية والتفاوضية المرتبطة بملف النزاع التجاري والمطالبات المالية الناشئة عنه أمام كافة الجهات القضائية وهيئات التحكيم المختصة.

البند الثاني: نطاق الأتعاب وآلية الاستحقاق:
تحدد أتعاب الطرف الثاني بموجب جدول الدفعات والمهام المعتمد، وتستحق وفقاً لمراحل الإنجاز المثبتة بتقارير العمل الرسمية الصادرة من المنظومة.`,
  },
  assignment: {
    title: 'تـكـلـيـف وتـفـويـض قـانـونـي رسـمـي',
    court: 'الهيئة العامة للتحكيم وتسوية منازعات الاستثمار',
    circuit: 'لجنة نظر التكليفات والوكالات القضائية',
    caseNumber: 'PWR-2026-004',
    clientRole: 'المفوض والموكل',
    opposing: 'المفوض إليه والوكيل',
    body: `إقرار تكليف رسمي:
نقر نحن الموقعين أدناه بصفتنا الممثلين القانونيين، بأننا قد كلفنا وفوضنا السادة محامي مكتب ميزان للاستشارات القانونية والتحكيم في تمثيلنا، والتوقيع نيابة عنا في اتخاذ كافة الإجراءات القانونية والطعون وتقديم المذكرات وحضور الجلسات في مواجهة كافة الجهات.
وهذا تفويض رسمي معتمد صادر للعمل بموجبه نظاماً وقانوناً.`,
  },
};

export function DocumentDraftCanvas({
  initialMatter = 'MAT-2201',
  initialTemplate = 'pleading',
  autoOpenWord = false,
  initialDocId,
  locale,
}: DocumentDraftCanvasProps) {
  const [selectedMatter, setSelectedMatter] = React.useState(initialMatter);
  const [templateType, setTemplateType] = React.useState<'pleading' | 'contract' | 'assignment'>('pleading');
  const [matters, setMatters] = React.useState<ActiveMatterOption[]>([]);

  // Document Fields
  const [title, setTitle] = React.useState(TEMPLATE_PRESETS[templateType].title);
  const [court, setCourt] = React.useState(TEMPLATE_PRESETS[templateType].court);
  const [circuit, setCircuit] = React.useState(TEMPLATE_PRESETS[templateType].circuit);
  const [caseNumber, setCaseNumber] = React.useState(TEMPLATE_PRESETS[templateType].caseNumber);
  const [clientRole, setClientRole] = React.useState(TEMPLATE_PRESETS[templateType].clientRole);
  const [opposing, setOpposing] = React.useState(TEMPLATE_PRESETS[templateType].opposing);
  const [bodyText, setBodyText] = React.useState(TEMPLATE_PRESETS[templateType].body);
  const [shareWithClient, setShareWithClient] = React.useState(true);

  // Actions state
  const [isSaving, startSavingTransition] = React.useTransition();
  const [isOpeningWordOnline, setIsOpeningWordOnline] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isUploadingUpdated, setIsUploadingUpdated] = React.useState(false);
  const [savedDoc, setSavedDoc] = React.useState<any | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = React.useState<string | null>(null);
  const [syncedPreview, setSyncedPreview] = React.useState<string | null>(null);

  // In-Website Document Viewer Modal
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  // Active Word Online Session State
  const [wordOnlineSession, setWordOnlineSession] = React.useState<{
    docId: string;
    docName: string;
    webUrl: string;
    mode: 'onedrive' | 'direct';
  } | null>(null);

  // Microsoft 365 status
  const [msStatus, setMsStatus] = React.useState<{
    is_connected: boolean;
    account_email?: string | null;
    account_name?: string | null;
  }>({ is_connected: false });
  const [showMsModal, setShowMsModal] = React.useState(false);

  // Fetch active matters & MS Status
  React.useEffect(() => {
    getActiveMattersForTimer().then((list) => {
      setMatters(list);
    });
    getMicrosoftStatusAction().then((status) => {
      if (status) setMsStatus(status);
    });

    if (initialDocId) {
      let isMounted = true;
      setIsLoadingPreview(true);

      // 1. Sync pending changes from OneDrive
      syncFromWordOnlineAction(initialDocId)
        .catch(() => null)
        .finally(() => {
          // 2. Fetch preview metadata
          fetch(`http://127.0.0.1:8000/api/documents/${initialDocId}/preview`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (!isMounted || !data) return;
              const loaded = {
                id: data.id,
                name: data.name,
                title: data.title,
                download_url: `/api/documents/${data.id}/download`,
                size_label: `${Math.round((data.size_bytes || 0) / 1024)} KB`,
                engagement_ref: initialMatter,
              };
              setSavedDoc(loaded);
              if (data.title) setTitle(data.title);
              if (data.paragraphs && data.paragraphs.length > 0) {
                setSyncedPreview(data.paragraphs.slice(-3).join('\n'));
              }

              if (autoOpenWord) {
                setIsOpeningWordOnline(true);
                openWordOnlineAction(data.id)
                  .then((res) => {
                    if (res.ok && res.data?.webUrl) {
                      window.open(res.data.webUrl, '_blank', 'noopener,noreferrer');
                      setWordOnlineSession({
                        docId: data.id,
                        docName: data.name,
                        webUrl: res.data.webUrl,
                        mode: res.data.mode || 'onedrive',
                      });
                    }
                  })
                  .finally(() => {
                    setIsOpeningWordOnline(false);
                  });
              }
            })
            .finally(() => {
              if (isMounted) setIsLoadingPreview(false);
            });
        });

      return () => {
        isMounted = false;
      };
    } else if (autoOpenWord) {
      handleOpenWordOnline();
    }
  }, [autoOpenWord, initialDocId]);

  // Auto-sync when user returns from the Word Online tab
  React.useEffect(() => {
    const docId = wordOnlineSession?.docId || savedDoc?.id || initialDocId;
    if (!docId) return;

    const onWindowFocus = () => {
      syncFromWordOnlineAction(docId)
        .then((res) => {
          if (res.ok && res.data) {
            setSyncSuccessMessage('تمت مزامنة وحفظ التعديلات تلقائياً من Word!');
            if (res.data.preview_text) {
              setSyncedPreview(res.data.preview_text);
            }
          }
        })
        .catch(() => null);
    };

    window.addEventListener('focus', onWindowFocus);
    return () => {
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [wordOnlineSession?.docId, savedDoc?.id, initialDocId]);

  // When template changes, apply preset
  const handleTemplateChange = (type: 'pleading' | 'contract' | 'assignment') => {
    setTemplateType(type);
    const preset = TEMPLATE_PRESETS[type];
    setTitle(preset.title);
    setCourt(preset.court);
    setCircuit(preset.circuit);
    setCaseNumber(preset.caseNumber);
    setClientRole(preset.clientRole);
    setOpposing(preset.opposing);
    setBodyText(preset.body);
    setSavedDoc(null);
    setWordOnlineSession(null);
  };

  // Quick insertion helpers
  const insertLegalClause = (textToInsert: string) => {
    setBodyText((prev) => `${prev}\n\n${textToInsert}`);
  };

  // Helper: Persist Word doc to PostgreSQL & disk
  const saveDocumentLocally = async () => {
    return await generateWordAction({
      matter_reference: selectedMatter,
      template_type: templateType,
      title,
      court_name: court,
      circuit,
      case_number: caseNumber,
      client_role: clientRole,
      opposing_party: opposing,
      body: bodyText,
      is_firm_only: !shareWithClient,
    });
  };

  // 1. Save to Site & Export .docx directly
  const handleSaveAndExport = () => {
    setErrorMessage(null);
    setSyncSuccessMessage(null);
    startSavingTransition(async () => {
      const res = await saveDocumentLocally();
      if (res.ok && res.data) {
        setSavedDoc(res.data);
        const downloadUrl = `http://127.0.0.1:8000${res.data.download_url}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setErrorMessage(res.error || 'حدث خطأ أثناء حفظ المستند في النظام.');
      }
    });
  };

  // 2. Open in official Microsoft Word Online in a NEW TAB
  const handleOpenWordOnline = async () => {
    setErrorMessage(null);
    setSyncSuccessMessage(null);
    setIsOpeningWordOnline(true);

    try {
      // First ensure the document is saved and registered in PostgreSQL
      let currentDocId = savedDoc?.id || initialDocId;
      let currentDocName = savedDoc?.name;

      if (!currentDocId) {
        const saveRes = await saveDocumentLocally();
        if (!saveRes.ok || !saveRes.data) {
          throw new Error(saveRes.error || 'تعذر إنشاء المستند في النظام قبل الفتح.');
        }
        currentDocId = saveRes.data.id;
        currentDocName = saveRes.data.name;
        setSavedDoc(saveRes.data);
      }

      // Call Backend to initiate Word Online session (OneDrive upload or direct word.new)
      const res = await openWordOnlineAction(currentDocId);
      if (res.ok && res.data && res.data.webUrl) {
        const targetUrl = res.data.webUrl;
        // Open official Microsoft Word Online in a new browser tab!
        window.open(targetUrl, '_blank', 'noopener,noreferrer');

        // Set active session for live syncing
        setWordOnlineSession({
          docId: currentDocId,
          docName: currentDocName || savedDoc?.name || 'مستند وورد',
          webUrl: targetUrl,
          mode: res.data.mode || 'direct',
        });
      } else {
        throw new Error(res.error || 'تعذر الحصول على رابط Microsoft Word Online.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء فتح Word Online.');
    } finally {
      setIsOpeningWordOnline(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreviewModal = async (targetDocId?: string) => {
    const docId = targetDocId || wordOnlineSession?.docId || savedDoc?.id || initialDocId;
    if (!docId) {
      setErrorMessage('يرجى حفظ المستند أولاً للمعاينة.');
      return;
    }
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`http://localhost:8000/api/documents/${docId}/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
        setPreviewModalOpen(true);
      } else {
        setErrorMessage('تعذر جلب محتوى المستند للمعاينة.');
      }
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء تحميل معاينة المستند.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // 3. Sync edits back from Microsoft Word Online / OneDrive
  const handleSyncFromWordOnline = async () => {
    const docId = wordOnlineSession?.docId || savedDoc?.id || initialDocId;
    if (!docId) return;
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncSuccessMessage(null);

    try {
      const res = await syncFromWordOnlineAction(docId);
      if (res.ok && res.data) {
        setSyncSuccessMessage('تمت مزامنة كافة التعديلات من Microsoft Word Online وحفظها في الموقع بنجاح!');
        if (res.data.preview_text) {
          setSyncedPreview(res.data.preview_text);
        }
        if (savedDoc) {
          setSavedDoc({
            ...savedDoc,
            size_bytes: res.data.size_bytes,
            updated_at: res.data.synced_at,
          });
        }
      } else {
        setErrorMessage(
          res.error ||
            'المستند مفتوح بوضع Word المباشر أو لم تنته المزامنة بعد. يمكنك أيضاً رفع النسخة المعدلة عبر زر "رفع النسخة المعدلة" لحفظها فوراً.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشلت المزامنة التلقائية.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Manual upload of edited .docx file to save in the system
  const handleUploadUpdatedDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedDoc?.id) return;

    setIsUploadingUpdated(true);
    setErrorMessage(null);
    setSyncSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadUpdatedDocxAction(savedDoc.id, formData);
      if (res.ok && res.data) {
        setSyncSuccessMessage('تم رفع وحفظ النسخة المحدثة في الموقع وقاعدة بيانات القضية بنجاح!');
        setSavedDoc({
          ...savedDoc,
          size_bytes: res.data.size_bytes,
          updated_at: res.data.updated_at,
        });
      } else {
        setErrorMessage(res.error || 'تعذر رفع الملف المحدث.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء رفع المستند.');
    } finally {
      setIsUploadingUpdated(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 pb-16" dir="rtl">
      {/* 1. Executive Top Bar (Word Editor Ribbon) */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 bg-white px-6 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/staff"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            title="العودة لمساحة العمل"
          >
            <ArrowRight size={18} />
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">محرر مستندات Word الرسمي</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                  Microsoft 365 / .DOCX
                </span>
                {msStatus.is_connected && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Cloud size={10} /> OneDrive متصل
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                صياغة وتعديل مباشر مع الحفظ في PostgreSQL والمزامنة مع Microsoft Word Online
              </p>
            </div>
          </div>
        </div>

        {/* Matter & Template Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1">
            <span className="text-xs font-semibold text-gray-600">القضية:</span>
            <select
              value={selectedMatter}
              onChange={(e) => setSelectedMatter(e.target.value)}
              className="bg-transparent text-xs font-bold text-legal-navy focus:outline-none"
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

          {/* Template buttons */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => handleTemplateChange('pleading')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                templateType === 'pleading' ? 'bg-white text-blue-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              مذكرة دفاع
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('contract')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                templateType === 'contract' ? 'bg-white text-blue-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              عقد اتفاق
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('assignment')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                templateType === 'assignment' ? 'bg-white text-blue-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              تكليف رسمي
            </button>
          </div>

          {/* Share toggle */}
          <label className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={shareWithClient}
              onChange={(e) => setShareWithClient(e.target.checked)}
              className="rounded text-action focus:ring-action"
            />
            مشاركة مع العميل
          </label>

          {/* IN-WEBSITE PREVIEW BUTTON */}
          <Button
            variant="secondary"
            onClick={() => handleOpenPreviewModal()}
            disabled={isLoadingPreview}
            icon={isLoadingPreview ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} className="text-gray-700" />}
            className="border-gray-300 bg-white text-gray-800 hover:bg-gray-50 font-bold shadow-xs transition-all"
          >
            {isLoadingPreview ? 'جاري التحميل...' : '👁️ عرض المستند في الموقع'}
          </Button>

          {/* PRIMARY BUTTON 1: Open in Official Microsoft Word Online Tab */}
          <Button
            variant="secondary"
            onClick={handleOpenWordOnline}
            disabled={isOpeningWordOnline}
            icon={isOpeningWordOnline ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} className="text-[#0078D4]" />}
            className="border-[#0078D4] bg-white text-[#0078D4] hover:bg-blue-50 font-bold shadow-xs transition-all"
          >
            {isOpeningWordOnline ? 'جاري التجهيز والفتح...' : 'فتح في Microsoft Word Online (الرسمي)'}
          </Button>

          {/* PRIMARY BUTTON 2: Save to Site & Export Local Docx */}
          <Button
            variant="primary"
            onClick={handleSaveAndExport}
            disabled={isSaving}
            icon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
          >
            {isSaving ? 'جاري الحفظ والتصدير...' : 'حفظ في الموقع وتصدير (.docx)'}
          </Button>
        </div>
      </header>

      {/* 2. Interactive Word Online Session Banner */}
      <div className="mx-auto max-w-5xl px-6 pt-4">
        {wordOnlineSession && (
          <div className="mb-4 rounded-xl border border-blue-400 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-5 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0078D4] text-white shadow-xs">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-bold text-base text-gray-900">
                      المستند مفتوح الآن في تاب Microsoft Word Online الرسمي 🌐
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    يمكنك كتابة وتنسيق مذكرتك في نافذة وورد الرسمية. عند الانتهاء، استخدم الأزرار التالية لحفظ التعديلات في الموقع:
                  </p>
                </div>
              </div>

              <a
                href={wordOnlineSession.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0078D4] px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                التبديل إلى نافذة Word Online
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Sync & Save Controls */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-blue-200 pt-3">
              <button
                type="button"
                onClick={handleSyncFromWordOnline}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
              >
                {isSyncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                مزامنة التعديلات من Word Online وحفظ في الموقع
              </button>

              <label className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer shadow-xs">
                {isUploadingUpdated ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} className="text-blue-700" />}
                رفع النسخة المعدلة وحفظها في الموقع (.docx)
                <input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleUploadUpdatedDocx}
                  disabled={isUploadingUpdated}
                />
              </label>

              <button
                type="button"
                onClick={() => handleOpenPreviewModal()}
                disabled={isLoadingPreview}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-xs font-bold text-gray-800 hover:bg-blue-50 transition-colors shadow-xs"
              >
                {isLoadingPreview ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} className="text-gray-700" />}
                👁️ عرض المستند في الموقع
              </button>

              <Link
                href={`/staff/matters/${selectedMatter}`}
                className="ms-auto inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline"
              >
                عرض المستند في صفحة القضية ({selectedMatter})
                <ArrowRight size={14} className="rotate-180" />
              </Link>
            </div>
          </div>
        )}

        {/* Synced Content Live Preview */}
        {syncedPreview && (
          <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs space-y-2 text-right shadow-xs">
            <div className="flex items-center justify-between font-bold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                آخر نص وتوقيع تم حفظه من Word في قاعدة بيانات الموقع:
              </span>
              <span className="text-[11px] text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">محفوظ بنجاح ✅</span>
            </div>
            <div className="rounded-lg bg-white p-3.5 font-sans font-medium text-gray-900 whitespace-pre-wrap border border-emerald-200 text-xs leading-relaxed">
              {syncedPreview}
            </div>
          </div>
        )}

        {/* Sync Success Message */}
        {syncSuccessMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-xs animate-in fade-in">
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-bold">{syncSuccessMessage}</p>
          </div>
        )}

        {/* Saved Locally Notification */}
        {savedDoc && !wordOnlineSession && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">تم حفظ المستند بنجاح في الموقع وقاعدة البيانات!</p>
                <p className="text-xs text-emerald-700">
                  الملف: <span className="font-mono font-semibold">{savedDoc.name}</span> ({savedDoc.size_label}) • مرتبط بالقضية {savedDoc.engagement_ref}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`http://127.0.0.1:8000${savedDoc.download_url}`}
                download={savedDoc.name}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
              >
                <Download size={14} />
                تنزيل المستند مرة أخرى
              </a>
              <Link
                href={`/staff/matters/${selectedMatter}`}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                عرض في صفحة القضية
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 shadow-xs">
            <AlertCircle size={22} className="text-red-600 shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Editor Quick Insert Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <Sparkles size={16} className="text-amber-500" />
            <span>نصوص وصيغ قانونية سريعة للإدراج:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                insertLegalClause(
                  'الدفع بالمسؤولية العقدية وثبوت الضرر المباشر إعمالاً لنص المادتين 147 و 157 من القانون المدني.'
                )
              }
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 hover:text-blue-700 transition-colors"
            >
              + مادة 147 و 157 مدني
            </button>
            <button
              type="button"
              onClick={() =>
                insertLegalClause(
                  'الدفع بعدم قبول الدعوى لرفعها من غير ذي صفة أو مصلحة إعمالاً لنص المادة 3 من قانون المرافعات.'
                )
              }
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 hover:text-blue-700 transition-colors"
            >
              + الدفع بانعدام الصفة
            </button>
            <button
              type="button"
              onClick={() =>
                insertLegalClause(
                  'استقرار قضاء محكمة النقض على أن محكمة الموضوع ملزمة بتمحيص الدفاع الجوهري والرد عليه بأسباب كافية تسوغ قضاءها.'
                )
              }
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 hover:text-blue-700 transition-colors"
            >
              + مبدأ محكمة النقض
            </button>
            <button
              type="button"
              onClick={() =>
                insertLegalClause(
                  'الطلبات الختامية: القضاء بإلزام المدعى عليه بكافة المصروفات ومقابل أتعاب المحاماة الفعلية.'
                )
              }
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 hover:text-blue-700 transition-colors"
            >
              + الطلبات والمصاريف
            </button>
          </div>
        </div>

        {/* 3. Document A4 Canvas Container */}
        <div className="mx-auto max-w-[850px] rounded-xl border border-gray-300 bg-white p-12 shadow-md transition-shadow hover:shadow-lg">
          {/* Header Table / Letterhead */}
          <div className="mb-6 flex items-start justify-between border-b-2 border-legal-navy pb-4">
            <div>
              <h2 className="font-bold text-lg text-legal-navy">مكتب ميزان للمحاماة والاستشارات القانونية</h2>
              <p className="text-xs font-semibold text-amber-600">MEEZAN LEGAL ADVOCATES & ARBITRATION</p>
              <p className="mt-1 font-mono text-xs text-gray-500">الملف الداخلي: {selectedMatter}</p>
            </div>
            <div className="text-left text-xs text-gray-600 space-y-1">
              <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-semibold text-gray-500">الجهة / المحكمة:</span>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-right font-bold text-gray-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-semibold text-gray-500">الدائرة / الدائرة المختصة:</span>
                <input
                  type="text"
                  value={circuit}
                  onChange={(e) => setCircuit(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-right font-medium text-gray-800 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Case Registry Bar */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 shrink-0">رقم الدعوى / القيد:</span>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono font-bold text-gray-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 shrink-0">صفة موكلنا:</span>
                <input
                  type="text"
                  value={clientRole}
                  onChange={(e) => setClientRole(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-blue-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold text-gray-600 shrink-0">الخصم / الطرف المقابل:</span>
              <input
                type="text"
                value={opposing}
                onChange={(e) => setOpposing(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Document Title Header */}
          <div className="mb-8 text-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-center font-bold text-xl text-legal-navy border-b border-dashed border-gray-300 pb-2 focus:border-blue-600 focus:outline-none"
              placeholder="اكتب عنوان المذكرة أو المستند هنا..."
            />
          </div>

          {/* Document Body Text Area (Word Page Typography) */}
          <div className="mb-8">
            <label className="block text-xs font-bold text-gray-500 mb-2">
              نص المستند القانوني (يمكنك كتابة وتعديل الحجج والدفوع بحرية كاملة):
            </label>
            <textarea
              rows={22}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-4 text-sm leading-relaxed text-gray-900 font-sans focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-shadow"
              style={{ direction: 'rtl', textAlign: 'justify', lineHeight: 1.8 }}
              placeholder="اكتب هنا وقائع النزاع، الدفوع القانونية، الأسانيد، والطلبات الختامية..."
            />
          </div>

          {/* Signature Block */}
          <div className="mt-12 flex justify-between border-t border-gray-200 pt-6 text-xs">
            <div>
              <p className="font-bold text-gray-700">المرفقات والحوافظ:</p>
              <p className="text-gray-500 mt-1">حافظة مستندات رقم (1) مودعة بملف النزاع</p>
            </div>
            <div className="text-left">
              <p className="font-bold text-legal-navy text-sm">وكيل الموكل</p>
              <p className="text-gray-700 mt-1 font-semibold">الأستاذ / منصور الفاروق (المحامي بالنقض)</p>
              <p className="text-gray-400 mt-4">التوقيع والختم: .......................................</p>
            </div>
          </div>
        </div>
      </div>

      {/* In-Website Document Preview Modal */}
      <Modal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={previewData?.title || 'معاينة المستند المحفوظ'}
        description={`الملف: ${previewData?.name || savedDoc?.name || ''}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleOpenWordOnline}
                disabled={isOpeningWordOnline}
                icon={isOpeningWordOnline ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              >
                فتح ومتابعة التعديل في Word Online
              </Button>
              {savedDoc && (
                <a
                  href={`http://localhost:8000/api/documents/${savedDoc.id}/download`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download size={13} />
                  تحميل .docx
                </a>
              )}
            </div>
            <Button variant="secondary" onClick={() => setPreviewModalOpen(false)}>
              إغلاق
            </Button>
          </div>
        }
      >
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4" dir="rtl">
          <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm font-sans space-y-4 text-gray-900 text-sm leading-relaxed">
            {previewData?.paragraphs && previewData.paragraphs.length > 0 ? (
              previewData.paragraphs.map((para: string, idx: number) => {
                const isHeading =
                  para.startsWith('أولاً') ||
                  para.startsWith('ثانياً') ||
                  para.startsWith('ثالثاً') ||
                  para.startsWith('بـنـاءً') ||
                  para.startsWith('مذكرة') ||
                  para.startsWith('الوقائع') ||
                  para.startsWith('الطلبات');
                const isSignature = para.includes('التوقيع') || para.includes('وكـيـل الـمـوكـل');

                return (
                  <p
                    key={idx}
                    className={`${
                      isSignature
                        ? 'rounded-lg border border-emerald-300 bg-emerald-50/70 p-3.5 font-bold text-emerald-950 text-right whitespace-pre-wrap'
                        : isHeading
                        ? 'font-bold text-gray-900 pt-2 border-b border-gray-100 pb-1'
                        : 'text-gray-800'
                    }`}
                  >
                    {para}
                  </p>
                );
              })
            ) : (
              <p className="text-center text-gray-400 py-8">المستند لا يحتوي على فقرات نصية مقروءة.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
