'use client';

import { ReactNode, useEffect, useState } from 'react';
import { getAdminToken, redirectToAdminLogin } from '@/lib/admin-auth';

type AdminProtectedProps = {
  children: ReactNode;
};

export function AdminProtected({ children }: AdminProtectedProps) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      redirectToAdminLogin();
      return;
    }
    setAllowed(true);
  }, []);

  if (!allowed) {
    return (
      <main className="admin-page">
        <div className="shell admin-shell">
          <div className="skeleton-block">正在检查后台登录状态...</div>
        </div>
      </main>
    );
  }

  return children;
}
