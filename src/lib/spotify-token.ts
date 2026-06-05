export const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.cors.syrins.tech/?url=',
  'https://cloudflare-cors-anywhere-rho.vercel.app/?',
  'https://test.cors.workers.dev/?',
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://api.thebugging.com/cors-proxy?'
];

export async function getSpotifyToken(): Promise<string> {
  // Try stoken.gifted.co.ke first
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
    console.error("Failed to fetch token from gifted.co.ke:", err);
  }

  // Fallback to xwolf.space
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
    console.error("Failed to fetch token from xwolf.space:", err);
  }

  throw new Error("Failed to fetch Spotify access token from all sources");
}

export async function fetchSpotify(url: string, init?: RequestInit): Promise<Response> {
  // Try direct fetch first
  try {
    const res = await fetch(url, init);
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
        method: init?.method || "GET",
        headers: {
          "Authorization": init?.headers ? (init.headers as any)["Authorization"] || "" : "",
          "Content-Type": init?.headers ? (init.headers as any)["Content-Type"] || "application/json" : "application/json",
          "accept": "application/json",
          "app-platform": "WebPlayer"
        }
      };
      if (init?.body) {
        proxyInit.body = init.body;
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
}
