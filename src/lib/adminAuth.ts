import crypto from "crypto";

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
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64");
  
  const secret = process.env.ADMIN_PASSCODE || "fallback-secret-for-development";
  const signature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64");
  
  return `${payloadBase64}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined): {
  valid: boolean;
  error?: string;
  payload?: AdminSessionPayload;
} {
  if (!token) {
    return { valid: false, error: "Authorization token missing" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid token format" };
  }

  const [payloadBase64, providedSignature] = parts;

  try {
    const secret = process.env.ADMIN_PASSCODE || "fallback-secret-for-development";
    const expectedSignature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64");
    
    const expectedBuf = Buffer.from(expectedSignature);
    const providedBuf = Buffer.from(providedSignature);
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return { valid: false, error: "Invalid admin session token signature" };
    }

    const decoded = Buffer.from(payloadBase64, "base64").toString("utf8");
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
