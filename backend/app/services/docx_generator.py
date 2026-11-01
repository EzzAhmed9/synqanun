import os
from io import BytesIO
from datetime import datetime
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

# Colors
COLOR_NAVY = RGBColor(27, 42, 74)     # #1B2A4A
COLOR_GOLD = RGBColor(197, 168, 128)  # #C5A880
COLOR_GRAY = RGBColor(100, 100, 100)
COLOR_BLACK = RGBColor(30, 30, 30)

def set_p_rtl(paragraph, align=WD_ALIGN_PARAGRAPH.RIGHT):
    """Ensure the paragraph is set to Right-To-Left (RTL) Arabic mode."""
    pPr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)
    paragraph.alignment = align

def add_ar_run(paragraph, text, font_name="Arial", size_pt=12, bold=False, italic=False, color=COLOR_BLACK):
    """Add a run with explicit Arabic/Complex Script RTL properties."""
    run = paragraph.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    
    rPr = run._r.get_or_add_rPr()
    rtl = OxmlElement('w:rtl')
    rtl.set(qn('w:val'), '1')
    rPr.append(rtl)
    
    # Configure font mapping for Arabic complex scripts
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:cs'), font_name)
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:hAnsi'), font_name)
    rPr.append(rFonts)
    return run

def set_cell_background(cell, fill_hex):
    """Set background color for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner padding for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_rtl(table):
    """Ensure entire table is laid out right-to-left."""
    tblPr = table._tbl.tblPr
    bidiVisual = OxmlElement('w:bidiVisual')
    tblPr.append(bidiVisual)

def add_divider_line(doc, color_hex="1B2A4A"):
    """Add a thin horizontal accent line."""
    p = doc.add_paragraph()
    set_p_rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="1" w:color="{color_hex}"/></w:pBdr>')
    pPr.append(pBdr)

def generate_pleading_memo(
    doc: Document,
    matter,
    client,
    firm,
    lead_counsel,
    params: dict
):
    """Generate official court pleading memo (مذكرة دفاع)."""
    # Header block
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(table)
    
    cell_right = table.cell(0, 0)
    cell_left = table.cell(0, 1)
    
    # Right cell: Court details
    court_name = params.get("court_name") or matter.forum_ar or "محكمة استئناف القاهرة"
    circuit = params.get("circuit") or "الدائرة التجارية الاستئنافية"
    case_number = params.get("case_number") or matter.court_file_number or f"{matter.reference}/2026"
    
    p1 = cell_right.paragraphs[0]
    set_p_rtl(p1, WD_ALIGN_PARAGRAPH.RIGHT)
    add_ar_run(p1, "جمهورية مصر العربية\n", size_pt=11, bold=True, color=COLOR_NAVY)
    add_ar_run(p1, "وزارة العدل\n", size_pt=10, bold=True, color=COLOR_GRAY)
    add_ar_run(p1, f"{court_name}\n", size_pt=11, bold=True)
    add_ar_run(p1, f"{circuit}\n", size_pt=10, color=COLOR_GRAY)
    add_ar_run(p1, f"القضية المقيدة برقم: {case_number}", size_pt=10, bold=True, color=COLOR_NAVY)
    
    # Left cell: Firm info & date
    p2 = cell_left.paragraphs[0]
    set_p_rtl(p2, WD_ALIGN_PARAGRAPH.LEFT)
    add_ar_run(p2, f"{firm.name_ar}\n", size_pt=12, bold=True, color=COLOR_NAVY)
    add_ar_run(p2, "للمحاماة والاستشارات القانونية\n", size_pt=10, color=COLOR_GOLD)
    add_ar_run(p2, f"التاريخ: {datetime.now().strftime('%Y/%m/%d')}\n", size_pt=9, color=COLOR_GRAY)
    add_ar_run(p2, f"ملف النزاع: {matter.reference}", size_pt=9, bold=True)

    add_divider_line(doc, "1B2A4A")

    # Document Title
    p_title = doc.add_paragraph()
    set_p_rtl(p_title, WD_ALIGN_PARAGRAPH.CENTER)
    p_title.paragraph_format.space_before = Pt(14)
    p_title.paragraph_format.space_after = Pt(14)
    custom_title = params.get("title") or f"مـذكــرة بـدفـاع ودفـوع فـي الـدعـوى رقـم {case_number}"
    add_ar_run(p_title, custom_title, size_pt=16, bold=True, color=COLOR_NAVY)

    # Parties Block (أطراف الخصومة)
    p_parties = doc.add_paragraph()
    set_p_rtl(p_parties, WD_ALIGN_PARAGRAPH.RIGHT)
    p_parties.paragraph_format.line_spacing = 1.3
    
    client_name = client.name_ar if client else "الموكل الموقر"
    client_role = params.get("client_role") or "المدعي / المستأنف"
    opposing = params.get("opposing_party") or matter.opposing_party_ar or "الطرف الخصم"
    lead_name = lead_counsel.name_ar if lead_counsel else "المحامي الوكيل"

    add_ar_run(p_parties, "مُـقـدمـة مـن:\n", size_pt=12, bold=True, color=COLOR_NAVY)
    add_ar_run(p_parties, f"السيد / {client_name} - (بصفته: {client_role})\n", size_pt=11, bold=True)
    add_ar_run(p_parties, f"وكيله الأستاذ / {lead_name} (المحامي بالنقض والاستئناف)\n\n", size_pt=11, color=COLOR_GRAY)
    
    add_ar_run(p_parties, "ضــــــــــــــــــــــــــــــد:\n", size_pt=13, bold=True, color=COLOR_NAVY)
    add_ar_run(p_parties, f"السيد / الشركة: {opposing} - (بصفته: الخصم المدعى عليه)\n", size_pt=11, bold=True)
    add_ar_run(p_parties, f"موضوع النزاع: {matter.title_ar}", size_pt=11, italic=True)

    add_divider_line(doc, "E0E0E0")

    # 1. Facts Section (أولاً: الوقائع)
    p_h1 = doc.add_paragraph()
    set_p_rtl(p_h1, WD_ALIGN_PARAGRAPH.RIGHT)
    p_h1.paragraph_format.space_before = Pt(12)
    add_ar_run(p_h1, "أولاً: وقـائـع الـنـزاع الـمـوضـوعـيـة", size_pt=13, bold=True, color=COLOR_NAVY)

    p_facts = doc.add_paragraph()
    set_p_rtl(p_facts, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_facts.paragraph_format.line_spacing = 1.3
    facts_text = params.get("facts") or (
        f"تتلخص وقائع النزاع الماثل في قيام موكلنا ({client_name}) بالتعاقد والمباشرة القانونية "
        f"وفقاً للثابت بالمستندات المودعة ملف الدعوى. وحيث إن الخصم قد امتنع دون مسوغ قانوني عن الوفاء بالتزاماته "
        f"العقدية، مما حدا بالموكل إلى إقامة هذه الدعوى حمايةً لحقوقه المادية والمعنوية، وذلك استناداً "
        f"إلى ما هو مقرر بنصوص القانون المدني والتجاري وأحكام محكمة النقض المستقرة.\n"
        f"وحيث إن الثابت بالأوراق أن الموكل قد أوفى بكامل التزاماته وحذر الخصم بموجب إنذارات رسمية على يد محضر، "
        f"فإنه يكون محقاً في كافة طلباته المبداة بصحيفة افتتاح الدعوى."
    )
    add_ar_run(p_facts, facts_text, size_pt=11)

    # 2. Legal Grounds Section (ثانياً: الأسانيد والدفوع القانونية)
    p_h2 = doc.add_paragraph()
    set_p_rtl(p_h2, WD_ALIGN_PARAGRAPH.RIGHT)
    p_h2.paragraph_format.space_before = Pt(12)
    add_ar_run(p_h2, "ثانياً: الـدفـوع والأفـكـار الـقـانـونـيـة الـجـوهـريـة", size_pt=13, bold=True, color=COLOR_NAVY)

    p_defenses = doc.add_paragraph()
    set_p_rtl(p_defenses, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_defenses.paragraph_format.line_spacing = 1.3
    defenses_text = params.get("defenses") or (
        "1. الدفع بالمسؤولية العقدية وإلزام الخصم بالتعويض الجابر للضرر طبقاً للمادتين 147 و 157 من القانون المدني.\n"
        "2. الدفع بعدم جواز الاحتجاج بالدفع بعدم التنفيذ لكون الخصم هو البادئ بالإخلال الجوهري بالعقد.\n"
        "3. ثبوت الضرر اللاحق بالموكل ثبوتاً يقينياً لا مراء فيه طبقاً للمستندات والتقارير الفنية المرفقة بحافظة المستندات.\n"
        "وحيث استقر قضاء محكمة النقض على أن 'العقد شريعة المتعاقدين، فلا يجوز نقضه ولا تعديله إلا باتفاق الطرفين، "
        "أو للأسباب التي يقررها القانون، وأن المدين ملزم بتنفيذ ما اشتمل عليه العقد بطريقة تتفق مع ما يوجبه حسن النية'."
    )
    add_ar_run(p_defenses, defenses_text, size_pt=11)

    # 3. Final Requests (ثالثاً: الطلبات الختامية)
    p_h3 = doc.add_paragraph()
    set_p_rtl(p_h3, WD_ALIGN_PARAGRAPH.RIGHT)
    p_h3.paragraph_format.space_before = Pt(12)
    add_ar_run(p_h3, "بـنـاءً عـلـيـه - يُـلـتـمـس مـن عـدالـة الـمـحـكـمـة الـمـوقـرة:", size_pt=13, bold=True, color=COLOR_NAVY)

    p_req = doc.add_paragraph()
    set_p_rtl(p_req, WD_ALIGN_PARAGRAPH.RIGHT)
    p_req.paragraph_format.line_spacing = 1.3
    requests_text = params.get("requests") or (
        "أولاً - في الشكل: قبول الدفوع الشكلية ومذكرة الدفاع شكلاً لتقديمها في الميعاد القانوني المقرر.\n"
        "ثانياً - في الموضوع:\n"
        "  1. القضاء بإلزام المدعى عليه بكافة الطلبات الواردة بأصل صحيفة الدعوى.\n"
        "  2. إلزامه بالمصروفات ومقابل أتعاب المحاماة الفعلية عملاً بنص المادة 184 من قانون المرافعات.\n"
        "احتياطياً: ندب خبير هندسي / حسابي مختص لإثبات عناصر الإخلال وحساب قيمة الأضرار المستحقة للموكل."
    )
    add_ar_run(p_req, requests_text, size_pt=11, bold=True)

    # Signatures
    p_sig = doc.add_paragraph()
    set_p_rtl(p_sig, WD_ALIGN_PARAGRAPH.LEFT)
    p_sig.paragraph_format.space_before = Pt(30)
    add_ar_run(p_sig, "وكـيـل الـمـوكـل\n", size_pt=12, bold=True, color=COLOR_NAVY)
    add_ar_run(p_sig, f"الأستاذ / {lead_name}\n", size_pt=11, bold=True)
    add_ar_run(p_sig, f"عن {firm.name_ar}\n", size_pt=10, color=COLOR_GRAY)
    add_ar_run(p_sig, "التوقيع: .......................................", size_pt=10, color=COLOR_GRAY)


def generate_contract_doc(
    doc: Document,
    matter,
    client,
    firm,
    lead_counsel,
    params: dict
):
    """Generate official bilingual/Arabic legal contract (عقد تقديم خدمات وأتعاب قانونية)."""
    # Header
    p_top = doc.add_paragraph()
    set_p_rtl(p_top, WD_ALIGN_PARAGRAPH.CENTER)
    add_ar_run(p_top, f"{firm.name_ar} للمحاماة والاستشارات القانونية\n", size_pt=14, bold=True, color=COLOR_NAVY)
    add_ar_run(p_top, "MEEZAN LEGAL & ARBITRATION PRACTICE\n", size_pt=10, bold=True, color=COLOR_GOLD)
    add_divider_line(doc, "1B2A4A")

    # Title
    p_title = doc.add_paragraph()
    set_p_rtl(p_title, WD_ALIGN_PARAGRAPH.CENTER)
    p_title.paragraph_format.space_before = Pt(14)
    p_title.paragraph_format.space_after = Pt(14)
    custom_title = params.get("title") or "عـقـد اتـفـاق وتـقـديـم خـدمـات قـانـونـيـة ومـهـنـيـة"
    add_ar_run(p_title, custom_title, size_pt=16, bold=True, color=COLOR_NAVY)

    # Date & preamble
    today_str = datetime.now().strftime("%Y/%m/%d")
    p_date = doc.add_paragraph()
    set_p_rtl(p_date, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_date.paragraph_format.line_spacing = 1.3
    client_name = client.name_ar if client else "الموكل الموقر"
    lead_name = lead_counsel.name_ar if lead_counsel else "المحامي المسؤول"
    
    preamble = (
        f"إنه في يوم الموافق {today_str}م، بمقر {firm.name_ar} الكائن بمدينة {firm.city_ar}، "
        f"قد تم الاتفاق والتراضي بين كل من:\n"
        f"1. {client_name} - ويشار إليه في هذا العقد بـ (الطرف الأول - الموكل).\n"
        f"2. {firm.name_ar} ويمثله الأستاذ / {lead_name} - ويشار إليه بـ (الطرف الثاني - الوكيل القانوني).\n"
        f"وبعد أن أقر الطرفان بأهليتهما القانونية والشرعية للتعاقد والتصرف، تم الاتفاق على البنود الآتية:"
    )
    add_ar_run(p_date, preamble, size_pt=11)

    clauses = params.get("contract_clauses") or [
        {
            "title": "البند الأول: موضوع العقد ونطاق الوكالة",
            "body": f"يوكل الطرف الأول الطرف الثاني لمباشرة وتمثيل مصالحه القانونية في المسألة المقيدة برقم ({matter.reference}) وعنوانها: ({matter.title_ar})، بما يشمل إعداد المذكرات وصحف الدعاوى وحضور الجلسات ومباشرة كافة الإجراءات القضائية أمام {matter.forum_ar} والجهات ذات الصلة."
        },
        {
            "title": "البند الثاني: التزامات الطرف الثاني (المحامي)",
            "body": "يلتزم الطرف الثاني ببذل عناية الرجل الحريص والمحامي الخبير الملتزم بقواعد وتقاليد مهنة المحاماة، ومتابعة الجلسات في مواعيدها وإخطار الطرف الأول بتقرير دوري عن تطورات المسألة ومجريات الجلسات."
        },
        {
            "title": "البند الثالث: الأتعاب وآلية السداد",
            "body": "تم الاتفاق على أن يستحق الطرف الثاني أتعاباً مهنية نظير التمثيل القانوني تسدد وفقاً للمطالبات المالية والفواتير الرسمية الصادرة من المكتب، ولا تشمل هذه الأتعاب الرسوم القضائية أو أمانات الخبراء أو تكاليف النشر والإعلانات الرسمية."
        },
        {
            "title": "البند الرابع: السرية والامتياز المهني",
            "body": "يلتزم الطرف الثاني التزاماً مطلقاً بالمحافظة على سرية كافة المعلومات والبيانات والمستندات المسلمة إليه من الطرف الأول، ولا يجوز إفشاؤها للغير إلا في حدود ما يقتضيه الدفاع أمام المحاكم والجهات الرسمية المختصة."
        },
        {
            "title": "البند الخامس: القانون الواجب التطبيق والاختصاص القضائي",
            "body": f"يخضع هذا العقد ويفسر وفقاً للقوانين السارية في جمهورية مصر العربية، وتختص محاكم {firm.city_ar} بنظر أي نزاع قد ينشأ عن تفسير أو تنفيذ هذا العقد."
        }
    ]

    for clause in clauses:
        p_ch = doc.add_paragraph()
        set_p_rtl(p_ch, WD_ALIGN_PARAGRAPH.RIGHT)
        p_ch.paragraph_format.space_before = Pt(8)
        add_ar_run(p_ch, clause["title"], size_pt=12, bold=True, color=COLOR_NAVY)

        p_cb = doc.add_paragraph()
        set_p_rtl(p_cb, WD_ALIGN_PARAGRAPH.JUSTIFY)
        p_cb.paragraph_format.line_spacing = 1.2
        add_ar_run(p_cb, clause["body"], size_pt=11)

    # Closing & Signatures Table
    doc.add_paragraph()
    sig_table = doc.add_table(rows=2, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(sig_table)
    
    c_r_head = sig_table.cell(0, 0)
    c_l_head = sig_table.cell(0, 1)
    c_r_sig = sig_table.cell(1, 0)
    c_l_sig = sig_table.cell(1, 1)

    p_r1 = c_r_head.paragraphs[0]
    set_p_rtl(p_r1, WD_ALIGN_PARAGRAPH.CENTER)
    add_ar_run(p_r1, "الـطـرف الأول (الـمـوكـل)", size_pt=11, bold=True, color=COLOR_NAVY)

    p_l1 = c_l_head.paragraphs[0]
    set_p_rtl(p_l1, WD_ALIGN_PARAGRAPH.CENTER)
    add_ar_run(p_l1, "الـطـرف الـثـانـي (الـمـحـامـي)", size_pt=11, bold=True, color=COLOR_NAVY)

    p_r2 = c_r_sig.paragraphs[0]
    set_p_rtl(p_r2, WD_ALIGN_PARAGRAPH.CENTER)
    add_ar_run(p_r2, f"\nالاسم: {client_name}\nالتوقيع: ............................\nالخاتم: ............................", size_pt=10)

    p_l2 = c_l_sig.paragraphs[0]
    set_p_rtl(p_l2, WD_ALIGN_PARAGRAPH.CENTER)
    add_ar_run(p_l2, f"\nالاسم: {lead_name}\nالصفة: عن {firm.name_ar}\nالتوقيع: ............................", size_pt=10)


def generate_legal_docx(
    matter,
    client,
    firm,
    lead_counsel,
    template_type: str,
    params: dict
) -> tuple[bytes, str]:
    """
    Main entry point for generating Word (.docx) documents.
    Returns (bytes, filename).
    """
    doc = Document()
    
    # Configure A4 page with 1 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    clean_ref = matter.reference.replace("-", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if template_type in ["pleading", "courtSubmission"]:
        generate_pleading_memo(doc, matter, client, firm, lead_counsel, params)
        filename = f"مذكرة_دفاع_{clean_ref}_{timestamp}.docx"
    elif template_type in ["contract", "agreement"]:
        generate_contract_doc(doc, matter, client, firm, lead_counsel, params)
        filename = f"عقد_اتفاق_{clean_ref}_{timestamp}.docx"
    else:
        # Default memo
        generate_pleading_memo(doc, matter, client, firm, lead_counsel, params)
        filename = f"مستند_قانوني_{clean_ref}_{timestamp}.docx"

    bio = BytesIO()
    doc.save(bio)
    file_bytes = bio.getvalue()
    bio.close()
    return file_bytes, filename
