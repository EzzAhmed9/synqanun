from io import BytesIO
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Palette
FILL_NAVY = PatternFill(start_color="1B2A4A", end_color="1B2A4A", fill_type="solid")
FILL_GOLD = PatternFill(start_color="C5A880", end_color="C5A880", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_TOTAL = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
FILL_HIGHLIGHT = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

FONT_HEADER = Font(name="Arial", size=11, bold=True, color="FFFFFF")
FONT_TITLE = Font(name="Arial", size=16, bold=True, color="1B2A4A")
FONT_SUBTITLE = Font(name="Arial", size=10, bold=False, color="64748B")
FONT_LABEL = Font(name="Arial", size=10, bold=True, color="334155")
FONT_VALUE = Font(name="Arial", size=10, bold=False, color="0F172A")
FONT_BOLD = Font(name="Arial", size=10, bold=True, color="0F172A")

ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")
ALIGN_LEFT = Alignment(horizontal="left", vertical="center")

BORDER_THIN = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="CBD5E1"),
    bottom=Side(style="thin", color="CBD5E1"),
)
BORDER_TOTAL = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="1B2A4A"),
    bottom=Side(style="double", color="1B2A4A"),
)

CURRENCY_FORMAT = '#,##0.00 "ج.م"'


def setup_sheet_rtl(ws):
    """Enable right-to-left layout for the worksheet."""
    ws.views.sheetView[0].rightToLeft = True


def auto_fit_columns(ws, min_width=12):
    """Calculate and set clean column widths."""
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if cell.number_format and "ج.م" in cell.number_format:
                val_str += "    "
            max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 4, min_width)


def export_client_statement_xlsx(
    client,
    firm,
    invoices,
    time_entries=None
) -> tuple[bytes, str]:
    """
    Generate Client Financial Statement of Account (كشف حساب موكل رسمي).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "كشف حساب موكل"
    setup_sheet_rtl(ws)

    # 1. Company & Header block
    ws.merge_cells("A1:G1")
    title_cell = ws["A1"]
    title_cell.value = f"{firm.name_ar} — كشف حساب مالي رسمي للموكل"
    title_cell.font = FONT_TITLE
    title_cell.alignment = ALIGN_CENTER
    ws.row_dimensions[1].height = 35

    ws.merge_cells("A2:G2")
    sub_cell = ws["A2"]
    sub_cell.value = f"تم استخراجه بتاريخ: {datetime.now().strftime('%Y/%m/%d %H:%M')} | العملة: {firm.currency}"
    sub_cell.font = FONT_SUBTITLE
    sub_cell.alignment = ALIGN_CENTER
    ws.row_dimensions[2].height = 20

    # 2. Client Metadata Box
    client_name = client.name_ar if client else "العميل الموقر"
    metadata = [
        ("اسم الموكل:", client_name, "رقم العميل:", client.id if client else ""),
        ("المكتب المصدر:", firm.name_ar, "الدولة / المدينة:", f"{firm.country_ar} - {firm.city_ar}"),
    ]
    current_row = 4
    for r_idx, row_data in enumerate(metadata):
        ws.cell(row=current_row + r_idx, column=1, value=row_data[0]).font = FONT_LABEL
        ws.cell(row=current_row + r_idx, column=2, value=row_data[1]).font = FONT_VALUE
        ws.cell(row=current_row + r_idx, column=4, value=row_data[2]).font = FONT_LABEL
        ws.cell(row=current_row + r_idx, column=5, value=row_data[3]).font = FONT_VALUE
        ws.row_dimensions[current_row + r_idx].height = 22

    # 3. Ledger Table Headers
    headers = [
        "م",
        "تاريخ الاستحقاق",
        "رقم المرجع",
        "المسألة القانونية",
        "البيان / تفاصيل المطالبة",
        "المبلغ المستحق (مدين)",
        "المسدد (دائن)",
        "الحالة",
    ]
    start_table_row = 7
    ws.row_dimensions[start_table_row].height = 28
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=start_table_row, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_THIN

    # 4. Populate rows from Invoices
    row_num = start_table_row + 1
    total_debit = 0.0
    total_credit = 0.0

    for idx, inv in enumerate(invoices, 1):
        ws.row_dimensions[row_num].height = 24
        fill = FILL_ZEBRA if idx % 2 == 0 else PatternFill(fill_type=None)

        amount = sum(li.amount for li in inv.line_items) if inv.line_items else 0.0
        is_paid = inv.status == "paid"
        debit = amount
        credit = amount if is_paid else 0.0

        total_debit += debit
        total_credit += credit

        status_text = {
            "paid": "مسددة بالكامل",
            "due": "مستحقة السداد",
            "overdue": "متأخرة عن موعدها",
            "draft": "مسودة",
            "pending_approval": "بانتظار الاعتماد",
        }.get(inv.status, inv.status)

        row_values = [
            (idx, ALIGN_CENTER, None),
            (inv.due_date, ALIGN_CENTER, None),
            (inv.reference, ALIGN_CENTER, None),
            (inv.engagement_ref, ALIGN_CENTER, None),
            (inv.description_ar or inv.description_en, ALIGN_RIGHT, None),
            (debit, ALIGN_RIGHT, CURRENCY_FORMAT),
            (credit, ALIGN_RIGHT, CURRENCY_FORMAT),
            (status_text, ALIGN_CENTER, None),
        ]

        for col_idx, (val, align, num_fmt) in enumerate(row_values, 1):
            cell = ws.cell(row=row_num, column=col_idx, value=val)
            cell.font = FONT_VALUE
            cell.alignment = align
            cell.border = BORDER_THIN
            if fill.fill_type:
                cell.fill = fill
            if num_fmt:
                cell.number_format = num_fmt

        row_num += 1

    # 5. Summary / Total Row
    ws.row_dimensions[row_num].height = 28
    ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=5)
    t_label = ws.cell(row=row_num, column=1, value="الإجـمـالـي الـعـام")
    t_label.font = FONT_BOLD
    t_label.alignment = ALIGN_CENTER
    t_label.fill = FILL_TOTAL
    t_label.border = BORDER_TOTAL

    for c in range(2, 6):
        ws.cell(row=row_num, column=c).border = BORDER_TOTAL
        ws.cell(row=row_num, column=c).fill = FILL_TOTAL

    c_deb = ws.cell(row=row_num, column=6, value=total_debit)
    c_deb.font = FONT_BOLD
    c_deb.number_format = CURRENCY_FORMAT
    c_deb.alignment = ALIGN_RIGHT
    c_deb.fill = FILL_TOTAL
    c_deb.border = BORDER_TOTAL

    c_cred = ws.cell(row=row_num, column=7, value=total_credit)
    c_cred.font = FONT_BOLD
    c_cred.number_format = CURRENCY_FORMAT
    c_cred.alignment = ALIGN_RIGHT
    c_cred.fill = FILL_TOTAL
    c_cred.border = BORDER_TOTAL

    c_st = ws.cell(row=row_num, column=8, value="")
    c_st.fill = FILL_TOTAL
    c_st.border = BORDER_TOTAL

    # Net outstanding balance highlight box
    net_due = total_debit - total_credit
    row_num += 2
    ws.merge_cells(start_row=row_num, start_column=4, end_row=row_num, end_column=5)
    box_lbl = ws.cell(row=row_num, column=4, value="صافي الرصيد المستحق على الموكل:")
    box_lbl.font = FONT_BOLD
    box_lbl.alignment = ALIGN_CENTER
    box_lbl.fill = FILL_HIGHLIGHT
    box_lbl.border = BORDER_THIN

    ws.merge_cells(start_row=row_num, start_column=6, end_row=row_num, end_column=7)
    box_val = ws.cell(row=row_num, column=6, value=net_due)
    box_val.font = Font(name="Arial", size=12, bold=True, color="991B1B" if net_due > 0 else "065F46")
    box_val.number_format = CURRENCY_FORMAT
    box_val.alignment = ALIGN_CENTER
    box_val.fill = FILL_HIGHLIGHT
    box_val.border = BORDER_THIN
    ws.row_dimensions[row_num].height = 30

    auto_fit_columns(ws)

    bio = BytesIO()
    wb.save(bio)
    file_bytes = bio.getvalue()
    bio.close()

    cli_id = client.id if client else "ALL"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"كشف_حساب_موكل_{cli_id}_{timestamp}.xlsx"
    return file_bytes, filename


def export_invoices_ledger_xlsx(
    invoices,
    matter=None,
    firm=None,
    title=None
) -> tuple[bytes, str]:
    """
    Generate Matter or Firm Invoices Ledger (سجل الفواتير والمطالبات).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "سجل الفواتير"
    setup_sheet_rtl(ws)

    firm_name = firm.name_ar if firm else "ميزان القانونية"
    doc_title = title or (f"سجل فواتير المسألة {matter.reference}" if matter else "سجل فواتير المكتب")

    ws.merge_cells("A1:I1")
    t1 = ws["A1"]
    t1.value = f"{firm_name} — {doc_title}"
    t1.font = FONT_TITLE
    t1.alignment = ALIGN_CENTER
    ws.row_dimensions[1].height = 32

    ws.merge_cells("A2:I2")
    t2 = ws["A2"]
    t2.value = f"تاريخ التقرير: {datetime.now().strftime('%Y/%m/%d %H:%M')} | إجمالي الفواتير: {len(invoices)}"
    t2.font = FONT_SUBTITLE
    t2.alignment = ALIGN_CENTER
    ws.row_dimensions[2].height = 20

    headers = [
        "م",
        "رقم الفاتورة",
        "المسألة القانونية",
        "الموكل",
        "تاريخ الإصدار",
        "تاريخ الاستحقاق",
        "المبلغ قبل الضريبة",
        "الضريبة (14%)",
        "الإجمالي الشامل",
        "الحالة",
    ]
    start_row = 4
    ws.row_dimensions[start_row].height = 26
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_THIN

    total_subtotal = 0.0
    total_tax = 0.0
    total_amount = 0.0

    current_row = start_row + 1
    for idx, inv in enumerate(invoices, 1):
        ws.row_dimensions[current_row].height = 22
        fill = FILL_ZEBRA if idx % 2 == 0 else PatternFill(fill_type=None)

        gross = sum(li.amount for li in inv.line_items) if inv.line_items else 0.0
        # Calculate approximate 14% VAT if applicable
        subtotal = round(gross / 1.14, 2)
        tax = round(gross - subtotal, 2)

        total_subtotal += subtotal
        total_tax += tax
        total_amount += gross

        status_text = {
            "paid": "مسددة",
            "due": "مستحقة",
            "overdue": "متأخرة",
            "draft": "مسودة",
            "pending_approval": "بانتظار الاعتماد",
        }.get(inv.status, inv.status)

        client_name = inv.client.name_ar if (hasattr(inv, "client") and inv.client) else ""

        row_vals = [
            (idx, ALIGN_CENTER, None),
            (inv.reference, ALIGN_CENTER, None),
            (inv.engagement_ref, ALIGN_CENTER, None),
            (client_name, ALIGN_RIGHT, None),
            (inv.issue_date, ALIGN_CENTER, None),
            (inv.due_date, ALIGN_CENTER, None),
            (subtotal, ALIGN_RIGHT, CURRENCY_FORMAT),
            (tax, ALIGN_RIGHT, CURRENCY_FORMAT),
            (gross, ALIGN_RIGHT, CURRENCY_FORMAT),
            (status_text, ALIGN_CENTER, None),
        ]

        for col_idx, (val, align, num_fmt) in enumerate(row_vals, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=val)
            cell.font = FONT_VALUE
            cell.alignment = align
            cell.border = BORDER_THIN
            if fill.fill_type:
                cell.fill = fill
            if num_fmt:
                cell.number_format = num_fmt

        current_row += 1

    # Totals
    ws.row_dimensions[current_row].height = 26
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
    ws.cell(row=current_row, column=1, value="الإجــمــالـي").font = FONT_BOLD
    ws.cell(row=current_row, column=1).alignment = ALIGN_CENTER
    ws.cell(row=current_row, column=1).fill = FILL_TOTAL
    ws.cell(row=current_row, column=1).border = BORDER_TOTAL

    for c in range(2, 7):
        ws.cell(row=current_row, column=c).border = BORDER_TOTAL
        ws.cell(row=current_row, column=c).fill = FILL_TOTAL

    for c_idx, val in [(7, total_subtotal), (8, total_tax), (9, total_amount)]:
        c_node = ws.cell(row=current_row, column=c_idx, value=val)
        c_node.font = FONT_BOLD
        c_node.number_format = CURRENCY_FORMAT
        c_node.alignment = ALIGN_RIGHT
        c_node.fill = FILL_TOTAL
        c_node.border = BORDER_TOTAL

    ws.cell(row=current_row, column=10).fill = FILL_TOTAL
    ws.cell(row=current_row, column=10).border = BORDER_TOTAL

    auto_fit_columns(ws)

    bio = BytesIO()
    wb.save(bio)
    file_bytes = bio.getvalue()
    bio.close()

    tag = matter.reference.replace("-", "_") if matter else "ALL"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"سجل_فواتير_{tag}_{timestamp}.xlsx"
    return file_bytes, filename


def export_timesheet_xlsx(
    time_entries,
    matter=None,
    firm=None,
    title=None
) -> tuple[bytes, str]:
    """
    Generate Timesheet & Billable Work Claims Report (سجل ساعات العمل والمطالبات).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "ساعات العمل"
    setup_sheet_rtl(ws)

    firm_name = firm.name_ar if firm else "ميزان القانونية"
    doc_title = title or (f"تقرير ساعات عمل المسألة {matter.reference}" if matter else "تقرير ساعات العمل والمطالبات")

    ws.merge_cells("A1:H1")
    t1 = ws["A1"]
    t1.value = f"{firm_name} — {doc_title}"
    t1.font = FONT_TITLE
    t1.alignment = ALIGN_CENTER
    ws.row_dimensions[1].height = 32

    ws.merge_cells("A2:H2")
    t2 = ws["A2"]
    t2.value = f"تاريخ الاستخراج: {datetime.now().strftime('%Y/%m/%d %H:%M')} | عدد السجلات: {len(time_entries)}"
    t2.font = FONT_SUBTITLE
    t2.alignment = ALIGN_CENTER
    ws.row_dimensions[2].height = 20

    headers = [
        "م",
        "تاريخ العمل",
        "المسألة",
        "المحامي / القائم بالعمل",
        "بيان العمل والإجراء القانوني",
        "الوقت (ساعات)",
        "سعر الساعة",
        "الإجمالي المستحق",
        "مفوترة؟",
    ]
    start_row = 4
    ws.row_dimensions[start_row].height = 26
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_THIN

    total_hours = 0.0
    total_amount = 0.0

    current_row = start_row + 1
    for idx, te in enumerate(time_entries, 1):
        ws.row_dimensions[current_row].height = 22
        fill = FILL_ZEBRA if idx % 2 == 0 else PatternFill(fill_type=None)

        hours = round(te.minutes / 60.0, 2)
        gross = round(hours * te.rate_at_time, 2)

        total_hours += hours
        total_amount += gross

        staff_name = te.staff.name_ar if (hasattr(te, "staff") and te.staff) else "المحامي"

        row_vals = [
            (idx, ALIGN_CENTER, None),
            (te.entry_date, ALIGN_CENTER, None),
            (te.matter_id, ALIGN_CENTER, None),
            (staff_name, ALIGN_RIGHT, None),
            (te.description_ar or te.description_en, ALIGN_RIGHT, None),
            (hours, ALIGN_CENTER, "0.00"),
            (te.rate_at_time, ALIGN_RIGHT, CURRENCY_FORMAT),
            (gross, ALIGN_RIGHT, CURRENCY_FORMAT),
            ("نعم (مفوترة)" if te.is_invoiced else "لا (قيد المطالبة)", ALIGN_CENTER, None),
        ]

        for col_idx, (val, align, num_fmt) in enumerate(row_vals, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=val)
            cell.font = FONT_VALUE
            cell.alignment = align
            cell.border = BORDER_THIN
            if fill.fill_type:
                cell.fill = fill
            if num_fmt:
                cell.number_format = num_fmt

        current_row += 1

    # Totals
    ws.row_dimensions[current_row].height = 26
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    ws.cell(row=current_row, column=1, value="إجمالي الساعات والمطالبات").font = FONT_BOLD
    ws.cell(row=current_row, column=1).alignment = ALIGN_CENTER
    ws.cell(row=current_row, column=1).fill = FILL_TOTAL
    ws.cell(row=current_row, column=1).border = BORDER_TOTAL

    for c in range(2, 6):
        ws.cell(row=current_row, column=c).border = BORDER_TOTAL
        ws.cell(row=current_row, column=c).fill = FILL_TOTAL

    c_hrs = ws.cell(row=current_row, column=6, value=total_hours)
    c_hrs.font = FONT_BOLD
    c_hrs.number_format = "0.00"
    c_hrs.alignment = ALIGN_CENTER
    c_hrs.fill = FILL_TOTAL
    c_hrs.border = BORDER_TOTAL

    ws.cell(row=current_row, column=7).fill = FILL_TOTAL
    ws.cell(row=current_row, column=7).border = BORDER_TOTAL

    c_tot = ws.cell(row=current_row, column=8, value=total_amount)
    c_tot.font = FONT_BOLD
    c_tot.number_format = CURRENCY_FORMAT
    c_tot.alignment = ALIGN_RIGHT
    c_tot.fill = FILL_TOTAL
    c_tot.border = BORDER_TOTAL

    ws.cell(row=current_row, column=9).fill = FILL_TOTAL
    ws.cell(row=current_row, column=9).border = BORDER_TOTAL

    auto_fit_columns(ws)

    bio = BytesIO()
    wb.save(bio)
    file_bytes = bio.getvalue()
    bio.close()

    tag = matter.reference.replace("-", "_") if matter else "ALL"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ساعات_عمل_{tag}_{timestamp}.xlsx"
    return file_bytes, filename
