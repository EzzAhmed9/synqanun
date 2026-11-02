'use client';

import * as React from 'react';
import { Users, UserPlus, UserMinus, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card, Modal, Select, Input } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { CardHead } from '../cards';
import {
  getActiveStaffRosterAction,
  assignLawyerToMatterAction,
  removeLawyerFromMatterAction,
} from './matter-team-actions';

interface TeamMemberItem {
  id?: string;
  name: { en: string; ar: string };
  rank: string;
  role: string;
}

interface MatterTeamCardProps {
  matterRef: string;
  team: TeamMemberItem[];
  locale: Locale;
}

export function MatterTeamCard({ matterRef, team, locale }: MatterTeamCardProps) {
  const t = useTranslations('staffMatters');
  const tRank = useTranslations('ranks');
  const router = useRouter();

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [availableStaff, setAvailableStaff] = React.useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState('');
  const [roleAr, setRoleAr] = React.useState('محامٍ مشارك');
  const [roleEn, setRoleEn] = React.useState('Associate');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load active staff members when modal opens
  const handleOpenAddModal = async () => {
    setErrorMsg(null);
    setIsAddModalOpen(true);
    const res = await getActiveStaffRosterAction();
    if (res.ok && res.members) {
      // Filter out staff already on the team by name or email
      const existingNames = new Set(team.map((m) => m.name.ar));
      const candidates = res.members.filter((s: any) => !existingNames.has(s.name.ar));
      setAvailableStaff(candidates);
      if (candidates.length > 0) {
        setSelectedStaffId(candidates[0].id);
      }
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await assignLawyerToMatterAction(matterRef, selectedStaffId, roleAr, roleEn);
    setIsSubmitting(false);

    if (res.ok) {
      setIsAddModalOpen(false);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'حدث خطأ أثناء إضافة المحامي');
    }
  };

  const handleRemove = async (staffNameAr: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في استبعاد الأستاذ (${staffNameAr}) من فريق عمل القضية؟`)) {
      return;
    }

    // Try finding staff ID
    const res = await getActiveStaffRosterAction();
    const target = res.members?.find((s: any) => s.name.ar === staffNameAr || s.name.en === staffNameAr);
    if (!target) {
      alert('تعذر تحديد معرف المحامي');
      return;
    }

    const removeRes = await removeLawyerFromMatterAction(matterRef, target.id);
    if (removeRes.ok) {
      router.refresh();
    } else {
      alert(removeRes.error || 'تعذر استبعاد المحامي');
    }
  };

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
          <CardHead
            icon={Users}
            heading={t('columns.team')}
            caption={t('detail.teamCount', { count: team.length })}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 text-caption font-medium text-legal-navy hover:bg-gray-50"
          >
            <UserPlus size={14} />
            <span>إضافة محامٍ للفريق</span>
          </Button>
        </header>

        <ul className="divide-y divide-gray-200">
          {team.map((member) => {
            const isLead = member.role === 'lead';
            return (
              <li
                key={`${member.name.en}-${member.role}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-gray-800">
                    <bdi>{member.name[locale]}</bdi>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={isLead ? 'info' : 'neutral'} icon={null}>
                    {isLead ? t('team.lead') : (member.role === 'Associate' ? 'محامٍ مشارك' : member.role)}
                  </Badge>
                  <span className="text-caption text-gray-500">
                    {tRank(`holder.${member.rank}`)}
                  </span>

                  {!isLead && (
                    <button
                      type="button"
                      title="استبعاد من فريق القضية"
                      onClick={() => handleRemove(member.name.ar)}
                      className="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Modal for adding lawyer to this matter */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="تعيين محامٍ في فريق عمل القضية"
      >
        <form onSubmit={handleAssign} className="flex flex-col gap-4 p-5">
          <p className="text-body text-gray-600">
            اختر محامياً من جدول قيد المكتب لإسناد العمل القانوني وتدوين ذلك في الجدول الزمني للقضية:
          </p>

          {errorMsg && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-caption text-red-700">
              {errorMsg}
            </div>
          )}

          {availableStaff.length === 0 ? (
            <p className="text-caption text-gray-500">
              جميع المحامين المسجلين في المكتب معينون بالفعل في هذه القضية أو لا توجد حسابات نشطة إضافية.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-caption font-semibold text-gray-700 mb-1">
                  المحامي المطلوب تعيينه:
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2.5 text-body bg-white text-gray-900 focus:border-legal-navy focus:ring-1 focus:ring-legal-navy"
                >
                  {availableStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name.ar} — ({tRank(`holder.${s.rank}`)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-caption font-semibold text-gray-700 mb-1">
                  الدور في القضية:
                </label>
                <input
                  type="text"
                  value={roleAr}
                  onChange={(e) => {
                    setRoleAr(e.target.value);
                    setRoleEn(e.target.value);
                  }}
                  placeholder="مثال: مستشار الصياغة والمراجعة، أو محامٍ مشارك"
                  className="w-full rounded-md border border-gray-300 p-2.5 text-body bg-white text-gray-900 focus:border-legal-navy focus:ring-1 focus:ring-legal-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedStaffId}
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد الإضافة في القضية'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
