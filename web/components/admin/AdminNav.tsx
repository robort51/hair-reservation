'use client';

import { clearAdminToken } from '@/lib/admin-auth';

const adminLinks = [
  { href: '/admin', label: '今日预约' },
  { href: '/admin/appointments', label: '全部预约' },
  { href: '/admin/services', label: '服务' },
  { href: '/admin/staff', label: '员工' },
  { href: '/admin/schedules', label: '排班' },
];

export function AdminNav() {
  function handleLogout() {
    clearAdminToken();
    window.location.href = '/admin/login';
  }

  return (
    <nav className="topbar">
      <a className="brand-mark" href="/admin">
        YJMF
      </a>
      <div className="nav-links">
        {adminLinks.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
        <button className="nav-button" type="button" onClick={handleLogout}>
          退出
        </button>
      </div>
    </nav>
  );
}
