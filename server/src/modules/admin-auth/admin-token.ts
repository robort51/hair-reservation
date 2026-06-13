import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

type AdminTokenPayload = {
  sub: string;
  exp: number;
};

function getTokenSecret() {
  return process.env.ADMIN_TOKEN_SECRET ?? 'yjmf-dev-admin-secret';
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function sign(value: string) {
  return createHmac('sha256', getTokenSecret()).update(value).digest('base64url');
}

export function createAdminToken(username: string) {
  const payload: AdminTokenPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminToken(token: string) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as AdminTokenPayload;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
