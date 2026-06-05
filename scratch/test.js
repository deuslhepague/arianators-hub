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

async function test() {
  try {
    console.log("Fetching token...");
    const token = await getSpotifyToken();
    console.log("Token obtained:", token.substring(0, 15) + "...");

    const albumId = "5EYKrEDnKhhcNxGedaRQeK";
    const pathfinderUrl = "https://api-partner.spotify.com/pathfinder/v2/query";
    const variables = {
      uri: `spotify:album:${albumId}`,
      locale: "intl-pt",
      offset: 0,
      limit: 50
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10"
      }
    };

    console.log("Querying Pathfinder...");
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
        variables,
        operationName: "getAlbum",
        extensions
      })
    });

    if (!res.ok) {
      console.error(`HTTP Error: ${res.status}`);
      const text = await res.text();
      console.error(text);
      return;
    }

    const data = await res.json();
    const items = data?.data?.albumUnion?.tracksV2?.items || [];
    console.log(`Found ${items.length} items in album.`);

    items.forEach(item => {
      const track = item?.track;
      if (track) {
        const uri = track.uri || "";
        const id = uri.split(":track:")[1] || uri;
        const title = track.name;
        const playcount = track.playcount;
        if (title.toLowerCase().includes("break up") || title.toLowerCase().includes("wanna break")) {
          console.log(`Track: ${title} (${id}) - Playcount: ${playcount}`);
        }
      }
    });

  } catch (err) {
    console.error("Error in test:", err);
  }
}

test();
