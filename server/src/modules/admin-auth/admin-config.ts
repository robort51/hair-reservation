type AdminEnvName = 'ADMIN_USERNAME' | 'ADMIN_PASSWORD' | 'ADMIN_TOKEN_SECRET';

function requireEnv(name: AdminEnvName): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少必要环境变量：${name}`);
  }

  return value;
}

export function getAdminUsername(): string {
  return requireEnv('ADMIN_USERNAME');
}

export function getAdminPassword(): string {
  return requireEnv('ADMIN_PASSWORD');
}

export function getAdminTokenSecret(): string {
  return requireEnv('ADMIN_TOKEN_SECRET');
}

export function validateAdminConfig(): void {
  getAdminUsername();
  getAdminPassword();
  getAdminTokenSecret();
}
