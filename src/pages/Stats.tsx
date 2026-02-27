import { useEffect, useState } from 'react';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import type { Progress, Checkin } from '@/types/progress';
import { getProgress, getCheckins, exportAllData, importAllData } from '@/storage/storage';
import { useToast } from '@/components/Toast';
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

// 对齐到本周周日，生成按周列的日期矩阵（与 GitHub 贡献图一致）
function buildWeeks(end: Date, weeks: number): Date[][] {
  const endCopy = new Date(end);
  const day = endCopy.getDay(); // 0=Sun ... 6=Sat
  const offsetToSunday = day; // 以周日作为一列的起始
  endCopy.setDate(endCopy.getDate() - offsetToSunday);

  const start = new Date(endCopy);
  start.setDate(endCopy.getDate() - (weeks - 1) * 7);

  const result: Date[][] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      week.push(date);
    }
    result.push(week);
  }
  return result;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function Stats() {
  const [progress, setProgressState] = useState<Progress | null>(null);
  const [checkins, setCheckinsState] = useState<Checkin[] | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, cs] = await Promise.all([getProgress(), getCheckins()]);
      if (cancelled) return;
      setProgressState(p);
      setCheckinsState(cs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!progress || !checkins) {
    return (
      <div className="page-stats">
        <div className="card">
          <h2>统计</h2>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const streak = getStreakDays(checkins);

  // 按日期汇总训练量与动作明细
  const byDateVolume: Record<string, number> = {};
  const byDateDetails: Record<string, string[]> = {};
  for (const c of checkins) {
    const key = c.date;
    if (!byDateDetails[key]) byDateDetails[key] = [];
    let dayVolume = 0;
    for (const e of c.entries) {
      const art = SIX_ARTS.find((a) => a.id === e.artId);
      const step = art?.steps.find((s) => s.level === e.level);
      const artName = art?.name ?? e.artId;
      const stepName = step?.name ?? `第${e.level}式`;
      const volume = (e.sets || 0) * (e.reps || 0);
      dayVolume += volume;
      const desc =
        e.reps && e.reps > 0
          ? `${artName}·${stepName} ${e.sets}×${e.reps}`
          : `${artName}·${stepName} ${e.sets}组`;
      byDateDetails[key].push(desc);
    }
    byDateVolume[key] = (byDateVolume[key] || 0) + dayVolume;
  }

  const today = new Date();
  const weeks = buildWeeks(today, 53);
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  // 根据实际训练量动态计算颜色阈值，让差异更明显
  const volumes = Object.values(byDateVolume).filter((v) => v > 0);
  const maxVolume = volumes.length ? Math.max(...volumes) : 0;
  const step = maxVolume > 0 ? Math.max(1, Math.ceil(maxVolume / 4)) : 0;

  return (
    <div className="page-stats">
      <div className="card">
        <h2>连续打卡</h2>
        <p className="big">{streak} 天</p>
      </div>

      <div className="card">
        <h2>打卡日历（近一年）</h2>
        <div className="heatmap-wrapper">
          <div className="heatmap-months">
            <span className="heatmap-month-spacer" />
            <div className="heatmap-month-row">
              {weeks.map((week, wi) => {
                const firstDay = week[0];
                const prev = weeks[wi - 1]?.[0];
                // 第 0 列只有在刚好是某月 1 号时才显示月份，
                // 否则从第二列起按月份变更显示，避免「FeMar」叠在一起
                const showLabel =
                  (wi === 0 && firstDay.getDate() === 1) ||
                  (wi > 0 && prev && firstDay.getMonth() !== prev.getMonth());
                if (!showLabel) return null;
                return (
                  <span key={wi} className="heatmap-month-label">
                    {monthFormatter.format(firstDay)}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="heatmap">
            <div className="heatmap-weekdays">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="heatmap-grid">
              {weeks.map((week, wi) => (
                <div key={wi} className="heatmap-week">
                  {week.map((day, di) => {
                    const key = dateKey(day);
                    const isFuture = day > today;
                    const volume = !isFuture ? byDateVolume[key] || 0 : 0;
                    const details = !isFuture ? byDateDetails[key] || [] : [];
                    let level = 0;
                    if (step > 0 && volume > 0) {
                      if (volume <= step) level = 1;
                      else if (volume <= step * 2) level = 2;
                      else if (volume <= step * 3) level = 3;
                      else level = 4;
                    }
                    const detailText = details.join('，');
                    const classes =
                      'heatmap-day' +
                      (isFuture ? ' future' : '') +
                      (level ? ` level-${level}` : '');
                    const infoText =
                      !isFuture && volume
                        ? `${key} · 训练量 ${volume}${
                            detailText ? `（${detailText}）` : ''
                          }`
                        : !isFuture
                        ? `${key} · 无打卡`
                        : '';
                    return (
                      <div
                        key={di}
                        className={classes}
                        title={infoText}
                        onMouseEnter={() => infoText && setHoverInfo(infoText)}
                        onMouseLeave={() => setHoverInfo(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="heatmap-caption">
            {hoverInfo || '移动到格子上查看当日训练量'}
          </div>
        </div>
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

      <div className="card">
        <h2>数据备份</h2>
        <p>可以导出 / 导入当前设备上的全部训练数据（进度、打卡、成就、设置）。</p>
        <div className="backup-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              try {
                const data = await exportAllData();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `prizonor-fitness-backup-${new Date()
                  .toISOString()
                  .slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('数据已导出为 JSON 文件。', 'success');
              } catch (e) {
                showToast('导出数据失败', 'error');
              }
            }}
          >
            导出数据（JSON）
          </button>
          <label className="btn-secondary">
            导入数据
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const json = JSON.parse(text);
                  await importAllData(json);
                  showToast('数据导入成功，即将刷新页面。', 'success');
                  window.location.reload();
                } catch (err) {
                  showToast('导入数据失败，请确认文件格式是否正确。', 'error');
                } finally {
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
