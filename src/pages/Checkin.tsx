import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import type { CheckinEntry } from '@/types/progress';
import { getProgress } from '@/storage/storage';
import { submitCheckinAndUpdateProgress } from '@/logic/progressLogic';

const today = () => new Date().toISOString().slice(0, 10);

export default function Checkin() {
  const [searchParams] = useSearchParams();
  const presetArt = (searchParams.get('art') as ArtId) || null;

  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<CheckinEntry[]>(() => {
    if (!presetArt) return [];
    const progress = getProgress();
    const level = progress.arts[presetArt]?.currentLevel ?? 1;
    return [{ artId: presetArt, level, sets: 3, reps: 10, passed: false }];
  });

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

  const submit = () => {
    if (entries.length === 0) return;
    submitCheckinAndUpdateProgress({ date, entries });
    setEntries([]);
    setDate(today());
    alert('打卡已保存');
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
