import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { getCheckins, getSettings, setSettings } from '@/storage/storage';
import { useToast } from '@/components/Toast';
import posterBg from '@/assets/share-poster.png';

export default function Share() {
  const cardRef = useRef<HTMLDivElement>(null);
  const checkins = getCheckins();
  const settings = getSettings();
  const { showToast } = useToast();

  const settingsCurrentWeight =
    typeof settings.currentWeightKg === 'number' ? settings.currentWeightKg : undefined;

  const [startDateInput, setStartDateInput] = useState<string>(() => {
    if (settings.shareStartDate) return settings.shareStartDate;
    if (checkins.length === 0) return '';
    // 默认从最早打卡日期开始
    const minDate = checkins.reduce(
      (min, c) => (c.date < min ? c.date : min),
      checkins[0].date
    );
    return minDate;
  });
  const [initialWeightInput, setInitialWeightInput] = useState<string>(() => {
    if (typeof settings.shareInitialWeightKg === 'number') {
      return String(settings.shareInitialWeightKg);
    }
    return '';
  });
  const [heightInput, setHeightInput] = useState<string>(() => {
    const rawHeight = (settings as any).heightMeter as number | undefined;
    return typeof rawHeight === 'number' ? String(rawHeight) : '';
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const formatTotalDuration = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '—';
    const totalMinutes = Math.floor(seconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalYears = Math.floor(totalDays / 365);

    if (totalYears >= 1) {
      const remDays = totalDays % 365;
      const remHours = totalHours % 24;
      return `${totalYears}y ${remDays}d ${remHours}h`;
    }
    if (totalDays >= 1) {
      const remHours = totalHours % 24;
      const remMinutes = totalMinutes % 60;
      return `${totalDays}d ${remHours}h ${remMinutes}m`;
    }
    if (totalHours >= 1) {
      const remMinutes = totalMinutes % 60;
      return `${totalHours}h ${remMinutes}m`;
    }
    return `${totalMinutes}m`;
  };

  const formatDateForPoster = (date: string | undefined): string => {
    if (!date) return '—';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    const [y, m, d] = parts;
    const yy = y.slice(-2);
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  const {
    startDate,
    currentDate,
    days,
    totalSeconds,
    lastWeight,
    weightDelta,
    bmi,
  } = useMemo(() => {
    if (checkins.length === 0) {
      const initWeight =
        initialWeightInput.trim() === ''
          ? undefined
          : Number.parseFloat(initialWeightInput.trim());
      const height =
        heightInput.trim() === '' ? undefined : Number.parseFloat(heightInput.trim());
      const lastW = settingsCurrentWeight;
      const delta =
        typeof initWeight === 'number' && typeof lastW === 'number'
          ? Number((lastW - initWeight).toFixed(1))
          : undefined;
      const bmiVal =
        typeof lastW === 'number' && typeof height === 'number' && height > 0
          ? Number((lastW / (height * height)).toFixed(1))
          : undefined;

      return {
        startDate: startDateInput || '',
        currentDate: todayStr,
        days: 0,
        totalSeconds: 0,
        lastWeight: lastW,
        weightDelta: delta,
        bmi: bmiVal,
      };
    }

    const effectiveStart = startDateInput || checkins[checkins.length - 1].date;
    const current = todayStr;

    const filtered = checkins.filter((c) => c.date >= effectiveStart && c.date <= current);
    // 按日期升序，方便拿到「最新一次」体重
    const filteredAsc = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

    const daySet = new Set(filteredAsc.map((c) => c.date));
    let secondsTotal = 0;
    let lastW: number | undefined = settingsCurrentWeight;

    for (const c of filteredAsc) {
      if (typeof c.durationSeconds === 'number') {
        secondsTotal += Math.max(0, c.durationSeconds);
      } else if (typeof c.durationMinutes === 'number') {
        secondsTotal += Math.max(0, c.durationMinutes) * 60;
      }
      if (typeof c.weightKg === 'number') {
        lastW = c.weightKg;
      }
    }

    const initWeight =
      initialWeightInput.trim() === ''
        ? undefined
        : Number.parseFloat(initialWeightInput.trim());

    const delta =
      typeof initWeight === 'number' && typeof lastW === 'number'
        ? Number((lastW - initWeight).toFixed(1))
        : undefined;

    const height =
      heightInput.trim() === '' ? undefined : Number.parseFloat(heightInput.trim());
    const bmiVal =
      typeof lastW === 'number' && typeof height === 'number' && height > 0
        ? Number((lastW / (height * height)).toFixed(1))
        : undefined;

    return {
      startDate: effectiveStart,
      currentDate: current,
      days: daySet.size,
      totalSeconds: secondsTotal,
      lastWeight: lastW,
      weightDelta: delta,
      bmi: bmiVal,
    };
  }, [checkins, startDateInput, initialWeightInput, heightInput, todayStr, settingsCurrentWeight]);

  const handleSave = async () => {
    if (!cardRef.current) return;
    try {
      const bg =
        getComputedStyle(document.documentElement).getPropertyValue('--bg') ||
        '#0f0f12';

      const options: any = {
        backgroundColor: bg.trim(),
        scale: window.devicePixelRatio || 2,
      };

      const canvas = await html2canvas(cardRef.current, options);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = '囚徒健身进度.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('已导出图片，正在下载。', 'success');
    } catch (e) {
      showToast(
        '导出图片失败',
        'error'
      );
    }
  };

  return (
    <div className="page-share">
      <div className="share-config card">
        <h3>分享设置</h3>
        <label>
          开始日期（用于统计）
          <input
            type="date"
            value={startDateInput}
            max={todayStr}
            onChange={(e) => {
              const v = e.target.value;
              setStartDateInput(v);
              setSettings({ shareStartDate: v || undefined });
            }}
            className="input"
          />
        </label>
        <label>
          初始体重（kg）
          <input
            type="number"
            min={0}
            step="0.1"
            value={initialWeightInput}
            onChange={(e) => {
              const v = e.target.value;
              setInitialWeightInput(v);
              const num =
                v.trim() === '' ? undefined : Number.parseFloat(v.trim()) || undefined;
              setSettings({ shareInitialWeightKg: num });
            }}
            className="input"
            placeholder="用于计算体重变化"
          />
        </label>
        <label>
          身高（m，用于 BMI）
          <input
            type="number"
            min={0}
            step="0.01"
            value={heightInput}
            onChange={(e) => {
              const v = e.target.value;
              setHeightInput(v);
              const num =
                v.trim() === '' ? undefined : Number.parseFloat(v.trim()) || undefined;
              setSettings({ heightMeter: num });
            }}
            className="input"
            placeholder="例如 1.75"
          />
        </label>
      </div>

      <div className="card share-card" ref={cardRef}>
        <div className="share-poster">
          <img src={posterBg} alt="健身进度海报" className="share-poster-bg" />
          {/* 只在图片预留位置叠加数值，不额外增加文字 */}
          <div className="share-poster-overlay">
            <div className="share-poster-values">
              <span className="val-start-date">{formatDateForPoster(startDate)}</span>
              <span className="val-current-date">{formatDateForPoster(currentDate)}</span>
              <span className="val-weight-change">
                {typeof weightDelta === 'number' && typeof lastWeight === 'number'
                  ? `${weightDelta >= 0 ? '+' : ''}${weightDelta}kg`
                  : '—'}
              </span>
              <span className="val-bmi">
                {typeof bmi === 'number' ? bmi.toFixed(1) : '—'}
              </span>
              <span className="val-days">{days}</span>
              <span className="val-duration">{formatTotalDuration(totalSeconds)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="actions">
        <button type="button" onClick={handleSave} className="cta">
          保存为图片（截图）
        </button>
      </div>
    </div>
  );
}
