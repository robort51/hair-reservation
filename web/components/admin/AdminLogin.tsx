'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { setAdminToken } from '@/lib/admin-auth';

function getNextPath() {
  if (typeof window === 'undefined') {
    return '/admin';
  }
  return new URLSearchParams(window.location.search).get('next') || '/admin';
}

export function AdminLogin() {
  const [username, setUsername] = useState('YJMF');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const result = await api.adminLogin({
        username: username.trim(),
        password,
      });
      setAdminToken(result.token);
      window.location.href = getNextPath();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-shell">
        <a className="brand-mark" href="/">
          YJMF
        </a>
        <form className="admin-login-panel panel" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Admin</p>
            <h1>后台登录</h1>
          </div>

          <label className="field">
            <span>用户名</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage ? (
            <p className="feedback feedback--error">{errorMessage}</p>
          ) : null}

          <button className="button" disabled={submitting} type="submit">
            {submitting ? '登录中...' : '进入后台'}
          </button>
        </form>
      </div>
    </main>
  );
}
