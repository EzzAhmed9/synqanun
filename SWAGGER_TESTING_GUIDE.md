# 🚀 دليل اختبار جميع واجهات برمجة التطبيقات (60 APIs) — SynQanun Suite

> **الرابط المباشر لـ Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
> **حساب الشريك للتجربة:** `partner@mr-law.eg` | **كلمة المرور:** `password123`  
> **حساب الموكل للتجربة:** `client@mr-law.eg` | **كلمة المرور:** `password123`  

---

## 🔑 أولاً: تفعيل التوثيق (Authorize) في Swagger UI

1. افتح صفحة السواجر: `http://127.0.0.1:8000/docs`.
2. اضغط على زر **Authorize** 🔓 الأخضر بأعلى يمين الصفحة.
3. يمكنك التسجيل بإحدى طريقتين:
   - **طريقة OAuth2 Form:** أدخل `username`: `partner@mr-law.eg` و `password`: `password123` واضغط **Authorize**.
   - **أو طريقة الـ Bearer Token:** نفّذ `POST /api/auth/login` وانسخ `access_token` ثم ضعه في خانة Bearer.
4. الآن كل طلباتك ستُرسل مصحوبة بالـ Token تلقائياً!

---

## 1️⃣ Authentication (المصادقة وتسجيل الدخول)

### 1. `POST /api/auth/token`
* **الهدف:** تسجيل الدخول بأسلوب OAuth2 Password Form للحصول على Access Token.
* **Request (Form Data):**
  - `username`: `partner@mr-law.eg`
  - `password`: `password123`
* **Response المتوقع (200 OK):**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

---

### 2. `POST /api/auth/login`
* **الهدف:** تسجيل الدخول بطلب JSON قياسي (للمحامين أو الموكلين).
* **Request Body (JSON):**
```json
{
  "email": "partner@mr-law.eg",
  "password": "password123"
}
```
*(أو استخدم `client@mr-law.eg` لتجربة واجهات الموكل)*
* **Response المتوقع (200 OK):**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": "stf-001",
    "email": "partner@mr-law.eg",
    "name_ar": "منصور الفاروق",
    "rank": "partner",
    "side": "staff"
  }
}
```

---

### 3. `GET /api/auth/me`
* **الهدف:** جلب بيانات المستخدم صاحب الجلسة الحالية من التوكن.
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Response المتوقع (200 OK):**
```json
{
  "id": "stf-001",
  "email": "partner@mr-law.eg",
  "name_en": "Mansoor Al-Farooq",
  "name_ar": "منصور الفاروق",
  "rank": "partner",
  "side": "staff"
}
```

---

### 4. `POST /api/auth/password-reset/request`
* **الهدف:** طلب استعادة كلمة المرور عبر البريد الإلكتروني وتوليد رابط/رمز الاستعادة.
* **Request Body (JSON):**
```json
{
  "email": "partner@mr-law.eg"
}
```
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "Password reset token generated",
  "token": "eyJhbGciOi...",
  "email": "partner@mr-law.eg"
}
```

---

### 5. `GET /api/auth/password-reset/verify/{token}`
* **الهدف:** التحقق من صلاحية رمز الاستعادة قبل كتابة كلمة السر الجديدة.
* **Parameters (Path):**
  - `token`: الرمز المنسوخ من الخطوة السابقة.
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "email": "partner@mr-law.eg",
  "side": "staff",
  "name": "منصور الفاروق",
  "rank": "partner"
}
```

---

### 6. `POST /api/auth/password-reset/complete`
* **الهدف:** إتمام تغيير كلمة المرور وتعيين كلمة المرور الجديدة في قاعدة البيانات.
* **Request Body (JSON):**
```json
{
  "token": "ضع_هنا_التوكن_المنسوخ",
  "password": "password123"
}
```
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "Password updated successfully in PostgreSQL",
  "email": "partner@mr-law.eg"
}
```

---

## 2️⃣ Clients (إدارة الموكلين)

### 7. `GET /api/staff/clients`
* **الهدف:** عرض قائمة الموكلين مع الفلاتر وعدد القضايا المفتوحة.
* **Query Parameters (اختيارية):**
  - `standing`: `all` أو `active` أو `retainer` أو `prospect`
  - `q`: `البحر`
* **Response المتوقع (200 OK):**
```json
{
  "items": [
    {
      "id": "cli-001",
      "name": { "en": "Al-Bahr Logistics", "ar": "شركة البحر للخدمات اللوجستية" },
      "standing": "retainer",
      "matters": 3
    }
  ],
  "total": 21
}
```

---

### 8. `POST /api/staff/clients`
* **الهدف:** تسجيل موكل جديد بالشركة.
* **Request Body (JSON):**
```json
{
  "name": "شركة الأهرام للتطوير التكنولوجي",
  "name_en": "Al-Ahram Tech Development",
  "standing": "active",
  "summary": "شركة مساهمة مصرية - حلول برمجية وحوسبة سحابية"
}
```
* **Response المتوقع (201 Created):**
```json
{
  "ok": true,
  "clientId": "cli-89a12c",
  "client": {
    "id": "cli-89a12c",
    "name": { "en": "Al-Ahram Tech Development", "ar": "شركة الأهرام للتطوير التكنولوجي" },
    "standing": "active"
  }
}
```

---

### 9. `GET /api/staff/clients/{client_id}`
* **الهدف:** عرض الملف الشامل للموكل وتاريخ التعامل وقضاياه.
* **Parameters (Path):** `client_id`: `cli-001`
* **Response المتوقع (200 OK):**
```json
{
  "id": "cli-001",
  "name": { "en": "Al-Bahr Logistics", "ar": "شركة البحر للخدمات اللوجستية" },
  "standing": "retainer",
  "contacts": [],
  "matters": []
}
```

---

### 10. `POST /api/staff/clients/{client_id}/contacts`
* **الهدف:** إضافة ممثل قانوني أو جهة اتصال تابعة للموكل.
* **Parameters (Path):** `client_id`: `cli-001`
* **Request Body (JSON):**
```json
{
  "name": "أحمد الشناوي",
  "title": "مدير الشؤون القانونية والعقود",
  "email": "legal.dir@client-firm.eg",
  "phone": "+201011223344",
  "role": "admin",
  "status": "invited"
}
```
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "contactId": "cnt-f8319a"
}
```

---

### 11. `GET /api/staff/clients/{client_id}/contacts`
* **الهدف:** جلب جهات الاتصال الخاصة بالموكل.
* **Parameters (Path):** `client_id`: `cli-001`
* **Response المتوقع (200 OK):**
```json
{
  "contacts": [
    {
      "id": "cnt-f8319a",
      "name_ar": "أحمد الشناوي",
      "email": "legal.dir@client-firm.eg",
      "role": "admin"
    }
  ]
}
```

---

## 3️⃣ Staff Matters (قضايا وملفات المحامين)

### 12. `GET /api/staff/matters`
* **الهدف:** استعراض جميع القضايا والمشاريع القانونية.
* **Query Parameters (اختيارية):** `status`: `open` | `q`: `تحكيم`
* **Response المتوقع (200 OK):** قائمة القضايا مع الجلسات القادمة والمحامي المسؤول.

---

### 13. `POST /api/staff/matters`
* **الهدف:** فتح قضية أو ملف قانوني جديد وربطه بالموكل.
* **Request Body (JSON):**
```json
{
  "title": "دعوى بطلان شرط التحكيم ومطالبة بالتعويض",
  "title_ar": "دعوى بطلان شرط التحكيم ومطالبة بالتعويض",
  "title_en": "Arbitration Clause Invalidation & Damages Claim",
  "workType": "dispute",
  "clientId": "cli-001",
  "practiceArea": "Commercial Litigation",
  "forum": "Cairo Economic Court",
  "leadId": "stf-001",
  "scope": "تمثيل الموكل أمام الدائرة الابتدائية بالمحكمة الاقتصادية"
}
```
* **Response المتوقع (201 Created):**
```json
{
  "ok": true,
  "reference": "MAT-2211",
  "matterId": "mat-...",
  "message": "تم إنشاء المسألة القانونية بنجاح"
}
```

---

### 14. `GET /api/staff/matters/lead-options`
* **الهدف:** عرض قائمة المحامين المؤهلين لرئاسة القضايا (درجة شريك أو محامٍ أول).
* **Response المتوقع (200 OK):**
```json
[
  { "id": "stf-001", "name": { "en": "Mansoor Al-Farooq", "ar": "منصور الفاروق" }, "rank": "partner" },
  { "id": "stf-002", "name": { "en": "Fatima Al-Zahraa", "ar": "فاطمة الزهراء" }, "rank": "seniorAssociate" }
]
```

---

### 15. `GET /api/staff/matters/options`
* **الهدف:** جلب خيارات المحاكم والهيئات القضائية وتصنيفات الممارسة المعتمدة في النظام.
* **Response المتوقع (200 OK):** كائنات `forums` و `practiceAreas`.

---

### 16. `GET /api/staff/matters/{reference}`
* **الهدف:** عرض الملف التفصيلي للقضية (الجلسات، جدول المواعيد، فريق العمل، المستندات).
* **Parameters (Path):** `reference`: `MAT-2201`
* **Response المتوقع (200 OK):** تفاصيل القضية الكاملة.

---

### 17. `POST /api/staff/matters/{reference}/close`
* **الهدف:** إغلاق القضية بعد صدور الحكم أو انتهاء النزاع.
* **Parameters (Path):** `reference`: `MAT-2201`
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "reference": "MAT-2201",
  "status": "closed",
  "message": "تم إغلاق القضية بنجاح"
}
```

---

### 18. `POST /api/staff/matters/{reference}/reopen`
* **الهدف:** إعادة فتح القضية (للاستئناف أو متابعة التنفيذ).
* **Parameters (Path):** `reference`: `MAT-2201`
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "reference": "MAT-2201",
  "status": "reopened",
  "message": "تم إعادة فتح القضية بنجاح"
}
```

---

### 19. `POST /api/staff/matters/reassign-lead`
* **الهدف:** إعادة تعيين المحامي المسؤول المشرف على ملف القضية.
* **Request Body (JSON):**
```json
{
  "references": ["MAT-2201"],
  "staffId": "stf-001"
}
```
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "reassignedCount": 1,
  "changed": 1,
  "leadName": { "en": "Mansoor Al-Farooq", "ar": "منصور الفاروق" }
}
```

---

### 20. `POST /api/staff/matters/{reference}/team`
* **الهدف:** إسناد عضو من فريق العمل إلى القضية وتحديد دوره.
* **Parameters (Path):** `reference`: `MAT-2201`
* **Request Body (JSON):**
```json
{
  "staff_id": "stf-002",
  "role_ar": "محامٍ أول مشارك",
  "role_en": "Senior Associate"
}
```
* **Response المتوقع (201 Created):**
```json
{
  "ok": true,
  "reference": "MAT-2201",
  "member": { "staff_id": "stf-002", "role_ar": "محامٍ أول مشارك" }
}
```

---

### 21. `DELETE /api/staff/matters/{reference}/team/{staff_id}`
* **الهدف:** إزالة عضو من فريق القضية.
* **Parameters (Path):**
  - `reference`: `MAT-2201`
  - `staff_id`: `stf-002`
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "تمت إزالة العضو من فريق القضية بنجاح"
}
```

---

## 4️⃣ Client Matters (بوابة الموكل - القضايا)
*(تتطلب توكن الموكل: سجل دخول بـ `client@mr-law.eg`)*

### 22. `GET /api/client/matters`
* **الهدف:** عرض القضايا المفتوحة الخاصة بالموكل المسجل دخوله.
* **Response المتوقع (200 OK):** قائمة قضايا الموكل وحالاتها ومواعيد الجلسات.

---

### 23. `GET /api/client/matters/forums`
* **الهدف:** استعراض المحاكم والهيئات التي يُنظر أمامها نزاعات الموكل.
* **Response المتوقع (200 OK):** مصفوفة بأسماء المحاكم ودوائرها.

---

### 24. `GET /api/client/matters/{reference}`
* **الهدف:** فحص تفاصيل قضية معينة من منظور الموكل.
* **Parameters (Path):** `reference`: `MAT-2201`
* **Response المتوقع (200 OK):** بيانات القضية ومذكرات الدفاع المتاحة للموكل.

---

## 5️⃣ Billing (الفوترة والأتعاب للمحامين)

### 25. `GET /api/staff/billing/summary`
* **الهدف:** تقرير المؤشرات المالية الرئيسية (المبالغ غير المفوترة، المفوترة، المحصلة، والمتأخرة).
* **Response المتوقع (200 OK):**
```json
{
  "unbilledHours": 42.5,
  "unbilledAmount": 185000,
  "billedAmount": 650000,
  "collectedAmount": 480000,
  "overdueAmount": 170000
}
```

---

### 26. `GET /api/staff/billing/invoices`
* **الهدف:** استعراض سجل الفواتير مع فلاتر الحالة.
* **Query Parameters (اختيارية):** `status`: `all` | `due` | `paid`
* **Response المتوقع (200 OK):** قائمة الفواتير الصادرة والمسددة.

---

### 27. `GET /api/staff/billing/drafts`
* **الهدف:** عرض مسودات الفواتير التي تم إعدادها ولم تُصدر بعد.
* **Response المتوقع (200 OK):** مصفوفة المسودات.

---

### 28. `POST /api/staff/billing/drafts`
* **الهدف:** إنشاء مسودة فاتورة أتعاب قانونية جديدة.
* **Request Body (JSON):**
```json
{
  "engagementRef": "MAT-2201",
  "description": "أتعاب مرحلة إيداع المذكرات وحضور جلسة الخبراء",
  "lines": [
    {
      "description": "صياغة المذكرة الختامية وحافظة المستندات",
      "amount": 50000,
      "minutes": 240
    },
    {
      "description": "رسوم قضائية ومصروفات انتقال",
      "amount": 7500,
      "minutes": 0
    }
  ]
}
```
* **Response المتوقع (201 Created):**
```json
{
  "ok": true,
  "reference": "INV-2026-105",
  "invoiceId": "inv-...",
  "status": "draft"
}
```

---

### 29. `POST /api/staff/billing/invoices/{reference}/issue`
* **الهدف:** اعتماد مسودة الفاتورة وإصدارها رسمياً للموكل (تتحول الحالة إلى `due`).
* **Parameters (Path):** `reference`: `INV-2026-089` (أو رقم الفاتورة المنشأة حديثاً)
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "reference": "INV-2026-089",
  "status": "due",
  "message": "تم إصدار الفاتورة بنجاح"
}
```

---

### 30. `POST /api/staff/billing/invoices/{reference}/mark-paid`
* **الهدف:** تسجيل سداد الفاتورة وإثبات التحصيل (تتحول الحالة إلى `paid`).
* **Parameters (Path):** `reference`: `INV-2026-089`
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "reference": "INV-2026-089",
  "status": "paid",
  "paidAt": "2026-11-02T...",
  "message": "تم تسجيل سداد الفاتورة بنجاح"
}
```

---

### 31. `GET /api/staff/billing/quotes`
* **الهدف:** عرض عروض الأسعار والتقديرات المقدمة للموكلين.
* **Response المتوقع (200 OK):** قائمة عروض الأتعاب المعتمدة وقيد الانتظار.

---

### 32. `POST /api/staff/billing/time`
* **الهدف:** تسجيل ساعات عمل قانونية مبذولة على ملف قضية (Time Tracking).
* **Request Body (JSON):**
```json
{
  "matterId": "MAT-2201",
  "minutes": 120,
  "description": "دراسة تقرير الخبير الهندسي وإعداد مذكرة الاعتراضات",
  "billable": true
}
```
* **Response المتوقع (201 Created):**
```json
{
  "ok": true,
  "entryId": "time-...",
  "recordedMinutes": 120
}
```

---

### 33. `GET /api/staff/billing/time`
* **الهدف:** استعراض سجل الساعات المسجلة من قِبل الفريق.
* **Response المتوقع (200 OK):** مصفوفة بساعات العمل اليومية وتفاصيلها.

---

### 34. `GET /api/staff/billing/context`
* **الهدف:** جلب سياق الفوترة (أسعار ساعات المحامين ومعدلات الصرف).
* **Response المتوقع (200 OK):**
```json
{
  "hourlyRates": {
    "partner": 3500,
    "seniorAssociate": 2200,
    "juniorAssociate": 1400,
    "paralegal": 800
  },
  "defaultCurrency": "EGP"
}
```

---

## 6️⃣ Client Invoices (فواتير الموكل)
*(تتطلب توكن الموكل: `client@mr-law.eg`)*

### 35. `GET /api/client/invoices`
* **الهدف:** عرض الفواتير الخاصة بالموكل وإشعارات السداد.
* **Response المتوقع (200 OK):** فواتير الموكل المستحقة والمسددة.

---

### 36. `GET /api/client/invoices/summary`
* **الهدف:** الملخص المالي الإجمالي لحساب الموكل.
* **Response المتوقع (200 OK):** إجمالي المستحق، المسدد، ورصيد الحساب.

---

### 37. `GET /api/client/invoices/engagements`
* **الهدف:** قائمة ملفات الموكل المربوطة بفواتير أو دفعات أتعاب.
* **Response المتوقع (200 OK):** كروت الملفات المالية.

---

### 38. `GET /api/client/invoices/{reference}`
* **الهدف:** عرض الفاتورة التفصيلية للموكل مع تفقيط المبلغ وبيانات الحساب البنكي للسداد.
* **Parameters (Path):** `reference`: `INV-2026-089`
* **Response المتوقع (200 OK):** البنود والمبلغ الإجمالي وطرق الدفع.

---

## 7️⃣ Legal Database (القاعدة القانونية وأحكام النقض)

### 39. `GET /api/staff/legal-database`
* **الهدف:** البحث الذكي في قاعدة القوانين واللوائح وأحكام محكمة النقض.
* **Query Parameters (اختيارية):**
  - `q`: `تحكيم` أو `مسؤولية عقدية`
  - `kind`: `all` | `judgment` | `statute` | `regulation`
* **Response المتوقع (200 OK):**
```json
{
  "entries": [
    {
      "reference": "EGY-LAW-27-1994",
      "title_ar": "قانون التحكيم المصري في المواد المدنية والتجارية",
      "kind": "statute"
    }
  ],
  "facets": { ... }
}
```

---

### 40. `GET /api/staff/legal-database/{reference}`
* **الهدف:** قراءة المبدأ القانوني أو نص القانون ومادته بالكامل.
* **Parameters (Path):** `reference`: `EGY-LAW-27-1994` أو `EGY-CASS-2023-419`
* **Response المتوقع (200 OK):** السند القانوني والنص العربي والإنجليزي والتصنيفات.

---

## 8️⃣ Documents (Staff) (صياغة وإدارة المستندات القانونية)

### 41. `POST /api/staff/documents/generate-word`
* **الهدف:** توليد مستند Word رسمي (.docx) مصاغ قانونياً ومجهز بهوية المكتب والتوقيع.
* **Request Body (JSON):**
```json
{
  "matter_reference": "MAT-2201",
  "template_type": "pleading",
  "title": "مذكرة دفاع ختامية في دعوى التعويض",
  "court_name": "محكمة القاهرة الاقتصادية",
  "circuit": "الدائرة الأولى استئنافي",
  "case_number": "1044 لسنة 2026",
  "client_role": "المدعى عليه",
  "opposing_party": "شركة المشرق للتجارة والتوريدات",
  "defenses": "أولاً: الدفع بعدم جواز نظر الدعوى لسابقة الفصل فيها بالتحكيم. ثانياً: انتفاء ركن الخطأ والضرر في جانب الموكل.",
  "requests": "أصلياً: الحكم بعدم قبول الدعوى. احتياطياً: رفض الدعوى وإلزام المدعي بالمصروفات ومقابل أتعاب المحاماة."
}
```
* **Response المتوقع (201 Created):**
```json
{
  "id": "doc-51a89b...",
  "name": "مذكرة_دفاع_MAT_2201_....docx",
  "title": "مذكرة دفاع ختامية في دعوى التعويض",
  "kind": "docx",
  "size_label": "34.2 KB",
  "download_url": "/api/documents/doc-51a89b.../download"
}
```

---

### 42. `POST /api/staff/documents/export-excel`
* **الهدف:** تصدير كشوف الحسابات المالية أو سجل الساعات كملف Excel رسمي (.xlsx).
* **Request Body (JSON):**
```json
{
  "export_type": "client_statement",
  "client_id": "cli-001"
}
```
* **Response المتوقع (201 Created):**
```json
{
  "id": "doc-...",
  "name": "كشف_حساب_موكل_cli-001_....xlsx",
  "kind": "xlsx",
  "size_label": "18.5 KB",
  "download_url": "/api/documents/.../download"
}
```

---

### 43. `GET /api/staff/documents`
* **الهدف:** استعراض خزانة المستندات المنشأة والمحفوظة.
* **Response المتوقع (200 OK):** قائمة المستندات مع أحجامها وتواريخ إنشائها وحالتها.

---

### 44. `DELETE /api/staff/documents/{document_id}`
* **الهدف:** حذف مستند من الخزانة وقاعدة البيانات.
* **Parameters (Path):** `document_id`: المعرف الناتج من خطوة التوليد.
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "تم حذف المستند بنجاح"
}
```

---

## 9️⃣ Documents (Client) (مستندات الموكل)

### 45. `GET /api/client/documents`
* **الهدف:** عرض المستندات المصرح للموكل بتحميلها (مثل صور الأحكام والعقود).
* **Response المتوقع (200 OK):** مصفوفة بالمستندات المتاحة للموكل.

---

## 🔟 Documents Download & Preview (المعاينة والتحميل الفوري)

### 46. `GET /api/documents/{document_id}/preview`
* **الهدف:** قراءة فقرات ونص المستند بالكامل لمعاينته مباشرة داخل المتصفح بدون الحاجة لبرامج خارجية.
* **Parameters (Path):** `document_id`: `doc-af3c1535bb77`
* **Response المتوقع (200 OK):**
```json
{
  "document_id": "doc-af3c1535bb77",
  "name": "مذكرة_دفاع_....docx",
  "paragraphs": [
    "مذكرة دفاع في الضرائب",
    "وكيل الموكل الأستاذ / رنا الخطيب",
    "بناء عليه يلتمس الموكل..."
  ]
}
```

---

### 47. `GET /api/documents/{document_id}/download`
* **الهدف:** تنزيل الملف المباشر للمتصفح (.docx أو .xlsx) بـ Stream مباشر.
* **Parameters (Path):** `document_id`: `doc-af3c1535bb77`
* **Response المتوقع (200 OK):** تحميل مباشر للملف (Binary Attachment).

---

## 1️⃣1️⃣ Integrations & Word Online (التكامل مع مايكروسوفت وورد أونلاين)

### 48. `POST /api/staff/integrations/microsoft/save-client-id`
* **الهدف:** حفظ أو تحديث Azure Client ID الخاص بالمكتب لتفعيل الربط السحابي.
* **Request Body (JSON):**
```json
{
  "client_id": "azure-client-id-example-12345",
  "client_secret": "azure-secret-example-67890"
}
```
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "تم حفظ بيانات تكامل Microsoft بنجاح"
}
```

---

### 49. `GET /api/staff/integrations/microsoft/login`
* **الهدف:** بدء تسجيل الدخول التلقائي لمايكروسوفت والتحويل لواجهة تسجيل الدخول.
* **Response المتوقع (307 Temporary Redirect):** توجيه إلى `https://login.microsoftonline.com/...`

---

### 50. `GET /api/staff/integrations/microsoft/auth-url`
* **الهدف:** الحصول على رابط تفويض OAuth الصريح مع عنوان الـ Redirect.
* **Query Parameters:**
  - `redirect_uri`: `http://localhost:8000/api/staff/integrations/microsoft/callback`
* **Response المتوقع (200 OK):**
```json
{
  "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?..."
}
```

---

### 51. `GET /api/staff/integrations/microsoft/status`
* **الهدف:** فحص حالة اتصال المكتب بخدمات مايكروسوفت و OneDrive.
* **Response المتوقع (200 OK):**
```json
{
  "connected": true,
  "provider": "microsoft",
  "configured": true
}
```

---

### 52. `GET /api/staff/integrations/microsoft/callback`
* **الهدف:** استقبال كود التفويض بعد موافقة المستخدم في مايكروسوفت.
* **Query Parameters:**
  - `code`: `MOCK_CODE`
  - `state`: `stf-001::/ar/staff`
* **Response:** توجيه المستخدم لصفحة التطبيق بعد حفظ التوكن.

---

### 53. `POST /api/staff/integrations/microsoft/exchange-token`
* **الهدف:** تبديل كود المصادقة بـ OAuth Token.
* **Request Body (JSON):**
```json
{
  "code": "auth_code_from_microsoft",
  "redirect_uri": "http://localhost:8000/api/staff/integrations/microsoft/callback"
}
```

---

### 54. `POST /api/staff/integrations/microsoft/disconnect`
* **الهدف:** فك الارتباط بحساب مايكروسوفت ومسح التوكن المخزن بأمان.
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "تم فك الارتباط بحساب Microsoft بنجاح"
}
```

---

### 55. `POST /api/staff/integrations/documents/{document_id}/open-word-online`
* **الهدف:** رفع المستند إلى OneDrive الخاص بالمكتب وتوليد رابط التعديل المباشر في Word Online.
* **Parameters (Path):** `document_id`: `doc-af3c1535bb77`
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "webUrl": "https://onedrive.live.com/edit.aspx?...",
  "message": "تم فتح المستند للتعديل الحي عبر Word Online"
}
```

---

### 56. `POST /api/staff/integrations/documents/{document_id}/sync-from-word-online`
* **الهدف:** سحب التعديلات الأخيرة التي أجراها المحامي على Word Online ومزامنتها في المنصة فوراً.
* **Parameters (Path):** `document_id`: `doc-af3c1535bb77`
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "message": "تمت مزامنة المستند من Word Online بنجاح وحفظ أحدث التعديلات"
}
```

---

### 57. `POST /api/staff/integrations/documents/{document_id}/upload-updated-docx`
* **الهدف:** رفع نسخة Word محدثة (.docx) مباشرة للمستند واستبدالها في النظام وقاعدة البيانات.
* **Request (Multipart Form):**
  - `file`: اختر ملف `.docx` من جهازك.
* **Response المتوقع (200 OK):**
```json
{
  "success": true,
  "message": "تم حفظ وتحديث المستند في الموقع وقاعدة البيانات بنجاح!",
  "document_id": "doc-af3c1535bb77"
}
```

---

## 1️⃣2️⃣ Users & Team Management (إدارة فريق العمل والصلاحيات)

### 58. `GET /api/staff/users`
* **الهدف:** عرض جدول المحامين وفريق العمل ورتبهم القانونية وحالة تفعيلهم.
* **Response المتوقع (200 OK):**
```json
{
  "members": [
    {
      "id": "stf-001",
      "name": { "en": "Mansoor Al-Farooq", "ar": "منصور الفاروق" },
      "rank": "partner",
      "email": "partner@mr-law.eg",
      "status": "active"
    }
  ],
  "total": 6
}
```

---

### 59. `POST /api/staff/users`
* **الهدف:** إضافة محامٍ أو عضو جديد لفريق العمل وتعيين رتبته وكلمة مروره المؤقتة (خاص بالشريك فقط).
* **Request Body (JSON):**
```json
{
  "name": "محمود عزمي",
  "name_ar": "محمود عزمي",
  "name_en": "Mahmoud Azmy",
  "email": "m.azmy@mr-law.eg",
  "rank": "juniorAssociate",
  "phone": "+201099887766",
  "password": "password123"
}
```
* **الرتب المتاحة (`rank`):**
  - `partner`: شريك
  - `seniorAssociate`: محامٍ أول
  - `juniorAssociate`: محامٍ مشارك
  - `paralegal`: باحث قانوني
  - `legalSecretary`: سكرتير قانوني
* **Response المتوقع (201 Created):**
```json
{
  "ok": true,
  "id": "stf-007",
  "name": { "en": "Mahmoud Azmy", "ar": "محمود عزمي" },
  "email": "m.azmy@mr-law.eg",
  "rank": "juniorAssociate",
  "status": "temporaryPasswordIssued",
  "message": "تم إضافة العضو بنجاح إلى قاعدة البيانات وتعيين كلمة المرور المؤقتة"
}
```

---

### 60. `POST /api/staff/users/{user_id}/access`
* **الهدف:** تفعيل أو سحب صلاحية الدخول للمحامي (Grant / Revoke).
* **Parameters (Path):** `user_id`: `stf-002` (أو رقم العضو)
* **Request Body (JSON):**
```json
{
  "grant": true
}
```
*(أو `"grant": false` لإلغاء صلاحية تسجيل الدخول وإيقاف الحساب)*
* **Response المتوقع (200 OK):**
```json
{
  "ok": true,
  "userId": "stf-002",
  "status": "active",
  "message": "تم تحديث صلاحيات الوصول بنجاح"
}
```

---

## ⚡ سكربت الاختبار التلقائي السريع لجميع الـ 60 API:

يمكنك تشغيل سكربت الفحص الآلي من الطرفية في أي وقت لاختبار جميع الواجهات في ثوانٍ معدودة:
```powershell
backend\venv\Scripts\python.exe tests\test_all_60_apis.py
```
سيعطيك تقريراً فورياً بعلامات النجاح `[PASS]` لكل API وحالة الاستجابة بالأرقام.
