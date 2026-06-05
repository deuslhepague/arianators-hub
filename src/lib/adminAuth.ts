export interface AdminSessionPayload {
  authenticated: true;
  timestamp: string;
  expiresAt: string;
}

export function generateAdminSessionToken(): string {
  const payload: AdminSessionPayload = {
    authenticated: true,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function verifyAdminSessionToken(token: string | null | undefined): {
  valid: boolean;
  error?: string;
  payload?: AdminSessionPayload;
} {
  if (!token) {
    return { valid: false, error: "Authorization token missing" };
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as AdminSessionPayload;

    if (!payload || payload.authenticated !== true || !payload.expiresAt) {
      return { valid: false, error: "Invalid admin session token" };
    }

    const expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return { valid: false, error: "Admin session token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: "Invalid admin session token" };
  }
}
