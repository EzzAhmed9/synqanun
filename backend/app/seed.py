"""
Seed initial demo data into synqanun_db matching the frontend fixtures.
"""
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.firm import Firm
from app.models.user import User
from app.models.client import Client, ClientContact
from app.models.matter import Matter, MatterTeamMember, MatterHearing, MatterTimelineEvent
from app.models.invoice import Invoice, InvoiceLineItem, TimeEntry, Quote
from app.models.legal_db import LegalDatabaseEntry

def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Firm).filter(Firm.id == "firm-001").first():
            print("Database already seeded!")
            return

        print("Seeding demo firm...")
        firm = Firm(
            id="firm-001",
            name_en="Mansoor Al-Farooq & Partners",
            name_ar="منصور الفاروق وشركاه للمحاماة والاستشارات القانونية",
            domain="mr-law.eg",
            phone="+20 2 3749 2210",
            city_en="Cairo",
            city_ar="القاهرة",
            country_en="Egypt",
            country_ar="مصر",
            currency="EGP",
        )
        db.add(firm)

        default_pw = get_password_hash("password123")

        print("Seeding staff accounts...")
        staff_members = [
            User(
                id="stf-001",
                firm_id="firm-001",
                email="m.alfarooq@mr-law.eg",
                hashed_password=default_pw,
                side="staff",
                name_en="Mansoor Al-Farooq",
                name_ar="منصور الفاروق",
                title_en="Managing Partner",
                title_ar="الشريك المدير",
                rank="partner",
                status="active",
                joined_days_ago=2190,
                phone="+20 100 234 5678",
            ),
            User(
                id="stf-002",
                firm_id="firm-001",
                email="m.roshdy@mr-law.eg",
                hashed_password=default_pw,
                side="staff",
                name_en="Mona Roshdy",
                name_ar="منى رشدي",
                title_en="Senior Associate",
                title_ar="محامٍ أول",
                rank="seniorAssociate",
                status="active",
                joined_days_ago=1095,
                phone="+20 100 876 5432",
            ),
            User(
                id="stf-003",
                firm_id="firm-001",
                email="k.adel@mr-law.eg",
                hashed_password=default_pw,
                side="staff",
                name_en="Karim Adel",
                name_ar="كريم عادل",
                title_en="Junior Associate",
                title_ar="محامٍ مشارك",
                rank="juniorAssociate",
                status="active",
                joined_days_ago=365,
                phone="+20 100 456 7890",
            ),
            User(
                id="stf-004",
                firm_id="firm-001",
                email="s.hashem@mr-law.eg",
                hashed_password=default_pw,
                side="staff",
                name_en="Salma Hashem",
                name_ar="سلمى هاشم",
                title_en="Paralegal",
                title_ar="مساعد قانوني",
                rank="paralegal",
                status="active",
                joined_days_ago=180,
                phone="+20 100 987 6543",
            ),
            User(
                id="stf-005",
                firm_id="firm-001",
                email="y.fouad@mr-law.eg",
                hashed_password=default_pw,
                side="staff",
                name_en="Youssef Fouad",
                name_ar="يوسف فؤاد",
                title_en="Legal Secretary",
                title_ar="سكرتير قانوني",
                rank="legalSecretary",
                status="active",
                joined_days_ago=730,
                phone="+20 100 112 2334",
            ),
        ]
        db.add_all(staff_members)

        print("Seeding clients...")
        clients = [
            Client(
                id="cli-001",
                firm_id="firm-001",
                name_en="Gulf Holdings",
                name_ar="الخليج القابضة",
                summary_en="Commercial arbitration & corporate governance advisory",
                summary_ar="تحكيم تجاري واستشارات حوكمة الشركات",
                standing="retainer",
                last_activity_days_ago=2,
            ),
            Client(
                id="cli-002",
                firm_id="firm-001",
                name_en="Nile Delta Logistics",
                name_ar="لوجستيات دلتا النيل",
                summary_en="Maritime transport disputes & customs clearing appeal",
                summary_ar="نزاعات النقل البحري واستئناف الجمارك",
                standing="active",
                last_activity_days_ago=5,
            ),
            Client(
                id="cli-003",
                firm_id="firm-001",
                name_en="Helwan Cement",
                name_ar="أسمنت حلوان",
                summary_en="Environmental compliance & labour collective bargaining",
                summary_ar="الامتثال البيئي ومفاوضات العمل الجماعية",
                standing="active",
                last_activity_days_ago=12,
            ),
            Client(
                id="cli-004",
                firm_id="firm-001",
                name_en="Alexandria Port Terminal",
                name_ar="محطة ميناء الإسكندرية",
                summary_en="Concession agreement renegotiation",
                summary_ar="إعادة التفاوض على اتفاقية الامتياز",
                standing="active",
                last_activity_days_ago=20,
            ),
            Client(
                id="cli-005",
                firm_id="firm-001",
                name_en="Cairo Fintech Labs",
                name_ar="مختبرات القاهرة للتكنولوجيا المالية",
                summary_en="Regulatory sandbox application & license filing",
                summary_ar="طلب البيئة التجريبية واستصدار ترخيص المدفوعات",
                standing="prospect",
                last_activity_days_ago=35,
            ),
        ]
        db.add_all(clients)

        print("Seeding client portal accounts & contacts...")
        client_contacts = [
            ClientContact(
                id="cnt-001",
                client_id="cli-001",
                name_en="Tarek Al-Rahman",
                name_ar="طارق الرحمن",
                title_en="Managing Director",
                title_ar="العضو المنتدب",
                email="t.alrahman@gulfholdings.ae",
                phone="+971 50 892 4110",
                role="admin",
                status="active",
            ),
            ClientContact(
                id="cnt-002",
                client_id="cli-001",
                name_en="Nadia Shukri",
                name_ar="نادية شكري",
                title_en="Chief Financial Officer",
                title_ar="المديرة المالية",
                email="n.shukri@gulfholdings.ae",
                phone="+971 50 123 4567",
                role="admin",
                status="active",
            ),
            ClientContact(
                id="cnt-003",
                client_id="cli-001",
                name_en="Omar Fahmy",
                name_ar="عمر فهمي",
                title_en="Legal Counsel",
                title_ar="المستشار القانوني",
                email="o.fahmy@gulfholdings.ae",
                phone="+971 50 765 4321",
                role="member",
                status="active",
            ),
            ClientContact(
                id="cnt-004",
                client_id="cli-001",
                name_en="Layla Mansour",
                name_ar="ليلى منصور",
                title_en="Senior Legal Counsel",
                title_ar="المستشارة القانونية الأولى",
                email="l.mansour@gulfholdings.ae",
                phone="+971 4 555 0104",
                role="member",
                status="invited",
            ),
        ]
        db.add_all(client_contacts)

        # Client portal user account
        portal_user = User(
            id="acct-client-tarek",
            firm_id="firm-001",
            email="t.alrahman@gulfholdings.ae",
            hashed_password=default_pw,
            side="client",
            name_en="Tarek Al-Rahman",
            name_ar="طارق الرحمن",
            title_en="Managing Director",
            title_ar="العضو المنتدب",
            client_id="cli-001",
            client_role="admin",
            status="active",
            phone="+971 50 892 4110",
        )
        db.add(portal_user)

        print("Seeding matters...")
        matters = [
            Matter(
                id="mat-001",
                reference="MAT-2201",
                firm_id="firm-001",
                client_id="cli-001",
                title_en="Commercial Agency Dispute with Middle East Trade Corp",
                title_ar="نزاع الوكالة التجارية مع شركة الشرق الأوسط للتجارة",
                work_type="dispute",
                matter_type_en="Commercial Litigation",
                matter_type_ar="النزاعات التجارية",
                forum_en="Cairo Court of Appeal (Commercial Circuit)",
                forum_ar="محكمة استئناف القاهرة (الدائرة التجارية)",
                lead_counsel_id="stf-001",
                status_en="Memorial submitted; awaiting expert report",
                status_ar="تم إيداع المذكرة الختامية؛ وفي انتظار تقرير مكتب الخبراء",
                status_tone="positive",
                current_phase_en="Expert Witness Review",
                current_phase_ar="فحص تقرير الخبراء",
                scope_summary_en="Representation in claim for wrongful termination of exclusive distribution rights.",
                scope_summary_ar="التمثيل في دعوى التعويض عن الإنهاء التعسفي لحقوق التوزيع الحصري.",
                is_closed=False,
            ),
            Matter(
                id="mat-002",
                reference="MAT-2202",
                firm_id="firm-001",
                client_id="cli-001",
                title_en="ADGM Corporate Governance Restructuring",
                title_ar="إعادة هيكلة حوكمة الشركات في سوق أبوظبي العالمي",
                work_type="otherProject",
                matter_type_en="Corporate & Regulatory",
                matter_type_ar="حوكمة الشركات والتنظيم",
                forum_en="Abu Dhabi Global Market Registration Authority",
                forum_ar="سلطة التسجيل في سوق أبوظبي العالمي",
                lead_counsel_id="stf-002",
                status_en="Articles of association draft finalized for board approval",
                status_ar="انتهاء صياغة النظام الأساسي وعرضه على مجلس الإدارة للاعتماد",
                status_tone="neutral",
                current_phase_en="Drafting & Review",
                current_phase_ar="الصياغة والمراجعة",
                scope_summary_en="Comprehensive compliance overhaul of regional operating subsidiaries.",
                scope_summary_ar="تحديث شامل للامتثال المؤسسي للشركات التابعة في المنطقة.",
                is_closed=False,
            ),
            Matter(
                id="mat-003",
                reference="MAT-2203",
                firm_id="firm-001",
                client_id="cli-002",
                title_en="Maritime Freight Charterparty Dispute",
                title_ar="نزاع مشارطة إيجار السفن للشحن البحري",
                work_type="dispute",
                matter_type_en="Maritime & Shipping",
                matter_type_ar="القانون البحري والشحن",
                forum_en="Alexandria Economic Court",
                forum_ar="محكمة الإسكندرية الاقتصادية",
                lead_counsel_id="stf-002",
                status_en="Arrest of vessel lifted; settlement discussions ongoing",
                status_ar="رفع الحجز التحفظي على السفينة ومفاوضات التسوية جارية",
                status_tone="urgent",
                current_phase_en="Settlement",
                current_phase_ar="مفاوضات الصلح",
                scope_summary_en="Defending cargo owners against demurrage and vessel detention claims.",
                scope_summary_ar="الدفاع عن ملاك البضائع ضد مطالبات غرامات التأخير واحتجاز السفينة.",
                is_closed=False,
            ),
        ]
        db.add_all(matters)

        print("Seeding matter hearings and timeline...")
        hearings = [
            MatterHearing(
                id="hrg-001",
                matter_id="mat-001",
                date="2026-11-15",
                time="10:00",
                notes_en="Hearing for submitting technical accounting defense memo",
                notes_ar="جلسة لتقديم مذكرة الدفاع المحاسبي الفني",
                status="scheduled",
            ),
            MatterHearing(
                id="hrg-002",
                matter_id="mat-003",
                date="2026-11-22",
                time="11:30",
                notes_en="Preliminary hearing on jurisdiction and arbitration clause",
                notes_ar="جلسة تمهيدية للدفع بوجود شرط التحكيم وعدم الاختصاص الولائي",
                status="scheduled",
            ),
        ]
        db.add_all(hearings)

        timeline_events = [
            MatterTimelineEvent(
                id="tml-001",
                matter_id="mat-001",
                kind="filing",
                title_en="Statement of Claim filed",
                title_ar="قيد صحيفة الدعوى وسداد الرسوم القضائية",
                date="2026-08-10",
            ),
            MatterTimelineEvent(
                id="tml-002",
                matter_id="mat-001",
                kind="hearing",
                title_en="First Court Appearance & Reference to Ministry of Justice Experts",
                title_ar="حضور الجلسة الأولى وقرار الإحالة لمكتب خبراء وزارة العدل",
                date="2026-09-24",
            ),
        ]
        db.add_all(timeline_events)

        print("Seeding billing & invoices...")
        inv = Invoice(
            id="inv-001",
            sequence="089",
            reference="INV-2026-089",
            firm_id="firm-001",
            client_id="cli-001",
            engagement_ref="MAT-2201",
            description_en="Professional legal services rendered for Commercial Agency Dispute (Q3 2026)",
            description_ar="أتعاب مهنية واستشارات قضائية عن نزاع الوكالة التجارية (الربع الثالث 2026)",
            status="due",
            currency="EGP",
            issue_date="2026-10-01",
            due_date="2026-11-01",
            prepared_by_id="stf-002",
        )
        db.add(inv)

        items = [
            InvoiceLineItem(
                id="itm-001",
                invoice_id="inv-001",
                description_en="Pleadings drafting and evidence assembly",
                description_ar="صياغة المذكرات وتجهيز حوافظ المستندات",
                detail_en="24 hours senior associate work",
                detail_ar="24 ساعة عمل محامٍ أول",
                amount=52800.0,
                order=1,
            ),
            InvoiceLineItem(
                id="itm-002",
                invoice_id="inv-001",
                description_en="Court session attendances and expert meetings",
                description_ar="حضور الجلسات واجتماعات مكتب الخبراء",
                detail_en="Partner attendance (6 hours)",
                detail_ar="حضور الشريك (6 ساعات)",
                amount=21000.0,
                order=2,
            ),
        ]
        db.add_all(items)

        time_entries = [
            TimeEntry(
                id="tm-001",
                firm_id="firm-001",
                matter_id="MAT-2201",
                staff_id="stf-002",
                minutes=180,
                rate_at_time=2200.0,
                billable=True,
                is_invoiced=False,
                description_en="Review of appellant's counter-memorial and rebuttal drafting",
                description_ar="مراجعة مذكرة الخصم الشارحة وصياغة الرد والدفوع الموضوعية",
                entry_date="2026-10-28",
            ),
            TimeEntry(
                id="tm-002",
                firm_id="firm-001",
                matter_id="MAT-2201",
                staff_id="stf-004",
                minutes=120,
                rate_at_time=800.0,
                billable=True,
                is_invoiced=False,
                description_en="Court registry search and filing certificate extraction",
                description_ar="المتابعة بجدول المحكمة واستخراج شهادة بما تم في الدعوى",
                entry_date="2026-10-29",
            ),
        ]
        db.add_all(time_entries)

        print("Seeding matter team members and quotes...")
        team_members = [
            MatterTeamMember(id="mtm-001", matter_id="mat-001", staff_id="stf-002", role_en="Senior Associate", role_ar="محامٍ أول"),
            MatterTeamMember(id="mtm-002", matter_id="mat-001", staff_id="stf-004", role_en="Paralegal", role_ar="باحث قانوني"),
            MatterTeamMember(id="mtm-003", matter_id="mat-002", staff_id="stf-003", role_en="Associate", role_ar="محامٍ مشارك"),
            MatterTeamMember(id="mtm-004", matter_id="mat-002", staff_id="stf-005", role_en="Legal Secretary", role_ar="سكرتير قانوني"),
            MatterTeamMember(id="mtm-005", matter_id="mat-003", staff_id="stf-002", role_en="Senior Associate", role_ar="محامٍ أول"),
            MatterTeamMember(id="mtm-006", matter_id="mat-003", staff_id="stf-003", role_en="Associate", role_ar="محامٍ مشارك"),
        ]
        db.add_all(team_members)

        quotes = [
            Quote(
                id="qt-001",
                firm_id="firm-001",
                client_id="cli-005",
                engagement_ref=None,
                description_en="Payment Licensing & Regulatory Sandbox Advisory Quote",
                description_ar="عرض سعر استشارات ترخيص المدفوعات والبيئة التجريبية",
                amount=85000.0,
                currency="EGP",
                valid_until="2026-11-30",
                status="issued",
            ),
            Quote(
                id="qt-002",
                firm_id="firm-001",
                client_id="cli-004",
                engagement_ref="MAT-2203",
                description_en="Customs Duty Appeal Litigation Fee Proposal",
                description_ar="عرض أتعاب الترافع في استئناف جمارك البضائع",
                amount=45000.0,
                currency="EGP",
                valid_until="2026-12-15",
                status="issued",
            ),
        ]
        db.add_all(quotes)

        print("Seeding legal database...")
        legal_entries = [
            LegalDatabaseEntry(
                id="leg-001",
                reference="EGY-CASS-2023-419",
                kind="judgment",
                title_en="Commercial Agency Termination & Due Compensation Principles",
                title_ar="شروط استحقاق التعويض عن إنهاء عقد الوكالة التجارية غير محدد المدة",
                jurisdiction_en="Egyptian Court of Cassation (Commercial Circuit)",
                jurisdiction_ar="محكمة النقض المصرية (الدائرة التجارية)",
                issued_on="2023-04-12",
                content_en="The Court held that the principal's right to terminate an agency contract is conditioned upon providing reasonable notice, absent which damages for goodwill loss become legally enforceable.",
                content_ar="المقرر في قضاء هذه المحكمة أن حق الموكل في إنهاء عقد الوكالة غير محدد المدة مشروط بعدم التعسف وإعطاء مهلة إخطار معقولة، وإلا التزم الموكل بتعويض الوكيل عما لحقه من خسارة وما فاته من كسب مشروع.",
                tags="commercial agency, termination, compensation, cassation",
            ),
            LegalDatabaseEntry(
                id="leg-002",
                reference="EGY-LAW-27-1994",
                kind="statute",
                title_en="Egyptian Arbitration Law in Civil and Commercial Matters (Law No. 27/1994)",
                title_ar="قانون التحكيم المصري في المواد المدنية والتجارية رقم 27 لسنة 1994",
                jurisdiction_en="Ministry of Justice / Egyptian Parliament",
                jurisdiction_ar="مجلس النواب / الجريدة الرسمية المصرية",
                issued_on="1994-05-03",
                content_en="Article 13 stipulates that the court before which an action is brought shall dismiss the case if the defendant raises an objection based on the existence of an arbitration agreement prior to entering into the merits.",
                content_ar="مادة 13: يجب على المحكمة التي يُرفع إليها نزاع يوجد بشأنه اتفاق تحكيم أن تحكم بعدم قبول الدعوى إذا دفع المدعى عليه بذلك قبل إبدائه أي طلب أو دفاع في موضوع الدعوى.",
                tags="arbitration, public policy, civil code",
            ),
            LegalDatabaseEntry(
                id="leg-003",
                reference="DIFC-REG-2020-04",
                kind="regulation",
                title_en="DIFC Companies Regulations (Operating Rules)",
                title_ar="لوائح وقواعد تشغيل الشركات في مركز دبي المالي العالمي",
                jurisdiction_en="Dubai International Financial Centre Authority (DIFCA)",
                jurisdiction_ar="سلطة مركز دبي المالي العالمي",
                issued_on="2020-09-15",
                content_en="Outlines directors' fiduciary duties and standard requirements for indemnification provisions in corporate bylaws.",
                content_ar="تحدد واجبات الأمانة والحرص الملقاة على عاتق أعضاء مجلس الإدارة والشروط الواجب توافرها في أحكام التعويض والمسؤولية في اللوائح الداخلية للشركات.",
                tags="DIFC, governance, directors, corporate",
            ),
        ]
        db.add_all(legal_entries)

        db.commit()
        print("Database successfully seeded with realistic bilingual records!")
    except Exception as e:
        db.rollback()
        print("Error seeding database:", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
