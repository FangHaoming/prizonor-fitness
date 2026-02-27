import type { Progress, Checkin, Achievement } from '@/types/progress';
import { ART_IDS } from '@/data/sixArts';

const KEY_PROGRESS = 'cc_progress';
const KEY_CHECKINS = 'cc_checkins';
const KEY_ACHIEVEMENTS = 'cc_achievements';
const KEY_SETTINGS = 'cc_settings';

function defaultProgress(): Progress {
  const arts: Progress['arts'] = {} as Progress['arts'];
  for (const id of ART_IDS) {
    arts[id] = {
      artId: id,
      currentLevel: 1,
      completedAt: {},
    };
  }
  return {
    arts,
    updatedAt: new Date().toISOString(),
  };
}

export function getProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY_PROGRESS);
    if (!raw) return defaultProgress();
    const data = JSON.parse(raw) as Progress;
    // 合并默认，防止缺艺
    const current = defaultProgress();
    for (const id of ART_IDS) {
      if (data.arts[id]) {
        current.arts[id] = {
          ...current.arts[id],
          ...data.arts[id],
          artId: id,
          completedAt: { ...current.arts[id].completedAt, ...data.arts[id].completedAt },
        };
      }
    }
    current.updatedAt = data.updatedAt || current.updatedAt;
    return current;
  } catch {
    return defaultProgress();
  }
}

export function setProgress(p: Progress): void {
  p.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY_PROGRESS, JSON.stringify(p));
}

export function getCheckins(): Checkin[] {
  try {
    const raw = localStorage.getItem(KEY_CHECKINS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCheckins(list: Checkin[]): void {
  localStorage.setItem(KEY_CHECKINS, JSON.stringify(list));
}

export function addCheckin(checkin: Checkin): void {
  const list = getCheckins();
  const idx = list.findIndex((c) => c.date === checkin.date);
  if (idx >= 0) {
    list[idx] = { ...checkin, entries: [...(list[idx].entries || []), ...checkin.entries] };
  } else {
    list.push({ ...checkin, createdAt: new Date().toISOString() });
  }
  list.sort((a, b) => b.date.localeCompare(a.date));
  setCheckins(list);
}

export function getAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(KEY_ACHIEVEMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function unlockAchievement(id: Achievement['id']): void {
  const list = getAchievements();
  if (list.some((a) => a.id === id)) return;
  list.push({ id, unlockedAt: new Date().toISOString() });
  localStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(list));
}

export interface AppSettings {
  feedbackDismissed?: boolean;
  reminder?: boolean;
  /** 分享页统计的起始日期（YYYY-MM-DD，可选） */
  shareStartDate?: string;
  /** 用户设置的初始体重（kg，可选） */
  shareInitialWeightKg?: number;
  /** 用户当前体重（kg，可选，用于体重变化计算） */
  currentWeightKg?: number;
  /** 用户身高（米，可选，用于 BMI 计算） */
  heightMeter?: number;
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function setSettings(s: Record<string, unknown>): void {
  const current = getSettings();
  localStorage.setItem(KEY_SETTINGS, JSON.stringify({ ...current, ...s }));
}
