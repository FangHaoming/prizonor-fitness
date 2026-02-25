import { useRef } from 'react';
import { getProgress } from '@/storage/storage';
import { getCompletedLevel, masterCount } from '@/logic/progressLogic';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';

export default function Share() {
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = getProgress();
  const masters = masterCount(progress);

  const handleSave = () => {
    if (!cardRef.current) return;
    // 简单方案：提示用户截图；后续可接 html2canvas 导出 PNG
    const range = document.createRange();
    range.selectNodeContents(cardRef.current);
    alert('请使用系统截图或浏览器开发者工具对下方卡片区域截图保存。后续版本将支持一键导出图片。');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '囚徒健身进度',
          text: `六艺进度 · 最终技 ${masters}/6 已完成`,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') alert('分享失败');
      }
    } else {
      handleSave();
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
        <button type="button" onClick={handleShare} className="btn-secondary">
          分享
        </button>
      </div>
    </div>
  );
}
