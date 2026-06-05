async function getSpotifyToken() {
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
  throw new Error("Failed to fetch Spotify access token");
}

async function test() {
  try {
    const token = await getSpotifyToken();
    const trackId = "0o3ua5ufFK7nfRzbDUNoGA"; // don't wanna break up again
    const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
    
    console.log("Querying getTrack...");
    const res = await fetch(pathfinderUrl, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "accept-language": "pt-BR",
        "app-platform": "WebPlayer",
        "authorization": `Bearer ${token}`,
        "content-type": "application/json;charset=UTF-8",
        "origin": "https://open.spotify.com",
        "referer": "https://open.spotify.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        variables: { uri: `spotify:track:${trackId}` },
        operationName: "getTrack",
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294"
          }
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const trackUnion = data?.data?.trackUnion;
      console.log("albumOfTrack:", JSON.stringify(trackUnion?.albumOfTrack, null, 2));
    } else {
      console.error(`Error: ${res.status}`);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
