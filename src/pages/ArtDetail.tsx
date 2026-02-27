import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArt } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import type { Progress } from '@/types/progress';
import { getProgress } from '@/storage/storage';

export default function ArtDetail() {
  const { artId } = useParams<{ artId: string }>();
  const [progress, setProgressState] = useState<Progress | null>(null);

  useEffect(() => {
    if (!artId) return;
    let cancelled = false;
    (async () => {
      const p = await getProgress();
      if (cancelled) return;
      setProgressState(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [artId]);

  if (!artId) return <div>无效艺</div>;

  const art = getArt(artId as ArtId);

  if (!progress) {
    return (
      <div className="page-art-detail">
        <div className="card">
          <h1>{art.name}</h1>
          <p className="sub">加载中...</p>
        </div>
      </div>
    );
  }

  const artProgress = progress.arts[art.id];

  return (
    <div className="page-art-detail">
      <div className="card">
        <h1>{art.name}</h1>
        <p className="sub">当前挑战：第 {artProgress.currentLevel} 式</p>
        <Link to={`/checkin?art=${art.id}`} className="cta">
          去打卡
        </Link>
      </div>

      <ul className="step-list">
        {art.steps.map((step) => {
          const done = artProgress.completedAt[step.level];
          const current = artProgress.currentLevel === step.level;
          return (
            <li
              key={step.level}
              className={`step-item ${done ? 'done' : ''} ${current ? 'current' : ''}`}
            >
              <span className="step-num">第 {step.level} 式</span>
              <span className="step-name">{step.name}</span>
              {done && <span className="step-date">{done}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
