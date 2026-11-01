'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

/**
 * The save / discard row under an editable settings panel.
 *
 * WHAT SAVE DOES, AND WHY IT IS NOT A SILENT NO-OP
 * ---------------------------------------------------------------------------
 * Settings is the first screen in this batch that is ENTIRELY a write surface.
 * Every other screen reads and has one or two forward-referencing buttons; here
 * every control is one. That changes the right answer: a page where nothing
 * visibly happens anywhere is not a prototype of a settings screen, it is a
 * broken one.
 *
 * So the controls behave normally — typing changes the field, a toggle flips,
 * this row appears when something is dirty, and Discard really does put it back.
 * Only the last step is missing, and it is the step that gets stated: pressing
 * Save says nothing was saved and names where persistence lands.
 *
 * That is the same shape as the invoice payment button and the opposite of the
 * message composer's optimistic echo, and the reason is the same one both times:
 * an echo of your own typing is a claim about the interface, which is true; a
 * saved state is a claim about what the system will remember, which is not.
 *
 * The notice is deliberately attached to the ACTION rather than being a banner
 * over the whole screen. A banner is read once and then stops being read; this
 * appears at the moment it is relevant, beside the button it is about.
 */
export interface SaveRowProps {
  dirty: boolean;
  /** Set once Save has been pressed for the current edits. */
  attempted: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveRow({ dirty, attempted, onSave, onDiscard }: SaveRowProps) {
  const t = useTranslations('settings');

  if (!dirty) return null;

  return (
    <div className="mt-5 border-t border-gray-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-gray-500">{t('unsaved')}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onDiscard}>
            {t('discard')}
          </Button>
          {/*
            syn-red. design.md §2 gives red to the human's own action, and §4
            spends it once per view — which holds here because only ONE panel is
            on screen at a time: the tabs are real URLs, so the Profile panel's
            Save and the Notifications panel's Save are never rendered together.
          */}
          <Button variant="primary" onClick={onSave}>
            {t('save')}
          </Button>
        </div>
      </div>

      {attempted ? (
        <p role="status" className="mt-3 text-caption text-gray-600">
          {t('notSaved')}
        </p>
      ) : null}
    </div>
  );
}

export default SaveRow;
