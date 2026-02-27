import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { getProgress } from '@/storage/storage';
import { getCompletedLevel, masterCount } from '@/logic/progressLogic';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import { useToast } from '@/components/Toast';

export default function Share() {
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = getProgress();
  const masters = masterCount(progress);
  const { showToast } = useToast();

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
      <div className="card share-card" ref={cardRef}>
        <h2>囚徒健身 · 进度</h2>
        <p className="masters">最终技 {masters} / 6</p>
        <ul className="share-list">
          {SIX_ARTS.map((art) => {
            const n = getCompletedLevel(progress, art.id as ArtId);
            return (
              <li key={art.id}>
                {art.name}：第 {n} 式
              </li>
            );
          })}
        </ul>
        <p className="tagline">坚持，渐进。</p>
      </div>
      <div className="actions">
        <button type="button" onClick={handleSave} className="cta">
          保存为图片（截图）
        </button>
      </div>
    </div>
  );
}
