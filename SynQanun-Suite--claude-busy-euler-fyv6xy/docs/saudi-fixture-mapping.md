# Saudi jurisdiction mapping — proposed fixture changes

**Status: PROPOSAL. Nothing in this table has been applied.**
Prepared for review by a Saudi-qualified lawyer before any fixture is edited.

The demo tenant became **Meezan Legal / ميزان القانونية**, a Saudi firm, in Phase 1. The fixtures still place its work in the UAE — DIFC, ADGM, DIAC, Abu Dhabi, and the UAE securities regulator. A Saudi firm litigating in the DIFC Court of First Instance is incoherent, so the data has to move jurisdiction.

This file is the proposed move, row by row, for review. It is deliberately a document and not a commit.

---

## Read this before the table

### Only 30 of the 36 occurrences are data

A plain search for `DIFC|ADGM|Dubai|Abu Dhabi|SCA` finds 36 hits across 7 files. **Six of them must not be touched**, and the distinction matters more than the count:

| File | Line | What it is |
|---|---|---|
| `fixtures/legal-database.ts` | 19, 22, 23 | Comment cataloguing citations **the Stitch export invented** — "ADGM Companies Regulations 2020", "[2023] ADGMCFI 0019", "DIFC Law No. 5/2018 § 85(3)" |
| `fixtures/transcripts.ts` | 39 | Comment cataloguing the export's invented transcript citations, including DIFC Law No. 5 of 2018 |
| `fixtures/documents.ts` | 64 | Comment recording a refused change note that mentioned DIFC arbitration clause feedback |
| `fixtures/availability.ts` | 66 | Comment using "a client in Dubai" to illustrate why a time is not the reader's local time |

These are **the project's record of what it refused to build**. Rewriting "the export invented a DIFC citation" into "the export invented a Saudi citation" would falsify that record — the export invented a DIFC citation, and the comment is evidence. `matters.ts:35` is a similar case: a comment naming which forums are real, which should be updated *after* the data moves, to describe the new reality.

**Nothing below proposes editing a comment.** Every row is fixture data that renders on screen.

### Where I am not certain

Rows marked **⚠ REVIEW** are ones where I am not confident, and they are not evenly distributed. Translating a court's name is one kind of problem; mapping a *legal structure* that has no Saudi analogue is another, and the second kind is where this needs a lawyer rather than a dictionary.

Three things I want to say plainly about my own confidence:

1. **Court and regulator names I am reasonably confident about** — the Commercial Court, the Board of Grievances, the Saudi Center for Commercial Arbitration, the Capital Market Authority, the Ministry of Commerce. These are well-attested and I have given the standard Arabic.
2. **Case and registration number formats I am not confident about.** `ADGM-2025-0044` and `DIFC-PC-4487` are UAE formats. I do not know the official format of a Saudi commercial court case number or how a CR number should be presented in a case file, so every row touching an identifier is flagged.
3. **The two free-zone company structures have no clean Saudi equivalent**, and I have not invented one. A DIFC prescribed company and an ADGM SPV are common-law vehicles in financial free zones. Saudi Arabia has no DIFC/ADGM analogue — the King Abdullah Financial District is a district, **not** a separate legal jurisdiction with its own companies law, and proposing it as an equivalent would be wrong. Those rows propose a Saudi structure that does similar commercial work and flag the change in substance.

---

## A. `fixtures/matters.ts`

| # | Line | Field | Current EN | Current AR | Proposed EN | Proposed AR | Note |
|---|---|---|---|---|---|---|---|
| A1 | 227 | `forum` | DIFC Court of First Instance | محكمة دبي المالي الابتدائية | Riyadh Commercial Court | المحكمة التجارية بالرياض | Commercial disputes sit with the Commercial Courts under the MoJ since 2017. |
| A2 | 248 | `scopeSummary` | …under DIFC Contract Law No. 6 of 2004 | …بموجب قانون العقود رقم 6 لسنة 2004 الصادر عن مركز دبي المالي العالمي | …under the Saudi Commercial Courts Law | …بموجب نظام المحاكم التجارية | **⚠ REVIEW.** Dropping a specific statute rather than substituting one. A carriage/cold-chain claim may sit under the Commercial Courts Law, the Civil Transactions Law (2023) or the Commercial Transport Law — a lawyer should pick, and naming the wrong statute in a scope summary is exactly the invented-citation failure this project refuses elsewhere. |
| A3 | 266 | timeline `detail` | Submitted to the DIFC registry | مُودعة لدى سجل محكمة دبي المالي | Filed with the Commercial Court registry | مُودعة لدى قلم المحكمة التجارية | قلم المحكمة is the standard term for a court registry/clerk's office. |
| A4 | 276 | timeline `detail` | DIFC Court of First Instance, hearing room 3 | محكمة دبي المالي الابتدائية، قاعة 3 | Riyadh Commercial Court, hearing room 3 | المحكمة التجارية بالرياض، قاعة 3 | |
| A5 | 372 | timeline `detail` | DIAC, Dubai | مركز دبي للتحكيم الدولي، دبي | SCCA, Riyadh | المركز السعودي للتحكيم التجاري، الرياض | SCCA is the direct institutional counterpart to DIAC. |
| A6 | 453 | `forum` | SCA UAE compliance | هيئة الأوراق المالية والسلع | Capital Market Authority compliance | الامتثال لهيئة السوق المالية | CMA is the Saudi securities regulator. The matter is a sukuk prospectus, which is squarely CMA. |
| A7 | 502 | `forum` | Abu Dhabi Commercial Court | محكمة أبوظبي التجارية | Jeddah Commercial Court | المحكمة التجارية بجدة | A second city keeps the register from reading as one court. ⚠ Confirm Jeddah is plausible for this matter's client. |
| A8 | 530 | timeline `detail` | Abu Dhabi Commercial Court | محكمة أبوظبي التجارية | Jeddah Commercial Court | المحكمة التجارية بجدة | Must match A7. |
| A9 | 559 | `forum` | ADGM Courts | محاكم سوق أبوظبي العالمي | Board of Grievances | ديوان المظالم | **⚠ REVIEW.** This matter is corporate governance ending in a settlement. ديوان المظالم is the *administrative* judiciary — correct if the counterparty is a government body, wrong if it is a private company, where it should be a Commercial Court. **A lawyer must decide which this matter is.** |
| A10 | 571 | `courtFileNumber` | `ADGM-2025-0044` | — | *(format unknown)* | — | **⚠ REVIEW.** I do not know the official Saudi commercial case number format. Do not invent one. |
| A11 | 591 | timeline `detail` | ADGM Courts, Abu Dhabi | محاكم سوق أبوظبي العالمي، أبوظبي | *(follows A9)* | *(follows A9)* | ⚠ Depends on A9. |
| A12 | 600 | timeline `detail` | ADGM Courts registry | سجل محاكم سوق أبوظبي العالمي | *(follows A9)* | *(follows A9)* | ⚠ Depends on A9. |

## B. `fixtures/projects.ts`

| # | Line | Field | Current EN | Current AR | Proposed EN | Proposed AR | Note |
|---|---|---|---|---|---|---|---|
| B1 | 152 | `scopeSummary` | …across Dubai and Riyadh… | …في دبي والرياض… | …across Jeddah and Riyadh… | …في جدة والرياض… | Keeps the cross-border shape without leaving the Gulf. ⚠ Or keep Dubai: a Saudi firm advising on a Dubai subsidiary is perfectly real. A lawyer should say whether the demo wants a cross-border element at all. |
| B2 | 193 | timeline `detail` | ADGM Registry of Companies | سجل الشركات بسوق أبوظبي العالمي | Ministry of Commerce | وزارة التجارة | MoC maintains the commercial register. |
| B3 | 217 | `title` | ADGM special purpose vehicle registration | تسجيل شركة ذات غرض خاص بسوق أبوظبي العالمي | Special purpose vehicle registration | تسجيل شركة ذات غرض خاص | **⚠ REVIEW.** Saudi has no ADGM analogue. Proposal drops the free-zone reference and keeps the SPV as an ordinary LLC/closed JSC. Confirm the structure. |
| B4 | 222 | `jurisdiction` | ADGM Registration Authority | سلطة التسجيل في سوق أبوظبي العالمي | Ministry of Commerce | وزارة التجارة | |
| B5 | 230 | `registrationNumber` | `ADGM-SPV-11740` | — | *(CR number format)* | — | **⚠ REVIEW.** Saudi CR numbers are 10 digits (Riyadh entities commonly begin 1010). I am not confident enough to mint one that looks real without looking fake. |
| B6 | 237 | `scopeSummary` | Incorporating a special purpose vehicle at ADGM to ring-fence… | تأسيس شركة ذات غرض خاص في سوق أبوظبي العالمي لعزل… | Incorporating a special purpose vehicle to ring-fence… | تأسيس شركة ذات غرض خاص لعزل… | ⚠ Follows B3. |
| B7 | 253 | timeline `detail` | ADGM Registry of Companies | سجل الشركات بسوق أبوظبي العالمي | Ministry of Commerce | وزارة التجارة | |
| B8 | 262 | timeline `detail` | ADGM registration approval | موافقة التسجيل في سوق أبوظبي العالمي | Commercial registration issued | صدور السجل التجاري | |
| B9 | 326 | `jurisdiction` | DIFC prescribed company | شركة محددة بمركز دبي المالي العالمي | Closed joint stock company | شركة مساهمة مقفلة | **⚠ REVIEW — the most substantive row.** A DIFC prescribed company is a common-law family-holding vehicle. The nearest Saudi instruments are a closed JSC or a family waqf (وقف أهلي). These are materially different in succession terms, which is what this project is about. |
| B10 | 337 | `registrationNumber` | `DIFC-PC-4487` | — | *(CR number format)* | — | ⚠ As B5. |
| B11 | 344 | `scopeSummary` | Establishing a DIFC prescribed company to hold family assets… | تأسيس شركة محددة بمركز دبي المالي العالمي لحيازة أصول العائلة… | *(follows B9)* | *(follows B9)* | ⚠ Follows B9. |
| B12 | 360 | timeline `detail` | DIFC Registrar of Companies | مسجّل الشركات بمركز دبي المالي العالمي | Ministry of Commerce | وزارة التجارة | |

## C. `fixtures/invoices.ts`

| # | Line | Field | Current EN | Current AR | Proposed EN | Proposed AR | Note |
|---|---|---|---|---|---|---|---|
| C1 | 183 | `description` | DIFC filing fees and court costs | رسوم القيد والمصروفات القضائية لدى محكمة دبي المالي | Court filing fees and costs | رسوم القيد والمصروفات القضائية لدى المحكمة التجارية | |
| C2 | 192 | line `detail` | DIFC Court of First Instance, claim CFI-042 | محكمة دبي المالي الابتدائية، الدعوى CFI-042 | Riyadh Commercial Court, claim *(number)* | المحكمة التجارية بالرياض، الدعوى *(رقم)* | ⚠ Carries the same case-number question as A10. Must match whatever A10 resolves to. |
| C3 | 229 | `description` | Initial retainer — DIFC filing and counsel engagement | الدفعة المقدمة — رسوم القيد لدى محكمة دبي المالي وأتعاب التوكيل | Initial retainer — court filing and counsel engagement | الدفعة المقدمة — رسوم القيد لدى المحكمة التجارية وأتعاب التوكيل | |
| C4 | 317 | `description` | Milestone 3 — MISA regulatory filing and ADGM structuring | المرحلة 3 — الإيداع النظامي لدى وزارة الاستثمار وهيكلة سوق أبوظبي العالمي | Milestone 3 — MISA regulatory filing and group structuring | المرحلة 3 — الإيداع النظامي لدى وزارة الاستثمار وهيكلة المجموعة | MISA is already Saudi and stays. |
| C5 | 329 | line `detail` | MISA submission and ADGM registration protocols | الإيداع لدى وزارة الاستثمار وإجراءات التسجيل في سوق أبوظبي العالمي | MISA submission and commercial registration | الإيداع لدى وزارة الاستثمار وإجراءات السجل التجاري | |

## D. `fixtures/documents.ts`

| # | Line | Field | Current | Proposed | Note |
|---|---|---|---|---|---|
| D1 | 206 | `name` | `DIFC_Court_Order_Directions_CFI-042.pdf` | `Commercial_Court_Order_Directions_<case>.pdf` | ⚠ Filename carries the case number, so it follows A10. Filenames are not translated — `fixtures/documents.ts` explains why. |

---

## Follow-on, once the table is agreed

- **`fixtures/matters.ts:35`** — the header comment names the real forums ("the forums (DIFC, DIAC, ADGM, the Saudi commercial courts) are…"). Update it to describe the new set. This is a comment, so it changes *after* the data, to stay a true description.
- **`fixtures/legal-database.ts`** — the four sample legal entries are already Saudi-neutral placeholders with Lorem Ipsum bodies, so no entry needs replacing. Worth confirming the issuing bodies on those four read as Saudi.
- **Nothing in this table changes the i18n dictionaries.** Every string above lives in a fixture, per the project's no-inline-fake-data rule.

## Open questions for the reviewer

1. **A9** — is the corporate governance matter against a government body (Board of Grievances) or a private company (Commercial Court)?
2. **A10 / B5 / B10 / C2 / D1** — what format should a Saudi commercial court case number and a CR number take in a demo fixture? I would rather leave the current identifiers than mint plausible-looking fakes.
3. **B9 / B3** — what Saudi structure should stand in for a DIFC prescribed company and an ADGM SPV? This changes what the project *is*, not just what it is called.
4. **B1** — should the demo keep a cross-border element at all, or be wholly domestic?
5. **A2** — which statute, if any, should the carriage claim cite? Or should it cite none, which is the safer default everywhere else in this codebase.
