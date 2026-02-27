import localforage from 'localforage';
import type { Progress, Checkin, Achievement } from '@/types/progress';
import { ART_IDS } from '@/data/sixArts';

const KEY_PROGRESS = 'cc_progress';
const KEY_CHECKINS = 'cc_checkins';
const KEY_ACHIEVEMENTS = 'cc_achievements';
const KEY_SETTINGS = 'cc_settings';
const EXPORT_VERSION = 1;

const db = localforage.createInstance({
  name: 'prizonor-fitness',
  storeName: 'app-data',
});

export function createDefaultProgress(): Progress {
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

async function migrateProgressFromLocalStorage(): Promise<Progress> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_PROGRESS) : null;
    if (!raw) return createDefaultProgress();
    const data = JSON.parse(raw) as Progress;
    const current = createDefaultProgress();
    for (const id of ART_IDS) {
      if (data.arts && data.arts[id]) {
        current.arts[id] = {
          ...current.arts[id],
          ...data.arts[id],
          artId: id,
          completedAt: { ...current.arts[id].completedAt, ...data.arts[id].completedAt },
        };
      }
    }
    current.updatedAt = data.updatedAt || current.updatedAt;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(KEY_PROGRESS);
    }
    await db.setItem(KEY_PROGRESS, current);
    return current;
  } catch {
    const fallback = createDefaultProgress();
    await db.setItem(KEY_PROGRESS, fallback);
    return fallback;
  }
}

async function migrateCheckinsFromLocalStorage(): Promise<Checkin[]> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_CHECKINS) : null;
    if (!raw) return [];
    const list = JSON.parse(raw) as Checkin[];
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(KEY_CHECKINS);
    }
    await db.setItem(KEY_CHECKINS, list);
    return list;
  } catch {
    await db.setItem(KEY_CHECKINS, []);
    return [];
  }
}

async function migrateAchievementsFromLocalStorage(): Promise<Achievement[]> {
  try {
    const raw =
      typeof window !== 'undefined' ? window.localStorage.getItem(KEY_ACHIEVEMENTS) : null;
    if (!raw) return [];
    const list = JSON.parse(raw) as Achievement[];
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(KEY_ACHIEVEMENTS);
    }
    await db.setItem(KEY_ACHIEVEMENTS, list);
    return list;
  } catch {
    await db.setItem(KEY_ACHIEVEMENTS, []);
    return [];
  }
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

async function migrateSettingsFromLocalStorage(): Promise<AppSettings> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_SETTINGS) : null;
    if (!raw) return {};
    const settings = JSON.parse(raw) as AppSettings;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(KEY_SETTINGS);
    }
    await db.setItem(KEY_SETTINGS, settings);
    return settings;
  } catch {
    await db.setItem(KEY_SETTINGS, {});
    return {};
  }
}

export async function getProgress(): Promise<Progress> {
  try {
    const stored = (await db.getItem<Progress>(KEY_PROGRESS)) || null;
    if (stored) {
      const current = createDefaultProgress();
      for (const id of ART_IDS) {
        if (stored.arts && stored.arts[id]) {
          current.arts[id] = {
            ...current.arts[id],
            ...stored.arts[id],
            artId: id,
            completedAt: { ...current.arts[id].completedAt, ...stored.arts[id].completedAt },
          };
        }
      }
      current.updatedAt = stored.updatedAt || current.updatedAt;
      return current;
    }
    return await migrateProgressFromLocalStorage();
  } catch {
    return await migrateProgressFromLocalStorage();
  }
}

export async function setProgress(p: Progress): Promise<void> {
  const next = {
    ...p,
    updatedAt: new Date().toISOString(),
  };
  await db.setItem(KEY_PROGRESS, next);
}

export async function getCheckins(): Promise<Checkin[]> {
  try {
    const stored = (await db.getItem<Checkin[]>(KEY_CHECKINS)) || null;
    if (stored) return stored;
    return await migrateCheckinsFromLocalStorage();
  } catch {
    return await migrateCheckinsFromLocalStorage();
  }
}

export async function setCheckins(list: Checkin[]): Promise<void> {
  await db.setItem(KEY_CHECKINS, list);
}

export async function addCheckin(checkin: Checkin): Promise<void> {
  const list = await getCheckins();
  const idx = list.findIndex((c) => c.date === checkin.date);
  if (idx >= 0) {
    list[idx] = { ...checkin, entries: [...(list[idx].entries || []), ...checkin.entries] };
  } else {
    list.push({ ...checkin, createdAt: new Date().toISOString() });
  }
  list.sort((a, b) => b.date.localeCompare(a.date));
  await setCheckins(list);
}

export async function getAchievements(): Promise<Achievement[]> {
  try {
    const stored = (await db.getItem<Achievement[]>(KEY_ACHIEVEMENTS)) || null;
    if (stored) return stored;
    return await migrateAchievementsFromLocalStorage();
  } catch {
    return await migrateAchievementsFromLocalStorage();
  }
}

export async function unlockAchievement(id: Achievement['id']): Promise<void> {
  const list = await getAchievements();
  if (list.some((a) => a.id === id)) return;
  const next = [...list, { id, unlockedAt: new Date().toISOString() }];
  await db.setItem(KEY_ACHIEVEMENTS, next);
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const stored = (await db.getItem<AppSettings>(KEY_SETTINGS)) || null;
    if (stored) return stored;
    return await migrateSettingsFromLocalStorage();
  } catch {
    return await migrateSettingsFromLocalStorage();
  }
}

export async function setSettings(patch: Record<string, unknown>): Promise<void> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.setItem(KEY_SETTINGS, next);
}

export interface ExportedData {
  version: number;
  exportedAt: string;
  progress: Progress;
  checkins: Checkin[];
  achievements: Achievement[];
  settings: AppSettings;
}

export async function exportAllData(): Promise<ExportedData> {
  const [progress, checkins, achievements, settings] = await Promise.all([
    getProgress(),
    getCheckins(),
    getAchievements(),
    getSettings(),
  ]);
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    checkins,
    achievements,
    settings,
  };
}

export async function importAllData(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('无效的数据格式');
  }
  const data = payload as Partial<ExportedData>;
  const progress = data.progress ?? createDefaultProgress();
  const checkins = data.checkins ?? [];
  const achievements = data.achievements ?? [];
  const settings = data.settings ?? {};

  await Promise.all([
    db.setItem(KEY_PROGRESS, {
      ...progress,
      updatedAt: new Date().toISOString(),
    }),
    db.setItem(KEY_CHECKINS, checkins),
    db.setItem(KEY_ACHIEVEMENTS, achievements),
    db.setItem(KEY_SETTINGS, settings),
  ]);
}
