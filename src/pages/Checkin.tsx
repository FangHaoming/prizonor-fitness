import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import type { CheckinEntry } from '@/types/progress';
import { getProgress, setSettings } from '@/storage/storage';
import { submitCheckinAndUpdateProgress } from '@/logic/progressLogic';
import { useToast } from '@/components/Toast';

const today = () => new Date().toISOString().slice(0, 10);

export default function Checkin() {
  const [searchParams] = useSearchParams();
  const presetArt = (searchParams.get('art') as ArtId) || null;
  const { showToast } = useToast();

  const [date, setDate] = useState(today());
  const [weightKg, setWeightKg] = useState<string>('');
  const [entries, setEntries] = useState<CheckinEntry[]>([]);

  const addEntry = () => {
    setEntries((e) => [
      ...e,
      { artId: 'pushup', level: 1, sets: 3, reps: 10, passed: false },
    ]);
  };

  const updateEntry = (idx: number, patch: Partial<CheckinEntry>) => {
    setEntries((e) => e.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeEntry = (idx: number) => {
    setEntries((e) => e.filter((_, i) => i !== idx));
  };

  // 每条记录对应一个计时器状态
  const [timers, setTimers] = useState<{ running: boolean; startAt: number | null }[]>(
    []
  );
  const [now, setNow] = useState(() => Date.now());

  // 保持 timers 长度与 entries 对齐
  useEffect(() => {
    setTimers((prev) => {
      const next = [...prev];
      while (next.length < entries.length) {
        next.push({ running: false, startAt: null });
      }
      return next.slice(0, entries.length);
    });
  }, [entries.length]);

  // 根据 presetArt 初始化一条记录（需要异步读取进度）
  useEffect(() => {
    if (!presetArt) return;
    let cancelled = false;
    (async () => {
      const progress = await getProgress();
      if (cancelled) return;
      const level = progress.arts[presetArt]?.currentLevel ?? 1;
      setEntries([{ artId: presetArt, level, sets: 3, reps: 10, passed: false }]);
    })();
    return () => {
      cancelled = true;
    };
  }, [presetArt]);

  // 有计时在跑时，每秒刷新一次，用于实时展示
  useEffect(() => {
    const hasRunning = timers.some((t) => t.running && t.startAt != null);
    if (!hasRunning) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [timers]);

  const toggleTimer = (idx: number) => {
    setTimers((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        if (!t.running) {
          // 重新开始计时时先清掉之前的时长（按秒存储）
          setEntries((es) =>
            es.map((e, j) =>
              j === idx ? { ...e, durationSeconds: undefined, durationMinutes: undefined } : e
            )
          );
          return { running: true, startAt: Date.now() };
        }
        const totalMs = t.startAt ? Date.now() - t.startAt : 0;
        const seconds = Math.max(0, Math.floor(totalMs / 1000));
        // 停止计时时写回到对应记录（精确到秒）
        setEntries((es) =>
          es.map((e, j) =>
            j === idx
              ? {
                  ...e,
                  durationSeconds: seconds > 0 ? seconds : undefined,
                  durationMinutes: seconds > 0 ? seconds / 60 : undefined,
                }
              : e
          )
        );
        return { running: false, startAt: null };
      })
    );
  };

  const formatDuration = (seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const getTimerLabel = (idx: number): string => {
    const t = timers[idx];
    const entry = entries[idx];
    if (t?.running) return '结束';
    if (entry?.durationSeconds && entry.durationSeconds > 0) return '已计时';
    return '开始';
  };

  const getTimerDisplay = (idx: number): string => {
    const t = timers[idx];
    const entry = entries[idx];
    if (!t) {
      const legacySec =
        entry && typeof entry.durationMinutes === 'number'
          ? Math.max(0, entry.durationMinutes) * 60
          : 0;
      const baseSec =
        entry && typeof entry.durationSeconds === 'number'
          ? Math.max(0, entry.durationSeconds)
          : legacySec;
      return baseSec > 0 ? formatDuration(baseSec) : '00:00';
    }
    if (t.running && t.startAt != null) {
      const diffMs = now - t.startAt;
      const seconds = Math.max(0, Math.floor(diffMs / 1000));
      return formatDuration(seconds);
    }
    if (entry?.durationSeconds && entry.durationSeconds > 0) {
      return formatDuration(entry.durationSeconds);
    }
    return '00:00';
  };

  const submit = async () => {
    if (entries.length === 0) return;
    const weight =
      weightKg.trim() === '' ? undefined : Math.max(0, Number.parseFloat(weightKg));
    const totalSeconds = entries.reduce((sum, e) => {
      if (typeof e.durationSeconds === 'number' && Number.isFinite(e.durationSeconds)) {
        return sum + Math.max(0, Math.floor(e.durationSeconds));
      }
      // 兼容旧数据：如果只有分钟，换算成秒
      if (typeof e.durationMinutes === 'number' && Number.isFinite(e.durationMinutes)) {
        return sum + Math.max(0, Math.floor(e.durationMinutes * 60));
      }
      return sum;
    }, 0);
    const durationSeconds = totalSeconds > 0 ? totalSeconds : undefined;

    await submitCheckinAndUpdateProgress({
      date,
      entries,
      weightKg: Number.isFinite(weight || 0) ? weight : undefined,
      durationSeconds: Number.isFinite(durationSeconds || 0) ? durationSeconds : undefined,
      durationMinutes:
        Number.isFinite(durationSeconds || 0) && durationSeconds
          ? durationSeconds / 60
          : undefined,
    });
    if (Number.isFinite(weight || 0) && typeof weight === 'number') {
      await setSettings({ currentWeightKg: weight });
    }
    setEntries([]);
    setDate(today());
    setWeightKg('');
    setTimers([]);
    showToast('打卡已保存', 'success');
  };

  return (
    <div className="page-checkin">
      <div className="card">
        <label>
          日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </label>
        <label>
          体重（kg，可选）
          <input
            type="number"
            min={0}
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="input"
            placeholder="例如 70.5"
          />
        </label>
      </div>

      <div className="card">
        <h3>记录</h3>
        {entries.map((entry, idx) => {
          const art = SIX_ARTS.find((a) => a.id === entry.artId) ?? SIX_ARTS[0];
          return (
            <div key={idx} className="entry-row">
              <select
                value={entry.artId}
                onChange={(e) => updateEntry(idx, { artId: e.target.value as ArtId })}
              >
                {SIX_ARTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                value={entry.level}
                onChange={(e) => updateEntry(idx, { level: +e.target.value })}
              >
                {art.steps.map((step) => (
                  <option key={step.level} value={step.level}>
                    {step.name}
                  </option>
                ))}
              </select>
            <input
              type="number"
              min={1}
              value={entry.sets}
              onChange={(e) => updateEntry(idx, { sets: +e.target.value })}
              placeholder="组"
              className="input small"
            />
            <input
              type="number"
              min={0}
              value={entry.reps}
              onChange={(e) => updateEntry(idx, { reps: +e.target.value })}
              placeholder="次/组"
              className="input small"
            />
              <button
                type="button"
                onClick={() => toggleTimer(idx)}
                className={`timer-btn ${timers[idx]?.running ? 'timer-btn-running' : 'timer-btn-idle'}`}
              >
                <span className="timer-label">{getTimerLabel(idx)}</span>
                <span className="timer-time">{getTimerDisplay(idx)}</span>
              </button>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={entry.passed}
                onChange={(e) => updateEntry(idx, { passed: e.target.checked })}
              />
              达标
            </label>
              <button type="button" onClick={() => removeEntry(idx)} className="btn-ghost">
                删
              </button>
            </div>
          );
        })}
        <button type="button" onClick={addEntry} className="btn-secondary">
          + 添加一项
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={entries.length === 0}
        className="cta block"
      >
        保存打卡
      </button>
    </div>
  );
}
