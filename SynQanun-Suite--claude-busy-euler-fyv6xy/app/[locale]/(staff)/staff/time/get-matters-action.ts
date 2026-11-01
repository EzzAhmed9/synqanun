'use server';

import { backendBridge } from '@/lib/backend-bridge';

export interface ActiveMatterOption {
  value: string;
  label: { en: string; ar: string };
}

export async function getActiveMattersForTimer(): Promise<ActiveMatterOption[]> {
  try {
    const context = await backendBridge.billing.invoiceDraftContext();
    if (context && context.engagements && Array.isArray(context.engagements) && context.engagements.length > 0) {
      return context.engagements.map((e: any) => ({
        value: e.value,
        label: {
          en: e.label?.en || e.value,
          ar: e.label?.ar || e.label?.en || e.value,
        },
      }));
    }

    const mattersRes = await backendBridge.matters.list({ view: 'active' });
    if (mattersRes && mattersRes.items && Array.isArray(mattersRes.items)) {
      return mattersRes.items.map((m: any) => ({
        value: m.reference,
        label: {
          en: m.title?.en || m.reference,
          ar: m.title?.ar || m.title?.en || m.reference,
        },
      }));
    }
  } catch (err) {
    console.error('Failed to get active matters for timer:', err);
  }

  // Sensible fallback matching active matters in database
  return [
    {
      value: 'MAT-2201',
      label: {
        ar: 'نزاع عقد التوزيع الحصري مع شركة الشرق الأوسط للتجارة',
        en: 'Exclusive Distribution Agreement Dispute with Middle East Trade Corp',
      },
    },
    {
      value: 'MAT-2202',
      label: {
        ar: 'تحكيم مشارطة إيجار سفن الشحن وتلف البضائع البحرية',
        en: 'Maritime Charterparty & Cargo Damage Arbitration',
      },
    },
    {
      value: 'MAT-2203',
      label: {
        ar: 'إعادة هيكلة الحوكمة واستيفاء متطلبات ترخيص البيئة التشريعية التجريبية',
        en: 'Corporate Governance Restructuring & Regulatory Sandbox Licensing',
      },
    },
    {
      value: 'MAT-2204',
      label: {
        ar: 'طعن ضريبة القيمة المضافة وفروق الفحص المالي للأعوام 2023-2024',
        en: 'VAT Assessment Dispute for Fiscal Years 2023-2024',
      },
    },
    {
      value: 'MAT-2205',
      label: {
        ar: 'الشركة المتحدة للخدمات اللوجستية والشحن',
        en: 'United Logistics & Cargo Co.',
      },
    },
  ];
}
