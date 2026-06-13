import { AdminNav } from '@/components/admin/AdminNav';

const settingCards = [
  {
    href: '/admin/services',
    label: '服务管理',
    description: '维护洗剪吹、洗吹、护理、染发、烫发等项目和价格时长。',
  },
  {
    href: '/admin/staff',
    label: '员工管理',
    description: '维护发型师资料，并配置每位员工可提供的服务。',
  },
  {
    href: '/admin/schedules',
    label: '排班管理',
    description: '按员工设置每周工作日和一天内多个可预约时间段。',
  },
];

export function StoreSettings() {
  return (
    <main className="settings-page">
      <div className="shell admin-shell">
        <AdminNav />

        <header className="admin-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1 className="section-title">门店设置</h1>
          </div>
        </header>

        <section className="settings-entry-grid">
          {settingCards.map((card) => (
            <a className="settings-entry-card panel" href={card.href} key={card.href}>
              <span className="eyebrow">YJMF</span>
              <strong>{card.label}</strong>
              <p>{card.description}</p>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
