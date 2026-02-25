import { Link } from 'react-router-dom';
import { SIX_ARTS } from '@/data/sixArts';
import type { ArtId } from '@/data/sixArts';
import { getProgress, getCheckins } from '@/storage/storage';
import { getCompletedLevel } from '@/logic/progressLogic';

export default function Home() {
  const progress = getProgress();
  const checkins = getCheckins();
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckin = checkins.find((c) => c.date === today);
  const times = todayCheckin?.entries.length ?? 0;
  const hasCheckin = times > 0;
  let level = 0;
  if (times === 1) level = 1;
  else if (times === 2) level = 2;
  else if (times === 3) level = 3;
  else if (times >= 4) level = 4;

  return (
    <div className="page-home">
      <section className="card today-summary">
        <div className="today-header">
          <h2>今日打卡</h2>
          <span className={`today-status ${hasCheckin ? `level-${level}` : 'level-0'}`}>
            {hasCheckin ? `已打卡 ${times} 次` : '尚未打卡'}
          </span>
        </div>
        <div className="today-action">
          <Link
            to="/checkin"
            className={`today-circle-btn ${hasCheckin ? 'today-circle-btn-checked' : ''}`}
          >
            去打卡
          </Link>
        </div>
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
