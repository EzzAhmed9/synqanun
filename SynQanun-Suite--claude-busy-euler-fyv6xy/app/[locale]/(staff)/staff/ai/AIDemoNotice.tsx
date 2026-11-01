import { useTranslations } from 'next-intl';
import { FeatherGlyph } from '../cards';
import { cn } from '@/lib/utils';

/**
 * The one label that sits over every piece of AI output in this product.
 *
 * ===========================================================================
 * WHY IT IS A COMPONENT AND NOT A SENTENCE EACH SCREEN WRITES
 * ===========================================================================
 * Four screens generate something that reads as analysis — the Assistant,
 * Document Canvas, AI Reports and the Digest. If each carried its own wording,
 * the four would drift, and the weakest one would become the product's real
 * claim. One component means one claim, changed in one place when Track A.5
 * makes it untrue.
 *
 * BUILD_PLAN §3 is explicit that Track A has "no live LLM calls", and §6 puts
 * "fake AI responses → real LLM calls" in Track A.5. So the honest statement is
 * not that the output is unreliable — it is that no model produced it. Every
 * one of these screens assembles its answer from records the fixtures already
 * hold, which is why the notice says "grounded in this firm's own records"
 * rather than the softer, vaguer "may contain errors" every AI product ships.
 *
 * ===========================================================================
 * NO CONFIDENCE SCORE, EVER
 * ===========================================================================
 * Seven Stitch exports attached one — "99.4% compliance confidence", "احتمالية
 * الحكم لصالح الموكل: 82%", "Cognitive Risk Confidence 96.2%", "دقة 99.4%" —
 * and each sat beside a decision a lawyer was being invited to make. A number
 * like that is the single most persuasive thing on a screen and the single
 * least defensible: it implies a calibrated model behind it. There is none,
 * and there will not be one in Track A.5 either unless somebody measures it.
 *
 * ===========================================================================
 * NAVY AND THE FEATHER, NOTHING ELSE
 * ===========================================================================
 * design.md §2 reserves legal-navy for the product's own voice and syn-red for
 * the human's primary action. AI output is the product speaking, so it takes
 * navy — and never red, which would put a machine's suggestion in the same
 * colour as the partner's decision button.
 */
export function AIDemoNotice({ className }: { className?: string }) {
  const t = useTranslations('ai.notice');

  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-card border border-legal-navy/20 bg-legal-navy/5 p-3',
        'text-caption text-legal-navy',
        className
      )}
    >
      {/* The mark, not a robot or a sparkle. components/ui/EmptyState.tsx
          explains why the feather may not stand in for "nothing here"; this is
          the case it IS for — the product speaking in its own voice. */}
      <span aria-hidden className="mt-0.5 shrink-0">
        <FeatherGlyph />
      </span>
      <span>{t('body')}</span>
    </p>
  );
}

export default AIDemoNotice;
