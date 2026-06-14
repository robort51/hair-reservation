import Link from 'next/link';
import { HomeWorkingStaff } from '@/components/home/HomeWorkingStaff';

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="shell">
        <nav className="topbar">
          <a className="brand-mark" href="/">
            YJMF
          </a>
          <div className="nav-links">
            <a href="/">首页</a>
            <a href="/book">预约</a>
            <a href="/orders">查预约</a>
          </div>
        </nav>

        <section className="home-hero">
          <div className="home-hero__copy">
            <p className="eyebrow">Single salon booking</p>
            <h1 className="home-title">YJMF</h1>
            <div className="hero-actions">
              <Link className="button" href="/book">
                立即预约
              </Link>
              <Link className="button secondary" href="/orders">
                查询预约
              </Link>
            </div>
          </div>

          <div className="salon-visual" aria-label="YJMF 门店预约视觉">
            <div className="salon-visual__header">
              <span>YJMF</span>
              <small>09:00 - 22:00</small>
            </div>
            <div className="salon-visual__portrait">
              <span />
              <strong>Hair Studio</strong>
            </div>
            <HomeWorkingStaff />
          </div>
        </section>
      </div>
    </main>
  );
}
