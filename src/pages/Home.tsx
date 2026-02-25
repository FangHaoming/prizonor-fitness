import { Link } from 'react-router-dom';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import { getProgress } from '@/storage/storage';
import { getCompletedLevel, masterCount } from '@/logic/progressLogic';

export default function Home() {
  const progress = getProgress();
  const masters = masterCount(progress);

  return (
    <div className="page-home">
      <section className="card summary">
        <h2>当前进度</h2>
        <p className="masters">
          最终技完成 <strong>{masters}</strong> / 6
        </p>
        <Link to="/checkin" className="cta">
          今日打卡
        </Link>
      </section>

      <section className="art-cards">
        <h2 className="section-title">六艺</h2>
        {SIX_ARTS.map((art) => {
          const artProgress = progress.arts[art.id as ArtId];
          const current = artProgress?.currentLevel ?? 1;
          const completed = getCompletedLevel(progress, art.id as ArtId);
          const pct = (completed / 10) * 100;
          return (
            <Link
              key={art.id}
              to={`/art/${art.id}`}
              className="card art-card"
            >
              <h3>{art.name}</h3>
              <p className="level">
                当前：第 {current} 式 · 已完成 {completed}/10
              </p>
              <div className="progress-bar">
                <div
                  className="progress-bar-inner"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
