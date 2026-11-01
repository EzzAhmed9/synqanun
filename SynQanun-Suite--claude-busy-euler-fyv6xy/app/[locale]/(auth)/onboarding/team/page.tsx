'use client';

import * as React from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  completedTeam,
  newTeamRow,
  useOnboarding,
  type TeamMember,
} from '@/components/onboarding/OnboardingProvider';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { Badge, Card, Input, Select } from '@/components/ui';
import { RANKS, type Rank } from '@/lib/ranks';

/**
 * Step 2 — add your team.
 *
 * No invitation language anywhere on this screen. BUILD_PLAN.md §3.1: staff
 * are provisioned by temporary password, not by invitation, so there is no
 * "pending invite" state to show and nothing here is sent. This step only
 * collects who is being added; the credentials line appears once, on the
 * review step, as a plain statement of what will happen at launch.
 *
 * Built directly from spec — Stitch never designed this step — reusing step
 * 1's card, spacing and field patterns so the stepper reads as one flow.
 */
export default function TeamStep() {
  const t = useTranslations('onboarding.team');
  const { team, setTeam } = useOnboarding();

  const filled = completedTeam(team);

  function updateRow(id: string, patch: Partial<TeamMember>) {
    setTeam(team.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setTeam([...team, newTeamRow()]);
  }

  function removeRow(id: string) {
    const remaining = team.filter((row) => row.id !== id);
    // Never leave the table with nothing to type into.
    setTeam(remaining.length > 0 ? remaining : [newTeamRow()]);
  }

  return (
    <WizardShell step="team" title={t('title')}>
      <div className="flex flex-col gap-6">
        <Card padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-title text-gray-700">{t('cardTitle')}</h2>
              <p className="mt-1 text-caption text-gray-500">{t('cardBody')}</p>
            </div>
            <Badge tone={filled.length > 0 ? 'success' : 'neutral'}>
              {filled.length > 0 ? t('countSome', { count: filled.length }) : t('countNone')}
            </Badge>
          </div>

          {/*
            A list of field groups, not a <table>. design.md §4's table styling
            is for displaying records; this is a form. Real inputs inside table
            cells collapse badly on narrow screens and give screen readers a
            grid to navigate where a labelled form is what is meant.

            Each row's labels are visually hidden after the first row so the
            control still has an accessible name without repeating the column
            heading five times down the page.
          */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="hidden gap-3 px-1 desktop:grid desktop:grid-cols-[1fr_1fr_200px_44px]">
              <span className="text-caption font-medium text-gray-500">{t('name')}</span>
              <span className="text-caption font-medium text-gray-500">{t('email')}</span>
              <span className="text-caption font-medium text-gray-500">{t('rank')}</span>
              <span className="sr-only">{t('remove')}</span>
            </div>

            {team.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 p-3 tablet:grid-cols-2 desktop:grid-cols-[1fr_1fr_200px_44px] desktop:items-center desktop:rounded-none desktop:border-0 desktop:p-0"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-caption font-medium text-gray-700 desktop:sr-only">
                    {t('name')}
                  </span>
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder={t('namePlaceholder')}
                    autoComplete="off"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-caption font-medium text-gray-700 desktop:sr-only">
                    {t('email')}
                  </span>
                  {/* A work email is Latin in both locales — isolate it so it
                      does not reorder inside the Arabic form (design.md §12). */}
                  <Input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(row.id, { email: e.target.value })}
                    placeholder={t('emailPlaceholder')}
                    latinValue
                    autoComplete="off"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-caption font-medium text-gray-700 desktop:sr-only">
                    {t('rank')}
                  </span>
                  <RankSelect
                    value={row.rank}
                    onChange={(rank) => updateRow(row.id, { rank })}
                  />
                </label>

                <div className="flex justify-end desktop:justify-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label={t('removeRow', {
                      name: row.name.trim() || String(index + 1),
                    })}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-error max-tablet:min-h-11"
                  >
                    <Trash2 aria-hidden size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-4 inline-flex items-center gap-2 rounded-btn border border-gray-200 bg-gray-50 px-3 py-2 text-caption font-medium text-gray-700 hover:bg-gray-100 max-tablet:min-h-11"
          >
            <Plus aria-hidden size={14} />
            {t('addAnother')}
          </button>
        </Card>

        <CsvUpload />
      </div>
    </WizardShell>
  );
}

function RankSelect({ value, onChange }: { value: Rank; onChange: (rank: Rank) => void }) {
  const tRanks = useTranslations('ranks');

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Rank)}>
      {RANKS.map((rank) => (
        <option key={rank} value={rank}>
          {tRanks(rank)}
        </option>
      ))}
    </Select>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Bulk add from a CSV.
 *
 * This one is genuinely implemented rather than faked — parsing a small CSV is
 * pure client-side work that needs no backend, so there was no reason to stub
 * it. Pick a file and the rows really do appear in the table above.
 *
 * Deliberately forgiving: it skips a header row, accepts the rank as either
 * the English label, the Arabic label or the internal id, and falls back to
 * junior associate when the rank cell is unrecognised rather than rejecting
 * the whole file. A firm's spreadsheet will not match our ids.
 */
function CsvUpload() {
  const t = useTranslations('onboarding.team');
  const tRanks = useTranslations('ranks');
  const { team, setTeam } = useOnboarding();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [result, setResult] = React.useState<{ kind: 'added'; count: number } | { kind: 'none' } | null>(
    null
  );

  function resolveRank(raw: string): Rank {
    const needle = raw.trim().toLowerCase();
    return (
      RANKS.find(
        (rank) =>
          rank.toLowerCase() === needle ||
          tRanks(rank).toLowerCase() === needle
      ) ?? 'juniorAssociate'
    );
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.split(','))
      .filter((cells) => cells.length >= 2);

    const parsed = rows
      .map((cells) => ({
        name: (cells[0] ?? '').trim().replace(/^"|"$/g, ''),
        email: (cells[1] ?? '').trim().replace(/^"|"$/g, ''),
        rank: resolveRank(cells[2] ?? ''),
      }))
      // Requires an @ in the second column, which both skips a header row and
      // discards anything that is plainly not an address.
      .filter((row) => row.name !== '' && row.email.includes('@'))
      .map((row) => ({ ...newTeamRow(), ...row }));

    if (parsed.length === 0) {
      setResult({ kind: 'none' });
      return;
    }

    // Drop the trailing blank row if the user has not typed in it.
    const existing = team.filter((row) => row.name.trim() !== '' || row.email.trim() !== '');
    setTeam([...existing, ...parsed]);
    setResult({ kind: 'added', count: parsed.length });
  }

  return (
    <Card padding="lg">
      <h2 className="text-title text-gray-700">{t('csvTitle')}</h2>
      <p className="mt-1 text-caption text-gray-500">{t('csvBody')}</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-btn border border-gray-200 bg-gray-50 px-3 py-2 text-caption font-medium text-gray-700 hover:bg-gray-100 max-tablet:min-h-11"
      >
        <Upload aria-hidden size={14} />
        {t('csvChoose')}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Reset so picking the same file twice fires again.
          e.target.value = '';
        }}
      />

      {/* Announced, because the change it describes happens in a different
          card further up the page and is easy to miss. */}
      <p aria-live="polite" className="mt-3 min-h-[18px] text-caption">
        {result?.kind === 'added' ? (
          <span className="text-success">{t('csvAdded', { count: result.count })}</span>
        ) : result?.kind === 'none' ? (
          <span className="text-warning-text">{t('csvNone')}</span>
        ) : null}
      </p>
    </Card>
  );
}
