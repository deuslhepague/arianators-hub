import * as crypto from "crypto";

export const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.cors.syrins.tech/?url=',
  'https://cloudflare-cors-anywhere-rho.vercel.app/?',
  'https://test.cors.workers.dev/?',
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://api.thebugging.com/cors-proxy?'
];

const SPOTIFY_SECRETS_URL = "https://code.thetadev.de/ThetaDev/spotify-secrets/raw/branch/main/secrets/secretBytes.json";

function getBrowserUserAgent(): string {
  const chromeVersions = [80, 85, 90, 95, 100, 105];
  const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
  const build = Math.floor(Math.random() * 1500) + 3000;
  const patch = Math.floor(Math.random() * 65) + 60;
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Safari/537.36`;
}

function generateTOTP(keyBuffer: Buffer, timeStepSeconds = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter), 0);
  
  const hmac = crypto.createHmac("sha1", keyBuffer).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
    
  const totp = code % Math.pow(10, digits);
  return String(totp).padStart(digits, "0");
}

async function fetchTokenWithTOTP(): Promise<{ accessToken: string; accessTokenExpirationTimestampMs: number }> {
  const secretsRes = await fetch(SPOTIFY_SECRETS_URL, { cache: "no-store" });
  if (!secretsRes.ok) {
    throw new Error(`Failed to fetch secrets: ${secretsRes.status}`);
  }
  const secretsData = await secretsRes.json();
  if (!Array.isArray(secretsData) || secretsData.length === 0) {
    throw new Error("No secrets found in fetched data");
  }

  const latestSecret = secretsData.reduce((prev: any, current: any) => 
    (prev.version > current.version) ? prev : current
  );

  const secretCipherBytes: number[] = latestSecret.secret;
  const totpVer: number = latestSecret.version;

  const transformed = secretCipherBytes.map((e, t) => e ^ ((t % 33) + 9));
  const joined = transformed.join("");
  const keyBuffer = Buffer.from(joined, "utf-8");

  const otpValue = generateTOTP(keyBuffer);
  const ua = getBrowserUserAgent();
  
  const headers = {
    'accept': 'application/json',
    'accept-language': 'pt-BR',
    'cache-control': 'no-cache',
    'dnt': '1',
    'pragma': 'no-cache',
    'referer': 'https://open.spotify.com/intl-pt/',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': ua,
  };

  const tokenUrl = `https://open.spotify.com/api/token?reason=init&productType=web-player&totp=${otpValue}&totpServer=${otpValue}&totpVer=${totpVer}`;
  const response = await fetch(tokenUrl, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Spotify token API returned status ${response.status}`);
  }

  return response.json();
}

let cachedOwnToken: string | null = null;
let cachedOwnTokenExpires = 0;

export async function getSpotifyToken(forceFresh = false): Promise<string> {
  if (!forceFresh && cachedOwnToken && Date.now() < cachedOwnTokenExpires - 60000) {
    return cachedOwnToken;
  }

  // 1. Try our own TOTP generation first
  try {
    console.log("Generating own Spotify WebPlayer token via TOTP...");
    const tokenData = await fetchTokenWithTOTP();
    if (tokenData && tokenData.accessToken) {
      cachedOwnToken = tokenData.accessToken;
      const expiresMs = Number(tokenData.accessTokenExpirationTimestampMs) || (Date.now() + 3500000);
      cachedOwnTokenExpires = expiresMs;
      return cachedOwnToken;
    }
  } catch (err: any) {
    console.error("Failed to generate own Spotify token via TOTP:", err.message);
  }

  // 2. Fallback to stoken.gifted.co.ke
  try {
    const res = await fetch("https://stoken.gifted.co.ke/token.json", {
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        return data.token;
      }
    }
  } catch (err) {
    console.error("Failed to fetch token from gifted.co.ke fallback:", err);
  }

  // 3. Fallback to xwolf.space
  try {
    const res = await fetch("https://spotify.xwolf.space/api/token", {
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        return data.access_token;
      }
    }
  } catch (err) {
    console.error("Failed to fetch token from xwolf.space fallback:", err);
  }

  throw new Error("Failed to fetch Spotify access token from all sources");
}

export async function fetchSpotify(url: string, init?: RequestInit): Promise<Response> {
  const newInit = { ...init };
  if (!newInit.headers) {
    newInit.headers = {};
  } else {
    newInit.headers = { ...newInit.headers } as any;
  }

  const performFetch = async () => {
    // Try direct fetch first
    try {
      const res = await fetch(url, { ...newInit, cache: "no-store" });
      if (res.status !== 429) {
        return res;
      }
      console.warn(`Direct fetch to ${url} returned 429. Trying proxies...`);
    } catch (err) {
      console.warn(`Direct fetch to ${url} failed. Trying proxies...`, err);
    }

    // Try proxies sequentially
    for (const proxy of CORS_PROXIES) {
      const proxiedUrl = `${proxy}${encodeURIComponent(url)}`;
      try {
        console.log(`Trying proxy: ${proxiedUrl}`);
        const proxyInit: RequestInit = {
          method: newInit?.method || "GET",
          headers: {
            "Authorization": (newInit.headers as any)["Authorization"] || (newInit.headers as any)["authorization"] || "",
            "Content-Type": (newInit.headers as any)["Content-Type"] || (newInit.headers as any)["content-type"] || "application/json",
            "accept": "application/json",
            "app-platform": "WebPlayer"
          },
          cache: "no-store"
        };
        if (newInit?.body) {
          proxyInit.body = newInit.body;
        }
        const res = await fetch(proxiedUrl, proxyInit);
        if (res.status === 200) {
          return res;
        }
        console.warn(`Proxy ${proxy} returned status ${res.status}`);
      } catch (proxyErr) {
        console.warn(`Proxy ${proxy} failed:`, proxyErr);
      }
    }

    throw new Error(`Failed to fetch ${url} directly and through all proxies`);
  };

  let response = await performFetch();

  if (response.status === 401) {
    console.warn("Pathfinder returned 401. Fetching a fresh TOTP Spotify token and retrying...");
    try {
      const newToken = await getSpotifyToken(true);
      const headersObj = newInit.headers as Record<string, string>;
      const authKey = Object.keys(headersObj).find(k => k.toLowerCase() === "authorization") || "Authorization";
      headersObj[authKey] = `Bearer ${newToken}`;
      response = await performFetch();
    } catch (retryErr: any) {
      console.error("Failed to retry fetchSpotify after 401:", retryErr.message);
    }
  }

  return response;
}
