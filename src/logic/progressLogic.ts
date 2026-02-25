import type { Progress, Checkin, CheckinEntry } from '@/types/progress';
import type { ArtId } from '@/data/sixArts';
import { getArt } from '@/data/sixArts';
import { getProgress, setProgress, addCheckin, unlockAchievement } from '@/storage/storage';

/** 计算某艺已完成最高式 */
export function getCompletedLevel(progress: Progress, artId: ArtId): number {
  const completed = progress.arts[artId].completedAt;
  let max = 0;
  for (let i = 1; i <= 10; i++) {
    if (completed[i]) max = i;
  }
  return max;
}

/** 某艺是否已完成最终技 */
export function isMasterCompleted(progress: Progress, artId: ArtId): boolean {
  return !!progress.arts[artId].completedAt[10];
}

/** 完成最终技数量 */
export function masterCount(progress: Progress): number {
  return (Object.keys(progress.arts) as ArtId[]).filter((id) =>
    isMasterCompleted(progress, id)
  ).length;
}

/** 提交打卡并更新进度：若 passed 且与当前式一致，记录达标并可选升级 */
export function submitCheckinAndUpdateProgress(
  checkin: { date: string; entries: CheckinEntry[] }
): Progress {
  const progress = getProgress();

  for (const entry of checkin.entries) {
    const art = progress.arts[entry.artId];
    if (!art) continue;
    if (entry.passed && entry.level === art.currentLevel && entry.level <= 10) {
      if (!art.completedAt[entry.level]) {
        art.completedAt[entry.level] = checkin.date;
        if (entry.level === 10) {
          unlockAchievement(`art_master_${entry.artId}`);
        }
      }
      if (entry.level === art.currentLevel && art.currentLevel < 10) {
        art.currentLevel = entry.level + 1;
      }
    }
  }

  progress.updatedAt = new Date().toISOString();
  setProgress(progress);
  addCheckin({
    ...checkin,
    createdAt: new Date().toISOString(),
  });
  return progress;
}

/** 阶段耗时（天）：从第一式达标到该阶段最后一式达标 */
export function getStageDurationDays(
  progress: Progress,
  artId: ArtId,
  stage: 'beginner' | 'intermediate' | 'advanced' | 'master'
): number | null {
  const art = getArt(artId);
  const steps = art.steps.filter((s) => s.stage === stage);
  if (steps.length === 0) return null;
  const firstLevel = steps[0].level;
  const lastLevel = steps[steps.length - 1].level;
  const firstDate = progress.arts[artId].completedAt[firstLevel];
  const lastDate = progress.arts[artId].completedAt[lastLevel];
  if (!firstDate || !lastDate) return null;
  const a = new Date(firstDate).getTime();
  const b = new Date(lastDate).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** 连续打卡天数（截止昨天的连续天数，若今天也打卡则再 +1） */
export function getStreakDays(checkins: Checkin[]): number {
  if (checkins.length === 0) return 0;

  const dateSet = new Set(checkins.map((c) => c.date));

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // 先统计「截止昨天」的连续天数
  let baseStreak = 0;
  let cur = yesterdayStr;
  while (dateSet.has(cur)) {
    baseStreak++;
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    cur = prev.toISOString().slice(0, 10);
  }

  // 如果今天也打卡了，则在「截止昨天的连续天数」基础上再 +1
  const hasToday = dateSet.has(todayStr);
  return baseStreak + (hasToday ? 1 : 0);
}
