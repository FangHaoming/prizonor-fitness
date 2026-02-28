import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Chart, TooltipItem } from 'chart.js';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import type { Progress, Checkin } from '@/types/progress';
import {
  getProgress,
  getCheckins,
  getSettings,
  setSettings,
  exportAllData,
  importAllData,
} from '@/storage/storage';
import { useToast } from '@/components/Toast';
import { Select } from '@/components/ui';
import {
  getCompletedLevel,
  isMasterCompleted,
  getStageDurationDays,
  getStreakDays,
} from '@/logic/progressLogic';

// 仅注册折线图所需组件，减小打包体积
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Filler,
  Legend
);

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

const CHART_HEIGHT = 220;

// 按阶段着色：1-3 初级(绿)，4-6 中级(蓝)，7-9 高级(橙)，10 终极技(金)
const STAGE_COLORS_BY_LEVEL: Record<number, string> = {
  1: '#15803d', 2: '#22c55e', 3: '#4ade80',   // 初级
  4: '#60a5fa', 5: '#3b82f6', 6: '#1d4ed8',   // 中级
  7: '#fb923c', 8: '#ea580c', 9: '#c2410c',   // 高级（橙）
  10: '#facc15',                               // 终极技（亮金）
};
function getStageColorForLevel(level: number): string {
  return STAGE_COLORS_BY_LEVEL[level] ?? '#888';
}

// 单动作：日期-锻炼量折线图（Chart.js），悬停显示当日详情
function ActionLineChart({
  data,
}: {
  data: { date: string; volume: number; details: string[] }[];
}) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: '锻炼量',
        data: data.map((d) => d.volume),
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.15)',
        fill: true,
        tension: 0.2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        position: 'nearest' as const, // 在最近的数据点位置弹出
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => {
            const idx = items[0]?.dataIndex;
            return idx != null ? data[idx].date : '';
          },
          label: (context: TooltipItem<'line'>) => {
            const idx = context.dataIndex;
            const vol = idx != null ? data[idx].volume : 0;
            return `锻炼量: ${vol}`;
          },
          afterLabel: () => [], // 单动作只显示总锻炼量，不列明细
          // 左侧色块实心填充，与折线颜色一致
          labelColor: () => ({
            backgroundColor: '#4ade80',
            borderColor: '#4ade80',
          }),
        },
      },
      legend: { display: false },
    },
    scales: {
      x: { ticks: { maxRotation: 45, maxTicksLimit: 8 } },
      y: { beginAtZero: true },
    },
  };
  return (
    <div className="line-chart-wrap" style={{ height: CHART_HEIGHT }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

// 六艺 1→10 式：多线折线图（Chart.js），每条线一个式，悬停显示当日各式详情
function ArtProgressionLineChart({
  data,
  artId,
}: {
  data: { date: string; byLevel: Record<number, { volume: number; details: string[] }> }[];
  artId: ArtId;
}) {
  const art = SIX_ARTS.find((a) => a.id === artId);
  const levelsWithData = new Set<number>();
  data.forEach((d) => Object.keys(d.byLevel).forEach((k) => levelsWithData.add(Number(k))));
  const levels = Array.from(levelsWithData).sort((a, b) => a - b);

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: levels.map((level) => {
      const step = art?.steps.find((s) => s.level === level);
      const color = getStageColorForLevel(level);
      return {
        label: step?.name ?? `第${level}式`,
        data: data.map((d) => d.byLevel[level]?.volume ?? 0),
        borderColor: color,
        backgroundColor: color + '20',
        fill: false,
        tension: 0.2,
      };
    }),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      tooltip: {
        enabled: true,
        // 使用内置定位，确保悬浮时能正常弹出
        position: 'average' as const,
        // 锻炼量为 0 的不展示
        filter: (item: TooltipItem<'line'>) => (item.parsed.y ?? 0) !== 0,
        // 按 dataset 顺序（第1式→第10式）排列，与折线、图例一致，色块才能和线条对上
        itemSort: (a: { datasetIndex: number }, b: { datasetIndex: number }) =>
          a.datasetIndex - b.datasetIndex,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => {
            const idx = items[0]?.dataIndex;
            return idx != null ? data[idx].date : '';
          },
          afterLabel: () => [], // 只展示动作+锻炼量，不列明细
          // 左侧色块实心填充，与各条折线颜色一致
          labelColor: (context: TooltipItem<'line'>) => {
            const color = chartData.datasets[context.datasetIndex]?.borderColor ?? '#888';
            return { backgroundColor: color, borderColor: color };
          },
        },
      },
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: false, // 使用矩形色块
          boxWidth: 14,
          boxHeight: 14,
          padding: 10,
          font: { size: 11, color: '#e8e8ec' }, // 与页面主文字色一致，深色背景下清晰可读
          generateLabels(chart: Chart<'line'>) {
            const legendTextColor = '#e8e8ec'; // 与页面主文字色一致
            const datasets = chart.data.datasets;
            return datasets.map((ds, i) => {
              const color =
                (typeof ds.borderColor === 'string' ? ds.borderColor : null) ??
                (typeof ds.backgroundColor === 'string' ? ds.backgroundColor : null) ??
                '#888';
              return {
                text: ds.label ?? '',
                fillStyle: color, // 实心填充
                strokeStyle: color,
                lineWidth: 0,
                fontColor: legendTextColor, // 自定义 generateLabels 时必须在每项上指定，否则会使用默认黑色
                index: i,
                datasetIndex: i,
              };
            });
          },
        },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 45, maxTicksLimit: 8 } },
      y: { beginAtZero: true },
    },
  };
  return (
    <div className="line-chart-wrap" style={{ height: CHART_HEIGHT }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

// 从打卡记录中收集有数据的 (艺, 式)，按六艺顺序再按式 1-10 排序
function getActionsWithData(checkins: Checkin[]): { artId: ArtId; level: number }[] {
  const set = new Set<string>();
  for (const c of checkins) {
    for (const e of c.entries) {
      set.add(`${e.artId}-${e.level}`);
    }
  }
  const list: { artId: ArtId; level: number }[] = [];
  for (const art of SIX_ARTS) {
    for (let level = 1; level <= 10; level++) {
      if (set.has(`${art.id}-${level}`)) list.push({ artId: art.id as ArtId, level });
    }
  }
  return list;
}

// 有打卡数据的艺 ID 列表（按 SIX_ARTS 顺序）
function getArtsWithData(checkins: Checkin[]): ArtId[] {
  const set = new Set<ArtId>();
  for (const c of checkins) {
    for (const e of c.entries) set.add(e.artId);
  }
  return SIX_ARTS.map((a) => a.id as ArtId).filter((id) => set.has(id));
}

// 某 (艺, 式) 按日期的训练量
function getVolumeByDateForAction(
  checkins: Checkin[],
  artId: ArtId,
  level: number
): { date: string; volume: number; details: string[] }[] {
  const byDate: Record<string, { volume: number; details: string[] }> = {};
  const art = SIX_ARTS.find((a) => a.id === artId);
  const step = art?.steps.find((s) => s.level === level);
  const stepName = step?.name ?? `第${level}式`;
  const artName = art?.name ?? artId;
  for (const c of checkins) {
    for (const e of c.entries) {
      if (e.artId !== artId || e.level !== level) continue;
      const vol = (e.sets || 0) * (e.reps || 0);
      const desc = e.reps && e.reps > 0 ? `${e.sets}×${e.reps}` : `${e.sets}组`;
      if (!byDate[c.date]) byDate[c.date] = { volume: 0, details: [] };
      byDate[c.date].volume += vol;
      byDate[c.date].details.push(`${artName}·${stepName} ${desc}`);
    }
  }
  return Object.entries(byDate)
    .map(([date, { volume, details }]) => ({ date, volume, details }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// 某艺 1-10 式按日期、按式的训练量（仅包含有数据的式）
function getVolumeByDateAndLevelForArt(
  checkins: Checkin[],
  artId: ArtId
): { date: string; byLevel: Record<number, { volume: number; details: string[] }> }[] {
  const byDate: Record<string, Record<number, { volume: number; details: string[] }>> = {};
  const art = SIX_ARTS.find((a) => a.id === artId);
  for (const c of checkins) {
    for (const e of c.entries) {
      if (e.artId !== artId) continue;
      const step = art?.steps.find((s) => s.level === e.level);
      const stepName = step?.name ?? `第${e.level}式`;
      const artName = art?.name ?? artId;
      const vol = (e.sets || 0) * (e.reps || 0);
      const desc = e.reps && e.reps > 0 ? `${e.sets}×${e.reps}` : `${e.sets}组`;
      if (!byDate[c.date]) byDate[c.date] = {};
      if (!byDate[c.date][e.level]) byDate[c.date][e.level] = { volume: 0, details: [] };
      byDate[c.date][e.level].volume += vol;
      byDate[c.date][e.level].details.push(`${artName}·${stepName} ${desc}`);
    }
  }
  return Object.entries(byDate)
    .map(([date, byLevel]) => ({ date, byLevel }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function Stats() {
  const [progress, setProgressState] = useState<Progress | null>(null);
  const [checkins, setCheckinsState] = useState<Checkin[] | null>(null);
  const [settings, setSettingsState] = useState<Awaited<ReturnType<typeof getSettings>> | null>(
    null
  );
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, cs, st] = await Promise.all([getProgress(), getCheckins(), getSettings()]);
      if (cancelled) return;
      setProgressState(p);
      setCheckinsState(cs);
      setSettingsState(st);
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

      {(() => {
        const actionsWithData = getActionsWithData(checkins);
        const artsWithData = getArtsWithData(checkins);
        const savedActionArtId = (settings?.statsActionArtId as ArtId | undefined) ?? undefined;
        const savedActionLevel = settings?.statsActionLevel;
        const savedProgressionArtId =
          (settings?.statsArtProgressionArtId as ArtId | undefined) ?? undefined;

        const selectedArtId =
          artsWithData.find((id) => id === savedProgressionArtId) ?? artsWithData[0];
        const actionsInArt = actionsWithData.filter((a) => a.artId === selectedArtId);
        const selectedActionKey =
          selectedArtId && savedActionArtId === selectedArtId && savedActionLevel != null
            ? `${savedActionArtId}-${savedActionLevel}`
            : '';
        const selectedAction = actionsInArt.find(
          (a) => `${a.artId}-${a.level}` === selectedActionKey
        );

        const actionChartData =
          selectedAction != null
            ? getVolumeByDateForAction(checkins, selectedAction.artId, selectedAction.level)
            : [];
        const progressionChartData = getVolumeByDateAndLevelForArt(checkins, selectedArtId);

        const showSingleAction = selectedActionKey !== '';

        return (
          (artsWithData.length > 0 && (
            <div className="card stats-chart-card">
              <h2>打卡趋势</h2>
              <p className="chart-desc">
                选择一艺，可选具体动作；不选动作时显示该艺 1→10 式趋势，选择动作时显示单动作趋势
              </p>
              <div className="chart-select-row">
                <Select
                  variant="chart"
                  value={selectedArtId ?? ''}
                  onValueChange={(artId) => {
                    const actionBelongsToNewArt =
                      savedActionArtId === artId && savedActionLevel != null;
                    setSettings({
                      statsArtProgressionArtId: artId,
                      ...(actionBelongsToNewArt
                        ? {}
                        : { statsActionArtId: undefined, statsActionLevel: undefined }),
                    });
                    setSettingsState((s) =>
                      s
                        ? {
                            ...s,
                            statsArtProgressionArtId: artId,
                            ...(actionBelongsToNewArt
                              ? {}
                              : { statsActionArtId: undefined, statsActionLevel: undefined }),
                          }
                        : s
                    );
                  }}
                  options={artsWithData.map((id) => {
                    const art = SIX_ARTS.find((a) => a.id === id);
                    return { value: id, label: art?.name ?? id };
                  })}
                />
                <Select
                  variant="chart"
                  clearable
                  clearLabel="全部 1→10 式"
                  value={selectedActionKey}
                  onValueChange={(v) => {
                    if (v === '') {
                      setSettings({ statsActionArtId: undefined, statsActionLevel: undefined });
                      setSettingsState((s) =>
                        s ? { ...s, statsActionArtId: undefined, statsActionLevel: undefined } : s
                      );
                      return;
                    }
                    const [aid, lv] = v.split('-');
                    const level = parseInt(lv, 10);
                    if (aid && !isNaN(level)) {
                      setSettings({ statsActionArtId: aid, statsActionLevel: level });
                      setSettingsState((s) =>
                        s ? { ...s, statsActionArtId: aid, statsActionLevel: level } : s
                      );
                    }
                  }}
                  options={actionsInArt.map((a) => {
                    const art = SIX_ARTS.find((x) => x.id === a.artId);
                    const step = art?.steps.find((s) => s.level === a.level);
                    return {
                      value: `${a.artId}-${a.level}`,
                      label: step?.name ?? `第${a.level}式`,
                    };
                  })}
                />
              </div>
              {showSingleAction ? (
                actionChartData.length > 0 ? (
                  <ActionLineChart data={actionChartData} />
                ) : (
                  <p className="chart-empty">暂无该动作的打卡数据</p>
                )
              ) : progressionChartData.length > 0 ? (
                <ArtProgressionLineChart data={progressionChartData} artId={selectedArtId!} />
              ) : (
                <p className="chart-empty">暂无该艺的打卡数据</p>
              )}
            </div>
          )) ??
          null
        );
      })()}

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
