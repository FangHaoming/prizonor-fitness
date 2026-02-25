import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import { getProgress, getCheckins } from '@/storage/storage';
import {
  getCompletedLevel,
  isMasterCompleted,
  getStageDurationDays,
  getStreakDays,
} from '@/logic/progressLogic';

const stageLabel: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  master: '最终技',
};

export default function Stats() {
  const progress = getProgress();
  const checkins = getCheckins();
  const streak = getStreakDays(checkins);

  return (
    <div className="page-stats">
      <div className="card">
        <h2>连续打卡</h2>
        <p className="big">{streak} 天</p>
      </div>

      <div className="card">
        <h2>最终技完成</h2>
        <ul className="master-list">
          {SIX_ARTS.map((art) => {
            const done = isMasterCompleted(progress, art.id as ArtId);
            return (
              <li key={art.id} className={done ? 'done' : ''}>
                {art.name} {done ? '✓' : `第 ${getCompletedLevel(progress, art.id as ArtId)}/10 式`}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <h2>各艺阶段耗时（天）</h2>
        {SIX_ARTS.map((art) => {
          const stages = ['beginner', 'intermediate', 'advanced', 'master'] as const;
          return (
            <div key={art.id} className="art-stats">
              <h3>{art.name}</h3>
              {stages.map((s) => {
                const days = getStageDurationDays(progress, art.id as ArtId, s);
                return (
                  <p key={s}>
                    {stageLabel[s]}：{days != null ? `${days} 天` : '—'}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
