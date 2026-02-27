import type { ArtId } from '@/data/sixArts';

/** 单艺进度：当前式、每式达标日期 */
export interface ArtProgress {
  artId: ArtId;
  /** 当前挑战式 1-10 */
  currentLevel: number;
  /** 每式首次达标日期 YYYY-MM-DD */
  completedAt: Record<number, string>;
}

/** 全局进度 */
export interface Progress {
  arts: Record<ArtId, ArtProgress>;
  updatedAt: string; // ISO
}

/** 单条打卡记录（某艺某式一次记录） */
export interface CheckinEntry {
  artId: ArtId;
  level: number;
  sets: number;
  reps: number;
  /** 用户自评本次是否达标 */
  passed: boolean;
  /** 本条记录耗时（秒，可选） */
  durationSeconds?: number;
  /** 兼容早期数据：按分钟存储的耗时 */
  durationMinutes?: number;
}

/** 某日的打卡 */
export interface Checkin {
  date: string; // YYYY-MM-DD
  entries: CheckinEntry[];
  /** 本次打卡时记录的体重（kg，可选） */
  weightKg?: number;
  /** 本次训练总耗时（秒，可选） */
  durationSeconds?: number;
  /** 兼容早期数据：按分钟存储的总耗时 */
  durationMinutes?: number;
  createdAt: string; // ISO
}

export type AchievementId =
  | 'first_checkin'
  | 'streak_7'
  | 'art_beginner'
  | 'art_intermediate'
  | 'art_advanced'
  | 'art_master'
  | string;

export interface Achievement {
  id: AchievementId;
  unlockedAt: string; // ISO
}
