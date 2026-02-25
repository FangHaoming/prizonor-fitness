import { Routes, Route, NavLink } from 'react-router-dom';
import Home from '@/pages/Home';
import ArtDetail from '@/pages/ArtDetail';
import Checkin from '@/pages/Checkin';
import Stats from '@/pages/Stats';
import Share from '@/pages/Share';

function Nav() {
  const link = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'nav-link' + (isActive ? ' active' : '')
      }
    >
      {label}
    </NavLink>
  );
  return (
    <nav className="nav">
      {link('/', '首页')}
      {link('/checkin', '打卡')}
      {link('/stats', '统计')}
      {link('/share', '分享')}
    </nav>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">囚徒健身 · 进度</h1>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/art/:artId" element={<ArtDetail />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/share" element={<Share />} />
        </Routes>
      </main>
      <Nav />
    </div>
  );
}
