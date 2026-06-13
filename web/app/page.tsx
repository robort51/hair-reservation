import Link from 'next/link';

const featuredServices = ['洗剪吹', '洗吹', '基础护理', '染发', '烫发'];

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
            <p className="home-subtitle">
              从洗吹到烫染护理，把服务、员工和时间安排在同一个预约流程里。
            </p>
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
              <small>09:00 - 18:00</small>
            </div>
            <div className="salon-visual__portrait">
              <span />
              <strong>Hair Studio</strong>
            </div>
            <div className="salon-visual__ticket">
              <span>今日可约</span>
              <strong>12 个时段</strong>
            </div>
          </div>
        </section>

        <section className="home-services" aria-label="服务项目">
          <div>
            <p className="eyebrow">Services</p>
            <h2 className="section-title">适合单门店的预约入口</h2>
          </div>
          <div className="home-service-list">
            {featuredServices.map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
